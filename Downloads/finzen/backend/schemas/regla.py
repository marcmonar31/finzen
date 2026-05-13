import json
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator

TRIGGER_TIPOS = ("movimiento_creado",)
MODOS_CONDICIONES = ("AND", "OR")


def _validar_nombre(v: str) -> str:
    stripped = v.strip()
    if not stripped:
        raise ValueError("El nombre no puede estar vacío")
    if len(stripped) > 200:
        raise ValueError("El nombre no puede superar 200 caracteres")
    return stripped


def _validar_max_ejecuciones(v: Optional[int]) -> Optional[int]:
    if v is not None and v < 1:
        raise ValueError("max_ejecuciones_mes debe ser al menos 1")
    return v


class ReglaCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = Field(default=None, max_length=500)
    trigger_tipo: str
    trigger_config: Dict[str, Any] = {}
    condiciones: List[Dict[str, Any]] = []
    modo_condiciones: str = "AND"
    acciones: List[Dict[str, Any]] = []
    max_ejecuciones_mes: Optional[int] = None
    orden: int = 0

    @field_validator("nombre")
    @classmethod
    def nombre_valido(cls, v: str) -> str:
        return _validar_nombre(v)

    @field_validator("trigger_tipo")
    @classmethod
    def trigger_tipo_valido(cls, v: str) -> str:
        if v not in TRIGGER_TIPOS:
            raise ValueError(f"trigger_tipo debe ser uno de {TRIGGER_TIPOS}")
        return v

    @field_validator("modo_condiciones")
    @classmethod
    def modo_condiciones_valido(cls, v: str) -> str:
        if v not in MODOS_CONDICIONES:
            raise ValueError(f"modo_condiciones debe ser uno de {MODOS_CONDICIONES}")
        return v

    @field_validator("max_ejecuciones_mes")
    @classmethod
    def max_ejecuciones_valido(cls, v: Optional[int]) -> Optional[int]:
        return _validar_max_ejecuciones(v)


class ReglaUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = Field(default=None, max_length=500)
    activa: Optional[bool] = None
    trigger_config: Optional[Dict[str, Any]] = None
    condiciones: Optional[List[Dict[str, Any]]] = None
    acciones: Optional[List[Dict[str, Any]]] = None
    modo_condiciones: Optional[str] = None
    max_ejecuciones_mes: Optional[int] = None
    orden: Optional[int] = None

    @field_validator("nombre")
    @classmethod
    def nombre_valido(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return _validar_nombre(v)

    @field_validator("modo_condiciones")
    @classmethod
    def modo_condiciones_valido(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in MODOS_CONDICIONES:
            raise ValueError(f"modo_condiciones debe ser uno de {MODOS_CONDICIONES}")
        return v

    @field_validator("max_ejecuciones_mes")
    @classmethod
    def max_ejecuciones_valido(cls, v: Optional[int]) -> Optional[int]:
        return _validar_max_ejecuciones(v)


class ReglaOut(BaseModel):
    id: str
    workspace_id: str
    nombre: str
    descripcion: Optional[str]
    trigger_tipo: str
    trigger_config: Dict[str, Any]
    condiciones: List[Dict[str, Any]]
    modo_condiciones: str
    acciones: List[Dict[str, Any]]
    activa: bool
    orden: int
    max_ejecuciones_mes: Optional[int]
    ultima_ejecucion: Optional[datetime]
    creado_en: datetime

    @classmethod
    def from_orm(cls, r: Any) -> "ReglaOut":
        return cls(
            id=r.id,
            workspace_id=r.workspace_id,
            nombre=r.nombre,
            descripcion=r.descripcion,
            trigger_tipo=r.trigger_tipo,
            trigger_config=json.loads(r.trigger_config or "{}"),
            condiciones=json.loads(r.condiciones or "[]"),
            modo_condiciones=r.modo_condiciones,
            acciones=json.loads(r.acciones or "[]"),
            activa=r.activa,
            orden=r.orden,
            max_ejecuciones_mes=r.max_ejecuciones_mes,
            ultima_ejecucion=r.ultima_ejecucion,
            creado_en=r.creado_en,
        )


class ReglaEjecucionOut(BaseModel):
    id: str
    regla_id: str
    trigger_movimiento_id: Optional[str]
    estado: str
    movimientos_creados_ids: List[str]
    razon_omision: Optional[str]
    error: Optional[str]
    ejecutado_en: datetime

    @classmethod
    def from_orm(cls, e: Any) -> "ReglaEjecucionOut":
        return cls(
            id=e.id,
            regla_id=e.regla_id,
            trigger_movimiento_id=e.trigger_movimiento_id,
            estado=e.estado,
            movimientos_creados_ids=json.loads(e.movimientos_creados_ids or "[]"),
            razon_omision=e.razon_omision,
            error=e.error,
            ejecutado_en=e.ejecutado_en,
        )
