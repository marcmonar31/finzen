from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator

from schemas.movimiento import MovimientoOut


class TransferenciaCreate(BaseModel):
    cuenta_origen_id: str
    cuenta_destino_id: str
    importe_origen: Decimal
    importe_destino: Optional[Decimal] = None
    fecha: date
    concepto: str = "Transferencia"
    notas: Optional[str] = None

    @field_validator("importe_origen")
    @classmethod
    def importe_positivo(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("El importe debe ser mayor que 0")
        return v

    @field_validator("importe_destino")
    @classmethod
    def importe_destino_positivo(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= 0:
            raise ValueError("El importe destino debe ser mayor que 0")
        return v


class TransferenciaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    movimiento_origen_id: str
    movimiento_destino_id: str
    creado_en: datetime
    movimiento_origen: Optional[MovimientoOut] = None
    movimiento_destino: Optional[MovimientoOut] = None
