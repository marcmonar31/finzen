import logging
from datetime import date
from typing import Optional
from sqlmodel import Session, select

from database import engine
from models.recurrente import Recurrente
from models.movimiento import Movimiento
from models.workspace import Workspace
from services.conversion import convertir
from services.recurrentes_svc import calcular_proxima_ejecucion

logger = logging.getLogger(__name__)

MAX_ITER_POR_RECURRENTE = 24


def ejecutar_recurrentes(session: Optional[Session] = None) -> int:
    """Ejecuta recurrentes pendientes. Devuelve el número de movimientos creados.

    Si se pasa `session`, la usa directamente (útil en tests). Si no, abre una sesión
    propia sobre el engine de producción.
    """
    if session is not None:
        return _run(session)

    with Session(engine) as s:
        return _run(s)


def _run(session: Session) -> int:
    hoy = date.today()
    creados = 0

    pendientes = session.exec(
        select(Recurrente).where(
            Recurrente.activo == True,  # noqa: E712
            Recurrente.archivado_en.is_(None),  # type: ignore[union-attr]
            Recurrente.proxima_ejecucion <= hoy,
        )
    ).all()

    for rec in pendientes:
        ws = session.get(Workspace, rec.workspace_id)
        if not ws:
            continue

        iteraciones = 0
        while rec.proxima_ejecucion <= hoy and iteraciones < MAX_ITER_POR_RECURRENTE:
            iteraciones += 1
            importe_base, tasa = convertir(
                rec.importe, rec.moneda, ws.moneda_base, rec.proxima_ejecucion, session
            )
            mov = Movimiento(
                workspace_id=rec.workspace_id,
                cuenta_id=rec.cuenta_id,
                tipo=rec.tipo,
                importe=rec.importe,
                moneda=rec.moneda,
                importe_base=importe_base,
                tasa_cambio=tasa,
                fecha=rec.proxima_ejecucion,
                categoria_id=rec.categoria_id,
                concepto=rec.nombre,
                notas=rec.notas,
                fuente="recurrente",
                fuente_id=rec.id,
                estado="confirmado",
                creado_por=ws.owner_id,
            )
            session.add(mov)
            rec.proxima_ejecucion = calcular_proxima_ejecucion(
                rec.frecuencia, rec.proxima_ejecucion, rec.dia_mes
            )
            creados += 1

        session.add(rec)

    session.commit()
    logger.info(f"Recurrentes ejecutados: {creados} movimientos creados")
    return creados
