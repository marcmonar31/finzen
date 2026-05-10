from decimal import Decimal
from typing import Dict, List, Optional
from sqlmodel import Session, select
from models.inversion import Activo, Posicion, PrecioActual


def calcular_pl_posicion(
    posicion: Posicion,
    precio_actual: Optional[Decimal],
) -> Dict:
    """P&L de una posición individual."""
    valor_coste = posicion.cantidad * posicion.precio_medio
    if precio_actual is not None:
        valor_actual = posicion.cantidad * precio_actual
        pl_absoluto = valor_actual - valor_coste
        pl_pct = (pl_absoluto / valor_coste * 100) if valor_coste != 0 else Decimal("0")
    else:
        valor_actual = valor_coste  # sin precio, asumimos sin cambio
        pl_absoluto = Decimal("0")
        pl_pct = Decimal("0")

    return {
        "valor_coste": str(valor_coste.quantize(Decimal("0.01"))),
        "valor_actual": str(valor_actual.quantize(Decimal("0.01"))),
        "pl_absoluto": str(pl_absoluto.quantize(Decimal("0.01"))),
        "pl_pct": str(pl_pct.quantize(Decimal("0.01"))),
    }


def resumen_cartera(workspace_id: str, session: Session) -> Dict:
    """P&L total de la cartera del workspace."""
    posiciones = session.exec(
        select(Posicion).where(
            Posicion.workspace_id == workspace_id,
            Posicion.activa == True,  # noqa: E712
        )
    ).all()

    total_coste = Decimal("0")
    total_actual = Decimal("0")
    desglose: List[Dict] = []

    for pos in posiciones:
        activo = session.get(Activo, pos.activo_id)
        if not activo:
            continue
        precio_row = session.exec(
            select(PrecioActual).where(PrecioActual.activo_id == pos.activo_id)
        ).first()
        precio = precio_row.precio if precio_row else None

        pl = calcular_pl_posicion(pos, precio)
        total_coste += Decimal(pl["valor_coste"])
        total_actual += Decimal(pl["valor_actual"])

        desglose.append({
            "posicion_id": pos.id,
            "activo_id": activo.id,
            "ticker": activo.ticker,
            "nombre": activo.nombre,
            "tipo": activo.tipo,
            "cantidad": str(pos.cantidad),
            "precio_medio": str(pos.precio_medio),
            "precio_actual": str(precio) if precio else None,
            "moneda": activo.moneda,
            "variacion_dia": str(precio_row.variacion_dia) if precio_row and precio_row.variacion_dia else None,
            "actualizado_en": precio_row.actualizado_en.isoformat() if precio_row else None,
            **pl,
        })

    pl_total = total_actual - total_coste
    pl_pct_total = (pl_total / total_coste * 100) if total_coste != 0 else Decimal("0")

    return {
        "total_coste": str(total_coste.quantize(Decimal("0.01"))),
        "total_actual": str(total_actual.quantize(Decimal("0.01"))),
        "pl_total": str(pl_total.quantize(Decimal("0.01"))),
        "pl_pct_total": str(pl_pct_total.quantize(Decimal("0.01"))),
        "posiciones": desglose,
    }
