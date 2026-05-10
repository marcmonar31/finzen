import json
import calendar
from datetime import date, timedelta
from decimal import Decimal
from typing import Dict, Any, List, Tuple
from sqlmodel import Session, select

from models.presupuesto import Presupuesto
from models.movimiento import Movimiento


def _periodo_fechas(periodo: str, modo: str, hoy: date) -> Tuple[date, date]:
    if modo == "flexible":
        dias = {"semanal": 7, "mensual": 30, "trimestral": 90, "anual": 365}.get(periodo, 30)
        return hoy - timedelta(days=dias), hoy

    # modo estricto
    if periodo == "mensual":
        inicio = hoy.replace(day=1)
        ultimo = calendar.monthrange(hoy.year, hoy.month)[1]
        fin = hoy.replace(day=ultimo)
    elif periodo == "semanal":
        inicio = hoy - timedelta(days=hoy.weekday())
        fin = inicio + timedelta(days=6)
    elif periodo == "trimestral":
        trimestre = (hoy.month - 1) // 3
        mes_inicio = trimestre * 3 + 1
        mes_fin = mes_inicio + 2
        inicio = date(hoy.year, mes_inicio, 1)
        ultimo = calendar.monthrange(hoy.year, mes_fin)[1]
        fin = date(hoy.year, mes_fin, ultimo)
    else:  # anual
        inicio = hoy.replace(month=1, day=1)
        fin = hoy.replace(month=12, day=31)

    return inicio, fin


def calcular_estado(presupuesto: Presupuesto, session: Session) -> Dict[str, Any]:
    hoy = date.today()
    fecha_inicio, fecha_fin = _periodo_fechas(presupuesto.periodo, presupuesto.modo, hoy)

    categoria_ids: List[str] = json.loads(presupuesto.categoria_ids or "[]")
    cuenta_ids: List[str] = json.loads(presupuesto.cuenta_ids or "[]")

    q = select(Movimiento).where(
        Movimiento.workspace_id == presupuesto.workspace_id,
        Movimiento.archivado_en.is_(None),  # type: ignore[union-attr]
        Movimiento.tipo == "gasto",
        Movimiento.fecha >= fecha_inicio,
        Movimiento.fecha <= fecha_fin,
    )
    if categoria_ids:
        q = q.where(Movimiento.categoria_id.in_(categoria_ids))  # type: ignore[union-attr]
    if cuenta_ids:
        q = q.where(Movimiento.cuenta_id.in_(cuenta_ids))  # type: ignore[union-attr]

    movimientos = session.exec(q).all()
    consumido = sum((Decimal(str(m.importe_base)) for m in movimientos), Decimal("0"))

    importe = presupuesto.importe
    porcentaje = float((consumido / importe * 100).quantize(Decimal("0.1"))) if importe > 0 else 0.0
    restante = importe - consumido

    if porcentaje >= 100:
        alerta = "superado"
    elif porcentaje >= 80:
        alerta = "advertencia"
    else:
        alerta = "ok"

    return {
        "consumido": str(consumido.quantize(Decimal("0.0001"))),
        "restante": str(restante.quantize(Decimal("0.0001"))),
        "porcentaje": porcentaje,
        "alerta": alerta,
        "fecha_inicio": str(fecha_inicio),
        "fecha_fin": str(fecha_fin),
    }
