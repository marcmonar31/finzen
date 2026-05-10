import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel

TIPOS_CATEGORIA = ("ingreso", "gasto", "transferencia")


class Categoria(SQLModel, table=True):
    __tablename__ = "categorias"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    workspace_id: str = Field(foreign_key="workspaces.id", index=True)
    nombre: str = Field(max_length=100)
    tipo: str = Field(max_length=20)
    parent_id: Optional[str] = Field(default=None, foreign_key="categorias.id")
    emoji: Optional[str] = Field(default=None, max_length=10)
    color: Optional[str] = Field(default=None, max_length=20)
    orden: int = Field(default=0)
    archivado_en: Optional[datetime] = Field(default=None)
    creado_en: datetime = Field(default_factory=datetime.utcnow)
