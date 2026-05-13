from decimal import Decimal
from sqlmodel import Session, select
from models.cuenta import Cuenta
from models.movimiento import Movimiento


def saldo_cuenta(cuenta_id: str, session: Session) -> Decimal:
    cuenta = session.get(Cuenta, cuenta_id)
    if not cuenta:
        return Decimal("0")

    if cuenta.modo_saldo == "manual":
        return cuenta.saldo_manual or Decimal("0")

    saldo = Decimal(str(cuenta.saldo_inicial or 0))

    movs = session.exec(
        select(Movimiento).where(
            Movimiento.cuenta_id == cuenta_id,
            Movimiento.fecha >= cuenta.fecha_saldo_inicial,
            Movimiento.estado == "confirmado",
            Movimiento.archivado_en.is_(None),  # type: ignore[union-attr]
        )
    ).all()

    for mov in movs:
        importe = Decimal(str(mov.importe))
        if mov.tipo in ("ingreso", "transferencia_destino"):
            saldo += importe
        elif mov.tipo in ("gasto", "transferencia_origen"):
            saldo -= importe
        elif mov.tipo == "ajuste":
            saldo += importe

    return saldo


def saldo_total_workspace(workspace_id: str, session: Session) -> Decimal:
    from datetime import date
    from models.workspace import Workspace as WorkspaceModel
    from services.conversion import convertir

    workspace = session.get(WorkspaceModel, workspace_id)
    moneda_base = workspace.moneda_base if workspace else "EUR"

    cuentas = session.exec(
        select(Cuenta).where(
            Cuenta.workspace_id == workspace_id,
            Cuenta.archivado_en.is_(None),  # type: ignore[union-attr]
            Cuenta.incluir_en_patrimonio == True,
        )
    ).all()

    total = Decimal("0")
    hoy = date.today()
    for cuenta in cuentas:
        saldo = saldo_cuenta(cuenta.id, session)
        saldo_convertido, _ = convertir(saldo, cuenta.moneda, moneda_base, hoy, session)
        total += saldo_convertido
    return total
