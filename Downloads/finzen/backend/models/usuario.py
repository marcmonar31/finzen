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
    creado_en: datetime = Field(default_factory=datetime.utcnow)
    activo: bool = Field(default=True)
