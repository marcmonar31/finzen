from fastapi import Header, HTTPException, Depends, Request
from sqlmodel import Session, select

from config import settings
from database import get_session
from models.workspace import Workspace
from models.miembro import WorkspaceMiembro
from models.usuario import Usuario


def get_current_user(
    request: Request,
    session: Session = Depends(get_session),
) -> Usuario:
    """
    En local: lee X-User-Id header (auth simulada).
    En producción: lee Authorization: Bearer <jwt> y verifica con Supabase.
    """
    if settings.is_local:
        from auth.simulada import get_current_user as get_user_simulado
        return get_user_simulado(request, session)
    else:
        from auth.real import get_current_user_real
        return get_current_user_real(request, session)


def get_current_workspace(
    x_workspace_id: str = Header(..., alias="X-Workspace-Id"),
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Workspace:
    workspace = session.get(Workspace, x_workspace_id)
    if not workspace or workspace.archivado_en is not None:
        raise HTTPException(status_code=404, detail="Workspace no encontrado")

    membresia = session.exec(
        select(WorkspaceMiembro).where(
            WorkspaceMiembro.workspace_id == x_workspace_id,
            WorkspaceMiembro.usuario_id == current_user.id,
        )
    ).first()

    if not membresia:
        raise HTTPException(status_code=403, detail="No tienes acceso a este workspace")

    return workspace
