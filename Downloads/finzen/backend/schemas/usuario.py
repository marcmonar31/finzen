from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator
import re


class UsuarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    usuario_unico: str
    nombre: str
    email: Optional[str]
    avatar_emoji: str
    avatar_color: str = "#1A1A2E"
    foto_data: Optional[str] = None
    ocultar_importes: bool = False
    tema: str = "sistema"
    idioma: str = "es"
    formato_fecha: str = "DD/MM/YYYY"
    primer_dia_mes: int = 1
    primer_dia_semana: str = "lunes"
    creado_en: datetime


class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[str] = None
    avatar_emoji: Optional[str] = None
    avatar_color: Optional[str] = None
    foto_data: Optional[str] = None  # base64 data URL or empty string to clear
    ocultar_importes: Optional[bool] = None
    tema: Optional[str] = None
    idioma: Optional[str] = None
    formato_fecha: Optional[str] = None
    primer_dia_mes: Optional[int] = None
    primer_dia_semana: Optional[str] = None

    @field_validator("nombre")
    @classmethod
    def nombre_valido(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if len(v) < 2:
            raise ValueError("El nombre debe tener al menos 2 caracteres")
        if len(v) > 50:
            raise ValueError("El nombre no puede superar los 50 caracteres")
        # Rechazar cadenas que sean solo emojis o solo números
        if re.fullmatch(r"[\d\s]+", v):
            raise ValueError("El nombre no puede ser solo números")
        return v

    @field_validator("email")
    @classmethod
    def email_valido(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip().lower()
        if v and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", v):
            raise ValueError("Formato de email no válido")
        return v

    @field_validator("avatar_emoji")
    @classmethod
    def emoji_valido(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if len(v.strip()) == 0:
            raise ValueError("El emoji no puede estar vacío")
        return v.strip()
