import hashlib
from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models.cuenta import Cuenta
from models.movimiento import Movimiento
from models.workspace import Workspace
from models.usuario import Usuario
from deps import get_current_user
from deps import get_current_workspace
from schemas.cuenta import CuentaCreate, CuentaUpdate, CuentaOut
from services.saldos import saldo_cuenta

router = APIRouter(prefix="/cuentas", tags=["cuentas"])


def _enrich(cuenta: Cuenta, session: Session) -> CuentaOut:
    out = CuentaOut.model_validate(cuenta)
    out.saldo = saldo_cuenta(cuenta.id, session)
    return out


@router.get("", response_model=List[CuentaOut])
def listar_cuentas(
    incluir_archivadas: bool = False,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    q = select(Cuenta).where(Cuenta.workspace_id == workspace.id)
    if not incluir_archivadas:
        q = q.where(Cuenta.archivado_en.is_(None))  # type: ignore[union-attr]
    q = q.order_by(Cuenta.orden, Cuenta.creado_en)
    cuentas = session.exec(q).all()
    return [_enrich(c, session) for c in cuentas]


@router.post("", response_model=CuentaOut, status_code=201)
def crear_cuenta(
    body: CuentaCreate,
    workspace: Workspace = Depends(get_current_workspace),
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    from datetime import date
    cuenta = Cuenta(
        workspace_id=workspace.id,
        nombre=body.nombre,
        tipo=body.tipo,
        moneda=body.moneda,
        saldo_inicial=body.saldo_inicial,
        fecha_saldo_inicial=body.fecha_saldo_inicial or date.today(),
        emoji=body.emoji,
        color=body.color,
        institucion=body.institucion,
        iban_ultimos4=body.iban_ultimos4,
        notas=body.notas,
        incluir_en_patrimonio=body.incluir_en_patrimonio,
        creado_por=current_user.id,
    )
    session.add(cuenta)
    session.commit()
    session.refresh(cuenta)
    return _enrich(cuenta, session)


@router.get("/{cuenta_id}", response_model=CuentaOut)
def get_cuenta(
    cuenta_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    cuenta = session.get(Cuenta, cuenta_id)
    if not cuenta or cuenta.workspace_id != workspace.id:
        raise HTTPException(404, "Cuenta no encontrada")
    return _enrich(cuenta, session)


@router.patch("/{cuenta_id}", response_model=CuentaOut)
def actualizar_cuenta(
    cuenta_id: str,
    body: CuentaUpdate,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    cuenta = session.get(Cuenta, cuenta_id)
    if not cuenta or cuenta.workspace_id != workspace.id:
        raise HTTPException(404, "Cuenta no encontrada")
    if cuenta.archivado_en:
        raise HTTPException(400, "La cuenta está archivada")

    datos = body.model_dump(exclude_unset=True)
    for campo, valor in datos.items():
        setattr(cuenta, campo, valor)
    session.add(cuenta)
    session.commit()
    session.refresh(cuenta)
    return _enrich(cuenta, session)


@router.delete("/{cuenta_id}", status_code=204)
def archivar_cuenta(
    cuenta_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    cuenta = session.get(Cuenta, cuenta_id)
    if not cuenta or cuenta.workspace_id != workspace.id:
        raise HTTPException(404, "Cuenta no encontrada")
    cuenta.archivado_en = datetime.utcnow()
    session.add(cuenta)
    session.commit()
