from datetime import date, timedelta
from decimal import Decimal
from typing import Dict, List
from sqlmodel import Session, select
from models.movimiento import Movimiento
from models.presupuesto import Presupuesto
from models.cuenta import Cuenta
from models.deuda import Deuda
from services.saldos import saldo_cuenta


def calcular_salud_score(workspace_id: str, session: Session) -> Dict:
    """
    Score 0-100 basado en 5 factores. Devuelve el total y el desglose.
    """
    hoy = date.today()
    hace_30 = hoy - timedelta(days=30)
    hace_90 = hoy - timedelta(days=90)

    factores: List[Dict] = []

    # ── Factor 1: Tasa de ahorro (0-25 pts) ───────────────────────────────────
    # (ingresos - gastos) / ingresos de los últimos 30 días
    movs_30 = session.exec(
        select(Movimiento).where(
            Movimiento.workspace_id == workspace_id,
            Movimiento.fecha >= hace_30,
            Movimiento.archivado_en == None,  # noqa: E711
        )
    ).all()

    ingresos_30 = sum(m.importe_base for m in movs_30 if m.tipo == "ingreso")
    gastos_30 = sum(m.importe_base for m in movs_30 if m.tipo == "gasto")

    if ingresos_30 > 0:
        tasa_ahorro = (ingresos_30 - gastos_30) / ingresos_30
        pts_ahorro = min(25, int(float(tasa_ahorro) * 100))  # 25% ahorro = full pts
    else:
        tasa_ahorro = Decimal("0")
        pts_ahorro = 0

    factores.append({
        "nombre": "Tasa de ahorro",
        "descripcion": f"Ahorras el {max(0, float(tasa_ahorro) * 100):.0f}% de tus ingresos",
        "puntos": max(0, pts_ahorro),
        "max_puntos": 25,
    })

    # ── Factor 2: Presupuestos en verde (0-20 pts) ────────────────────────────
    presupuestos = session.exec(
        select(Presupuesto).where(
            Presupuesto.workspace_id == workspace_id,
            Presupuesto.activo == True,  # noqa: E712
        )
    ).all()

    if presupuestos:
        from services.presupuestos_calc import calcular_estado
        en_verde = sum(
            1 for p in presupuestos
            if calcular_estado(p, session)["alerta"] == "ok"
        )
        pts_presupuestos = int(20 * en_verde / len(presupuestos))
        desc_pres = f"{en_verde}/{len(presupuestos)} presupuestos en verde"
    else:
        pts_presupuestos = 10  # sin presupuestos = puntuación neutra
        desc_pres = "Sin presupuestos configurados"

    factores.append({
        "nombre": "Presupuestos",
        "descripcion": desc_pres,
        "puntos": pts_presupuestos,
        "max_puntos": 20,
    })

    # ── Factor 3: Consistencia de registro (0-15 pts) ─────────────────────────
    # Cuántos días distintos de los últimos 30 tienen al menos un movimiento
    fechas_con_movs = {m.fecha for m in movs_30}
    dias_activos = len(fechas_con_movs)
    pts_consistencia = min(15, dias_activos // 2)  # 30 días = full pts

    factores.append({
        "nombre": "Consistencia de registro",
        "descripcion": f"Registraste movimientos en {dias_activos} días este mes",
        "puntos": pts_consistencia,
        "max_puntos": 15,
    })

    # ── Factor 4: Fondo de emergencia (0-20 pts) ──────────────────────────────
    # Cuántos meses de gasto cubre el saldo actual
    cuentas = session.exec(
        select(Cuenta).where(
            Cuenta.workspace_id == workspace_id,
            Cuenta.archivado_en == None,  # noqa: E711
            Cuenta.incluir_en_patrimonio == True,  # noqa: E712
        )
    ).all()
    saldo_total = sum(saldo_cuenta(c.id, session) for c in cuentas)

    if gastos_30 > 0:
        meses_cobertura = float(saldo_total / gastos_30)
        if meses_cobertura >= 6:
            pts_emergencia = 20
        elif meses_cobertura >= 3:
            pts_emergencia = 14
        elif meses_cobertura >= 1:
            pts_emergencia = 7
        else:
            pts_emergencia = 0
        desc_emer = f"Tu saldo cubre {meses_cobertura:.1f} meses de gastos"
    else:
        pts_emergencia = 10
        desc_emer = "Sin gastos registrados este mes"

    factores.append({
        "nombre": "Fondo de emergencia",
        "descripcion": desc_emer,
        "puntos": pts_emergencia,
        "max_puntos": 20,
    })

    # ── Factor 5: Salud de deudas (0-20 pts) ──────────────────────────────────
    deudas = session.exec(
        select(Deuda).where(
            Deuda.workspace_id == workspace_id,
            Deuda.activa == True,  # noqa: E712
        )
    ).all()

    if not deudas:
        pts_deudas = 20
        desc_deudas = "Sin deudas registradas"
    else:
        total_deuda = sum(d.importe_total for d in deudas)
        if saldo_total > 0:
            ratio_deuda = float(total_deuda / saldo_total)
            if ratio_deuda <= 0.3:
                pts_deudas = 20
            elif ratio_deuda <= 0.6:
                pts_deudas = 12
            elif ratio_deuda <= 1.0:
                pts_deudas = 6
            else:
                pts_deudas = 0
        else:
            pts_deudas = 0
        desc_deudas = f"{len(deudas)} deuda(s) por {float(total_deuda):.0f}€"

    factores.append({
        "nombre": "Salud de deudas",
        "descripcion": desc_deudas,
        "puntos": pts_deudas,
        "max_puntos": 20,
    })

    score_total = sum(f["puntos"] for f in factores)

    if score_total >= 80:
        nivel = "excelente"
    elif score_total >= 60:
        nivel = "bueno"
    elif score_total >= 40:
        nivel = "regular"
    else:
        nivel = "mejorable"

    return {
        "score": score_total,
        "nivel": nivel,
        "factores": factores,
        "calculado_en": hoy.isoformat(),
    }
