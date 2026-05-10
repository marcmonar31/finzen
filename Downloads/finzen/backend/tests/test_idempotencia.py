from datetime import date
from fastapi.testclient import TestClient


def _headers(uid: str, wid: str) -> dict:
    return {"X-User-Id": uid, "X-Workspace-Id": wid}


def test_movimiento_duplicado_falla(client: TestClient, datos_base: dict):
    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]
    banco = datos_base["banco"]

    payload = {
        "cuenta_id": banco.id,
        "tipo": "gasto",
        "importe": "100.00",
        "moneda": "EUR",
        "fecha": str(date.today()),
        "concepto": "Pago duplicado",
    }

    r1 = client.post("/movimientos", json=payload, headers=_headers(martin.id, ws.id))
    assert r1.status_code == 201

    r2 = client.post("/movimientos", json=payload, headers=_headers(martin.id, ws.id))
    assert r2.status_code == 409


def test_mismo_concepto_distinta_fecha_no_es_duplicado(client: TestClient, datos_base: dict):
    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]
    banco = datos_base["banco"]

    base = {
        "cuenta_id": banco.id,
        "tipo": "gasto",
        "importe": "50.00",
        "moneda": "EUR",
        "concepto": "Alquiler",
    }

    r1 = client.post("/movimientos", json={**base, "fecha": "2026-04-01"}, headers=_headers(martin.id, ws.id))
    r2 = client.post("/movimientos", json={**base, "fecha": "2026-05-01"}, headers=_headers(martin.id, ws.id))

    assert r1.status_code == 201
    assert r2.status_code == 201


def test_mismo_importe_distinto_concepto_no_es_duplicado(client: TestClient, datos_base: dict):
    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]
    banco = datos_base["banco"]

    r1 = client.post("/movimientos", json={
        "cuenta_id": banco.id, "tipo": "gasto", "importe": "20.00",
        "moneda": "EUR", "fecha": str(date.today()), "concepto": "Café A",
    }, headers=_headers(martin.id, ws.id))

    r2 = client.post("/movimientos", json={
        "cuenta_id": banco.id, "tipo": "gasto", "importe": "20.00",
        "moneda": "EUR", "fecha": str(date.today()), "concepto": "Café B",
    }, headers=_headers(martin.id, ws.id))

    assert r1.status_code == 201
    assert r2.status_code == 201
