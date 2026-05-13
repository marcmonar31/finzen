from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from database import get_session
from models.workspace import Workspace
from models.miembro import WorkspaceMiembro
from models.usuario import Usuario
from deps import get_current_user
from schemas.workspace import WorkspaceOut, WorkspaceUpdate

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.get("/{workspace_id}", response_model=WorkspaceOut)
def get_workspace(
    workspace_id: str,
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    workspace = session.get(Workspace, workspace_id)
    if not workspace or workspace.archivado_en is not None:
        raise HTTPException(status_code=404, detail="Workspace no encontrado")

    from sqlmodel import select
    membresia = session.exec(
        select(WorkspaceMiembro).where(
            WorkspaceMiembro.workspace_id == workspace_id,
            WorkspaceMiembro.usuario_id == current_user.id,
        )
    ).first()

    if not membresia:
        raise HTTPException(status_code=403, detail="No tienes acceso a este workspace")

    return workspace


@router.patch("/{workspace_id}", response_model=WorkspaceOut)
def actualizar_workspace(
    workspace_id: str,
    body: WorkspaceUpdate,
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    workspace = session.get(Workspace, workspace_id)
    if not workspace or workspace.archivado_en is not None:
        raise HTTPException(status_code=404, detail="Workspace no encontrado")

    from sqlmodel import select
    membresia = session.exec(
        select(WorkspaceMiembro).where(
            WorkspaceMiembro.workspace_id == workspace_id,
            WorkspaceMiembro.usuario_id == current_user.id,
        )
    ).first()

    if not membresia:
        raise HTTPException(status_code=403, detail="No tienes acceso a este workspace")

    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(workspace, k, v)
    session.add(workspace)
    session.commit()
    session.refresh(workspace)
    return workspace
