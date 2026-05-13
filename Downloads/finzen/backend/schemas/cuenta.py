from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from schemas.validators import validar_moneda

TIPOS_CUENTA = ("efectivo", "corriente", "ahorro", "tarjeta_credito", "inversion", "cripto", "prestamo", "hipoteca", "otro")

# Numeric(18,4) → máx 14 dígitos enteros
_MAX_IMPORTE = Decimal("99999999999999.9999")


def _validar_tipo(v: str) -> str:
    if v not in TIPOS_CUENTA:
        raise ValueError(f"tipo debe ser uno de {TIPOS_CUENTA}")
    return v


def _validar_nombre(v: str) -> str:
    stripped = v.strip()
    if not stripped:
        raise ValueError("El nombre no puede estar vacío")
    if len(stripped) > 100:
        raise ValueError("El nombre no puede superar 100 caracteres")
    return stripped


def _validar_saldo(v: Decimal) -> Decimal:
    if abs(v) > _MAX_IMPORTE:
        raise ValueError(f"El importe no puede superar {_MAX_IMPORTE}")
    return v


class CuentaCreate(BaseModel):
    nombre: str
    tipo: str = "corriente"
    moneda: str = "EUR"
    saldo_inicial: Decimal = Decimal("0")
    fecha_saldo_inicial: Optional[date] = None
    emoji: Optional[str] = Field(default=None, max_length=10)
    color: Optional[str] = Field(default=None, max_length=20)
    institucion: Optional[str] = Field(default=None, max_length=100)
    iban_ultimos4: Optional[str] = Field(default=None, max_length=4)
    notas: Optional[str] = Field(default=None, max_length=500)
    incluir_en_patrimonio: bool = True

    @field_validator("nombre")
    @classmethod
    def nombre_valido(cls, v: str) -> str:
        return _validar_nombre(v)

    @field_validator("tipo")
    @classmethod
    def tipo_valido(cls, v: str) -> str:
        return _validar_tipo(v)

    @field_validator("moneda")
    @classmethod
    def moneda_valida(cls, v: str) -> str:
        return validar_moneda(v)

    @field_validator("saldo_inicial")
    @classmethod
    def saldo_valido(cls, v: Decimal) -> Decimal:
        return _validar_saldo(v)


class CuentaUpdate(BaseModel):
    nombre: Optional[str] = None
    tipo: Optional[str] = None
    moneda: Optional[str] = None
    emoji: Optional[str] = Field(default=None, max_length=10)
    color: Optional[str] = Field(default=None, max_length=20)
    institucion: Optional[str] = Field(default=None, max_length=100)
    iban_ultimos4: Optional[str] = Field(default=None, max_length=4)
    notas: Optional[str] = Field(default=None, max_length=500)
    incluir_en_patrimonio: Optional[bool] = None
    orden: Optional[int] = None

    @field_validator("nombre")
    @classmethod
    def nombre_valido(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return _validar_nombre(v)

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


class CuentaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    nombre: str
    tipo: str
    moneda: str
    saldo_inicial: Decimal
    fecha_saldo_inicial: date
    emoji: Optional[str]
    color: Optional[str]
    institucion: Optional[str]
    iban_ultimos4: Optional[str]
    notas: Optional[str]
    incluir_en_patrimonio: bool
    orden: int
    archivado_en: Optional[datetime]
    creado_en: datetime
    saldo: Optional[Decimal] = None
    num_movimientos: int = 0
