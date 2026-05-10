from decimal import Decimal


def convertir(importe: Decimal, moneda_origen: str, moneda_destino: str) -> tuple[Decimal, Decimal]:
    """
    Placeholder Bloque 2 — tasa 1.0 siempre.
    En Bloque 3 se implementa con exchangerate.host.
    Devuelve (importe_convertido, tasa_usada).
    """
    if moneda_origen == moneda_destino:
        return importe, Decimal("1.0")
    return importe, Decimal("1.0")
