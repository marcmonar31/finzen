import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import Numeric


class Recurrente(SQLModel, table=True):
    __tablename__ = "recurrentes"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    workspace_id: str = Field(foreign_key="workspaces.id", index=True)
    nombre: str = Field(max_length=200)
    tipo: str = Field(max_length=30)  # ingreso|gasto
    importe: Decimal = Field(sa_column=Column(Numeric(18, 4), nullable=False))
    moneda: str = Field(max_length=3)
    cuenta_id: str = Field(foreign_key="cuentas.id", index=True)
    categoria_id: Optional[str] = Field(default=None, foreign_key="categorias.id")
    frecuencia: str = Field(max_length=20)  # diario|semanal|mensual|anual
    dia_mes: Optional[int] = Field(default=None)  # 1-31, for mensual
    proxima_ejecucion: date = Field(index=True)
    activo: bool = Field(default=True)
    notas: Optional[str] = Field(default=None, max_length=500)
    archivado_en: Optional[datetime] = Field(default=None)
    creado_por: str = Field(foreign_key="usuarios.id")
    creado_en: datetime = Field(default_factory=datetime.utcnow)
