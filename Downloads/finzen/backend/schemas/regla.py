import json
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class ReglaCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    trigger_tipo: str
    trigger_config: Dict[str, Any] = {}
    condiciones: List[Dict[str, Any]] = []
    modo_condiciones: str = "AND"
    acciones: List[Dict[str, Any]] = []
    max_ejecuciones_mes: Optional[int] = None
    orden: int = 0


class ReglaUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    activa: Optional[bool] = None
    trigger_config: Optional[Dict[str, Any]] = None
    condiciones: Optional[List[Dict[str, Any]]] = None
    acciones: Optional[List[Dict[str, Any]]] = None
    modo_condiciones: Optional[str] = None
    max_ejecuciones_mes: Optional[int] = None
    orden: Optional[int] = None


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
