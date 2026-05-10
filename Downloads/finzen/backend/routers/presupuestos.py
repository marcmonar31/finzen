import json
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from database import get_session
from models.presupuesto import Presupuesto
from models.workspace import Workspace
from deps import get_current_user
from deps import get_current_workspace
from schemas.presupuesto import PresupuestoCreate, PresupuestoUpdate, PresupuestoOut, EstadoPresupuesto
from services.presupuestos_calc import calcular_estado

router = APIRouter(prefix="/presupuestos", tags=["presupuestos"])


def _build_out(p: Presupuesto, session: Session) -> PresupuestoOut:
    estado = calcular_estado(p, session)
    return PresupuestoOut.from_orm_with_estado(p, estado)


@router.get("", response_model=List[PresupuestoOut])
def listar(
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    presupuestos = session.exec(
        select(Presupuesto).where(
            Presupuesto.workspace_id == workspace.id,
            Presupuesto.archivado_en.is_(None),  # type: ignore[union-attr]
        ).order_by(Presupuesto.orden, Presupuesto.creado_en)  # type: ignore[union-attr]
    ).all()
    return [_build_out(p, session) for p in presupuestos]


@router.post("", response_model=PresupuestoOut, status_code=201)
def crear(
    body: PresupuestoCreate,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    p = Presupuesto(
        workspace_id=workspace.id,
        nombre=body.nombre,
        importe=body.importe,
        moneda=body.moneda,
        periodo=body.periodo,
        modo=body.modo,
        categoria_ids=json.dumps(body.categoria_ids),
        cuenta_ids=json.dumps(body.cuenta_ids),
    )
    session.add(p)
    session.commit()
    session.refresh(p)
    return _build_out(p, session)


@router.get("/{presupuesto_id}/estado", response_model=EstadoPresupuesto)
def estado(
    presupuesto_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    p = session.get(Presupuesto, presupuesto_id)
    if not p or p.workspace_id != workspace.id:
        raise HTTPException(404, "Presupuesto no encontrado")
    return calcular_estado(p, session)


@router.patch("/{presupuesto_id}", response_model=PresupuestoOut)
def actualizar(
    presupuesto_id: str,
    body: PresupuestoUpdate,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    p = session.get(Presupuesto, presupuesto_id)
    if not p or p.workspace_id != workspace.id:
        raise HTTPException(404, "Presupuesto no encontrado")

    datos = body.model_dump(exclude_unset=True)
    for campo, valor in datos.items():
        if campo == "categoria_ids":
            p.categoria_ids = json.dumps(valor)
        elif campo == "cuenta_ids":
            p.cuenta_ids = json.dumps(valor)
        else:
            setattr(p, campo, valor)

    session.add(p)
    session.commit()
    session.refresh(p)
    return _build_out(p, session)


@router.delete("/{presupuesto_id}", status_code=204)
def archivar(
    presupuesto_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    p = session.get(Presupuesto, presupuesto_id)
    if not p or p.workspace_id != workspace.id:
        raise HTTPException(404, "Presupuesto no encontrado")
    p.archivado_en = datetime.utcnow()
    session.add(p)
    session.commit()
