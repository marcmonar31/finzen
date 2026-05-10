import json
from decimal import Decimal
from datetime import date, timedelta

import pytest


def _headers(usuario_id: str, workspace_id: str) -> dict:
    return {"X-User-Id": usuario_id, "X-Workspace-Id": workspace_id}


def _crear_presupuesto(client, martin, ws, **kwargs):
    defaults = {
        "nombre": "Comida",
        "importe": "400.00",
        "moneda": "EUR",
        "periodo": "mensual",
        "modo": "estricto",
        "categoria_ids": [],
        "cuenta_ids": [],
    }
    defaults.update(kwargs)
    r = client.post("/presupuestos", json=defaults, headers=_headers(martin.id, ws.id))
    assert r.status_code == 201
    return r.json()


def test_crear_presupuesto(client, datos_base):
    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]
    data = _crear_presupuesto(client, martin, ws)
    assert data["nombre"] == "Comida"
    assert Decimal(data["importe"]) == Decimal("400.00")
    assert data["estado"]["alerta"] == "ok"
    assert data["estado"]["porcentaje"] == 0.0


def test_estado_sin_movimientos(client, datos_base):
    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]
    pres = _crear_presupuesto(client, martin, ws, nombre="Ocio", importe="200.00")

    r = client.get(f"/presupuestos/{pres['id']}/estado", headers=_headers(martin.id, ws.id))
    assert r.status_code == 200
    estado = r.json()
    assert estado["consumido"] == "0.0000"
    assert estado["alerta"] == "ok"


def test_estado_con_movimientos(client, datos_base):
    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]
    banco = datos_base["banco"]
    cat_comida = datos_base["cat_comida"]

    pres = _crear_presupuesto(
        client, martin, ws,
        nombre="Comida",
        importe="400.00",
        categoria_ids=[cat_comida.id],
    )

    # Gasto de 200€ en comida
    client.post(
        "/movimientos",
        json={
            "cuenta_id": banco.id,
            "tipo": "gasto",
            "importe": "200.00",
            "moneda": "EUR",
            "fecha": str(date.today()),
            "concepto": "Mercadona",
            "categoria_id": cat_comida.id,
        },
        headers=_headers(martin.id, ws.id),
    )

    r = client.get(f"/presupuestos/{pres['id']}/estado", headers=_headers(martin.id, ws.id))
    estado = r.json()
    assert Decimal(estado["consumido"]) == Decimal("200.0000")
    assert estado["porcentaje"] == 50.0
    assert estado["alerta"] == "ok"


def test_estado_alerta_advertencia(client, datos_base):
    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]
    banco = datos_base["banco"]
    cat_comida = datos_base["cat_comida"]

    pres = _crear_presupuesto(
        client, martin, ws,
        nombre="Comida",
        importe="100.00",
        categoria_ids=[cat_comida.id],
    )

    client.post(
        "/movimientos",
        json={
            "cuenta_id": banco.id,
            "tipo": "gasto",
            "importe": "85.00",
            "moneda": "EUR",
            "fecha": str(date.today()),
            "concepto": "Super",
            "categoria_id": cat_comida.id,
        },
        headers=_headers(martin.id, ws.id),
    )

    r = client.get(f"/presupuestos/{pres['id']}/estado", headers=_headers(martin.id, ws.id))
    estado = r.json()
    assert estado["alerta"] == "advertencia"
    assert estado["porcentaje"] >= 80.0


def test_estado_superado(client, datos_base):
    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]
    banco = datos_base["banco"]
    cat_comida = datos_base["cat_comida"]

    pres = _crear_presupuesto(
        client, martin, ws,
        nombre="Transporte",
        importe="50.00",
        categoria_ids=[cat_comida.id],
    )

    client.post(
        "/movimientos",
        json={
            "cuenta_id": banco.id,
            "tipo": "gasto",
            "importe": "60.00",
            "moneda": "EUR",
            "fecha": str(date.today()),
            "concepto": "Gasolina",
            "categoria_id": cat_comida.id,
        },
        headers=_headers(martin.id, ws.id),
    )

    r = client.get(f"/presupuestos/{pres['id']}/estado", headers=_headers(martin.id, ws.id))
    estado = r.json()
    assert estado["alerta"] == "superado"
    assert estado["porcentaje"] >= 100.0


def test_filtro_por_categoria_no_cuenta_gastos_otra(client, datos_base):
    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]
    banco = datos_base["banco"]
    cat_comida = datos_base["cat_comida"]
    cat_nomina = datos_base["cat_nomina"]

    pres = _crear_presupuesto(
        client, martin, ws,
        nombre="Solo comida",
        importe="100.00",
        categoria_ids=[cat_comida.id],
    )

    # Gasto en otra categoría — no debe contar
    client.post(
        "/movimientos",
        json={
            "cuenta_id": banco.id,
            "tipo": "gasto",
            "importe": "50.00",
            "moneda": "EUR",
            "fecha": str(date.today()),
            "concepto": "Gasolina",
            "categoria_id": cat_nomina.id,
        },
        headers=_headers(martin.id, ws.id),
    )

    r = client.get(f"/presupuestos/{pres['id']}/estado", headers=_headers(martin.id, ws.id))
    estado = r.json()
    assert estado["consumido"] == "0.0000"


def test_modo_flexible(client, datos_base):
    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]
    banco = datos_base["banco"]
    cat_comida = datos_base["cat_comida"]

    pres = _crear_presupuesto(
        client, martin, ws,
        nombre="Comida flexible",
        importe="400.00",
        modo="flexible",
        periodo="mensual",
        categoria_ids=[cat_comida.id],
    )

    # Gasto de ayer — debe contar en rolling 30d
    ayer = date.today() - timedelta(days=1)
    client.post(
        "/movimientos",
        json={
            "cuenta_id": banco.id,
            "tipo": "gasto",
            "importe": "30.00",
            "moneda": "EUR",
            "fecha": str(ayer),
            "concepto": "Super ayer",
            "categoria_id": cat_comida.id,
        },
        headers=_headers(martin.id, ws.id),
    )

    r = client.get(f"/presupuestos/{pres['id']}/estado", headers=_headers(martin.id, ws.id))
    estado = r.json()
    assert Decimal(estado["consumido"]) == Decimal("30.0000")


def test_archivar_presupuesto(client, datos_base):
    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]
    pres = _crear_presupuesto(client, martin, ws)

    r = client.delete(f"/presupuestos/{pres['id']}", headers=_headers(martin.id, ws.id))
    assert r.status_code == 204

    r2 = client.get("/presupuestos", headers=_headers(martin.id, ws.id))
    ids = [p["id"] for p in r2.json()]
    assert pres["id"] not in ids


def test_listar_presupuestos(client, datos_base):
    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]
    _crear_presupuesto(client, martin, ws, nombre="P1")
    _crear_presupuesto(client, martin, ws, nombre="P2")

    r = client.get("/presupuestos", headers=_headers(martin.id, ws.id))
    assert r.status_code == 200
    nombres = [p["nombre"] for p in r.json()]
    assert "P1" in nombres
    assert "P2" in nombres
