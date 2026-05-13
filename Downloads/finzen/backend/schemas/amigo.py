import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class AmigoSolicitudCreate(BaseModel):
    receptor_usuario_unico: str  # El @handle del destinatario


class AmigoOut(BaseModel):
    id: str
    usuario_id: str
    nombre: str
    usuario_unico: str
    avatar_emoji: str
    estado: str  # pendiente | aceptado
    soy_solicitante: bool


class AmigoExternoCreate(BaseModel):
    nombre: str
    email: Optional[str] = Field(default=None, max_length=200)
    telefono: Optional[str] = Field(default=None, max_length=30)

    @field_validator("nombre")
    @classmethod
    def nombre_valido(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("El nombre no puede estar vacío")
        if len(stripped) > 200:
            raise ValueError("El nombre no puede superar 200 caracteres")
        return stripped

    @field_validator("email")
    @classmethod
    def email_valido(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not _EMAIL_RE.match(v):
            raise ValueError("El email no tiene un formato válido")
        return v


class AmigoExternoOut(BaseModel):
    id: str
    nombre: str
    email: Optional[str]
    telefono: Optional[str]
    usuario_real_id: Optional[str]
    creado_en: datetime
