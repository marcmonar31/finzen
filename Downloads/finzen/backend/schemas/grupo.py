from datetime import date, datetime
from decimal import Decimal
from typing import Dict, List, Optional
from pydantic import BaseModel


class GrupoCreate(BaseModel):
    nombre: str
    emoji: str = "🤝"
    descripcion: Optional[str] = None
    moneda_principal: str = "EUR"
    es_cuenta_real: bool = False
    modo_reparto_default: str = "igualitario"
    # IDs de miembros iniciales (usuario_id o externo_id)
    miembro_usuario_ids: List[str] = []
    miembro_externo_ids: List[str] = []
    # Si es_cuenta_real=True, workspace_id para crear la cuenta
    workspace_id: Optional[str] = None


class GrupoMiembroOut(BaseModel):
    id: str
    grupo_id: str
    usuario_id: Optional[str]
    externo_id: Optional[str]
    nombre_display: str  # nombre del usuario o externo
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
    pagador_id: str  # miembro_id del pagador
    modo_reparto: str = "igualitario"
    # miembros_ids para igualitario/partes/porcentajes
    miembro_ids: List[str] = []
    # Detalle por miembro para modos no igualitario
    repartos: List[GastoRepartoInput] = []
    afecta_cuenta_personal: bool = False
    cuenta_personal_id: Optional[str] = None
    categoria_personal_id: Optional[str] = None


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
    # Registrar en cuentas personales
    cuenta_pago_id: Optional[str] = None    # cuenta del que paga
    cuenta_cobro_id: Optional[str] = None   # cuenta del que cobra


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
