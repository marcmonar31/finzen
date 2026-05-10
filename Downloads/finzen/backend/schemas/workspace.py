from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


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
