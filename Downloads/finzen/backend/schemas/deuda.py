from datetime import date, datetime
from decimal import Decimal
from typing import Any, List, Optional
from pydantic import BaseModel, Field, field_validator
from schemas.validators import validar_moneda

TIPOS_DEUDA = ("prestamo", "hipoteca", "tarjeta", "personal")
_MAX_IMPORTE = Decimal("99999999999999.9999")
_MAX_TASA = Decimal("9999.9999")


def _validar_nombre(v: str) -> str:
    stripped = v.strip()
    if not stripped:
        raise ValueError("El nombre no puede estar vacío")
    if len(stripped) > 200:
        raise ValueError("El nombre no puede superar 200 caracteres")
    return stripped


def _validar_importe_positivo(v: Decimal) -> Decimal:
    if v <= 0:
        raise ValueError("El importe debe ser mayor que 0")
    if v > _MAX_IMPORTE:
        raise ValueError(f"El importe no puede superar {_MAX_IMPORTE}")
    return v


class DeudaCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = Field(default=None, max_length=500)
    tipo: str = "prestamo"
    importe_total: Decimal
    moneda: str = "EUR"
    tasa_interes_anual: Decimal = Decimal("0")
    num_cuotas: Optional[int] = None
    importe_cuota: Optional[Decimal] = None
    fecha_inicio: date
    dia_cuota: int = 1
    cuenta_id: Optional[str] = None

    @field_validator("nombre")
    @classmethod
    def nombre_valido(cls, v: str) -> str:
        return _validar_nombre(v)

    @field_validator("tipo")
    @classmethod
    def tipo_valido(cls, v: str) -> str:
        if v not in TIPOS_DEUDA:
            raise ValueError(f"tipo debe ser uno de {TIPOS_DEUDA}")
        return v

    @field_validator("importe_total")
    @classmethod
    def importe_total_valido(cls, v: Decimal) -> Decimal:
        return _validar_importe_positivo(v)

    @field_validator("tasa_interes_anual")
    @classmethod
    def tasa_valida(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("La tasa de interés no puede ser negativa")
        if v > _MAX_TASA:
            raise ValueError(f"La tasa de interés no puede superar {_MAX_TASA}")
        return v

    @field_validator("num_cuotas")
    @classmethod
    def num_cuotas_valido(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 1:
            raise ValueError("num_cuotas debe ser al menos 1")
        return v

    @field_validator("importe_cuota")
    @classmethod
    def importe_cuota_valido(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None:
            return _validar_importe_positivo(v)
        return v

    @field_validator("dia_cuota")
    @classmethod
    def dia_cuota_valido(cls, v: int) -> int:
        if v < 1 or v > 31:
            raise ValueError("dia_cuota debe estar entre 1 y 31")
        return v

    @field_validator("moneda")
    @classmethod
    def moneda_valida(cls, v: str) -> str:
        return validar_moneda(v)


class DeudaUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = Field(default=None, max_length=500)
    tipo: Optional[str] = None
    tasa_interes_anual: Optional[Decimal] = None
    num_cuotas: Optional[int] = None
    importe_cuota: Optional[Decimal] = None
    dia_cuota: Optional[int] = None
    cuenta_id: Optional[str] = None
    activa: Optional[bool] = None

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
        if v not in TIPOS_DEUDA:
            raise ValueError(f"tipo debe ser uno de {TIPOS_DEUDA}")
        return v

    @field_validator("tasa_interes_anual")
    @classmethod
    def tasa_valida(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is None:
            return v
        if v < 0:
            raise ValueError("La tasa de interés no puede ser negativa")
        if v > _MAX_TASA:
            raise ValueError(f"La tasa de interés no puede superar {_MAX_TASA}")
        return v

    @field_validator("num_cuotas")
    @classmethod
    def num_cuotas_valido(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 1:
            raise ValueError("num_cuotas debe ser al menos 1")
        return v

    @field_validator("importe_cuota")
    @classmethod
    def importe_cuota_valido(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None:
            return _validar_importe_positivo(v)
        return v

    @field_validator("dia_cuota")
    @classmethod
    def dia_cuota_valido(cls, v: Optional[int]) -> Optional[int]:
        if v is None:
            return v
        if v < 1 or v > 31:
            raise ValueError("dia_cuota debe estar entre 1 y 31")
        return v


class CuotaOut(BaseModel):
    numero: int
    fecha: date
    importe: str
    capital: str
    intereses: str
    saldo_pendiente: str


class PagoAnticipadoCreate(BaseModel):
    fecha: date
    importe: Decimal
    notas: Optional[str] = Field(default=None, max_length=500)

    @field_validator("importe")
    @classmethod
    def importe_valido(cls, v: Decimal) -> Decimal:
        return _validar_importe_positivo(v)


class PagoAnticipadoOut(BaseModel):
    id: str
    deuda_id: str
    fecha: date
    importe: str
    notas: Optional[str]
    creado_en: datetime


class DeudaOut(BaseModel):
    id: str
    workspace_id: str
    nombre: str
    descripcion: Optional[str]
    tipo: str
    importe_total: str
    moneda: str
    tasa_interes_anual: str
    num_cuotas: Optional[int]
    importe_cuota: Optional[str]
    fecha_inicio: date
    dia_cuota: int
    cuenta_id: Optional[str]
    activa: bool
    creado_en: datetime
    saldo_pendiente: Optional[str] = None

    @classmethod
    def from_orm(cls, d: Any, saldo_pendiente: Optional[str] = None) -> "DeudaOut":
        return cls(
            id=d.id,
            workspace_id=d.workspace_id,
            nombre=d.nombre,
            descripcion=d.descripcion,
            tipo=d.tipo,
            importe_total=str(d.importe_total),
            moneda=d.moneda,
            tasa_interes_anual=str(d.tasa_interes_anual),
            num_cuotas=d.num_cuotas,
            importe_cuota=str(d.importe_cuota) if d.importe_cuota else None,
            fecha_inicio=d.fecha_inicio,
            dia_cuota=d.dia_cuota,
            cuenta_id=d.cuenta_id,
            activa=d.activa,
            creado_en=d.creado_en,
            saldo_pendiente=saldo_pendiente,
        )
