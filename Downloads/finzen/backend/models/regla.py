import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import Column, Numeric
from sqlmodel import Field, SQLModel


class Regla(SQLModel, table=True):
    __tablename__ = "reglas"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    workspace_id: str = Field(foreign_key="workspaces.id", index=True)
    nombre: str = Field(max_length=100)
    descripcion: Optional[str] = Field(default=None, max_length=500)

    # movimiento_creado | fecha_calendario | umbral_saldo | umbral_presupuesto
    trigger_tipo: str = Field(max_length=40)
    trigger_config: Optional[str] = Field(default=None)  # JSON

    condiciones: Optional[str] = Field(default=None)   # JSON list
    modo_condiciones: str = Field(default="AND", max_length=3)  # AND | OR
    acciones: Optional[str] = Field(default=None)       # JSON list, ordered

    activa: bool = Field(default=True)
    orden: int = Field(default=0)

    # Salvaguardas
    max_ejecuciones_mes: Optional[int] = Field(default=None)
    importe_max_acumulado_mes: Optional[Decimal] = Field(
        default=None, sa_column=Column(Numeric(18, 4), nullable=True)
    )

    ultima_ejecucion: Optional[datetime] = Field(default=None)
    creado_por: str = Field(foreign_key="usuarios.id")
    creado_en: datetime = Field(default_factory=datetime.utcnow)
    archivado_en: Optional[datetime] = Field(default=None)


class ReglaEjecucion(SQLModel, table=True):
    __tablename__ = "reglas_ejecuciones"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    regla_id: str = Field(foreign_key="reglas.id", index=True)
    workspace_id: str = Field(foreign_key="workspaces.id", index=True)
    trigger_movimiento_id: Optional[str] = Field(default=None, foreign_key="movimientos.id")

    # exito | error | omitida | simulacion
    estado: str = Field(max_length=20)
    movimientos_creados_ids: Optional[str] = Field(default=None)  # JSON list
    razon_omision: Optional[str] = Field(default=None, max_length=200)
    error: Optional[str] = Field(default=None, max_length=1000)
    ejecutado_en: datetime = Field(default_factory=datetime.utcnow)
