"""Tests Bloque 5 — Grupos y gastos compartidos."""
import pytest
from datetime import date
from decimal import Decimal


def _headers(usuario_id: str, workspace_id: str = "x") -> dict:
    return {"X-User-Id": usuario_id, "X-Workspace-Id": workspace_id}


def test_crear_grupo(client, datos_base):
    martin = datos_base["martin"]
    maria = datos_base["maria"]
    ws = datos_base["ws_martin"]

    r = client.post("/grupos", json={
        "nombre": "Piso compartido",
        "emoji": "🏠",
        "moneda_principal": "EUR",
        "miembro_usuario_ids": [maria.id],
        "workspace_id": ws.id,
    }, headers=_headers(martin.id, ws.id))

    assert r.status_code == 200
    data = r.json()
    assert data["nombre"] == "Piso compartido"
    assert len(data["miembros"]) == 2  # martin + maria


def test_listar_grupos(client, datos_base):
    martin = datos_base["martin"]
    maria = datos_base["maria"]
    ws = datos_base["ws_martin"]

    client.post("/grupos", json={
        "nombre": "Grupo A", "moneda_principal": "EUR",
        "workspace_id": ws.id,
    }, headers=_headers(martin.id, ws.id))

    r = client.get("/grupos", headers=_headers(martin.id, ws.id))
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_salir_grupo_con_balance_cero(client, datos_base):
    martin = datos_base["martin"]
    maria = datos_base["maria"]
    ws = datos_base["ws_martin"]

    r = client.post("/grupos", json={
        "nombre": "Viaje", "moneda_principal": "EUR",
        "miembro_usuario_ids": [maria.id],
        "workspace_id": ws.id,
    }, headers=_headers(martin.id, ws.id))
    grupo_id = r.json()["id"]

    # Maria sale (sin gastos → balance 0)
    r2 = client.delete(f"/grupos/{grupo_id}/salir", headers=_headers(maria.id, ws.id))
    assert r2.status_code == 200


def test_salir_grupo_con_balance_pendiente(client, datos_base):
    martin = datos_base["martin"]
    maria = datos_base["maria"]
    ws = datos_base["ws_martin"]

    r = client.post("/grupos", json={
        "nombre": "Viaje", "moneda_principal": "EUR",
        "miembro_usuario_ids": [maria.id],
        "workspace_id": ws.id,
    }, headers=_headers(martin.id, ws.id))
    grupo_id = r.json()["id"]
    miembros = r.json()["miembros"]
    m_martin = next(m for m in miembros if m["usuario_id"] == martin.id)
    m_maria = next(m for m in miembros if m["usuario_id"] == maria.id)

    # Martin paga 80€ repartido con María
    client.post(f"/grupos/{grupo_id}/gastos", json={
        "grupo_id": grupo_id, "concepto": "Cena", "importe": "80",
        "moneda": "EUR", "fecha": date.today().isoformat(),
        "pagador_id": m_martin["id"], "modo_reparto": "igualitario",
        "miembro_ids": [m_martin["id"], m_maria["id"]],
    }, headers=_headers(martin.id, ws.id))

    # María intenta salir con balance pendiente (-40€)
    r2 = client.delete(f"/grupos/{grupo_id}/salir", headers=_headers(maria.id, ws.id))
    assert r2.status_code == 400


def test_crear_gasto_igualitario(client, datos_base):
    martin = datos_base["martin"]
    maria = datos_base["maria"]
    ws = datos_base["ws_martin"]

    r = client.post("/grupos", json={
        "nombre": "Test", "moneda_principal": "EUR",
        "miembro_usuario_ids": [maria.id],
        "workspace_id": ws.id,
    }, headers=_headers(martin.id, ws.id))
    grupo_id = r.json()["id"]
    miembros = r.json()["miembros"]
    m_martin = next(m for m in miembros if m["usuario_id"] == martin.id)
    m_maria = next(m for m in miembros if m["usuario_id"] == maria.id)

    r2 = client.post(f"/grupos/{grupo_id}/gastos", json={
        "grupo_id": grupo_id, "concepto": "Cena", "importe": "80",
        "moneda": "EUR", "fecha": date.today().isoformat(),
        "pagador_id": m_martin["id"], "modo_reparto": "igualitario",
        "miembro_ids": [m_martin["id"], m_maria["id"]],
    }, headers=_headers(martin.id, ws.id))

    assert r2.status_code == 200
    gasto = r2.json()
    assert len(gasto["repartos"]) == 2
    # Cada uno paga 40
    for rep in gasto["repartos"]:
        assert Decimal(rep["importe_asignado"]) == Decimal("40.0000")


def test_balance_endpoint(client, datos_base):
    martin = datos_base["martin"]
    maria = datos_base["maria"]
    ws = datos_base["ws_martin"]

    r = client.post("/grupos", json={
        "nombre": "Test balance", "moneda_principal": "EUR",
        "miembro_usuario_ids": [maria.id],
        "workspace_id": ws.id,
    }, headers=_headers(martin.id, ws.id))
    grupo_id = r.json()["id"]
    miembros = r.json()["miembros"]
    m_martin = next(m for m in miembros if m["usuario_id"] == martin.id)
    m_maria = next(m for m in miembros if m["usuario_id"] == maria.id)

    # Martin paga 80€
    client.post(f"/grupos/{grupo_id}/gastos", json={
        "grupo_id": grupo_id, "concepto": "Cena", "importe": "80",
        "moneda": "EUR", "fecha": date.today().isoformat(),
        "pagador_id": m_martin["id"], "modo_reparto": "igualitario",
        "miembro_ids": [m_martin["id"], m_maria["id"]],
    }, headers=_headers(martin.id, ws.id))

    r2 = client.get(f"/grupos/{grupo_id}/balance", headers=_headers(martin.id, ws.id))
    assert r2.status_code == 200
    data = r2.json()
    assert Decimal(data["balance"][m_martin["id"]]) == Decimal("40.0000")
    assert Decimal(data["balance"][m_maria["id"]]) == Decimal("-40.0000")
    # 1 transferencia óptima
    assert len(data["transferencias_optimas"]) == 1
    assert data["transferencias_optimas"][0]["de"] == m_maria["id"]
    assert data["transferencias_optimas"][0]["a"] == m_martin["id"]


def test_gasto_afecta_cuenta_personal(client, datos_base):
    martin = datos_base["martin"]
    maria = datos_base["maria"]
    ws = datos_base["ws_martin"]
    banco = datos_base["banco"]

    r = client.post("/grupos", json={
        "nombre": "Piso", "moneda_principal": "EUR",
        "miembro_usuario_ids": [maria.id],
        "workspace_id": ws.id,
    }, headers=_headers(martin.id, ws.id))
    grupo_id = r.json()["id"]
    m_martin = next(m for m in r.json()["miembros"] if m["usuario_id"] == martin.id)
    m_maria = next(m for m in r.json()["miembros"] if m["usuario_id"] == maria.id)

    r2 = client.post(f"/grupos/{grupo_id}/gastos", json={
        "grupo_id": grupo_id, "concepto": "Cena", "importe": "80",
        "moneda": "EUR", "fecha": date.today().isoformat(),
        "pagador_id": m_martin["id"], "modo_reparto": "igualitario",
        "miembro_ids": [m_martin["id"], m_maria["id"]],
        "afecta_cuenta_personal": True,
        "cuenta_personal_id": banco.id,
    }, headers=_headers(martin.id, ws.id))

    assert r2.status_code == 200
    gasto = r2.json()
    # Debe tener movimiento vinculado
    assert gasto["movimiento_id"] is not None


def test_registrar_y_confirmar_liquidacion(client, datos_base):
    martin = datos_base["martin"]
    maria = datos_base["maria"]
    ws = datos_base["ws_martin"]

    r = client.post("/grupos", json={
        "nombre": "Viaje", "moneda_principal": "EUR",
        "miembro_usuario_ids": [maria.id],
        "workspace_id": ws.id,
    }, headers=_headers(martin.id, ws.id))
    grupo_id = r.json()["id"]
    miembros = r.json()["miembros"]
    m_martin = next(m for m in miembros if m["usuario_id"] == martin.id)
    m_maria = next(m for m in miembros if m["usuario_id"] == maria.id)

    # Gasto: martin paga 80, maría le debe 40
    client.post(f"/grupos/{grupo_id}/gastos", json={
        "grupo_id": grupo_id, "concepto": "Cena", "importe": "80",
        "moneda": "EUR", "fecha": date.today().isoformat(),
        "pagador_id": m_martin["id"], "modo_reparto": "igualitario",
        "miembro_ids": [m_martin["id"], m_maria["id"]],
    }, headers=_headers(martin.id, ws.id))

    # María liquida 40€
    r_liq = client.post(f"/grupos/{grupo_id}/liquidaciones", json={
        "grupo_id": grupo_id,
        "de_miembro_id": m_maria["id"],
        "a_miembro_id": m_martin["id"],
        "importe": "40",
        "moneda": "EUR",
    }, headers=_headers(maria.id, ws.id))
    assert r_liq.status_code == 200
    assert r_liq.json()["estado"] == "pendiente"

    liq_id = r_liq.json()["id"]
    r_confirmar = client.post(f"/grupos/{grupo_id}/liquidaciones/{liq_id}/confirmar", headers=_headers(martin.id, ws.id))
    assert r_confirmar.status_code == 200
    assert r_confirmar.json()["estado"] == "confirmada"

    # Ahora el balance debería ser 0
    r_balance = client.get(f"/grupos/{grupo_id}/balance", headers=_headers(martin.id, ws.id))
    bal = r_balance.json()["balance"]
    assert Decimal(bal[m_martin["id"]]) == Decimal("0.0000")
    assert Decimal(bal[m_maria["id"]]) == Decimal("0.0000")


def test_grupo_es_cuenta_real(client, datos_base):
    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]

    r = client.post("/grupos", json={
        "nombre": "Bote viaje", "moneda_principal": "EUR",
        "es_cuenta_real": True,
        "workspace_id": ws.id,
    }, headers=_headers(martin.id, ws.id))

    assert r.status_code == 200
    grupo = r.json()
    assert grupo["es_cuenta_real"] is True
    assert grupo["cuenta_id"] is not None

    # Verificar que la cuenta aparece en las cuentas del workspace
    r2 = client.get(f"/cuentas", headers=_headers(martin.id, ws.id))
    cuentas = r2.json()
    assert any(c["id"] == grupo["cuenta_id"] for c in cuentas)
