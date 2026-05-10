"""
Endpoints de autenticación para Supabase.

En producción:
- El frontend hace sign-in → obtiene JWT → lo envía en Authorization header
- GET /auth/me verifica el JWT y devuelve el perfil del usuario (creándolo si es nuevo)
- El frontend también puede usar este endpoint para saber si ya tiene perfil

En local (ENVIRONMENT=local):
- GET /auth/me usa X-User-Id header
- POST /auth/debug/login solo disponible en local para testing
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from config import settings
from database import get_session
from deps import get_current_user
from models.usuario import Usuario
from models.workspace import Workspace
from models.miembro import WorkspaceMiembro

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me")
def get_me(
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Devuelve el perfil del usuario autenticado + sus workspaces."""
    workspaces = session.exec(
        select(Workspace).join(
            WorkspaceMiembro, WorkspaceMiembro.workspace_id == Workspace.id
        ).where(WorkspaceMiembro.usuario_id == current_user.id)
    ).all()
    return {
        "usuario": current_user,
        "workspaces": workspaces,
    }


@router.get("/config")
def get_auth_config():
    """Devuelve la configuración de auth para que el frontend sepa qué modo usar."""
    return {
        "modo": "simulado" if settings.is_local else "supabase",
        "supabase_url": settings.SUPABASE_URL if not settings.is_local else None,
        "supabase_anon_key": settings.SUPABASE_ANON_KEY if not settings.is_local else None,
    }


# ── Solo disponible en modo local ──────────────────────────────────────────────

@router.get("/demo/usuarios")
def listar_usuarios_demo(session: Session = Depends(get_session)):
    """Lista todos los usuarios disponibles para el selector demo (solo en local)."""
    if not settings.is_local:
        raise HTTPException(403, "Solo disponible en entorno local")
    usuarios = session.exec(select(Usuario)).all()
    return usuarios
