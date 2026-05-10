import uuid
from datetime import datetime, date
from decimal import Decimal
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import Numeric, UniqueConstraint


class TipoCambio(SQLModel, table=True):
    __tablename__ = "tipos_cambio"
    __table_args__ = (
        UniqueConstraint("moneda_origen", "moneda_destino", "fecha", name="uq_tipo_cambio"),
    )

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    moneda_origen: str = Field(max_length=3, index=True)
    moneda_destino: str = Field(max_length=3, index=True)
    tasa: Decimal = Field(sa_column=Column(Numeric(18, 8), nullable=False))
    fecha: date = Field(index=True)
    fuente: str = Field(default="frankfurter", max_length=50)
    creado_en: datetime = Field(default_factory=datetime.utcnow)
