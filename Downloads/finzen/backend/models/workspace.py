import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class Workspace(SQLModel, table=True):
    __tablename__ = "workspaces"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    nombre: str = Field(max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=300)
    emoji: str = Field(default="💼", max_length=10)
    moneda_base: str = Field(default="EUR", max_length=3)
    owner_id: str = Field(foreign_key="usuarios.id", index=True)
    creado_en: datetime = Field(default_factory=datetime.utcnow)
    archivado_en: Optional[datetime] = Field(default=None)
