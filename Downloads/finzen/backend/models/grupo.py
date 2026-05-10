import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import Column, Numeric
from sqlmodel import Field, SQLModel


class Grupo(SQLModel, table=True):
    __tablename__ = "grupos"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    nombre: str = Field(max_length=100)
    emoji: str = Field(default="🤝", max_length=10)
    descripcion: Optional[str] = Field(default=None, max_length=500)
    moneda_principal: str = Field(default="EUR", max_length=3)
    # Si es True, se crea una cuenta real en el workspace del creador
    es_cuenta_real: bool = Field(default=False)
    cuenta_id: Optional[str] = Field(default=None, foreign_key="cuentas.id")
    # igualitario | porcentajes | partes | manual
    modo_reparto_default: str = Field(default="igualitario", max_length=20)
    creado_por: str = Field(foreign_key="usuarios.id")
    creado_en: datetime = Field(default_factory=datetime.utcnow)
    cerrado_en: Optional[datetime] = Field(default=None)
    archivado_en: Optional[datetime] = Field(default=None)


class GrupoMiembro(SQLModel, table=True):
    __tablename__ = "grupo_miembros"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    grupo_id: str = Field(foreign_key="grupos.id", index=True)
    # Uno de los dos debe ser not-null
    usuario_id: Optional[str] = Field(default=None, foreign_key="usuarios.id")
    externo_id: Optional[str] = Field(default=None, foreign_key="amigos_externos.id")
    # admin | miembro
    rol: str = Field(default="miembro", max_length=20)
    apodo: Optional[str] = Field(default=None, max_length=100)
    activo: bool = Field(default=True)
    salido_en: Optional[datetime] = Field(default=None)
    creado_en: datetime = Field(default_factory=datetime.utcnow)


class GastoCompartido(SQLModel, table=True):
    __tablename__ = "gastos_compartidos"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    grupo_id: str = Field(foreign_key="grupos.id", index=True)
    concepto: str = Field(max_length=200)
    importe: Decimal = Field(sa_column=Column(Numeric(18, 4), nullable=False))
    moneda: str = Field(max_length=3)
    # Importe convertido a moneda_principal del grupo
    importe_convertido: Decimal = Field(sa_column=Column(Numeric(18, 4), nullable=False))
    tasa_cambio: Decimal = Field(sa_column=Column(Numeric(18, 8), nullable=False))
    fecha: date
    categoria_id: Optional[str] = Field(default=None, foreign_key="categorias.id")
    # Quién pagó (FK a grupo_miembros)
    pagador_id: str = Field(foreign_key="grupo_miembros.id")
    # igualitario | porcentajes | partes | manual
    modo_reparto: str = Field(default="igualitario", max_length=20)
    # Si True, crea movimiento en cuenta personal del pagador
    afecta_cuenta_personal: bool = Field(default=False)
    movimiento_id: Optional[str] = Field(default=None, foreign_key="movimientos.id")
    cuenta_personal_id: Optional[str] = Field(default=None, foreign_key="cuentas.id")
    creado_por: str = Field(foreign_key="usuarios.id")
    creado_en: datetime = Field(default_factory=datetime.utcnow)
    archivado_en: Optional[datetime] = Field(default=None)


class GastoReparto(SQLModel, table=True):
    """Cuánto le toca pagar a cada miembro por un gasto compartido."""
    __tablename__ = "gastos_repartos"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    gasto_id: str = Field(foreign_key="gastos_compartidos.id", index=True)
    miembro_id: str = Field(foreign_key="grupo_miembros.id")
    importe_asignado: Decimal = Field(sa_column=Column(Numeric(18, 4), nullable=False))
    # Para modo 'partes'
    partes: Optional[int] = Field(default=None)
    # Para modo 'porcentajes' (ej: 33.33)
    porcentaje: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(5, 2)))


class Liquidacion(SQLModel, table=True):
    """Registro de pago de deuda entre miembros de un grupo."""
    __tablename__ = "liquidaciones"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    grupo_id: str = Field(foreign_key="grupos.id", index=True)
    de_miembro_id: str = Field(foreign_key="grupo_miembros.id")
    a_miembro_id: str = Field(foreign_key="grupo_miembros.id")
    importe: Decimal = Field(sa_column=Column(Numeric(18, 4), nullable=False))
    moneda: str = Field(max_length=3)
    # Movimientos vinculados en cuentas personales (opcionales)
    movimiento_pago_id: Optional[str] = Field(default=None, foreign_key="movimientos.id")
    movimiento_cobro_id: Optional[str] = Field(default=None, foreign_key="movimientos.id")
    # pendiente | confirmada | rechazada
    estado: str = Field(default="pendiente", max_length=20)
    creado_en: datetime = Field(default_factory=datetime.utcnow)
    confirmado_en: Optional[datetime] = Field(default=None)
