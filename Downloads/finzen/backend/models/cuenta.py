import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import Numeric

TIPOS_CUENTA = ("efectivo", "corriente", "ahorro", "tarjeta_credito", "inversion", "cripto", "prestamo", "hipoteca", "otro")


class Cuenta(SQLModel, table=True):
    __tablename__ = "cuentas"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    workspace_id: str = Field(foreign_key="workspaces.id", index=True)
    nombre: str = Field(max_length=100)
    tipo: str = Field(default="corriente", max_length=30)
    moneda: str = Field(default="EUR", max_length=3)
    saldo_inicial: Decimal = Field(default=Decimal("0"), sa_column=Column(Numeric(18, 4), nullable=False, server_default="0"))
    fecha_saldo_inicial: date = Field(default_factory=date.today)
    modo_saldo: str = Field(default="derivado", max_length=20)
    saldo_manual: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(18, 4), nullable=True))
    emoji: Optional[str] = Field(default=None, max_length=10)
    color: Optional[str] = Field(default=None, max_length=20)
    institucion: Optional[str] = Field(default=None, max_length=100)
    iban_ultimos4: Optional[str] = Field(default=None, max_length=4)
    notas: Optional[str] = Field(default=None, max_length=500)
    incluir_en_patrimonio: bool = Field(default=True)
    orden: int = Field(default=0)
    archivado_en: Optional[datetime] = Field(default=None)
    creado_por: str = Field(foreign_key="usuarios.id")
    creado_en: datetime = Field(default_factory=datetime.utcnow)
