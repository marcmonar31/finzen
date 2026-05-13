"""Cierre mensual: resumen financiero de un mes."""
from calendar import monthrange
from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from database import get_session
from deps import get_current_workspace
from models.categoria import Categoria
from models.movimiento import Movimiento
from models.workspace import Workspace

router = APIRouter(prefix="/cierre", tags=["cierre"])


@router.get("/{anio}/{mes}")
def cierre_mensual(
    anio: int,
    mes: int,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    """Resumen financiero de un mes: ingresos, gastos, balance, top categorías."""
    if mes < 1 or mes > 12:
        raise HTTPException(400, "El mes debe estar entre 1 y 12")
    if anio < 1900 or anio > 2100:
        raise HTTPException(400, "El año debe estar entre 1900 y 2100")
    fecha_inicio = date(anio, mes, 1)
    ultimo_dia = monthrange(anio, mes)[1]
    fecha_fin = date(anio, mes, ultimo_dia)

    movimientos = session.exec(
        select(Movimiento).where(
            Movimiento.workspace_id == workspace.id,
            Movimiento.fecha >= fecha_inicio,
            Movimiento.fecha <= fecha_fin,
            Movimiento.archivado_en.is_(None),  # type: ignore[union-attr]
        )
    ).all()

    ingresos = Decimal("0")
    gastos = Decimal("0")
    por_categoria: dict[str, Decimal] = {}

    for m in movimientos:
        if m.tipo == "ingreso":
            ingresos += m.importe_base
        elif m.tipo == "gasto":
            gastos += m.importe_base
            cat_id = m.categoria_id or "__sin_categoria__"
            por_categoria[cat_id] = por_categoria.get(cat_id, Decimal("0")) + m.importe_base

    # Enriquecer con nombres de categoría
    top_categorias = []
    for cat_id, total in sorted(por_categoria.items(), key=lambda x: x[1], reverse=True)[:5]:
        nombre = cat_id
        if cat_id != "__sin_categoria__":
            cat = session.get(Categoria, cat_id)
            nombre = cat.nombre if cat else cat_id
        top_categorias.append({
            "categoria_id": cat_id if cat_id != "__sin_categoria__" else None,
            "nombre": nombre,
            "total": str(total.quantize(Decimal("0.01"))),
            "pct": str((total / gastos * 100).quantize(Decimal("0.1"))) if gastos else "0.0",
        })

    # Mes anterior para comparación
    mes_ant = mes - 1 if mes > 1 else 12
    anio_ant = anio if mes > 1 else anio - 1
    fecha_ini_ant = date(anio_ant, mes_ant, 1)
    ultimo_dia_ant = monthrange(anio_ant, mes_ant)[1]
    fecha_fin_ant = date(anio_ant, mes_ant, ultimo_dia_ant)

    movs_ant = session.exec(
        select(Movimiento).where(
            Movimiento.workspace_id == workspace.id,
            Movimiento.fecha >= fecha_ini_ant,
            Movimiento.fecha <= fecha_fin_ant,
            Movimiento.archivado_en.is_(None),  # type: ignore[union-attr]
        )
    ).all()

    gastos_ant = sum(m.importe_base for m in movs_ant if m.tipo == "gasto") or Decimal("0")
    ingresos_ant = sum(m.importe_base for m in movs_ant if m.tipo == "ingreso") or Decimal("0")

    balance = ingresos - gastos
    tasa_ahorro = (balance / ingresos * 100) if ingresos > 0 else Decimal("0")
    var_gastos = ((gastos - gastos_ant) / gastos_ant * 100) if gastos_ant > 0 else None
    var_ingresos = ((ingresos - ingresos_ant) / ingresos_ant * 100) if ingresos_ant > 0 else None

    return {
        "anio": anio,
        "mes": mes,
        "ingresos": str(ingresos.quantize(Decimal("0.01"))),
        "gastos": str(gastos.quantize(Decimal("0.01"))),
        "balance": str(balance.quantize(Decimal("0.01"))),
        "tasa_ahorro": str(tasa_ahorro.quantize(Decimal("0.1"))),
        "num_movimientos": len(movimientos),
        "top_categorias": top_categorias,
        "vs_mes_anterior": {
            "gastos_anterior": str(gastos_ant.quantize(Decimal("0.01"))),
            "ingresos_anterior": str(ingresos_ant.quantize(Decimal("0.01"))),
            "variacion_gastos_pct": str(var_gastos.quantize(Decimal("0.1"))) if var_gastos is not None else None,
            "variacion_ingresos_pct": str(var_ingresos.quantize(Decimal("0.1"))) if var_ingresos is not None else None,
        },
    }
