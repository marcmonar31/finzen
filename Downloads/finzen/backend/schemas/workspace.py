from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class WorkspaceUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    emoji: Optional[str] = None
    moneda_base: Optional[str] = None


class WorkspaceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    nombre: str
    descripcion: Optional[str]
    emoji: str
    moneda_base: str
    owner_id: str
    creado_en: datetime


class WorkspaceConRol(WorkspaceOut):
    rol: str
