"""Modo viaje y modo emergencia del workspace."""
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from deps import get_current_user, get_current_workspace
from models.inversion import ModoViaje
from models.workspace_config import WorkspaceConfig
from models.usuario import Usuario
from models.workspace import Workspace

router = APIRouter(tags=["modos"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class ModoViajeCreate(BaseModel):
    nombre: str
    fecha_inicio: date
    fecha_fin: Optional[date] = None
    etiqueta_id: Optional[str] = None


class ModoViajeUpdate(BaseModel):
    nombre: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    etiqueta_id: Optional[str] = None
    activo: Optional[bool] = None


class ModoEmergenciaUpdate(BaseModel):
    activo: bool


# ── Modo Viaje ──────────────────────────────────────────────────────────────────

@router.get("/modos/viaje")
def listar_modos_viaje(
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    modos = session.exec(
        select(ModoViaje).where(ModoViaje.workspace_id == workspace.id)
    ).all()
    return modos


@router.post("/modos/viaje", status_code=201)
def crear_modo_viaje(
    body: ModoViajeCreate,
    current_user: Usuario = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    modo = ModoViaje(
        workspace_id=workspace.id,
        nombre=body.nombre,
        fecha_inicio=body.fecha_inicio,
        fecha_fin=body.fecha_fin,
        etiqueta_id=body.etiqueta_id,
        creado_por=current_user.id,
    )
    session.add(modo)
    session.commit()
    session.refresh(modo)
    return modo


@router.patch("/modos/viaje/{modo_id}")
def actualizar_modo_viaje(
    modo_id: str,
    body: ModoViajeUpdate,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    modo = session.get(ModoViaje, modo_id)
    if not modo or modo.workspace_id != workspace.id:
        raise HTTPException(404, "Modo viaje no encontrado")
    for campo, valor in body.model_dump(exclude_unset=True).items():
        setattr(modo, campo, valor)
    session.add(modo)
    session.commit()
    session.refresh(modo)
    return modo


@router.delete("/modos/viaje/{modo_id}", status_code=204)
def eliminar_modo_viaje(
    modo_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    modo = session.get(ModoViaje, modo_id)
    if not modo or modo.workspace_id != workspace.id:
        raise HTTPException(404, "Modo viaje no encontrado")
    session.delete(modo)
    session.commit()


# ── Modo Emergencia ─────────────────────────────────────────────────────────────

@router.get("/modos/emergencia")
def get_modo_emergencia(
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    config = session.exec(
        select(WorkspaceConfig).where(WorkspaceConfig.workspace_id == workspace.id)
    ).first()
    return {"activo": config.modo_emergencia if config else False}


@router.patch("/modos/emergencia")
def set_modo_emergencia(
    body: ModoEmergenciaUpdate,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    config = session.exec(
        select(WorkspaceConfig).where(WorkspaceConfig.workspace_id == workspace.id)
    ).first()
    if not config:
        config = WorkspaceConfig(workspace_id=workspace.id)
    config.modo_emergencia = body.activo
    config.actualizado_en = datetime.utcnow()
    session.add(config)
    session.commit()
    session.refresh(config)
    return {"activo": config.modo_emergencia}
