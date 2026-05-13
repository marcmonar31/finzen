import json
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from database import get_session
from deps import get_current_user, get_current_workspace
from models.regla import Regla, ReglaEjecucion
from models.usuario import Usuario
from models.workspace import Workspace
from schemas.regla import ReglaCreate, ReglaEjecucionOut, ReglaOut, ReglaUpdate
from services.reglas_engine import simular_regla

router = APIRouter(prefix="/reglas", tags=["reglas"])


@router.get("", response_model=List[ReglaOut])
def listar_reglas(
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    reglas = session.exec(
        select(Regla).where(
            Regla.workspace_id == workspace.id,
            Regla.archivado_en == None,  # noqa: E711
        ).order_by(Regla.orden, Regla.creado_en)
    ).all()
    return [ReglaOut.from_orm(r) for r in reglas]


@router.post("", response_model=ReglaOut)
def crear_regla(
    body: ReglaCreate,
    current_user: Usuario = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    regla = Regla(
        workspace_id=workspace.id,
        nombre=body.nombre,
        descripcion=body.descripcion,
        trigger_tipo=body.trigger_tipo,
        trigger_config=json.dumps(body.trigger_config),
        condiciones=json.dumps(body.condiciones),
        modo_condiciones=body.modo_condiciones,
        acciones=json.dumps(body.acciones),
        max_ejecuciones_mes=body.max_ejecuciones_mes,
        orden=body.orden,
        creado_por=current_user.id,
    )
    session.add(regla)
    session.commit()
    session.refresh(regla)
    return ReglaOut.from_orm(regla)


@router.patch("/{regla_id}", response_model=ReglaOut)
def actualizar_regla(
    regla_id: str,
    body: ReglaUpdate,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    regla = session.get(Regla, regla_id)
    if not regla or regla.workspace_id != workspace.id or regla.archivado_en:
        raise HTTPException(404, "Regla no encontrada")

    if body.nombre is not None:
        regla.nombre = body.nombre
    if body.descripcion is not None:
        regla.descripcion = body.descripcion
    if body.activa is not None:
        regla.activa = body.activa
    if body.trigger_config is not None:
        regla.trigger_config = json.dumps(body.trigger_config)
    if body.condiciones is not None:
        regla.condiciones = json.dumps(body.condiciones)
    if body.acciones is not None:
        regla.acciones = json.dumps(body.acciones)
    if body.modo_condiciones is not None:
        regla.modo_condiciones = body.modo_condiciones
    if body.max_ejecuciones_mes is not None:
        regla.max_ejecuciones_mes = body.max_ejecuciones_mes
    if body.orden is not None:
        regla.orden = body.orden

    session.add(regla)
    session.commit()
    session.refresh(regla)
    return ReglaOut.from_orm(regla)


@router.delete("/{regla_id}", status_code=204)
def archivar_regla(
    regla_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    regla = session.get(Regla, regla_id)
    if not regla or regla.workspace_id != workspace.id or regla.archivado_en:
        raise HTTPException(404, "Regla no encontrada")
    regla.archivado_en = datetime.utcnow()
    session.add(regla)
    session.commit()


@router.post("/{regla_id}/simular")
def simular(
    regla_id: str,
    dias_atras: int = 30,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    regla = session.get(Regla, regla_id)
    if not regla or regla.workspace_id != workspace.id or regla.archivado_en:
        raise HTTPException(404, "Regla no encontrada")
    resultados = simular_regla(regla, session, dias_atras)
    return {"resultados": resultados, "total_disparos": len(resultados)}


@router.get("/{regla_id}/ejecuciones", response_model=List[ReglaEjecucionOut])
def historial_ejecuciones(
    regla_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    ejecuciones = session.exec(
        select(ReglaEjecucion).where(
            ReglaEjecucion.regla_id == regla_id,
            ReglaEjecucion.workspace_id == workspace.id,
        ).order_by(ReglaEjecucion.ejecutado_en.desc()).limit(50)  # type: ignore[attr-defined]
    ).all()
    return [ReglaEjecucionOut.from_orm(e) for e in ejecuciones]
