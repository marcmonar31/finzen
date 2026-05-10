import calendar
from datetime import date, timedelta
from typing import Optional


def calcular_proxima_ejecucion(
    frecuencia: str,
    desde: date,
    dia_mes: Optional[int] = None,
) -> date:
    if frecuencia == "diario":
        return desde + timedelta(days=1)

    if frecuencia == "semanal":
        return desde + timedelta(weeks=1)

    if frecuencia == "mensual":
        dia = dia_mes or desde.day
        mes = desde.month + 1
        año = desde.year
        if mes > 12:
            mes = 1
            año += 1
        ultimo_dia = calendar.monthrange(año, mes)[1]
        return date(año, mes, min(dia, ultimo_dia))

    if frecuencia == "anual":
        try:
            return desde.replace(year=desde.year + 1)
        except ValueError:
            return date(desde.year + 1, desde.month, 28)

    return desde + timedelta(days=30)
