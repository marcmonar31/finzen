from datetime import datetime
from typing import Optional
from pydantic import BaseModel


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
    email: Optional[str] = None
    telefono: Optional[str] = None


class AmigoExternoOut(BaseModel):
    id: str
    nombre: str
    email: Optional[str]
    telefono: Optional[str]
    usuario_real_id: Optional[str]
    creado_en: datetime
