"""Shared field validators reusable across Pydantic schemas."""

# Common ISO 4217 currency codes accepted by the app.
# Kept deliberately broad to support multi-currency workspaces worldwide.
MONEDAS_VALIDAS = {
    "EUR", "USD", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD",
    "CNY", "HKD", "SGD", "SEK", "NOK", "DKK", "PLN", "CZK",
    "HUF", "RON", "BGN", "HRK", "TRY", "ILS", "ZAR", "BRL",
    "MXN", "ARS", "CLP", "COP", "PEN", "INR", "THB", "IDR",
    "MYR", "PHP", "VND", "KRW", "TWD", "AED", "SAR", "KWD",
    "QAR", "BHD", "OMR", "EGP", "MAD", "TND", "NGN", "KES",
    "UAH", "RUB", "PKR", "BDT", "LKR", "NPR",
}


def validar_moneda(v: str) -> str:
    code = v.strip().upper()
    if code not in MONEDAS_VALIDAS:
        raise ValueError(
            f"Moneda '{v}' no reconocida. Usa un código ISO 4217 válido (ej: EUR, USD, GBP)."
        )
    return code
