import json
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, ConfigDict, field_validator
from schemas.validators import validar_moneda


PERIODOS = ("mensual", "semanal", "trimestral", "anual")
MODOS = ("estricto", "flexible")

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


class PresupuestoCreate(BaseModel):
    nombre: str
    importe: Decimal
    moneda: str = "EUR"
    periodo: str
    modo: str = "estricto"
    categoria_ids: List[str] = []
    cuenta_ids: List[str] = []

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

    @field_validator("periodo")
    @classmethod
    def periodo_valido(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in PERIODOS:
            raise ValueError(f"periodo debe ser uno de {PERIODOS}")
        return v

    @field_validator("modo")
    @classmethod
    def modo_valido(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in MODOS:
            raise ValueError(f"modo debe ser uno de {MODOS}")
        return v


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
