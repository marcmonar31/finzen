import uuid
from typing import Optional
from sqlmodel import Field, SQLModel


class Etiqueta(SQLModel, table=True):
    __tablename__ = "etiquetas"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    workspace_id: str = Field(foreign_key="workspaces.id", index=True)
    nombre: str = Field(max_length=60)
    color: Optional[str] = Field(default=None, max_length=20)
