"""
Obtiene precios de mercado de activos financieros.
- Acciones/ETFs → yfinance (Yahoo Finance, sin API key)
- Cripto → CoinGecko API pública gratuita
- Fallback: devuelve None si el servicio no está disponible
"""
import logging
from datetime import datetime
from decimal import Decimal
from typing import Optional, Tuple
import httpx

logger = logging.getLogger(__name__)

# CoinGecko ID map para tickers habituales
COINGECKO_IDS = {
    "BTC": "bitcoin", "ETH": "ethereum", "SOL": "solana",
    "ADA": "cardano", "DOT": "polkadot", "AVAX": "avalanche-2",
    "MATIC": "matic-network", "LINK": "chainlink", "UNI": "uniswap",
    "LTC": "litecoin", "XRP": "ripple", "DOGE": "dogecoin",
    "BNB": "binancecoin", "USDT": "tether", "USDC": "usd-coin",
}


def _ticker_es_cripto(ticker: str) -> bool:
    """Detecta si el ticker corresponde a cripto (ticker sin '-USD' o en la lista)."""
    ticker_upper = ticker.upper().replace("-USD", "").replace("-EUR", "")
    return ticker_upper in COINGECKO_IDS


def _precio_yfinance(ticker: str) -> Optional[Tuple[Decimal, str, Optional[Decimal]]]:
    """
    Devuelve (precio, moneda, variacion_dia_pct) o None si falla.
    variacion_dia_pct = (precio_actual - precio_apertura) / precio_apertura * 100
    """
    try:
        import yfinance as yf
        t = yf.Ticker(ticker)
        info = t.fast_info
        precio = info.last_price
        moneda = info.currency or "USD"
        open_price = getattr(info, "open", None) or getattr(info, "regular_market_open", None)
        variacion = None
        if open_price and open_price > 0 and precio:
            variacion = Decimal(str(round((precio - open_price) / open_price * 100, 2)))
        return Decimal(str(round(precio, 4))), moneda, variacion
    except Exception as e:
        logger.warning(f"yfinance fallo para {ticker}: {e}")
        return None


def _precio_coingecko(ticker: str) -> Optional[Tuple[Decimal, str, Optional[Decimal]]]:
    """
    Devuelve (precio_usd, 'USD', variacion_24h_pct) o None si falla.
    Usa la API pública de CoinGecko (sin key, rate-limited).
    """
    coin_id = COINGECKO_IDS.get(ticker.upper().replace("-USD", ""))
    if not coin_id:
        return None
    try:
        url = f"https://api.coingecko.com/api/v3/simple/price?ids={coin_id}&vs_currencies=usd&include_24hr_change=true"
        r = httpx.get(url, timeout=5.0)
        data = r.json().get(coin_id, {})
        precio = data.get("usd")
        if not precio:
            return None
        variacion = data.get("usd_24h_change")
        return (
            Decimal(str(round(precio, 4))),
            "USD",
            Decimal(str(round(variacion, 2))) if variacion is not None else None,
        )
    except Exception as e:
        logger.warning(f"CoinGecko fallo para {ticker}: {e}")
        return None


def obtener_precio(ticker: str, tipo: str) -> Optional[Tuple[Decimal, str, Optional[Decimal]]]:
    """
    Punto de entrada principal. Selecciona la fuente según el tipo.
    Retorna (precio, moneda, variacion_dia_pct) o None.
    """
    if tipo == "cripto" or _ticker_es_cripto(ticker):
        result = _precio_coingecko(ticker)
        if result:
            return result
    # Para cualquier tipo (incluyendo cripto con formato ticker-USD) → yfinance
    return _precio_yfinance(ticker)
