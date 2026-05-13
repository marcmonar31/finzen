from datetime import date, datetime
from decimal import Decimal
from typing import Any, List, Optional
from pydantic import BaseModel


class DeudaCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    tipo: str = "prestamo"
    importe_total: Decimal
    moneda: str = "EUR"
    tasa_interes_anual: Decimal = Decimal("0")
    num_cuotas: Optional[int] = None
    importe_cuota: Optional[Decimal] = None
    fecha_inicio: date
    dia_cuota: int = 1
    cuenta_id: Optional[str] = None


class DeudaUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    tipo: Optional[str] = None
    tasa_interes_anual: Optional[Decimal] = None
    num_cuotas: Optional[int] = None
    importe_cuota: Optional[Decimal] = None
    dia_cuota: Optional[int] = None
    cuenta_id: Optional[str] = None
    activa: Optional[bool] = None


class CuotaOut(BaseModel):
    numero: int
    fecha: date
    importe: str
    capital: str
    intereses: str
    saldo_pendiente: str


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
