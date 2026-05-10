from decimal import Decimal
from datetime import date, timedelta
import calendar

import pytest


def _headers(usuario_id: str, workspace_id: str) -> dict:
    return {"X-User-Id": usuario_id, "X-Workspace-Id": workspace_id}


def _crear_recurrente(client, martin, ws, banco, **kwargs):
    defaults = {
        "nombre": "Alquiler",
        "tipo": "gasto",
        "importe": "700.00",
        "moneda": "EUR",
        "cuenta_id": banco.id,
        "frecuencia": "mensual",
        "fecha_inicio": str(date.today()),
    }
    defaults.update(kwargs)
    r = client.post("/recurrentes", json=defaults, headers=_headers(martin.id, ws.id))
    assert r.status_code == 201
    return r.json()


# ---- calcular_proxima_ejecucion unit tests ----

def test_proxima_diario():
    from services.recurrentes_svc import calcular_proxima_ejecucion
    inicio = date(2024, 1, 15)
    assert calcular_proxima_ejecucion("diario", inicio) == date(2024, 1, 16)


def test_proxima_semanal():
    from services.recurrentes_svc import calcular_proxima_ejecucion
    inicio = date(2024, 1, 15)
    assert calcular_proxima_ejecucion("semanal", inicio) == date(2024, 1, 22)


def test_proxima_mensual():
    from services.recurrentes_svc import calcular_proxima_ejecucion
    inicio = date(2024, 1, 15)
    assert calcular_proxima_ejecucion("mensual", inicio) == date(2024, 2, 15)


def test_proxima_mensual_fin_de_mes():
    from services.recurrentes_svc import calcular_proxima_ejecucion
    inicio = date(2024, 1, 31)
    proxima = calcular_proxima_ejecucion("mensual", inicio)
    # Febrero 2024 tiene 29 días (bisiesto)
    assert proxima == date(2024, 2, 29)


def test_proxima_mensual_con_dia_mes():
    from services.recurrentes_svc import calcular_proxima_ejecucion
    # El dia_mes sobreescribe el día
    inicio = date(2024, 1, 5)
    proxima = calcular_proxima_ejecucion("mensual", inicio, dia_mes=1)
    assert proxima == date(2024, 2, 1)


def test_proxima_anual():
    from services.recurrentes_svc import calcular_proxima_ejecucion
    inicio = date(2024, 3, 15)
    assert calcular_proxima_ejecucion("anual", inicio) == date(2025, 3, 15)


def test_proxima_anual_bisiesto():
    from services.recurrentes_svc import calcular_proxima_ejecucion
    # 29 de febrero — el año siguiente no es bisiesto
    inicio = date(2024, 2, 29)
    proxima = calcular_proxima_ejecucion("anual", inicio)
    assert proxima == date(2025, 2, 28)


# ---- API tests ----

def test_crear_recurrente(client, datos_base):
    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]
    banco = datos_base["banco"]

    data = _crear_recurrente(client, martin, ws, banco)
    assert data["nombre"] == "Alquiler"
    assert Decimal(data["importe"]) == Decimal("700.00")
    assert data["frecuencia"] == "mensual"
    assert data["activo"] is True


def test_ejecutar_recurrente_manualmente(client, datos_base, session):
    from models.movimiento import Movimiento
    from sqlmodel import select as sql_select

    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]
    banco = datos_base["banco"]

    rec = _crear_recurrente(
        client, martin, ws, banco,
        nombre="Netflix",
        importe="15.99",
        frecuencia="mensual",
        fecha_inicio=str(date.today()),
    )

    r = client.post(
        f"/recurrentes/{rec['id']}/ejecutar",
        headers=_headers(martin.id, ws.id),
    )
    assert r.status_code == 200
    data = r.json()

    # proxima_ejecucion debe avanzar un mes
    hoy = date.today()
    mes_siguiente = hoy.month + 1 if hoy.month < 12 else 1
    año_siguiente = hoy.year if hoy.month < 12 else hoy.year + 1
    ultimo_dia = calendar.monthrange(año_siguiente, mes_siguiente)[1]
    dia_esperado = min(hoy.day, ultimo_dia)
    assert data["proxima_ejecucion"] == str(date(año_siguiente, mes_siguiente, dia_esperado))

    # Debe existir el movimiento
    movimientos = session.exec(
        sql_select(Movimiento).where(
            Movimiento.workspace_id == ws.id,
            Movimiento.fuente == "recurrente",
            Movimiento.fuente_id == rec["id"],
        )
    ).all()
    assert len(movimientos) == 1
    assert Decimal(str(movimientos[0].importe)) == Decimal("15.99")


def test_pausar_recurrente(client, datos_base):
    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]
    banco = datos_base["banco"]

    rec = _crear_recurrente(client, martin, ws, banco)

    r = client.patch(
        f"/recurrentes/{rec['id']}",
        json={"activo": False},
        headers=_headers(martin.id, ws.id),
    )
    assert r.status_code == 200
    assert r.json()["activo"] is False


def test_recurrente_pausado_no_ejecuta(client, datos_base, session):
    from models.movimiento import Movimiento
    from sqlmodel import select as sql_select

    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]
    banco = datos_base["banco"]

    rec = _crear_recurrente(client, martin, ws, banco, nombre="Suscripción")
    client.patch(
        f"/recurrentes/{rec['id']}",
        json={"activo": False},
        headers=_headers(martin.id, ws.id),
    )

    r = client.post(
        f"/recurrentes/{rec['id']}/ejecutar",
        headers=_headers(martin.id, ws.id),
    )
    assert r.status_code == 400


def test_archivar_recurrente(client, datos_base):
    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]
    banco = datos_base["banco"]

    rec = _crear_recurrente(client, martin, ws, banco)
    r = client.delete(f"/recurrentes/{rec['id']}", headers=_headers(martin.id, ws.id))
    assert r.status_code == 204

    r2 = client.get("/recurrentes", headers=_headers(martin.id, ws.id))
    ids = [r["id"] for r in r2.json()]
    assert rec["id"] not in ids


def test_recurrente_actualiza_saldo_cuenta(client, datos_base, session):
    from services.saldos import saldo_cuenta

    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]
    banco = datos_base["banco"]

    saldo_antes = saldo_cuenta(banco.id, session)

    rec = _crear_recurrente(
        client, martin, ws, banco,
        nombre="Alquiler test",
        importe="500.00",
        tipo="gasto",
    )
    client.post(f"/recurrentes/{rec['id']}/ejecutar", headers=_headers(martin.id, ws.id))

    session.expire_all()
    saldo_despues = saldo_cuenta(banco.id, session)
    assert saldo_despues == saldo_antes - Decimal("500.00")


def test_job_ejecuta_recurrentes_pendientes(session, datos_base):
    from models.recurrente import Recurrente
    from models.movimiento import Movimiento
    from sqlmodel import select as sql_select
    from jobs.recurrentes_job import ejecutar_recurrentes

    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]
    banco = datos_base["banco"]

    # Crear recurrente con fecha de ayer
    ayer = date.today() - timedelta(days=1)
    rec = Recurrente(
        workspace_id=ws.id,
        nombre="Job test",
        tipo="gasto",
        importe=Decimal("100"),
        moneda="EUR",
        cuenta_id=banco.id,
        frecuencia="mensual",
        proxima_ejecucion=ayer,
        creado_por=martin.id,
    )
    session.add(rec)
    session.commit()

    creados = ejecutar_recurrentes(session=session)
    assert creados >= 1
