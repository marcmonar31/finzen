from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field, field_validator


def _validar_nombre_cat(v: str) -> str:
    stripped = v.strip()
    if not stripped:
        raise ValueError("El nombre no puede estar vacío")
    if len(stripped) > 200:
        raise ValueError("El nombre no puede superar 200 caracteres")
    return stripped


class CategoriaCreate(BaseModel):
    nombre: str
    tipo: str
    parent_id: Optional[str] = None
    emoji: Optional[str] = Field(default=None, max_length=10)
    color: Optional[str] = Field(default=None, max_length=20)
    orden: int = 0

    @field_validator("nombre")
    @classmethod
    def nombre_valido(cls, v: str) -> str:
        return _validar_nombre_cat(v)


class CategoriaUpdate(BaseModel):
    nombre: Optional[str] = None
    emoji: Optional[str] = Field(default=None, max_length=10)
    color: Optional[str] = Field(default=None, max_length=20)
    orden: Optional[int] = None
    parent_id: Optional[str] = None

    @field_validator("nombre")
    @classmethod
    def nombre_valido(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return _validar_nombre_cat(v)


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
