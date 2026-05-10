import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class Amigo(SQLModel, table=True):
    """Relación de amistad entre dos usuarios reales (bidireccional)."""
    __tablename__ = "amigos"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    solicitante_id: str = Field(foreign_key="usuarios.id", index=True)
    receptor_id: str = Field(foreign_key="usuarios.id", index=True)
    # pendiente | aceptado | rechazado
    estado: str = Field(default="pendiente", max_length=20)
    creado_en: datetime = Field(default_factory=datetime.utcnow)
    actualizado_en: datetime = Field(default_factory=datetime.utcnow)


class AmigoExterno(SQLModel, table=True):
    """Contacto externo sin cuenta en la app."""
    __tablename__ = "amigos_externos"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    creado_por: str = Field(foreign_key="usuarios.id", index=True)
    nombre: str = Field(max_length=100)
    email: Optional[str] = Field(default=None, max_length=200)
    telefono: Optional[str] = Field(default=None, max_length=30)
    # Cuando se vincula a un usuario real de la app
    usuario_real_id: Optional[str] = Field(default=None, foreign_key="usuarios.id")
    creado_en: datetime = Field(default_factory=datetime.utcnow)
    archivado_en: Optional[datetime] = Field(default=None)
