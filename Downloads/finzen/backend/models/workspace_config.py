from datetime import datetime
from typing import Optional
import uuid
from sqlmodel import Field, SQLModel


class WorkspaceConfig(SQLModel, table=True):
    """Configuración mutable del workspace, separada del modelo principal."""
    __tablename__ = "workspace_configs"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    workspace_id: str = Field(foreign_key="workspaces.id", unique=True, index=True)
    modo_emergencia: bool = False
    actualizado_en: datetime = Field(default_factory=datetime.utcnow)
