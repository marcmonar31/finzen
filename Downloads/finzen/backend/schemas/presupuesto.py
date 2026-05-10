import json
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, ConfigDict, field_validator


PERIODOS = ("mensual", "semanal", "trimestral", "anual")
MODOS = ("estricto", "flexible")


class PresupuestoCreate(BaseModel):
    nombre: str
    importe: Decimal
    moneda: str = "EUR"
    periodo: str
    modo: str = "estricto"
    categoria_ids: List[str] = []
    cuenta_ids: List[str] = []

    @field_validator("importe")
    @classmethod
    def importe_positivo(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("El importe debe ser mayor que 0")
        return v

    @field_validator("periodo")
    @classmethod
    def periodo_valido(cls, v: str) -> str:
        if v not in PERIODOS:
            raise ValueError(f"periodo debe ser uno de {PERIODOS}")
        return v

    @field_validator("modo")
    @classmethod
    def modo_valido(cls, v: str) -> str:
        if v not in MODOS:
            raise ValueError(f"modo debe ser uno de {MODOS}")
        return v


class PresupuestoUpdate(BaseModel):
    nombre: Optional[str] = None
    importe: Optional[Decimal] = None
    periodo: Optional[str] = None
    modo: Optional[str] = None
    categoria_ids: Optional[List[str]] = None
    cuenta_ids: Optional[List[str]] = None
    activo: Optional[bool] = None


class EstadoPresupuesto(BaseModel):
    consumido: str
    restante: str
    porcentaje: float
    alerta: str  # ok|advertencia|superado
    fecha_inicio: str
    fecha_fin: str


class PresupuestoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    nombre: str
    importe: Decimal
    moneda: str
    periodo: str
    modo: str
    categoria_ids: List[str] = []
    cuenta_ids: List[str] = []
    orden: int
    activo: bool
    creado_en: datetime
    estado: Optional[EstadoPresupuesto] = None

    @classmethod
    def from_orm_with_estado(cls, p: Any, estado_data: Dict[str, Any]) -> "PresupuestoOut":
        return cls(
            id=p.id,
            workspace_id=p.workspace_id,
            nombre=p.nombre,
            importe=p.importe,
            moneda=p.moneda,
            periodo=p.periodo,
            modo=p.modo,
            categoria_ids=json.loads(p.categoria_ids or "[]"),
            cuenta_ids=json.loads(p.cuenta_ids or "[]"),
            orden=p.orden,
            activo=p.activo,
            creado_en=p.creado_en,
            estado=EstadoPresupuesto(**estado_data),
        )
