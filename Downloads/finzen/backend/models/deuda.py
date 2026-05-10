from datetime import date, datetime
from decimal import Decimal
from typing import Optional
import uuid
from sqlmodel import Field, SQLModel
from sqlalchemy import Column, Numeric


class Deuda(SQLModel, table=True):
    __tablename__ = "deudas"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    workspace_id: str = Field(foreign_key="workspaces.id", index=True)
    nombre: str
    descripcion: Optional[str] = None
    tipo: str = "prestamo"  # prestamo | hipoteca | tarjeta | personal
    importe_total: Decimal = Field(sa_column=Column(Numeric(18, 4)))
    moneda: str = "EUR"
    tasa_interes_anual: Decimal = Field(default=Decimal("0"), sa_column=Column(Numeric(8, 4)))
    num_cuotas: Optional[int] = None
    importe_cuota: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(18, 4)))
    fecha_inicio: date
    dia_cuota: int = 1  # día del mes en que cae la cuota
    cuenta_id: Optional[str] = Field(default=None, foreign_key="cuentas.id")
    activa: bool = True
    creado_por: str
    creado_en: datetime = Field(default_factory=datetime.utcnow)
    archivado_en: Optional[datetime] = None
