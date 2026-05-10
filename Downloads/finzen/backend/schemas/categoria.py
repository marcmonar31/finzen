from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class CategoriaCreate(BaseModel):
    nombre: str
    tipo: str
    parent_id: Optional[str] = None
    emoji: Optional[str] = None
    color: Optional[str] = None
    orden: int = 0


class CategoriaUpdate(BaseModel):
    nombre: Optional[str] = None
    emoji: Optional[str] = None
    color: Optional[str] = None
    orden: Optional[int] = None
    parent_id: Optional[str] = None


class CategoriaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    nombre: str
    tipo: str
    parent_id: Optional[str]
    emoji: Optional[str]
    color: Optional[str]
    orden: int
    archivado_en: Optional[datetime]
    creado_en: datetime
    hijos: List["CategoriaOut"] = []
