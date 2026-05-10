from datetime import date, datetime
from decimal import Decimal
from typing import Optional
import uuid
from sqlmodel import Field, SQLModel
from sqlalchemy import Column, Numeric


class Activo(SQLModel, table=True):
    __tablename__ = "activos"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    workspace_id: str = Field(foreign_key="workspaces.id", index=True)
    ticker: str                   # "AAPL", "BTC-USD", "ETH-USD"
    nombre: str                   # "Apple Inc.", "Bitcoin"
    tipo: str = "accion"          # accion | etf | cripto | materia_prima | fondo
    moneda: str = "USD"
    creado_por: str
    creado_en: datetime = Field(default_factory=datetime.utcnow)


class Posicion(SQLModel, table=True):
    __tablename__ = "posiciones"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    workspace_id: str = Field(foreign_key="workspaces.id", index=True)
    activo_id: str = Field(foreign_key="activos.id", index=True)
    cantidad: Decimal = Field(sa_column=Column(Numeric(18, 8)))   # 8 decimales para cripto
    precio_medio: Decimal = Field(sa_column=Column(Numeric(18, 4)))
    moneda: str = "USD"
    cuenta_id: Optional[str] = Field(default=None, foreign_key="cuentas.id")
    activa: bool = True
    creado_por: str
    creado_en: datetime = Field(default_factory=datetime.utcnow)


class PrecioActual(SQLModel, table=True):
    """Precio más reciente de cada activo. Un registro por activo."""
    __tablename__ = "precios_actuales"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    activo_id: str = Field(foreign_key="activos.id", unique=True, index=True)
    precio: Decimal = Field(sa_column=Column(Numeric(18, 4)))
    moneda: str = "USD"
    variacion_dia: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(8, 4)))
    actualizado_en: datetime = Field(default_factory=datetime.utcnow)


class ModoViaje(SQLModel, table=True):
    __tablename__ = "modos_viaje"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    workspace_id: str = Field(foreign_key="workspaces.id", index=True)
    nombre: str                  # "Roma 2026"
    fecha_inicio: date
    fecha_fin: date
    etiqueta_id: Optional[str] = Field(default=None, foreign_key="etiquetas.id")
    activo: bool = True
    creado_por: str
    creado_en: datetime = Field(default_factory=datetime.utcnow)
