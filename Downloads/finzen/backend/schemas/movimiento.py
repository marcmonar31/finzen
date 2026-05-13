from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field, field_validator
from schemas.validators import validar_moneda

TIPOS_MOVIMIENTO = ("ingreso", "gasto", "transferencia_origen", "transferencia_destino", "ajuste")

_MAX_IMPORTE = Decimal("99999999999999.9999")


def _validar_tipo(v: str) -> str:
    if v not in TIPOS_MOVIMIENTO:
        raise ValueError(f"tipo debe ser uno de {TIPOS_MOVIMIENTO}")
    return v


def _validar_concepto(v: str) -> str:
    stripped = v.strip()
    if not stripped:
        raise ValueError("El concepto no puede estar vacío")
    if len(stripped) > 200:
        raise ValueError("El concepto no puede superar 200 caracteres")
    return stripped


def _validar_importe(v: Decimal) -> Decimal:
    if v <= 0:
        raise ValueError("El importe debe ser mayor que 0")
    if v > _MAX_IMPORTE:
        raise ValueError(f"El importe no puede superar {_MAX_IMPORTE}")
    return v


def _validar_fecha(v: date) -> date:
    if v > date.today() + timedelta(days=366):
        raise ValueError("La fecha no puede ser más de 1 año en el futuro")
    return v


class MovimientoCreate(BaseModel):
    cuenta_id: str
    tipo: str
    importe: Decimal
    moneda: str
    fecha: date
    categoria_id: Optional[str] = None
    concepto: str
    notas: Optional[str] = Field(default=None, max_length=1000)
    etiqueta_ids: List[str] = []

    @field_validator("importe")
    @classmethod
    def importe_valido(cls, v: Decimal) -> Decimal:
        return _validar_importe(v)

    @field_validator("tipo")
    @classmethod
    def tipo_valido(cls, v: str) -> str:
        return _validar_tipo(v)

    @field_validator("moneda")
    @classmethod
    def moneda_valida(cls, v: str) -> str:
        return validar_moneda(v)

    @field_validator("fecha")
    @classmethod
    def fecha_no_muy_futura(cls, v: date) -> date:
        return _validar_fecha(v)

    @field_validator("concepto")
    @classmethod
    def concepto_valido(cls, v: str) -> str:
        return _validar_concepto(v)


class MovimientoUpdate(BaseModel):
    tipo: Optional[str] = None
    importe: Optional[Decimal] = None
    moneda: Optional[str] = None
    fecha: Optional[date] = None
    categoria_id: Optional[str] = None
    concepto: Optional[str] = None
    notas: Optional[str] = Field(default=None, max_length=1000)
    etiqueta_ids: Optional[List[str]] = None

    @field_validator("importe")
    @classmethod
    def importe_valido(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is None:
            return v
        return _validar_importe(v)

    @field_validator("tipo")
    @classmethod
    def tipo_valido(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return _validar_tipo(v)

    @field_validator("moneda")
    @classmethod
    def moneda_valida(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return validar_moneda(v)

    @field_validator("fecha")
    @classmethod
    def fecha_no_muy_futura(cls, v: Optional[date]) -> Optional[date]:
        if v is None:
            return v
        return _validar_fecha(v)

    @field_validator("concepto")
    @classmethod
    def concepto_valido(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return _validar_concepto(v)


class MovimientoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    cuenta_id: str
    tipo: str
    importe: Decimal
    moneda: str
    importe_base: Decimal
    tasa_cambio: Decimal
    fecha: date
    categoria_id: Optional[str]
    concepto: str
    notas: Optional[str]
    transferencia_id: Optional[str]
    estado: str
    fuente: str
    hash_idempotencia: Optional[str]
    archivado_en: Optional[datetime]
    creado_por: str
    creado_en: datetime
    actualizado_en: datetime
    categoria_emoji: Optional[str] = None
    categoria_nombre: Optional[str] = None
    cuenta_nombre: Optional[str] = None
    cuenta_contraparte_nombre: Optional[str] = None
