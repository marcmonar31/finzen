from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlmodel import Session, select
from database import get_session
from models.etiqueta import Etiqueta
from models.workspace import Workspace
from deps import get_current_workspace

router = APIRouter(prefix="/etiquetas", tags=["etiquetas"])


class EtiquetaCreate(BaseModel):
    nombre: str
    color: Optional[str] = None


class EtiquetaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    workspace_id: str
    nombre: str
    color: Optional[str]


@router.get("", response_model=List[EtiquetaOut])
def listar(workspace: Workspace = Depends(get_current_workspace), session: Session = Depends(get_session)):
    return session.exec(select(Etiqueta).where(Etiqueta.workspace_id == workspace.id)).all()


@router.post("", response_model=EtiquetaOut, status_code=201)
def crear(
    body: EtiquetaCreate,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    existente = session.exec(
        select(Etiqueta).where(Etiqueta.workspace_id == workspace.id, Etiqueta.nombre == body.nombre)
    ).first()
    if existente:
        raise HTTPException(409, "Ya existe una etiqueta con ese nombre")
    et = Etiqueta(workspace_id=workspace.id, nombre=body.nombre, color=body.color)
    session.add(et)
    session.commit()
    session.refresh(et)
    return et


@router.delete("/{etiqueta_id}", status_code=204)
def eliminar(
    etiqueta_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    et = session.get(Etiqueta, etiqueta_id)
    if not et or et.workspace_id != workspace.id:
        raise HTTPException(404, "Etiqueta no encontrada")
    session.delete(et)
    session.commit()
