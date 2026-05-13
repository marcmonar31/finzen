from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, field_validator


class MovimientoCreate(BaseModel):
    cuenta_id: str
    tipo: str
    importe: Decimal
    moneda: str
    fecha: date
    categoria_id: Optional[str] = None
    concepto: str
    notas: Optional[str] = None
    etiqueta_ids: List[str] = []

    @field_validator("importe")
    @classmethod
    def importe_positivo(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("El importe debe ser mayor que 0")
        return v

    @field_validator("tipo")
    @classmethod
    def tipo_valido(cls, v: str) -> str:
        validos = ("ingreso", "gasto", "transferencia_origen", "transferencia_destino", "ajuste")
        if v not in validos:
            raise ValueError(f"tipo debe ser uno de {validos}")
        return v

    @field_validator("fecha")
    @classmethod
    def fecha_no_muy_futura(cls, v: date) -> date:
        from datetime import timedelta
        limite = date.today() + timedelta(days=366)
        if v > limite:
            raise ValueError("La fecha no puede ser más de 1 año en el futuro")
        return v


class MovimientoUpdate(BaseModel):
    tipo: Optional[str] = None
    importe: Optional[Decimal] = None
    moneda: Optional[str] = None
    fecha: Optional[date] = None
    categoria_id: Optional[str] = None
    concepto: Optional[str] = None
    notas: Optional[str] = None
    etiqueta_ids: Optional[List[str]] = None

    @field_validator("importe")
    @classmethod
    def importe_positivo(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= 0:
            raise ValueError("El importe debe ser mayor que 0")
        return v


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
