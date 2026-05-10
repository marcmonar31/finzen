from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator


FRECUENCIAS = ("diario", "semanal", "mensual", "anual")
TIPOS = ("ingreso", "gasto")


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
    notas: Optional[str] = None

    @field_validator("importe")
    @classmethod
    def importe_positivo(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("El importe debe ser mayor que 0")
        return v

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
        if v is not None and not (1 <= v <= 31):
            raise ValueError("dia_mes debe estar entre 1 y 31")
        return v


class RecurrenteUpdate(BaseModel):
    nombre: Optional[str] = None
    importe: Optional[Decimal] = None
    moneda: Optional[str] = None
    cuenta_id: Optional[str] = None
    categoria_id: Optional[str] = None
    dia_mes: Optional[int] = None
    activo: Optional[bool] = None
    notas: Optional[str] = None


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
