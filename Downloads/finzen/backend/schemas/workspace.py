from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from schemas.validators import validar_moneda


def _validar_nombre_ws(v: Optional[str]) -> Optional[str]:
    if v is None:
        return v
    stripped = v.strip()
    if not stripped:
        raise ValueError("El nombre no puede estar vacío")
    if len(stripped) > 200:
        raise ValueError("El nombre no puede superar 200 caracteres")
    return stripped


class WorkspaceUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = Field(default=None, max_length=500)
    emoji: Optional[str] = Field(default=None, max_length=10)
    moneda_base: Optional[str] = None

    @field_validator("nombre")
    @classmethod
    def nombre_valido(cls, v: Optional[str]) -> Optional[str]:
        return _validar_nombre_ws(v)

    @field_validator("moneda_base")
    @classmethod
    def moneda_valida(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return validar_moneda(v)


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
