from decimal import Decimal
from datetime import date, timedelta
from fastapi.testclient import TestClient


def _headers(usuario_id: str, workspace_id: str) -> dict:
    return {"X-User-Id": usuario_id, "X-Workspace-Id": workspace_id}


def test_crear_movimiento(client: TestClient, datos_base: dict):
    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]
    banco = datos_base["banco"]
    cat = datos_base["cat_comida"]

    resp = client.post(
        "/movimientos",
        json={
            "cuenta_id": banco.id,
            "tipo": "gasto",
            "importe": "30.00",
            "moneda": "EUR",
            "fecha": str(date.today()),
            "categoria_id": cat.id,
            "concepto": "Mercadona",
        },
        headers=_headers(martin.id, ws.id),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["concepto"] == "Mercadona"
    assert Decimal(data["importe"]) == Decimal("30.00")
    assert data["categoria_emoji"] is not None


def test_importe_cero_falla(client: TestClient, datos_base: dict):
    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]
    banco = datos_base["banco"]

    resp = client.post(
        "/movimientos",
        json={
            "cuenta_id": banco.id,
            "tipo": "gasto",
            "importe": "0",
            "moneda": "EUR",
            "fecha": str(date.today()),
            "concepto": "Sin importe",
        },
        headers=_headers(martin.id, ws.id),
    )
    assert resp.status_code == 422


def test_fecha_muy_futura_falla(client: TestClient, datos_base: dict):
    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]
    banco = datos_base["banco"]
    fecha_futura = date.today() + timedelta(days=400)

    resp = client.post(
        "/movimientos",
        json={
            "cuenta_id": banco.id,
            "tipo": "gasto",
            "importe": "10.00",
            "moneda": "EUR",
            "fecha": str(fecha_futura),
            "concepto": "Muy futuro",
        },
        headers=_headers(martin.id, ws.id),
    )
    assert resp.status_code == 422


def test_listar_movimientos(client: TestClient, datos_base: dict):
    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]
    banco = datos_base["banco"]

    # Crear algunos movimientos
    for i in range(3):
        client.post(
            "/movimientos",
            json={
                "cuenta_id": banco.id,
                "tipo": "gasto",
                "importe": f"{10 + i}.00",
                "moneda": "EUR",
                "fecha": str(date.today()),
                "concepto": f"Gasto {i}",
            },
            headers=_headers(martin.id, ws.id),
        )

    resp = client.get("/movimientos", headers=_headers(martin.id, ws.id))
    assert resp.status_code == 200
    assert len(resp.json()) >= 3


def test_filtrar_por_categoria(client: TestClient, datos_base: dict):
    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]
    banco = datos_base["banco"]
    cat_comida = datos_base["cat_comida"]
    cat_nomina = datos_base["cat_nomina"]

    client.post("/movimientos", json={
        "cuenta_id": banco.id, "tipo": "gasto", "importe": "15.00",
        "moneda": "EUR", "fecha": str(date.today()),
        "concepto": "Pizza", "categoria_id": cat_comida.id,
    }, headers=_headers(martin.id, ws.id))

    client.post("/movimientos", json={
        "cuenta_id": banco.id, "tipo": "ingreso", "importe": "2000.00",
        "moneda": "EUR", "fecha": str(date.today()),
        "concepto": "Nómina enero", "categoria_id": cat_nomina.id,
    }, headers=_headers(martin.id, ws.id))

    resp = client.get(f"/movimientos?categoria_id={cat_comida.id}", headers=_headers(martin.id, ws.id))
    assert resp.status_code == 200
    movs = resp.json()
    assert all(m["categoria_id"] == cat_comida.id for m in movs)


def test_editar_movimiento(client: TestClient, datos_base: dict):
    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]
    banco = datos_base["banco"]

    r = client.post("/movimientos", json={
        "cuenta_id": banco.id, "tipo": "gasto", "importe": "30.00",
        "moneda": "EUR", "fecha": str(date.today()), "concepto": "Cena",
    }, headers=_headers(martin.id, ws.id))
    mov_id = r.json()["id"]

    r2 = client.patch(f"/movimientos/{mov_id}", json={"importe": "35.00", "concepto": "Cena editada"},
                      headers=_headers(martin.id, ws.id))
    assert r2.status_code == 200
    assert Decimal(r2.json()["importe"]) == Decimal("35.00")
    assert r2.json()["concepto"] == "Cena editada"


def test_archivar_movimiento(client: TestClient, datos_base: dict):
    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]
    banco = datos_base["banco"]

    r = client.post("/movimientos", json={
        "cuenta_id": banco.id, "tipo": "gasto", "importe": "50.00",
        "moneda": "EUR", "fecha": str(date.today()), "concepto": "Archivame",
    }, headers=_headers(martin.id, ws.id))
    mov_id = r.json()["id"]

    r2 = client.delete(f"/movimientos/{mov_id}", headers=_headers(martin.id, ws.id))
    assert r2.status_code == 204

    # Ya no aparece en la lista
    lista = client.get("/movimientos", headers=_headers(martin.id, ws.id)).json()
    ids = [m["id"] for m in lista]
    assert mov_id not in ids


def test_saldo_se_actualiza_al_crear_movimiento(client: TestClient, datos_base: dict):
    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]
    banco = datos_base["banco"]

    from sqlmodel import Session
    from database import engine
    banco.saldo_inicial = Decimal("1000")
    with Session(engine) as s:
        pass  # Solo para verificar — usamos el endpoint de cuentas
    # Usando el endpoint de cuentas con saldo
    banco_resp = client.get(f"/cuentas/{banco.id}", headers=_headers(martin.id, ws.id))
    saldo_antes = Decimal(banco_resp.json()["saldo"])

    client.post("/movimientos", json={
        "cuenta_id": banco.id, "tipo": "gasto", "importe": "30.00",
        "moneda": "EUR", "fecha": str(date.today()), "concepto": "Gasto saldo",
    }, headers=_headers(martin.id, ws.id))

    banco_resp2 = client.get(f"/cuentas/{banco.id}", headers=_headers(martin.id, ws.id))
    saldo_despues = Decimal(banco_resp2.json()["saldo"])
    assert saldo_despues == saldo_antes - Decimal("30.00")
