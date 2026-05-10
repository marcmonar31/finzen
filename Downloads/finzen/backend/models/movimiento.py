import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import Numeric

TIPOS_MOVIMIENTO = ("ingreso", "gasto", "transferencia_origen", "transferencia_destino", "ajuste")
ESTADOS_MOVIMIENTO = ("previsto", "confirmado", "anulado")
FUENTES_MOVIMIENTO = ("manual", "recurrente", "regla", "split", "ajuste", "grupo_compartido")


class Movimiento(SQLModel, table=True):
    __tablename__ = "movimientos"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    workspace_id: str = Field(foreign_key="workspaces.id", index=True)
    cuenta_id: str = Field(foreign_key="cuentas.id", index=True)
    tipo: str = Field(max_length=30)
    importe: Decimal = Field(sa_column=Column(Numeric(18, 4), nullable=False))
    moneda: str = Field(max_length=3)
    importe_base: Decimal = Field(sa_column=Column(Numeric(18, 4), nullable=False))
    tasa_cambio: Decimal = Field(default=Decimal("1"), sa_column=Column(Numeric(18, 8), nullable=False, server_default="1"))
    fecha: date = Field(index=True)
    categoria_id: Optional[str] = Field(default=None, foreign_key="categorias.id", index=True)
    concepto: str = Field(max_length=200)
    notas: Optional[str] = Field(default=None, max_length=1000)
    transferencia_id: Optional[str] = Field(default=None, max_length=36)
    estado: str = Field(default="confirmado", max_length=20)
    fuente: str = Field(default="manual", max_length=30)
    fuente_id: Optional[str] = Field(default=None, max_length=36)
    hash_idempotencia: Optional[str] = Field(default=None, unique=True, max_length=64)
    archivado_en: Optional[datetime] = Field(default=None)
    creado_por: str = Field(foreign_key="usuarios.id")
    creado_en: datetime = Field(default_factory=datetime.utcnow)
    actualizado_en: datetime = Field(default_factory=datetime.utcnow)


class MovimientoEtiqueta(SQLModel, table=True):
    __tablename__ = "movimientos_etiquetas"

    movimiento_id: str = Field(foreign_key="movimientos.id", primary_key=True)
    etiqueta_id: str = Field(foreign_key="etiquetas.id", primary_key=True)
