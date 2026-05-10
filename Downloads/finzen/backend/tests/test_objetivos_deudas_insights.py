"""Tests Bloque 7: objetivos, deudas, predicción, detección, salud score."""
import pytest
from datetime import date, timedelta
from decimal import Decimal


def _h(datos):
    return {"X-User-Id": datos["martin"].id, "X-Workspace-Id": datos["ws_martin"].id}


# ── Objetivos ─────────────────────────────────────────────────────────────────

def test_crear_objetivo(client, datos_base):
    r = client.post("/objetivos", json={
        "nombre": "Vacaciones 2026",
        "emoji": "✈️",
        "importe_objetivo": "2000.00",
        "moneda": "EUR",
        "fecha_objetivo": "2026-12-01",
    }, headers=_h(datos_base))
    assert r.status_code == 201
    data = r.json()
    assert data["nombre"] == "Vacaciones 2026"
    assert float(data["importe_objetivo"]) == pytest.approx(2000.0)
    assert data["porcentaje"] == 0.0
    assert float(data["falta"]) == pytest.approx(2000.0)


def test_aportar_a_objetivo(client, datos_base):
    h = _h(datos_base)
    r = client.post("/objetivos", json={
        "nombre": "Fondo emergencia",
        "importe_objetivo": "1000.00",
        "moneda": "EUR",
        "fecha_objetivo": None,
    }, headers=h)
    obj_id = r.json()["id"]

    r2 = client.post(f"/objetivos/{obj_id}/aportaciones", json={
        "importe": "200.00",
        "moneda": "EUR",
        "fecha": date.today().isoformat(),
        "concepto": "Aportación mensual",
    }, headers=h)
    assert r2.status_code == 201

    r3 = client.get("/objetivos", headers=h)
    obj = next(o for o in r3.json() if o["id"] == obj_id)
    assert obj["porcentaje"] == 20.0
    assert float(obj["falta"]) == pytest.approx(800.0, abs=0.01)


def test_objetivo_100_porciento(client, datos_base):
    h = _h(datos_base)
    r = client.post("/objetivos", json={
        "nombre": "Meta pequeña",
        "importe_objetivo": "100.00",
        "moneda": "EUR",
        "fecha_objetivo": None,
    }, headers=h)
    obj_id = r.json()["id"]

    client.post(f"/objetivos/{obj_id}/aportaciones", json={
        "importe": "150.00", "moneda": "EUR",
        "fecha": date.today().isoformat(),
    }, headers=h)

    r2 = client.get("/objetivos", headers=h)
    obj = next(o for o in r2.json() if o["id"] == obj_id)
    assert obj["porcentaje"] == 100.0  # capped at 100
    assert float(obj["falta"]) == 0.0


def test_archivar_objetivo(client, datos_base):
    h = _h(datos_base)
    r = client.post("/objetivos", json={
        "nombre": "Para archivar",
        "importe_objetivo": "500.00",
        "moneda": "EUR",
        "fecha_objetivo": None,
    }, headers=h)
    obj_id = r.json()["id"]
    r2 = client.delete(f"/objetivos/{obj_id}", headers=h)
    assert r2.status_code == 204

    r3 = client.get("/objetivos", headers=h)
    ids = [o["id"] for o in r3.json()]
    assert obj_id not in ids


def test_listar_aportaciones(client, datos_base):
    h = _h(datos_base)
    r = client.post("/objetivos", json={
        "nombre": "Con aportaciones",
        "importe_objetivo": "500.00",
        "moneda": "EUR",
        "fecha_objetivo": None,
    }, headers=h)
    obj_id = r.json()["id"]

    for _ in range(3):
        client.post(f"/objetivos/{obj_id}/aportaciones", json={
            "importe": "50.00", "moneda": "EUR",
            "fecha": date.today().isoformat(),
        }, headers=h)

    r2 = client.get(f"/objetivos/{obj_id}/aportaciones", headers=h)
    assert r2.status_code == 200
    assert len(r2.json()) == 3


# ── Deudas ────────────────────────────────────────────────────────────────────

def test_crear_deuda(client, datos_base):
    h = _h(datos_base)
    r = client.post("/deudas", json={
        "nombre": "Préstamo coche",
        "tipo": "prestamo",
        "importe_total": "10000.00",
        "moneda": "EUR",
        "tasa_interes_anual": "5.00",
        "num_cuotas": 36,
        "fecha_inicio": date.today().isoformat(),
        "dia_cuota": 1,
    }, headers=h)
    assert r.status_code == 201
    data = r.json()
    assert data["nombre"] == "Préstamo coche"
    assert data["num_cuotas"] == 36


def test_tabla_amortizacion_con_interes(client, datos_base):
    h = _h(datos_base)
    r = client.post("/deudas", json={
        "nombre": "Préstamo test",
        "tipo": "prestamo",
        "importe_total": "12000.00",
        "moneda": "EUR",
        "tasa_interes_anual": "3.00",
        "num_cuotas": 12,
        "fecha_inicio": date.today().isoformat(),
        "dia_cuota": 5,
    }, headers=h)
    deuda_id = r.json()["id"]

    r2 = client.get(f"/deudas/{deuda_id}/cuotas", headers=h)
    assert r2.status_code == 200
    cuotas = r2.json()
    assert len(cuotas) == 12
    # La última cuota debe dejar saldo ≈ 0
    assert float(cuotas[-1]["saldo_pendiente"]) < 1.0
    # Cuota 1: intereses = 12000 * 3% / 12 = 30
    assert float(cuotas[0]["intereses"]) == pytest.approx(30.0, abs=0.5)


def test_deuda_sin_interes(client, datos_base):
    h = _h(datos_base)
    r = client.post("/deudas", json={
        "nombre": "Deuda personal",
        "tipo": "personal",
        "importe_total": "1200.00",
        "moneda": "EUR",
        "tasa_interes_anual": "0",
        "num_cuotas": 12,
        "fecha_inicio": date.today().isoformat(),
        "dia_cuota": 15,
    }, headers=h)
    deuda_id = r.json()["id"]
    r2 = client.get(f"/deudas/{deuda_id}/cuotas", headers=h)
    cuotas = r2.json()
    assert len(cuotas) == 12
    for c in cuotas:
        assert float(c["intereses"]) == 0.0
        assert float(c["capital"]) == pytest.approx(100.0, abs=0.01)


def test_deuda_sin_cuotas_no_genera_tabla(client, datos_base):
    h = _h(datos_base)
    r = client.post("/deudas", json={
        "nombre": "Deuda indefinida",
        "tipo": "tarjeta",
        "importe_total": "2000.00",
        "moneda": "EUR",
        "tasa_interes_anual": "20.00",
        "fecha_inicio": date.today().isoformat(),
        "dia_cuota": 1,
    }, headers=h)
    deuda_id = r.json()["id"]
    r2 = client.get(f"/deudas/{deuda_id}/cuotas", headers=h)
    assert r2.status_code == 400


# ── Insights / predicción ─────────────────────────────────────────────────────

def test_prediccion_devuelve_tres_horizontes(client, datos_base):
    h = _h(datos_base)
    r = client.get("/insights/prediccion", headers=h)
    assert r.status_code == 200
    datos = r.json()
    assert len(datos) == 3
    dias = [d["dias"] for d in datos]
    assert set(dias) == {30, 60, 90}
    for d in datos:
        assert "saldo_proyectado" in d
        assert "gasto_proyectado" in d
        assert "impacto_recurrentes" in d


def test_insights_endpoint_completo(client, datos_base):
    h = _h(datos_base)
    r = client.get("/insights", headers=h)
    assert r.status_code == 200
    data = r.json()
    assert "prediccion" in data
    assert "suscripciones" in data
    assert "gastos_hormiga" in data
    assert "anomalias" in data
    assert "salud" in data


# ── Salud score ───────────────────────────────────────────────────────────────

def test_salud_score_estructura(client, datos_base):
    h = _h(datos_base)
    r = client.get("/insights/salud", headers=h)
    assert r.status_code == 200
    data = r.json()
    assert "score" in data
    assert "nivel" in data
    assert "factores" in data
    assert 0 <= data["score"] <= 100
    assert len(data["factores"]) == 5
    assert data["nivel"] in ("excelente", "bueno", "regular", "mejorable")
    for f in data["factores"]:
        assert "nombre" in f
        assert "puntos" in f
        assert "max_puntos" in f
        assert f["puntos"] <= f["max_puntos"]


def test_salud_score_con_buenos_datos(client, datos_base):
    h = _h(datos_base)
    banco = datos_base["banco"]

    # Ingreso alto + poco gasto → tasa ahorro 83% → 25 pts en factor 1
    client.post("/movimientos", json={
        "cuenta_id": banco.id, "tipo": "ingreso",
        "importe": "3000.00", "moneda": "EUR",
        "fecha": date.today().isoformat(), "concepto": "Nómina test",
    }, headers=h)
    client.post("/movimientos", json={
        "cuenta_id": banco.id, "tipo": "gasto",
        "importe": "500.00", "moneda": "EUR",
        "fecha": date.today().isoformat(), "concepto": "Gastos test",
    }, headers=h)

    r = client.get("/insights/salud", headers=h)
    data = r.json()
    factor_ahorro = next(f for f in data["factores"] if "ahorro" in f["nombre"].lower())
    assert factor_ahorro["puntos"] == 25


def test_detectar_suscripciones(client, datos_base):
    h = _h(datos_base)
    banco = datos_base["banco"]

    # 3 pagos con cadencia mensual exacta
    for i in [90, 60, 30]:
        client.post("/movimientos", json={
            "cuenta_id": banco.id, "tipo": "gasto",
            "importe": "9.99", "moneda": "EUR",
            "fecha": (date.today() - timedelta(days=i)).isoformat(),
            "concepto": "Netflix España",
        }, headers=h)

    r = client.get("/insights/suscripciones", headers=h)
    assert r.status_code == 200
    subs = r.json()
    nombres = [s["concepto_normalizado"] for s in subs]
    assert any("netflix" in n for n in nombres)


def test_detectar_gastos_hormiga(client, datos_base):
    h = _h(datos_base)
    banco = datos_base["banco"]

    for i in range(5):
        # Variamos el concepto con número para evitar colisión de hash de idempotencia;
        # la normalización elimina dígitos y deja "cafe bar centro" en todos.
        client.post("/movimientos", json={
            "cuenta_id": banco.id, "tipo": "gasto",
            "importe": "2.50", "moneda": "EUR",
            "fecha": (date.today() - timedelta(days=i)).isoformat(),
            "concepto": f"Cafe bar centro {i + 1}",
        }, headers=h)

    r = client.get("/insights/gastos-hormiga", headers=h)
    assert r.status_code == 200
    hormiga = r.json()
    assert len(hormiga) >= 1
    assert hormiga[0]["num_ocurrencias_mes"] >= 5
    assert float(hormiga[0]["total_mes"]) == pytest.approx(12.50, abs=0.01)
