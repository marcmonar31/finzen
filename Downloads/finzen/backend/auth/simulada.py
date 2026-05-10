from fastapi import HTTPException, Request
from sqlmodel import Session
from models.usuario import Usuario


def get_current_user(request: Request, session: Session) -> Usuario:
    """Auth simulada: lee X-User-Id header directamente."""
    user_id = request.headers.get("X-User-Id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Header X-User-Id requerido (modo local)")
    user = session.get(Usuario, user_id)
    if not user or not user.activo:
        raise HTTPException(status_code=401, detail="Usuario no autenticado")
    return user
