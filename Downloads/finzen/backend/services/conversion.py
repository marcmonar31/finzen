from decimal import Decimal
from datetime import date
from typing import Optional, Tuple
import httpx
from sqlmodel import Session, select


def _fetch_tasa_api(moneda_origen: str, moneda_destino: str, fecha: date) -> Optional[Decimal]:
    """Fetch exchange rate from Frankfurter API (free, no key needed)."""
    try:
        r = httpx.get(
            f"https://api.frankfurter.app/{fecha.isoformat()}",
            params={"from": moneda_origen, "to": moneda_destino},
            timeout=5.0,
        )
        r.raise_for_status()
        data = r.json()
        rates = data.get("rates", {})
        if moneda_destino in rates:
            return Decimal(str(rates[moneda_destino]))
    except Exception:
        pass
    return None


def obtener_tasa(
    moneda_origen: str,
    moneda_destino: str,
    fecha: date,
    session: Session,
) -> Decimal:
    from models.tipo_cambio import TipoCambio

    cached = session.exec(
        select(TipoCambio).where(
            TipoCambio.moneda_origen == moneda_origen,
            TipoCambio.moneda_destino == moneda_destino,
            TipoCambio.fecha == fecha,
        )
    ).first()
    if cached:
        return cached.tasa

    tasa = _fetch_tasa_api(moneda_origen, moneda_destino, fecha)
    if tasa is not None:
        tc = TipoCambio(
            moneda_origen=moneda_origen,
            moneda_destino=moneda_destino,
            tasa=tasa,
            fecha=fecha,
        )
        session.add(tc)
        session.commit()
        return tasa

    return Decimal("1.0")


def convertir(
    importe: Decimal,
    moneda_origen: str,
    moneda_destino: str,
    fecha: date,
    session: Session,
) -> Tuple[Decimal, Decimal]:
    """Returns (importe_convertido, tasa_usada)."""
    if moneda_origen == moneda_destino:
        return importe, Decimal("1.0")
    tasa = obtener_tasa(moneda_origen, moneda_destino, fecha, session)
    importe_convertido = (importe * tasa).quantize(Decimal("0.0001"))
    return importe_convertido, tasa
