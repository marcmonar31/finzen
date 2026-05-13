from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from database import get_session
from models.transferencia import Transferencia
from models.movimiento import Movimiento
from models.categoria import Categoria
from models.workspace import Workspace
from models.usuario import Usuario
from models.cuenta import Cuenta
from deps import get_current_user
from deps import get_current_workspace
from schemas.transferencia import TransferenciaCreate, TransferenciaOut
from schemas.movimiento import MovimientoOut
from services.transferencias import crear_transferencia as _crear_transferencia

router = APIRouter(prefix="/transferencias", tags=["transferencias"])


def _enrich_movimiento(mov: Movimiento, session: Session, contraparte_cuenta_nombre: Optional[str] = None) -> MovimientoOut:
    out = MovimientoOut.model_validate(mov)
    if mov.categoria_id:
        cat = session.get(Categoria, mov.categoria_id)
        if cat:
            out.categoria_emoji = cat.emoji
            out.categoria_nombre = cat.nombre
    cuenta = session.get(Cuenta, mov.cuenta_id)
    if cuenta:
        out.cuenta_nombre = cuenta.nombre
    out.cuenta_contraparte_nombre = contraparte_cuenta_nombre
    return out


def _enrich_transferencia(t: Transferencia, session: Session) -> TransferenciaOut:
    out = TransferenciaOut.model_validate(t)
    mov_orig = session.get(Movimiento, t.movimiento_origen_id)
    mov_dest = session.get(Movimiento, t.movimiento_destino_id)
    cuenta_orig_nombre = None
    cuenta_dest_nombre = None
    if mov_orig:
        c = session.get(Cuenta, mov_orig.cuenta_id)
        cuenta_orig_nombre = c.nombre if c else None
    if mov_dest:
        c = session.get(Cuenta, mov_dest.cuenta_id)
        cuenta_dest_nombre = c.nombre if c else None
    if mov_orig:
        out.movimiento_origen = _enrich_movimiento(mov_orig, session, contraparte_cuenta_nombre=cuenta_dest_nombre)
    if mov_dest:
        out.movimiento_destino = _enrich_movimiento(mov_dest, session, contraparte_cuenta_nombre=cuenta_orig_nombre)
    return out


@router.post("", response_model=TransferenciaOut, status_code=201)
def crear(
    body: TransferenciaCreate,
    workspace: Workspace = Depends(get_current_workspace),
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    transferencia = _crear_transferencia(
        workspace_id=workspace.id,
        workspace_moneda_base=workspace.moneda_base,
        usuario_id=current_user.id,
        cuenta_origen_id=body.cuenta_origen_id,
        cuenta_destino_id=body.cuenta_destino_id,
        importe_origen=body.importe_origen,
        fecha=body.fecha,
        concepto=body.concepto,
        session=session,
        importe_destino=body.importe_destino,
        notas=body.notas,
    )
    return _enrich_transferencia(transferencia, session)


@router.get("", response_model=List[TransferenciaOut])
def listar(
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    transferencias = session.exec(
        select(Transferencia)
        .where(Transferencia.workspace_id == workspace.id)
        .order_by(Transferencia.creado_en.desc())  # type: ignore[union-attr]
    ).all()
    return [_enrich_transferencia(t, session) for t in transferencias]


@router.delete("/{transferencia_id}", status_code=204)
def archivar(
    transferencia_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    from datetime import datetime
    from fastapi import HTTPException

    t = session.get(Transferencia, transferencia_id)
    if not t or t.workspace_id != workspace.id:
        raise HTTPException(404, "Transferencia no encontrada")

    now = datetime.utcnow()
    for mov_id in [t.movimiento_origen_id, t.movimiento_destino_id]:
        mov = session.get(Movimiento, mov_id)
        if mov:
            mov.archivado_en = now
            session.add(mov)

    session.delete(t)
    session.commit()
