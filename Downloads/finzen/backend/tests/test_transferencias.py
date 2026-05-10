from decimal import Decimal
from datetime import date
from unittest.mock import patch, MagicMock

import pytest


def _headers(usuario_id: str, workspace_id: str) -> dict:
    return {"X-User-Id": usuario_id, "X-Workspace-Id": workspace_id}


@pytest.fixture
def cuenta_usd(session, datos_base):
    """Cuenta extra en USD en el workspace de Martín."""
    from models.cuenta import Cuenta

    ws = datos_base["ws_martin"]
    martin = datos_base["martin"]
    cuenta = Cuenta(
        workspace_id=ws.id,
        nombre="Banco USD",
        tipo="corriente",
        moneda="USD",
        saldo_inicial=Decimal("500"),
        fecha_saldo_inicial=date(2024, 1, 1),
        emoji="🏦",
        creado_por=martin.id,
    )
    session.add(cuenta)
    session.commit()
    session.refresh(cuenta)
    return cuenta


def test_crear_transferencia_misma_moneda(client, datos_base):
    ws = datos_base["ws_martin"]
    martin = datos_base["martin"]
    banco = datos_base["banco"]
    efectivo = datos_base["efectivo"]

    r = client.post(
        "/transferencias",
        json={
            "cuenta_origen_id": banco.id,
            "cuenta_destino_id": efectivo.id,
            "importe_origen": "100.00",
            "fecha": str(date.today()),
            "concepto": "Sacar efectivo",
        },
        headers=_headers(martin.id, ws.id),
    )
    assert r.status_code == 201
    data = r.json()
    assert data["movimiento_origen"]["tipo"] == "transferencia_origen"
    assert data["movimiento_destino"]["tipo"] == "transferencia_destino"
    assert Decimal(data["movimiento_origen"]["importe"]) == Decimal("100.00")
    assert Decimal(data["movimiento_destino"]["importe"]) == Decimal("100.00")


def test_crear_transferencia_genera_dos_movimientos_vinculados(client, datos_base, session):
    from sqlmodel import select
    from models.movimiento import Movimiento

    ws = datos_base["ws_martin"]
    martin = datos_base["martin"]
    banco = datos_base["banco"]
    efectivo = datos_base["efectivo"]

    r = client.post(
        "/transferencias",
        json={
            "cuenta_origen_id": banco.id,
            "cuenta_destino_id": efectivo.id,
            "importe_origen": "50.00",
            "fecha": str(date.today()),
        },
        headers=_headers(martin.id, ws.id),
    )
    assert r.status_code == 201
    data = r.json()
    transferencia_id = data["id"]

    orig_id = data["movimiento_origen_id"]
    dest_id = data["movimiento_destino_id"]

    mov_orig = session.get(Movimiento, orig_id)
    mov_dest = session.get(Movimiento, dest_id)

    assert mov_orig.transferencia_id == transferencia_id
    assert mov_dest.transferencia_id == transferencia_id


def test_mismas_cuentas_falla(client, datos_base):
    ws = datos_base["ws_martin"]
    martin = datos_base["martin"]
    banco = datos_base["banco"]

    r = client.post(
        "/transferencias",
        json={
            "cuenta_origen_id": banco.id,
            "cuenta_destino_id": banco.id,
            "importe_origen": "100.00",
            "fecha": str(date.today()),
        },
        headers=_headers(martin.id, ws.id),
    )
    assert r.status_code == 400


def test_importe_cero_falla(client, datos_base):
    ws = datos_base["ws_martin"]
    martin = datos_base["martin"]
    banco = datos_base["banco"]
    efectivo = datos_base["efectivo"]

    r = client.post(
        "/transferencias",
        json={
            "cuenta_origen_id": banco.id,
            "cuenta_destino_id": efectivo.id,
            "importe_origen": "0",
            "fecha": str(date.today()),
        },
        headers=_headers(martin.id, ws.id),
    )
    assert r.status_code == 422


def test_crear_transferencia_multimoneda_con_importe_destino(client, datos_base, cuenta_usd):
    ws = datos_base["ws_martin"]
    martin = datos_base["martin"]
    banco = datos_base["banco"]

    r = client.post(
        "/transferencias",
        json={
            "cuenta_origen_id": banco.id,
            "cuenta_destino_id": cuenta_usd.id,
            "importe_origen": "100.00",
            "importe_destino": "108.70",
            "fecha": str(date.today()),
            "concepto": "Cambio de divisa",
        },
        headers=_headers(martin.id, ws.id),
    )
    assert r.status_code == 201
    data = r.json()
    assert Decimal(data["movimiento_origen"]["importe"]) == Decimal("100.00")
    assert Decimal(data["movimiento_destino"]["importe"]) == Decimal("108.70")
    assert data["movimiento_origen"]["moneda"] == "EUR"
    assert data["movimiento_destino"]["moneda"] == "USD"


def test_crear_transferencia_multimoneda_autoconvert(client, datos_base, cuenta_usd):
    ws = datos_base["ws_martin"]
    martin = datos_base["martin"]
    banco = datos_base["banco"]

    mock_resp = MagicMock()
    mock_resp.json.return_value = {"rates": {"USD": 1.087}}
    mock_resp.raise_for_status = MagicMock()

    with patch("services.conversion.httpx.get", return_value=mock_resp):
        r = client.post(
            "/transferencias",
            json={
                "cuenta_origen_id": banco.id,
                "cuenta_destino_id": cuenta_usd.id,
                "importe_origen": "100.00",
                "fecha": str(date.today()),
            },
            headers=_headers(martin.id, ws.id),
        )

    assert r.status_code == 201
    data = r.json()
    assert Decimal(data["movimiento_destino"]["importe"]) == Decimal("108.7000")


def test_saldos_actualizan_tras_transferencia(client, datos_base, session):
    from services.saldos import saldo_cuenta

    ws = datos_base["ws_martin"]
    martin = datos_base["martin"]
    banco = datos_base["banco"]
    efectivo = datos_base["efectivo"]

    saldo_banco_antes = saldo_cuenta(banco.id, session)
    saldo_efectivo_antes = saldo_cuenta(efectivo.id, session)

    r = client.post(
        "/transferencias",
        json={
            "cuenta_origen_id": banco.id,
            "cuenta_destino_id": efectivo.id,
            "importe_origen": "200.00",
            "fecha": str(date.today()),
            "concepto": "Test transferencia saldo",
        },
        headers=_headers(martin.id, ws.id),
    )
    assert r.status_code == 201

    # Refrescar saldos
    session.expire_all()
    saldo_banco_despues = saldo_cuenta(banco.id, session)
    saldo_efectivo_despues = saldo_cuenta(efectivo.id, session)

    assert saldo_banco_despues == saldo_banco_antes - Decimal("200.00")
    assert saldo_efectivo_despues == saldo_efectivo_antes + Decimal("200.00")


def test_listar_transferencias(client, datos_base):
    ws = datos_base["ws_martin"]
    martin = datos_base["martin"]
    banco = datos_base["banco"]
    efectivo = datos_base["efectivo"]

    client.post(
        "/transferencias",
        json={
            "cuenta_origen_id": banco.id,
            "cuenta_destino_id": efectivo.id,
            "importe_origen": "10.00",
            "fecha": str(date.today()),
        },
        headers=_headers(martin.id, ws.id),
    )

    r = client.get("/transferencias", headers=_headers(martin.id, ws.id))
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 1
    assert data[0]["movimiento_origen"] is not None


def test_archivar_transferencia(client, datos_base, session):
    from models.movimiento import Movimiento

    ws = datos_base["ws_martin"]
    martin = datos_base["martin"]
    banco = datos_base["banco"]
    efectivo = datos_base["efectivo"]

    r = client.post(
        "/transferencias",
        json={
            "cuenta_origen_id": banco.id,
            "cuenta_destino_id": efectivo.id,
            "importe_origen": "10.00",
            "fecha": str(date.today()),
        },
        headers=_headers(martin.id, ws.id),
    )
    transferencia_id = r.json()["id"]
    orig_id = r.json()["movimiento_origen_id"]

    r2 = client.delete(
        f"/transferencias/{transferencia_id}",
        headers=_headers(martin.id, ws.id),
    )
    assert r2.status_code == 204

    session.expire_all()
    mov = session.get(Movimiento, orig_id)
    assert mov.archivado_en is not None
