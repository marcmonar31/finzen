import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class Usuario(SQLModel, table=True):
    __tablename__ = "usuarios"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    auth_id: Optional[str] = Field(default=None, unique=True, index=True)  # Supabase UUID
    usuario_unico: str = Field(unique=True, index=True, max_length=50)
    nombre: str = Field(max_length=100)
    email: Optional[str] = Field(default=None, max_length=200)
    avatar_emoji: str = Field(default="👤", max_length=10)
    avatar_color: str = Field(default="#1A1A2E", max_length=10)
    foto_data: Optional[str] = Field(default=None)  # base64 JPG/WebP, máx ~130 KB
    ocultar_importes: bool = Field(default=False)
    tema: str = Field(default="sistema", max_length=10)
    idioma: str = Field(default="es", max_length=5)
    formato_fecha: str = Field(default="DD/MM/YYYY", max_length=20)
    primer_dia_mes: int = Field(default=1)
    primer_dia_semana: str = Field(default="lunes", max_length=10)
    creado_en: datetime = Field(default_factory=datetime.utcnow)
    activo: bool = Field(default=True)
