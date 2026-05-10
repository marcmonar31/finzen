import uuid
from datetime import datetime
from sqlmodel import Field, SQLModel


class Transferencia(SQLModel, table=True):
    __tablename__ = "transferencias"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    workspace_id: str = Field(foreign_key="workspaces.id", index=True)
    movimiento_origen_id: str = Field(foreign_key="movimientos.id")
    movimiento_destino_id: str = Field(foreign_key="movimientos.id")
    creado_en: datetime = Field(default_factory=datetime.utcnow)
