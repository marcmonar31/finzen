from decimal import Decimal
from datetime import date
from unittest.mock import patch, MagicMock

import pytest


def test_convertir_misma_moneda(session):
    from services.conversion import convertir

    resultado, tasa = convertir(Decimal("100"), "EUR", "EUR", date(2024, 1, 15), session)
    assert resultado == Decimal("100")
    assert tasa == Decimal("1.0")


def test_convertir_desde_cache(session):
    from models.tipo_cambio import TipoCambio
    from services.conversion import convertir

    tc = TipoCambio(
        moneda_origen="USD",
        moneda_destino="EUR",
        tasa=Decimal("0.92000000"),
        fecha=date(2024, 1, 15),
    )
    session.add(tc)
    session.commit()

    resultado, tasa = convertir(Decimal("100"), "USD", "EUR", date(2024, 1, 15), session)
    assert tasa == Decimal("0.92000000")
    assert resultado == Decimal("92.0000")


def test_convertir_llama_api_y_cachea(session):
    from services.conversion import convertir
    from models.tipo_cambio import TipoCambio
    from sqlmodel import select

    mock_resp = MagicMock()
    mock_resp.json.return_value = {"rates": {"EUR": 0.92}}
    mock_resp.raise_for_status = MagicMock()

    with patch("services.conversion.httpx.get", return_value=mock_resp) as mock_get:
        resultado, tasa = convertir(Decimal("100"), "USD", "EUR", date(2024, 1, 16), session)

    mock_get.assert_called_once()
    assert tasa == Decimal("0.92")
    assert resultado == Decimal("92.0000")

    # Debe estar cacheado en BD
    cached = session.exec(
        select(TipoCambio).where(
            TipoCambio.moneda_origen == "USD",
            TipoCambio.moneda_destino == "EUR",
            TipoCambio.fecha == date(2024, 1, 16),
        )
    ).first()
    assert cached is not None
    assert cached.tasa == Decimal("0.92")


def test_convertir_api_falla_devuelve_fallback(session):
    from services.conversion import convertir

    with patch("services.conversion.httpx.get", side_effect=Exception("timeout")):
        resultado, tasa = convertir(Decimal("100"), "USD", "EUR", date(2024, 1, 17), session)

    assert tasa == Decimal("1.0")
    assert resultado == Decimal("100")


def test_segunda_llamada_usa_cache_sin_api(session):
    """La segunda llamada con la misma fecha no debe llamar a la API."""
    from services.conversion import convertir

    mock_resp = MagicMock()
    mock_resp.json.return_value = {"rates": {"EUR": 0.91}}
    mock_resp.raise_for_status = MagicMock()

    with patch("services.conversion.httpx.get", return_value=mock_resp) as mock_get:
        convertir(Decimal("100"), "GBP", "EUR", date(2024, 2, 1), session)
        # Segunda llamada
        convertir(Decimal("50"), "GBP", "EUR", date(2024, 2, 1), session)

    assert mock_get.call_count == 1
