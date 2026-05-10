import uuid
from datetime import datetime
from typing import Literal
from sqlmodel import Field, SQLModel


RolWorkspace = Literal["owner", "admin", "editor", "lector"]


class WorkspaceMiembro(SQLModel, table=True):
    __tablename__ = "workspace_miembros"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    workspace_id: str = Field(foreign_key="workspaces.id", index=True)
    usuario_id: str = Field(foreign_key="usuarios.id", index=True)
    rol: str = Field(default="editor", max_length=20)
    unido_en: datetime = Field(default_factory=datetime.utcnow)
