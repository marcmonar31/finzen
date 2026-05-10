from decimal import Decimal
from datetime import date
from typing import Optional
from sqlmodel import Session
from models.movimiento import Movimiento
from models.cuenta import Cuenta
from services.saldos import saldo_cuenta, saldo_total_workspace


def _mov(session: Session, ws_id: str, cuenta_id: str, tipo: str, importe: str,
         user_id: str, categoria_id: Optional[str] = None) -> Movimiento:
    mov = Movimiento(
        workspace_id=ws_id,
        cuenta_id=cuenta_id,
        tipo=tipo,
        importe=Decimal(importe),
        moneda="EUR",
        importe_base=Decimal(importe),
        tasa_cambio=Decimal("1"),
        fecha=date.today(),
        concepto=f"test {tipo} {importe}",
        creado_por=user_id,
    )
    session.add(mov)
    session.commit()
    return mov


def test_saldo_cuenta_sin_movimientos(session: Session, datos_base: dict):
    banco = datos_base["banco"]
    # saldo_inicial = 0 por defecto
    assert saldo_cuenta(banco.id, session) == Decimal("0")


def test_saldo_cuenta_con_saldo_inicial(session: Session, datos_base: dict):
    banco = datos_base["banco"]
    banco.saldo_inicial = Decimal("1000")
    session.add(banco)
    session.commit()
    assert saldo_cuenta(banco.id, session) == Decimal("1000")


def test_saldo_cuenta_ingreso_y_gasto(session: Session, datos_base: dict):
    banco = datos_base["banco"]
    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]

    banco.saldo_inicial = Decimal("1000")
    session.add(banco)
    session.commit()

    _mov(session, ws.id, banco.id, "ingreso", "500", martin.id)
    _mov(session, ws.id, banco.id, "gasto", "200", martin.id)

    assert saldo_cuenta(banco.id, session) == Decimal("1300")


def test_saldo_no_cuenta_archivados(session: Session, datos_base: dict):
    banco = datos_base["banco"]
    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]

    banco.saldo_inicial = Decimal("1000")
    session.add(banco)
    session.commit()

    mov = _mov(session, ws.id, banco.id, "gasto", "300", martin.id)
    assert saldo_cuenta(banco.id, session) == Decimal("700")

    # Archivar el movimiento → saldo vuelve a 1000
    from datetime import datetime
    mov.archivado_en = datetime.utcnow()
    session.add(mov)
    session.commit()

    assert saldo_cuenta(banco.id, session) == Decimal("1000")


def test_saldo_total_workspace(session: Session, datos_base: dict):
    banco = datos_base["banco"]
    efectivo = datos_base["efectivo"]
    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]

    banco.saldo_inicial = Decimal("1000")
    efectivo.saldo_inicial = Decimal("50")
    session.add(banco)
    session.add(efectivo)
    session.commit()

    total = saldo_total_workspace(ws.id, session)
    assert total == Decimal("1050")


def test_saldo_modo_manual(session: Session, datos_base: dict):
    banco = datos_base["banco"]
    martin = datos_base["martin"]
    ws = datos_base["ws_martin"]

    banco.modo_saldo = "manual"
    banco.saldo_manual = Decimal("9999")
    session.add(banco)
    session.commit()

    # Aunque haya movimientos, en modo manual devuelve saldo_manual
    _mov(session, ws.id, banco.id, "gasto", "5000", martin.id)
    assert saldo_cuenta(banco.id, session) == Decimal("9999")
