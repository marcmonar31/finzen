from datetime import datetime
from decimal import Decimal
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from database import get_session
from deps import get_current_user, get_current_workspace
from models.objetivo import Objetivo, ObjetivoAportacion
from models.cuenta import Cuenta
from models.usuario import Usuario
from models.workspace import Workspace
from schemas.objetivo import AportacionCreate, AportacionOut, ObjetivoCreate, ObjetivoOut, ObjetivoUpdate

router = APIRouter(prefix="/objetivos", tags=["objetivos"])


def _aportado(objetivo_id: str, session: Session) -> Decimal:
    aportaciones = session.exec(
        select(ObjetivoAportacion).where(ObjetivoAportacion.objetivo_id == objetivo_id)
    ).all()
    return sum(a.importe for a in aportaciones) or Decimal("0")


@router.get("", response_model=List[ObjetivoOut])
def listar(
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    objetivos = session.exec(
        select(Objetivo).where(
            Objetivo.workspace_id == workspace.id,
            Objetivo.archivado_en == None,  # noqa: E711
        ).order_by(Objetivo.creado_en)
    ).all()
    return [ObjetivoOut.from_orm(o, _aportado(o.id, session)) for o in objetivos]


@router.post("", response_model=ObjetivoOut, status_code=201)
def crear(
    body: ObjetivoCreate,
    current_user: Usuario = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    if body.cuenta_id:
        cuenta = session.get(Cuenta, body.cuenta_id)
        if not cuenta or cuenta.workspace_id != workspace.id:
            raise HTTPException(400, "Cuenta no válida")

    obj = Objetivo(
        workspace_id=workspace.id,
        creado_por=current_user.id,
        **body.model_dump(),
    )
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return ObjetivoOut.from_orm(obj, Decimal("0"))


@router.patch("/{obj_id}", response_model=ObjetivoOut)
def actualizar(
    obj_id: str,
    body: ObjetivoUpdate,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    obj = session.get(Objetivo, obj_id)
    if not obj or obj.workspace_id != workspace.id or obj.archivado_en:
        raise HTTPException(404, "Objetivo no encontrado")

    datos = body.model_dump(exclude_unset=True)
    if "cuenta_id" in datos and datos["cuenta_id"] is not None:
        cuenta = session.get(Cuenta, datos["cuenta_id"])
        if not cuenta or cuenta.workspace_id != workspace.id:
            raise HTTPException(400, "Cuenta no válida")

    for campo, valor in datos.items():
        setattr(obj, campo, valor)
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return ObjetivoOut.from_orm(obj, _aportado(obj.id, session))


@router.delete("/{obj_id}", status_code=204)
def archivar(
    obj_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    obj = session.get(Objetivo, obj_id)
    if not obj or obj.workspace_id != workspace.id or obj.archivado_en:
        raise HTTPException(404, "Objetivo no encontrado")
    obj.archivado_en = datetime.utcnow()
    session.add(obj)
    session.commit()


@router.post("/{obj_id}/aportaciones", response_model=AportacionOut, status_code=201)
def aportar(
    obj_id: str,
    body: AportacionCreate,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    obj = session.get(Objetivo, obj_id)
    if not obj or obj.workspace_id != workspace.id or obj.archivado_en:
        raise HTTPException(404, "Objetivo no encontrado")

    cuenta = session.get(Cuenta, body.cuenta_id)
    if not cuenta or cuenta.workspace_id != workspace.id:
        raise HTTPException(400, "Cuenta no válida")

    aportacion = ObjetivoAportacion(
        objetivo_id=obj_id,
        workspace_id=workspace.id,
        **body.model_dump(),
    )
    session.add(aportacion)
    session.commit()
    session.refresh(aportacion)
    return AportacionOut.from_orm(aportacion)


@router.get("/{obj_id}/aportaciones", response_model=List[AportacionOut])
def listar_aportaciones(
    obj_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    obj = session.get(Objetivo, obj_id)
    if not obj or obj.workspace_id != workspace.id:
        raise HTTPException(404, "Objetivo no encontrado")
    aportaciones = session.exec(
        select(ObjetivoAportacion)
        .where(ObjetivoAportacion.objetivo_id == obj_id)
        .order_by(ObjetivoAportacion.fecha.desc())  # type: ignore[arg-type]
    ).all()
    return [AportacionOut.from_orm(a) for a in aportaciones]
