from datetime import date, timedelta
from decimal import Decimal
from typing import Dict, List, Optional
from sqlmodel import Session, select
from models.movimiento import Movimiento
from models.recurrente import Recurrente
from models.cuenta import Cuenta
from services.saldos import saldo_cuenta


def predecir_saldo(
    workspace_id: str,
    session: Session,
    cuenta_id: Optional[str] = None,
    dias: int = 90,
) -> List[Dict]:
    """
    Proyecta el saldo a 30, 60 y 90 días (o los horizontes que entren en `dias`).
    Combina saldo actual + recurrentes pendientes + media diaria de gasto libre.
    """
    hoy = date.today()

    # Saldo base
    if cuenta_id:
        cuentas = [session.get(Cuenta, cuenta_id)]
        saldo_base = saldo_cuenta(cuenta_id, session)
    else:
        cuentas_q = session.exec(
            select(Cuenta).where(
                Cuenta.workspace_id == workspace_id,
                Cuenta.archivado_en == None,  # noqa: E711
                Cuenta.incluir_en_patrimonio == True,  # noqa: E712
            )
        ).all()
        saldo_base = sum(saldo_cuenta(c.id, session) for c in cuentas_q)

    # Media diaria de gasto libre (últimos 60 días, sin transferencias ni recurrentes)
    hace_60 = hoy - timedelta(days=60)
    movs_recientes = session.exec(
        select(Movimiento).where(
            Movimiento.workspace_id == workspace_id,
            Movimiento.fecha >= hace_60,
            Movimiento.fecha <= hoy,
            Movimiento.archivado_en == None,  # noqa: E711
            Movimiento.tipo == "gasto",
        )
    ).all()
    if cuenta_id:
        movs_recientes = [m for m in movs_recientes if m.cuenta_id == cuenta_id]

    total_gasto_libre = sum(m.importe_base for m in movs_recientes)
    media_diaria_gasto = total_gasto_libre / 60 if movs_recientes else Decimal("0")

    # Recurrentes activos en el horizonte
    recurrentes = session.exec(
        select(Recurrente).where(
            Recurrente.workspace_id == workspace_id,
            Recurrente.activo == True,  # noqa: E712
        )
    ).all()

    horizontes = [h for h in [30, 60, 90] if h <= dias]
    resultados = []

    for h in horizontes:
        fecha_horizonte = hoy + timedelta(days=h)
        impacto_recurrentes = Decimal("0")

        for rec in recurrentes:
            if cuenta_id and rec.cuenta_id != cuenta_id:
                continue
            proxima = rec.proxima_ejecucion
            while proxima <= fecha_horizonte:
                importe_base = rec.importe  # approx — ya está en moneda base si coincide
                if rec.tipo == "ingreso":
                    impacto_recurrentes += importe_base
                else:
                    impacto_recurrentes -= importe_base
                # avanzar según frecuencia
                if rec.frecuencia == "diario":
                    proxima = proxima + timedelta(days=1)
                elif rec.frecuencia == "semanal":
                    proxima = proxima + timedelta(weeks=1)
                elif rec.frecuencia == "mensual":
                    mes = proxima.month + 1
                    anio = proxima.year + (mes - 1) // 12
                    mes = ((mes - 1) % 12) + 1
                    proxima = proxima.replace(year=anio, month=mes)
                elif rec.frecuencia == "anual":
                    proxima = proxima.replace(year=proxima.year + 1)
                else:
                    break

        gasto_proyectado = media_diaria_gasto * h
        saldo_proyectado = saldo_base + impacto_recurrentes - gasto_proyectado

        resultados.append({
            "dias": h,
            "fecha": (hoy + timedelta(days=h)).isoformat(),
            "saldo_proyectado": str(saldo_proyectado.quantize(Decimal("0.01"))),
            "impacto_recurrentes": str(impacto_recurrentes.quantize(Decimal("0.01"))),
            "gasto_proyectado": str(gasto_proyectado.quantize(Decimal("0.01"))),
        })

    return resultados
