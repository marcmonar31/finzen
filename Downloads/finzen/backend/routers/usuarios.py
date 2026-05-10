from typing import List
from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from database import get_session
from models.usuario import Usuario
from models.miembro import WorkspaceMiembro
from models.workspace import Workspace
from auth.simulada import get_current_user
from schemas.usuario import UsuarioOut
from schemas.workspace import WorkspaceConRol

router = APIRouter(prefix="/usuarios", tags=["usuarios"])


@router.get("/demo", response_model=List[UsuarioOut])
def listar_usuarios_demo(session: Session = Depends(get_session)):
    """Devuelve los usuarios demo (solo en modo local)."""
    usuarios = session.exec(select(Usuario).where(Usuario.activo == True)).all()
    return usuarios


@router.get("/me", response_model=UsuarioOut)
def get_me(current_user: Usuario = Depends(get_current_user)):
    return current_user


@router.get("/me/workspaces", response_model=List[WorkspaceConRol])
def get_mis_workspaces(
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    membresias = session.exec(
        select(WorkspaceMiembro).where(
            WorkspaceMiembro.usuario_id == current_user.id
        )
    ).all()

    resultado = []
    for m in membresias:
        ws = session.get(Workspace, m.workspace_id)
        if ws and ws.archivado_en is None:
            resultado.append(WorkspaceConRol(
                id=ws.id,
                nombre=ws.nombre,
                descripcion=ws.descripcion,
                emoji=ws.emoji,
                moneda_base=ws.moneda_base,
                owner_id=ws.owner_id,
                creado_en=ws.creado_en,
                rol=m.rol,
            ))
    return resultado
