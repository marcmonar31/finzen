import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import Numeric


class Presupuesto(SQLModel, table=True):
    __tablename__ = "presupuestos"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    workspace_id: str = Field(foreign_key="workspaces.id", index=True)
    nombre: str = Field(max_length=100)
    importe: Decimal = Field(sa_column=Column(Numeric(18, 4), nullable=False))
    moneda: str = Field(max_length=3)
    periodo: str = Field(max_length=20)  # mensual|semanal|trimestral|anual
    modo: str = Field(default="estricto", max_length=20)  # estricto|flexible
    # JSON-encoded list of IDs for filtering (empty string = no filter)
    categoria_ids: Optional[str] = Field(default=None)  # '["id1","id2"]'
    cuenta_ids: Optional[str] = Field(default=None)    # '["id1","id2"]'
    orden: int = Field(default=0)
    activo: bool = Field(default=True)
    archivado_en: Optional[datetime] = Field(default=None)
    creado_en: datetime = Field(default_factory=datetime.utcnow)
