import logging
from datetime import date
from sqlmodel import Session, select

from database import engine
from models.cuenta import Cuenta
from models.workspace import Workspace
from models.tipo_cambio import TipoCambio
from services.conversion import _fetch_tasa_api

logger = logging.getLogger(__name__)


def actualizar_tipos_cambio() -> None:
    """Job diario: actualiza tipos de cambio para monedas en uso en cada workspace."""
    today = date.today()

    with Session(engine) as session:
        workspaces = session.exec(select(Workspace)).all()

        for ws in workspaces:
            cuentas = session.exec(
                select(Cuenta).where(
                    Cuenta.workspace_id == ws.id,
                    Cuenta.archivado_en.is_(None),  # type: ignore[union-attr]
                )
            ).all()

            monedas = {c.moneda for c in cuentas} - {ws.moneda_base}

            for moneda in monedas:
                ya_existe = session.exec(
                    select(TipoCambio).where(
                        TipoCambio.moneda_origen == moneda,
                        TipoCambio.moneda_destino == ws.moneda_base,
                        TipoCambio.fecha == today,
                    )
                ).first()

                if ya_existe:
                    continue

                tasa = _fetch_tasa_api(moneda, ws.moneda_base, today)
                if tasa is not None:
                    session.add(
                        TipoCambio(
                            moneda_origen=moneda,
                            moneda_destino=ws.moneda_base,
                            tasa=tasa,
                            fecha=today,
                        )
                    )
                    logger.info(f"Tasa actualizada {moneda}/{ws.moneda_base}: {tasa}")

        session.commit()
