from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from database import get_session
from models.usuario import Usuario
from models.miembro import WorkspaceMiembro
from models.workspace import Workspace
from deps import get_current_user
from schemas.usuario import UsuarioOut, UsuarioUpdate
from schemas.workspace import WorkspaceConRol

router = APIRouter(prefix="/usuarios", tags=["usuarios"])


@router.get("/demo", response_model=List[UsuarioOut])
def listar_usuarios_demo(session: Session = Depends(get_session)):
    """Devuelve los usuarios demo (solo en modo local)."""
    usuarios = session.exec(select(Usuario).where(Usuario.activo == True)).all()  # noqa: E712
    return usuarios


@router.get("/me", response_model=UsuarioOut)
def get_me(current_user: Usuario = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UsuarioOut)
def actualizar_me(
    body: UsuarioUpdate,
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    cambios = body.model_dump(exclude_unset=True)
    if not cambios:
        raise HTTPException(400, "No hay campos para actualizar")

    # Verificar email único si se cambia
    if "email" in cambios and cambios["email"]:
        existente = session.exec(
            select(Usuario).where(
                Usuario.email == cambios["email"],
                Usuario.id != current_user.id,
            )
        ).first()
        if existente:
            raise HTTPException(409, "Este email ya está en uso por otra cuenta")

    # foto_data vacío = eliminar foto
    if "foto_data" in cambios and cambios["foto_data"] == "":
        cambios["foto_data"] = None

    for campo, valor in cambios.items():
        setattr(current_user, campo, valor)

    session.add(current_user)
    session.commit()
    session.refresh(current_user)
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
