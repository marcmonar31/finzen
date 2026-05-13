from datetime import date, datetime
from decimal import Decimal
from typing import Any, List, Optional
from pydantic import BaseModel


class ObjetivoCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    emoji: str = "🎯"
    importe_objetivo: Decimal
    moneda: str = "EUR"
    fecha_objetivo: Optional[date] = None
    cuenta_id: Optional[str] = None


class ObjetivoUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    emoji: Optional[str] = None
    importe_objetivo: Optional[Decimal] = None
    fecha_objetivo: Optional[date] = None
    cuenta_id: Optional[str] = None
    activo: Optional[bool] = None


class AportacionCreate(BaseModel):
    importe: Decimal
    moneda: str = "EUR"
    fecha: date
    cuenta_id: str
    concepto: Optional[str] = None
    movimiento_id: Optional[str] = None


class AportacionOut(BaseModel):
    id: str
    objetivo_id: str
    importe: str
    moneda: str
    fecha: date
    cuenta_id: Optional[str]
    concepto: Optional[str]
    movimiento_id: Optional[str]
    creado_en: datetime

    @classmethod
    def from_orm(cls, a: Any) -> "AportacionOut":
        return cls(
            id=a.id,
            objetivo_id=a.objetivo_id,
            importe=str(a.importe),
            moneda=a.moneda,
            fecha=a.fecha,
            cuenta_id=getattr(a, "cuenta_id", None),
            concepto=a.concepto,
            movimiento_id=a.movimiento_id,
            creado_en=a.creado_en,
        )


class ObjetivoOut(BaseModel):
    id: str
    workspace_id: str
    nombre: str
    descripcion: Optional[str]
    emoji: str
    importe_objetivo: str
    moneda: str
    fecha_objetivo: Optional[date]
    cuenta_id: Optional[str]
    activo: bool
    creado_en: datetime
    importe_aportado: str = "0"
    porcentaje: float = 0.0
    falta: str = "0"

    @classmethod
    def from_orm(cls, o: Any, importe_aportado: Decimal = Decimal("0")) -> "ObjetivoOut":
        falta = max(Decimal("0"), o.importe_objetivo - importe_aportado)
        pct = float(importe_aportado / o.importe_objetivo * 100) if o.importe_objetivo > 0 else 0.0
        return cls(
            id=o.id,
            workspace_id=o.workspace_id,
            nombre=o.nombre,
            descripcion=o.descripcion,
            emoji=o.emoji,
            importe_objetivo=str(o.importe_objetivo),
            moneda=o.moneda,
            fecha_objetivo=o.fecha_objetivo,
            cuenta_id=o.cuenta_id,
            activo=o.activo,
            creado_en=o.creado_en,
            importe_aportado=str(importe_aportado.quantize(Decimal("0.0001"))),
            porcentaje=round(min(100.0, pct), 1),
            falta=str(falta),
        )
