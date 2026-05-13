"""
Autenticación real con Supabase JWT.
Activa cuando ENVIRONMENT=produccion.

El flujo:
1. El frontend hace sign-in con Supabase → recibe un JWT access_token
2. El frontend envía el token en el header: Authorization: Bearer <token>
3. Este módulo verifica el JWT con SUPABASE_JWT_SECRET
4. Extrae el sub (Supabase user UUID) y el email
5. Busca o crea el Usuario en nuestra BD
"""
import logging
from typing import Optional, Tuple

import jwt
from fastapi import HTTPException, Request
from sqlmodel import Session, select

from config import settings
from models.usuario import Usuario
from models.workspace import Workspace
from models.miembro import WorkspaceMiembro
from services.workspace_defaults import seed_workspace_defaults

logger = logging.getLogger(__name__)


def _verificar_token(token: str) -> dict:
    """Decodifica y verifica un JWT de Supabase. Lanza HTTPException si es inválido."""
    if not settings.SUPABASE_JWT_SECRET:
        raise HTTPException(503, "Auth no configurada (falta SUPABASE_JWT_SECRET)")
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},  # Supabase no usa audience por defecto
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expirado")
    except jwt.InvalidTokenError as e:
        raise HTTPException(401, f"Token inválido: {e}")


def get_current_user_real(request: Request, session: Session) -> Usuario:
    """Extrae el usuario del JWT. Crea el usuario en BD si es la primera vez."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(401, "Se requiere Authorization: Bearer <token>")

    token = auth_header.removeprefix("Bearer ").strip()
    payload = _verificar_token(token)

    auth_id: Optional[str] = payload.get("sub")
    email: Optional[str] = payload.get("email")
    if not auth_id:
        raise HTTPException(401, "Token sin sub (user_id)")

    # Buscar usuario existente por auth_id
    usuario = session.exec(
        select(Usuario).where(Usuario.auth_id == auth_id)
    ).first()

    if not usuario:
        # Primera vez que inicia sesión → crear usuario
        usuario = _registrar_nuevo_usuario(auth_id, email, session)

    return usuario


def _registrar_nuevo_usuario(auth_id: str, email: Optional[str], session: Session) -> Usuario:
    """Crea usuario + workspace inicial cuando alguien se registra por primera vez."""
    nombre = (email or "Usuario").split("@")[0].capitalize()
    usuario_unico = _generar_usuario_unico(nombre, session)

    usuario = Usuario(
        auth_id=auth_id,
        email=email,
        nombre=nombre,
        usuario_unico=usuario_unico,
    )
    session.add(usuario)
    session.flush()

    # Workspace inicial
    from models.workspace import Workspace
    from models.miembro import WorkspaceMiembro
    ws = Workspace(
        nombre=f"Personal de {nombre}",
        emoji="home",
        moneda_base="EUR",
        owner_id=usuario.id,
    )
    session.add(ws)
    session.flush()

    session.add(WorkspaceMiembro(workspace_id=ws.id, usuario_id=usuario.id, rol="owner"))
    session.flush()

    seed_workspace_defaults(ws.id, usuario.id, session)
    session.commit()
    session.refresh(usuario)

    logger.info(f"Nuevo usuario registrado: {usuario_unico} (auth_id={auth_id})")
    return usuario


def _generar_usuario_unico(base: str, session: Session) -> str:
    """Genera un usuario_unico disponible a partir de un nombre base."""
    import re
    slug = re.sub(r"[^a-z0-9]", "", base.lower())[:20] or "usuario"
    candidato = slug
    i = 2
    while session.exec(select(Usuario).where(Usuario.usuario_unico == candidato)).first():
        candidato = f"{slug}{i}"
        i += 1
    return candidato
