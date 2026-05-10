"""Tests Bloque 8: Inversiones, Modos y Cierre mensual."""
import pytest
from decimal import Decimal
from datetime import date


def _h(d):
    return {"X-User-Id": d["martin"].id, "X-Workspace-Id": d["ws_martin"].id}


# ── Inversiones ─────────────────────────────────────────────────────────────────

def test_crear_activo(client, datos_base):
    r = client.post("/inversiones/activos", json={
        "ticker": "aapl",
        "nombre": "Apple Inc.",
        "tipo": "accion",
        "moneda": "USD",
    }, headers=_h(datos_base))
    assert r.status_code == 201
    data = r.json()
    assert data["ticker"] == "AAPL"
    assert data["workspace_id"] == datos_base["ws_martin"].id


def test_listar_activos(client, datos_base):
    client.post("/inversiones/activos", json={"ticker": "MSFT", "nombre": "Microsoft"}, headers=_h(datos_base))
    r = client.get("/inversiones/activos", headers=_h(datos_base))
    assert r.status_code == 200
    assert any(a["ticker"] == "MSFT" for a in r.json())


def test_crear_posicion(client, datos_base):
    r_activo = client.post("/inversiones/activos", json={
        "ticker": "VTI", "nombre": "Vanguard Total Market"
    }, headers=_h(datos_base))
    activo_id = r_activo.json()["id"]

    r = client.post("/inversiones/posiciones", json={
        "activo_id": activo_id,
        "cantidad": "10.5",
        "precio_medio": "220.00",
    }, headers=_h(datos_base))
    assert r.status_code == 201
    data = r.json()
    assert data["activo_id"] == activo_id
    assert Decimal(data["cantidad"]) == Decimal("10.5")


def test_resumen_cartera_pl(client, datos_base):
    """El endpoint GET /posiciones devuelve totales de P&L."""
    r_activo = client.post("/inversiones/activos", json={
        "ticker": "SPY", "nombre": "S&P 500 ETF"
    }, headers=_h(datos_base))
    activo_id = r_activo.json()["id"]

    client.post("/inversiones/posiciones", json={
        "activo_id": activo_id,
        "cantidad": "5",
        "precio_medio": "400.00",
    }, headers=_h(datos_base))

    r = client.get("/inversiones/posiciones", headers=_h(datos_base))
    assert r.status_code == 200
    data = r.json()
    assert "total_coste" in data
    assert "pl_total" in data
    assert "posiciones" in data
    assert len(data["posiciones"]) >= 1


def test_actualizar_posicion(client, datos_base):
    r_activo = client.post("/inversiones/activos", json={
        "ticker": "QQQ", "nombre": "Nasdaq ETF"
    }, headers=_h(datos_base))
    activo_id = r_activo.json()["id"]

    r_pos = client.post("/inversiones/posiciones", json={
        "activo_id": activo_id, "cantidad": "3", "precio_medio": "350.00"
    }, headers=_h(datos_base))
    pos_id = r_pos.json()["id"]

    r = client.patch(f"/inversiones/posiciones/{pos_id}", json={
        "cantidad": "5", "precio_medio": "360.00"
    }, headers=_h(datos_base))
    assert r.status_code == 200
    assert Decimal(r.json()["cantidad"]) == Decimal("5")


def test_cerrar_posicion(client, datos_base):
    r_activo = client.post("/inversiones/activos", json={
        "ticker": "GLD", "nombre": "Gold ETF"
    }, headers=_h(datos_base))
    activo_id = r_activo.json()["id"]

    r_pos = client.post("/inversiones/posiciones", json={
        "activo_id": activo_id, "cantidad": "2", "precio_medio": "180.00"
    }, headers=_h(datos_base))
    pos_id = r_pos.json()["id"]

    r = client.delete(f"/inversiones/posiciones/{pos_id}", headers=_h(datos_base))
    assert r.status_code == 204


def test_workspace_isolation_inversiones(client, datos_base):
    """Activos de otro workspace no son visibles."""
    r_activo = client.post("/inversiones/activos", json={
        "ticker": "IVV", "nombre": "iShares Core S&P 500"
    }, headers=_h(datos_base))
    assert r_activo.status_code == 201

    headers_familia = {"X-User-Id": datos_base["martin"].id, "X-Workspace-Id": datos_base["ws_familia"].id}
    r = client.get("/inversiones/activos", headers=headers_familia)
    assert not any(a["ticker"] == "IVV" for a in r.json())


# ── Modos ────────────────────────────────────────────────────────────────────────

def test_modo_emergencia_por_defecto(client, datos_base):
    r = client.get("/modos/emergencia", headers=_h(datos_base))
    assert r.status_code == 200
    assert r.json()["activo"] is False


def test_activar_modo_emergencia(client, datos_base):
    r = client.patch("/modos/emergencia", json={"activo": True}, headers=_h(datos_base))
    assert r.status_code == 200
    assert r.json()["activo"] is True

    r2 = client.get("/modos/emergencia", headers=_h(datos_base))
    assert r2.json()["activo"] is True


def test_crud_modo_viaje(client, datos_base):
    r = client.post("/modos/viaje", json={
        "nombre": "Viaje a Tokyo",
        "fecha_inicio": "2026-06-01",
        "fecha_fin": "2026-06-15",
    }, headers=_h(datos_base))
    assert r.status_code == 201
    modo_id = r.json()["id"]

    r2 = client.get("/modos/viaje", headers=_h(datos_base))
    assert any(m["id"] == modo_id for m in r2.json())

    r3 = client.patch(f"/modos/viaje/{modo_id}", json={"nombre": "Tokyo 2026"}, headers=_h(datos_base))
    assert r3.json()["nombre"] == "Tokyo 2026"

    r4 = client.delete(f"/modos/viaje/{modo_id}", headers=_h(datos_base))
    assert r4.status_code == 204


# ── Cierre Mensual ────────────────────────────────────────────────────────────────

def test_cierre_mensual_vacio(client, datos_base):
    """Mes sin movimientos devuelve ceros."""
    r = client.get("/cierre/2020/1", headers=_h(datos_base))
    assert r.status_code == 200
    data = r.json()
    assert data["ingresos"] == "0.00"
    assert data["gastos"] == "0.00"
    assert data["balance"] == "0.00"


def test_cierre_mensual_con_movimientos(client, datos_base):
    """Cierre calcula ingresos, gastos y balance correctamente."""
    h = _h(datos_base)
    banco_id = datos_base["banco"].id
    cat_id = datos_base["cat_comida"].id

    client.post("/movimientos", json={
        "tipo": "ingreso", "concepto": "Sueldo", "importe": "2000",
        "moneda": "EUR", "fecha": "2026-03-01",
        "cuenta_id": banco_id, "categoria_id": datos_base["cat_nomina"].id,
    }, headers=h)
    client.post("/movimientos", json={
        "tipo": "gasto", "concepto": "Supermercado", "importe": "150",
        "moneda": "EUR", "fecha": "2026-03-10",
        "cuenta_id": banco_id, "categoria_id": cat_id,
    }, headers=h)

    r = client.get("/cierre/2026/3", headers=h)
    assert r.status_code == 200
    data = r.json()
    assert Decimal(data["ingresos"]) == Decimal("2000.00")
    assert Decimal(data["gastos"]) == Decimal("150.00")
    assert Decimal(data["balance"]) == Decimal("1850.00")
    assert len(data["top_categorias"]) >= 1


def test_cierre_mensual_tasa_ahorro(client, datos_base):
    h = _h(datos_base)
    banco_id = datos_base["banco"].id

    client.post("/movimientos", json={
        "tipo": "ingreso", "concepto": "Freelance", "importe": "1000",
        "moneda": "EUR", "fecha": "2026-04-05",
        "cuenta_id": banco_id,
    }, headers=h)
    client.post("/movimientos", json={
        "tipo": "gasto", "concepto": "Alquiler", "importe": "500",
        "moneda": "EUR", "fecha": "2026-04-01",
        "cuenta_id": banco_id,
    }, headers=h)

    r = client.get("/cierre/2026/4", headers=h)
    data = r.json()
    assert Decimal(data["tasa_ahorro"]) == Decimal("50.0")
