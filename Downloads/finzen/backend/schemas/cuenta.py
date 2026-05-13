from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator


class CuentaCreate(BaseModel):
    nombre: str
    tipo: str = "corriente"
    moneda: str = "EUR"
    saldo_inicial: Decimal = Decimal("0")
    fecha_saldo_inicial: Optional[date] = None
    emoji: Optional[str] = None
    color: Optional[str] = None
    institucion: Optional[str] = None
    iban_ultimos4: Optional[str] = None
    notas: Optional[str] = None
    incluir_en_patrimonio: bool = True

    @field_validator("tipo")
    @classmethod
    def tipo_valido(cls, v: str) -> str:
        validos = ("efectivo", "corriente", "ahorro", "tarjeta_credito", "inversion", "cripto", "prestamo", "hipoteca", "otro")
        if v not in validos:
            raise ValueError(f"tipo debe ser uno de {validos}")
        return v


class CuentaUpdate(BaseModel):
    nombre: Optional[str] = None
    tipo: Optional[str] = None
    moneda: Optional[str] = None
    emoji: Optional[str] = None
    color: Optional[str] = None
    institucion: Optional[str] = None
    iban_ultimos4: Optional[str] = None
    notas: Optional[str] = None
    incluir_en_patrimonio: Optional[bool] = None
    orden: Optional[int] = None


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
