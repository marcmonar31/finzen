from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from schemas.validators import validar_moneda


FRECUENCIAS = ("diario", "semanal", "cada_4_semanas", "mensual", "anual")
TIPOS = ("ingreso", "gasto")

_MAX_IMPORTE = Decimal("99999999999999.9999")


def _validar_nombre(v: str) -> str:
    stripped = v.strip()
    if not stripped:
        raise ValueError("El nombre no puede estar vacío")
    if len(stripped) > 200:
        raise ValueError("El nombre no puede superar 200 caracteres")
    return stripped


def _validar_importe(v: Decimal) -> Decimal:
    if v <= 0:
        raise ValueError("El importe debe ser mayor que 0")
    if v > _MAX_IMPORTE:
        raise ValueError(f"El importe no puede superar {_MAX_IMPORTE}")
    return v


def _validar_dia_mes(v: Optional[int]) -> Optional[int]:
    if v is not None and not (1 <= v <= 31):
        raise ValueError("dia_mes debe estar entre 1 y 31")
    return v


class RecurrenteCreate(BaseModel):
    nombre: str
    tipo: str
    importe: Decimal
    moneda: str
    cuenta_id: str
    categoria_id: Optional[str] = None
    frecuencia: str
    dia_mes: Optional[int] = None
    fecha_inicio: date
    notas: Optional[str] = Field(default=None, max_length=500)

    @field_validator("nombre")
    @classmethod
    def nombre_valido(cls, v: str) -> str:
        return _validar_nombre(v)

    @field_validator("importe")
    @classmethod
    def importe_valido(cls, v: Decimal) -> Decimal:
        return _validar_importe(v)

    @field_validator("moneda")
    @classmethod
    def moneda_valida(cls, v: str) -> str:
        return validar_moneda(v)

    @field_validator("tipo")
    @classmethod
    def tipo_valido(cls, v: str) -> str:
        if v not in TIPOS:
            raise ValueError(f"tipo debe ser uno de {TIPOS}")
        return v

    @field_validator("frecuencia")
    @classmethod
    def frecuencia_valida(cls, v: str) -> str:
        if v not in FRECUENCIAS:
            raise ValueError(f"frecuencia debe ser una de {FRECUENCIAS}")
        return v

    @field_validator("dia_mes")
    @classmethod
    def dia_mes_valido(cls, v: Optional[int]) -> Optional[int]:
        return _validar_dia_mes(v)

    @field_validator("fecha_inicio")
    @classmethod
    def fecha_no_muy_futura(cls, v: date) -> date:
        if v > date.today() + timedelta(days=366):
            raise ValueError("La fecha no puede ser más de 1 año en el futuro")
        return v


class RecurrenteUpdate(BaseModel):
    nombre: Optional[str] = None
    importe: Optional[Decimal] = None
    moneda: Optional[str] = None
    cuenta_id: Optional[str] = None
    categoria_id: Optional[str] = None
    frecuencia: Optional[str] = None
    dia_mes: Optional[int] = None
    activo: Optional[bool] = None
    notas: Optional[str] = Field(default=None, max_length=500)

    @field_validator("nombre")
    @classmethod
    def nombre_valido(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return _validar_nombre(v)

    @field_validator("importe")
    @classmethod
    def importe_valido(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is None:
            return v
        return _validar_importe(v)

    @field_validator("moneda")
    @classmethod
    def moneda_valida(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return validar_moneda(v)

    @field_validator("frecuencia")
    @classmethod
    def frecuencia_valida(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in FRECUENCIAS:
            raise ValueError(f"frecuencia debe ser una de {FRECUENCIAS}")
        return v

    @field_validator("dia_mes")
    @classmethod
    def dia_mes_valido(cls, v: Optional[int]) -> Optional[int]:
        return _validar_dia_mes(v)


class RecurrenteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    nombre: str
    tipo: str
    importe: Decimal
    moneda: str
    cuenta_id: str
    categoria_id: Optional[str]
    frecuencia: str
    dia_mes: Optional[int]
    proxima_ejecucion: date
    activo: bool
    notas: Optional[str]
    creado_en: datetime
