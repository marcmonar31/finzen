from datetime import date, datetime
from decimal import Decimal
from typing import Optional
import uuid
from sqlmodel import Field, SQLModel
from sqlalchemy import Column, Numeric


class Objetivo(SQLModel, table=True):
    __tablename__ = "objetivos"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    workspace_id: str = Field(foreign_key="workspaces.id", index=True)
    nombre: str
    descripcion: Optional[str] = None
    emoji: str = "🎯"
    importe_objetivo: Decimal = Field(sa_column=Column(Numeric(18, 4)))
    moneda: str = "EUR"
    fecha_objetivo: Optional[date] = None
    cuenta_id: Optional[str] = Field(default=None, foreign_key="cuentas.id")
    activo: bool = True
    creado_por: str
    creado_en: datetime = Field(default_factory=datetime.utcnow)
    archivado_en: Optional[datetime] = None


class ObjetivoAportacion(SQLModel, table=True):
    __tablename__ = "objetivo_aportaciones"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    objetivo_id: str = Field(foreign_key="objetivos.id", index=True)
    workspace_id: str = Field(foreign_key="workspaces.id", index=True)
    importe: Decimal = Field(sa_column=Column(Numeric(18, 4)))
    moneda: str = "EUR"
    fecha: date
    concepto: Optional[str] = None
    cuenta_id: Optional[str] = Field(default=None, foreign_key="cuentas.id")
    movimiento_id: Optional[str] = Field(default=None, foreign_key="movimientos.id")
    creado_en: datetime = Field(default_factory=datetime.utcnow)
