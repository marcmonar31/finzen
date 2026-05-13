from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

from schemas.movimiento import MovimientoOut
from schemas.validators import validar_moneda

_MAX_IMPORTE = Decimal("99999999999999.9999")


def _validar_concepto(v: str) -> str:
    stripped = v.strip()
    if not stripped:
        raise ValueError("El concepto no puede estar vacío")
    if len(stripped) > 200:
        raise ValueError("El concepto no puede superar 200 caracteres")
    return stripped


def _validar_importe_positivo(v: Decimal, nombre: str = "importe") -> Decimal:
    if v <= 0:
        raise ValueError(f"El {nombre} debe ser mayor que 0")
    if v > _MAX_IMPORTE:
        raise ValueError(f"El {nombre} no puede superar {_MAX_IMPORTE}")
    return v


def _validar_fecha(v: date) -> date:
    if v > date.today() + timedelta(days=366):
        raise ValueError("La fecha no puede ser más de 1 año en el futuro")
    return v


class TransferenciaCreate(BaseModel):
    cuenta_origen_id: str
    cuenta_destino_id: str
    importe_origen: Decimal
    importe_destino: Optional[Decimal] = None
    fecha: date
    concepto: str = "Transferencia"
    notas: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("importe_origen")
    @classmethod
    def importe_origen_valido(cls, v: Decimal) -> Decimal:
        return _validar_importe_positivo(v, "importe")

    @field_validator("importe_destino")
    @classmethod
    def importe_destino_valido(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is None:
            return v
        return _validar_importe_positivo(v, "importe destino")

    @field_validator("concepto")
    @classmethod
    def concepto_valido(cls, v: str) -> str:
        return _validar_concepto(v)

    @field_validator("fecha")
    @classmethod
    def fecha_no_muy_futura(cls, v: date) -> date:
        return _validar_fecha(v)


class TransferenciaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    movimiento_origen_id: str
    movimiento_destino_id: str
    creado_en: datetime
    movimiento_origen: Optional[MovimientoOut] = None
    movimiento_destino: Optional[MovimientoOut] = None
