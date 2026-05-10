from decimal import Decimal
from typing import Dict, List, Optional, Tuple

from sqlmodel import Session, select

from models.grupo import GastoCompartido, GastoReparto, GrupoMiembro, Liquidacion


def calcular_balance_grupo(grupo_id: str, session: Session) -> Dict[str, Decimal]:
    """
    Retorna balance por miembro_id:
      >0  → le deben ese importe
      <0  → debe ese importe a otros
    Usa importe_convertido (moneda_principal del grupo) para comparaciones homogéneas.
    """
    miembros = session.exec(
        select(GrupoMiembro).where(GrupoMiembro.grupo_id == grupo_id)
    ).all()
    balance: Dict[str, Decimal] = {m.id: Decimal("0") for m in miembros}

    gastos = session.exec(
        select(GastoCompartido).where(
            GastoCompartido.grupo_id == grupo_id,
            GastoCompartido.archivado_en == None,  # noqa: E711
        )
    ).all()

    for gasto in gastos:
        if gasto.pagador_id in balance:
            balance[gasto.pagador_id] += gasto.importe_convertido

        repartos = session.exec(
            select(GastoReparto).where(GastoReparto.gasto_id == gasto.id)
        ).all()
        for reparto in repartos:
            if reparto.miembro_id in balance:
                balance[reparto.miembro_id] -= reparto.importe_asignado

    liquidaciones = session.exec(
        select(Liquidacion).where(
            Liquidacion.grupo_id == grupo_id,
            Liquidacion.estado == "confirmada",
        )
    ).all()
    for liq in liquidaciones:
        if liq.de_miembro_id in balance:
            balance[liq.de_miembro_id] += liq.importe
        if liq.a_miembro_id in balance:
            balance[liq.a_miembro_id] -= liq.importe

    # Redondear para evitar ruido de Decimal
    return {k: v.quantize(Decimal("0.0001")) for k, v in balance.items()}


def transferencias_optimas(
    balance: Dict[str, Decimal],
) -> List[Dict[str, object]]:
    """
    Algoritmo greedy O(n log n).
    Devuelve el mínimo número de transferencias para que todos queden a 0.
    """
    deudores: List[Tuple[str, Decimal]] = sorted(
        [(uid, -bal) for uid, bal in balance.items() if bal < Decimal("0")],
        key=lambda x: -x[1],
    )
    acreedores: List[Tuple[str, Decimal]] = sorted(
        [(uid, bal) for uid, bal in balance.items() if bal > Decimal("0")],
        key=lambda x: -x[1],
    )

    transferencias = []
    while deudores and acreedores:
        deudor_id, deuda = deudores[0]
        acreedor_id, credito = acreedores[0]

        importe = min(deuda, credito)
        transferencias.append({"de": deudor_id, "a": acreedor_id, "importe": importe})

        if deuda > credito:
            deudores[0] = (deudor_id, deuda - credito)
            acreedores.pop(0)
        elif credito > deuda:
            acreedores[0] = (acreedor_id, credito - deuda)
            deudores.pop(0)
        else:
            deudores.pop(0)
            acreedores.pop(0)

    return transferencias


def calcular_repartos(
    importe: Decimal,
    miembro_ids: List[str],
    modo: str,
    porcentajes: Optional[Dict[str, Decimal]] = None,
    partes: Optional[Dict[str, int]] = None,
    montos_manuales: Optional[Dict[str, Decimal]] = None,
) -> Dict[str, Decimal]:
    """
    Calcula cuánto le corresponde a cada miembro.
    Retorna {miembro_id: importe_asignado}.
    Garantiza que la suma == importe (ajusta el último centavo).
    """
    if not miembro_ids:
        return {}

    n = len(miembro_ids)
    result: Dict[str, Decimal] = {}

    if modo == "igualitario":
        base = (importe / n).quantize(Decimal("0.0001"))
        for mid in miembro_ids:
            result[mid] = base
        # Ajustar residuo en el último
        diferencia = importe - sum(result.values())
        result[miembro_ids[-1]] += diferencia

    elif modo == "porcentajes" and porcentajes:
        for mid in miembro_ids:
            pct = porcentajes.get(mid, Decimal("0"))
            result[mid] = (importe * pct / Decimal("100")).quantize(Decimal("0.0001"))
        diferencia = importe - sum(result.values())
        result[miembro_ids[-1]] += diferencia

    elif modo == "partes" and partes:
        total_partes = Decimal(sum(partes.get(mid, 1) for mid in miembro_ids))
        for mid in miembro_ids:
            p = Decimal(partes.get(mid, 1))
            result[mid] = (importe * p / total_partes).quantize(Decimal("0.0001"))
        diferencia = importe - sum(result.values())
        result[miembro_ids[-1]] += diferencia

    elif modo == "manual" and montos_manuales:
        result = {mid: montos_manuales.get(mid, Decimal("0")) for mid in miembro_ids}

    else:
        # Fallback igualitario
        base = (importe / n).quantize(Decimal("0.0001"))
        for mid in miembro_ids:
            result[mid] = base
        diferencia = importe - sum(result.values())
        result[miembro_ids[-1]] += diferencia

    return result
