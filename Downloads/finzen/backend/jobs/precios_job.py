"""Job semanal que actualiza precios de activos de inversión."""
import logging
from datetime import datetime
from sqlmodel import Session, select
from database import get_session_sync
from models.inversion import Activo, PrecioActual
from services.precios_inversion import obtener_precio

logger = logging.getLogger(__name__)


def actualizar_precios():
    """Actualiza el precio más reciente de todos los activos."""
    session: Session = get_session_sync()
    try:
        activos = session.exec(select(Activo)).all()
        actualizados = 0
        for activo in activos:
            resultado = obtener_precio(activo.ticker, activo.tipo)
            if not resultado:
                continue
            precio, moneda, variacion = resultado

            precio_row = session.exec(
                select(PrecioActual).where(PrecioActual.activo_id == activo.id)
            ).first()

            if precio_row:
                precio_row.precio = precio
                precio_row.moneda = moneda
                precio_row.variacion_dia = variacion
                precio_row.actualizado_en = datetime.utcnow()
                session.add(precio_row)
            else:
                session.add(PrecioActual(
                    activo_id=activo.id,
                    precio=precio,
                    moneda=moneda,
                    variacion_dia=variacion,
                ))
            actualizados += 1

        session.commit()
        logger.info(f"Precios actualizados: {actualizados}/{len(activos)} activos")
    except Exception as e:
        logger.error(f"Error actualizando precios: {e}")
        session.rollback()
    finally:
        session.close()
