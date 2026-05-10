import re
from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal
from typing import Dict, List
from sqlmodel import Session, select
from models.movimiento import Movimiento


def _normalizar(concepto: str) -> str:
    """Lowercase, quita números y caracteres raros, colapsa espacios."""
    s = concepto.lower()
    s = re.sub(r"[0-9]", "", s)
    s = re.sub(r"[^a-záéíóúüñ\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def detectar_suscripciones(workspace_id: str, session: Session) -> List[Dict]:
    """
    Detecta pagos con mismo concepto normalizado, mismo importe (±5%) y cadencia
    aproximadamente mensual (entre 25 y 35 días). Mínimo 2 ocurrencias.
    """
    hace_6m = date.today() - timedelta(days=180)
    movimientos = session.exec(
        select(Movimiento).where(
            Movimiento.workspace_id == workspace_id,
            Movimiento.tipo == "gasto",
            Movimiento.fecha >= hace_6m,
            Movimiento.archivado_en == None,  # noqa: E711
        ).order_by(Movimiento.fecha)  # type: ignore[arg-type]
    ).all()

    grupos: Dict[str, List[Movimiento]] = defaultdict(list)
    for m in movimientos:
        key = _normalizar(m.concepto)
        if key:
            grupos[key].append(m)

    resultados = []
    for concepto_norm, movs in grupos.items():
        if len(movs) < 2:
            continue

        # Verificar cadencia mensual: diferencias entre fechas consecutivas 25-35 días
        fechas = sorted(m.fecha for m in movs)
        diferencias = [(fechas[i + 1] - fechas[i]).days for i in range(len(fechas) - 1)]
        cadencia_mensual = all(25 <= d <= 35 for d in diferencias)
        if not cadencia_mensual:
            continue

        # Verificar importe consistente (±5%)
        importes = [m.importe_base for m in movs]
        media = sum(importes) / len(importes)
        consistente = all(abs(imp - media) / media <= Decimal("0.05") for imp in importes)
        if not consistente:
            continue

        resultados.append({
            "concepto": movs[-1].concepto,
            "concepto_normalizado": concepto_norm,
            "importe_medio": str(media.quantize(Decimal("0.01"))),
            "moneda": movs[-1].moneda,
            "num_ocurrencias": len(movs),
            "ultima_fecha": movs[-1].fecha.isoformat(),
            "categoria_id": movs[-1].categoria_id,
        })

    return sorted(resultados, key=lambda x: float(x["importe_medio"]), reverse=True)


def detectar_gastos_hormiga(workspace_id: str, session: Session) -> List[Dict]:
    """
    Detecta conceptos normalizados con importes pequeños (< 15€) que aparecen
    3 o más veces en un mes. Representa hábitos de gasto pequeño pero recurrente.
    """
    UMBRAL_IMPORTE = Decimal("15")
    UMBRAL_FRECUENCIA = 3
    hace_30 = date.today() - timedelta(days=30)

    movimientos = session.exec(
        select(Movimiento).where(
            Movimiento.workspace_id == workspace_id,
            Movimiento.tipo == "gasto",
            Movimiento.fecha >= hace_30,
            Movimiento.importe_base <= UMBRAL_IMPORTE,
            Movimiento.archivado_en == None,  # noqa: E711
        )
    ).all()

    grupos: Dict[str, List[Movimiento]] = defaultdict(list)
    for m in movimientos:
        key = _normalizar(m.concepto)
        if key:
            grupos[key].append(m)

    resultados = []
    for concepto_norm, movs in grupos.items():
        if len(movs) < UMBRAL_FRECUENCIA:
            continue
        total = sum(m.importe_base for m in movs)
        resultados.append({
            "concepto": movs[0].concepto,
            "concepto_normalizado": concepto_norm,
            "num_ocurrencias_mes": len(movs),
            "total_mes": str(total.quantize(Decimal("0.01"))),
            "importe_medio": str((total / len(movs)).quantize(Decimal("0.01"))),
            "moneda": movs[0].moneda,
        })

    return sorted(resultados, key=lambda x: float(x["total_mes"]), reverse=True)


def detectar_anomalias(workspace_id: str, session: Session) -> List[Dict]:
    """
    Detecta movimientos de gasto cuyo importe_base sea >= 3× la media de su categoría
    en los últimos 90 días.
    """
    FACTOR = Decimal("3")
    hoy = date.today()
    hace_90 = hoy - timedelta(days=90)
    hace_7 = hoy - timedelta(days=7)

    movimientos = session.exec(
        select(Movimiento).where(
            Movimiento.workspace_id == workspace_id,
            Movimiento.tipo == "gasto",
            Movimiento.fecha >= hace_90,
            Movimiento.archivado_en == None,  # noqa: E711
        ).order_by(Movimiento.fecha.desc())  # type: ignore[arg-type]
    ).all()

    # Agrupar por categoría y calcular media
    por_categoria: Dict[str, List[Decimal]] = defaultdict(list)
    for m in movimientos:
        key = m.categoria_id or "__sin_categoria__"
        por_categoria[key].append(m.importe_base)

    medias: Dict[str, Decimal] = {}
    for cat, importes in por_categoria.items():
        medias[cat] = sum(importes) / len(importes)

    resultados = []
    for m in movimientos:
        if m.fecha < hace_7:
            continue  # solo anomalías recientes (última semana)
        key = m.categoria_id or "__sin_categoria__"
        media = medias.get(key, Decimal("0"))
        if media > 0 and m.importe_base >= media * FACTOR:
            resultados.append({
                "movimiento_id": m.id,
                "concepto": m.concepto,
                "importe": str(m.importe),
                "moneda": m.moneda,
                "importe_base": str(m.importe_base.quantize(Decimal("0.01"))),
                "media_categoria": str(media.quantize(Decimal("0.01"))),
                "factor": str((m.importe_base / media).quantize(Decimal("0.01"))),
                "fecha": m.fecha.isoformat(),
                "categoria_id": m.categoria_id,
            })

    return resultados
