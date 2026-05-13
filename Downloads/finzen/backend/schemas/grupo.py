from datetime import date, datetime
from decimal import Decimal
from typing import Dict, List, Optional
from pydantic import BaseModel, Field, field_validator
from schemas.validators import validar_moneda

MODOS_REPARTO = ("igualitario", "porcentajes", "partes", "manual")
_MAX_IMPORTE = Decimal("99999999999999.9999")


def _validar_nombre_grupo(v: str) -> str:
    stripped = v.strip()
    if not stripped:
        raise ValueError("El nombre no puede estar vacío")
    if len(stripped) > 200:
        raise ValueError("El nombre no puede superar 200 caracteres")
    return stripped


def _validar_importe_positivo(v: Decimal) -> Decimal:
    if v <= 0:
        raise ValueError("El importe debe ser mayor que 0")
    if v > _MAX_IMPORTE:
        raise ValueError(f"El importe no puede superar {_MAX_IMPORTE}")
    return v


class GrupoCreate(BaseModel):
    nombre: str
    emoji: str = Field(default="🤝", max_length=10)
    descripcion: Optional[str] = Field(default=None, max_length=500)
    moneda_principal: str = "EUR"
    es_cuenta_real: bool = False
    modo_reparto_default: str = "igualitario"
    miembro_usuario_ids: List[str] = []
    miembro_externo_ids: List[str] = []
    workspace_id: Optional[str] = None

    @field_validator("nombre")
    @classmethod
    def nombre_valido(cls, v: str) -> str:
        return _validar_nombre_grupo(v)

    @field_validator("moneda_principal")
    @classmethod
    def moneda_valida(cls, v: str) -> str:
        return validar_moneda(v)

    @field_validator("modo_reparto_default")
    @classmethod
    def modo_reparto_valido(cls, v: str) -> str:
        if v not in MODOS_REPARTO:
            raise ValueError(f"modo_reparto_default debe ser uno de {MODOS_REPARTO}")
        return v


class GrupoMiembroOut(BaseModel):
    id: str
    grupo_id: str
    usuario_id: Optional[str]
    externo_id: Optional[str]
    nombre_display: str
    rol: str
    activo: bool


class GrupoOut(BaseModel):
    id: str
    nombre: str
    emoji: str
    descripcion: Optional[str]
    moneda_principal: str
    es_cuenta_real: bool
    cuenta_id: Optional[str]
    modo_reparto_default: str
    creado_por: str
    creado_en: datetime
    cerrado_en: Optional[datetime]
    miembros: List[GrupoMiembroOut] = []


class GrupoUpdate(BaseModel):
    nombre: Optional[str] = None
    emoji: Optional[str] = Field(default=None, max_length=10)

    @field_validator("nombre")
    @classmethod
    def nombre_valido(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return _validar_nombre_grupo(v)


class GastoRepartoInput(BaseModel):
    miembro_id: str
    # Para modo manual: importe exacto
    importe_manual: Optional[Decimal] = None
    # Para modo porcentajes
    porcentaje: Optional[Decimal] = None
    # Para modo partes
    partes: Optional[int] = None


class GastoCompartidoCreate(BaseModel):
    grupo_id: str
    concepto: str
    importe: Decimal
    moneda: str
    fecha: date
    categoria_id: Optional[str] = None
    pagador_id: str
    modo_reparto: str = "igualitario"
    miembro_ids: List[str] = []
    repartos: List[GastoRepartoInput] = []
    afecta_cuenta_personal: bool = False
    cuenta_personal_id: Optional[str] = None
    categoria_personal_id: Optional[str] = None

    @field_validator("concepto")
    @classmethod
    def concepto_valido(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("El concepto no puede estar vacío")
        if len(stripped) > 200:
            raise ValueError("El concepto no puede superar 200 caracteres")
        return stripped

    @field_validator("importe")
    @classmethod
    def importe_valido(cls, v: Decimal) -> Decimal:
        return _validar_importe_positivo(v)

    @field_validator("moneda")
    @classmethod
    def moneda_valida(cls, v: str) -> str:
        return validar_moneda(v)

    @field_validator("modo_reparto")
    @classmethod
    def modo_reparto_valido(cls, v: str) -> str:
        if v not in MODOS_REPARTO:
            raise ValueError(f"modo_reparto debe ser uno de {MODOS_REPARTO}")
        return v


class GastoRepartoOut(BaseModel):
    id: str
    miembro_id: str
    importe_asignado: Decimal
    partes: Optional[int]
    porcentaje: Optional[Decimal]


class GastoCompartidoOut(BaseModel):
    id: str
    grupo_id: str
    concepto: str
    importe: Decimal
    moneda: str
    importe_convertido: Decimal
    tasa_cambio: Decimal
    fecha: date
    categoria_id: Optional[str]
    pagador_id: str
    modo_reparto: str
    afecta_cuenta_personal: bool
    movimiento_id: Optional[str]
    creado_por: str
    creado_en: datetime
    repartos: List[GastoRepartoOut] = []


class LiquidacionCreate(BaseModel):
    grupo_id: str
    de_miembro_id: str
    a_miembro_id: str
    importe: Decimal
    moneda: str
    cuenta_pago_id: Optional[str] = None
    cuenta_cobro_id: Optional[str] = None

    @field_validator("importe")
    @classmethod
    def importe_valido(cls, v: Decimal) -> Decimal:
        return _validar_importe_positivo(v)

    @field_validator("moneda")
    @classmethod
    def moneda_valida(cls, v: str) -> str:
        return validar_moneda(v)


class LiquidacionOut(BaseModel):
    id: str
    grupo_id: str
    de_miembro_id: str
    a_miembro_id: str
    importe: Decimal
    moneda: str
    movimiento_pago_id: Optional[str]
    movimiento_cobro_id: Optional[str]
    estado: str
    creado_en: datetime
    confirmado_en: Optional[datetime]


class BalanceGrupoOut(BaseModel):
    balance: Dict[str, Decimal]
    transferencias_optimas: List[Dict[str, object]]
