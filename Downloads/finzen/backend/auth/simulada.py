from fastapi import Header, HTTPException, Depends
from sqlmodel import Session, select
from database import get_session
from models.usuario import Usuario


def get_current_user(
    x_user_id: str = Header(..., alias="X-User-Id"),
    session: Session = Depends(get_session),
) -> Usuario:
    user = session.get(Usuario, x_user_id)
    if not user or not user.activo:
        raise HTTPException(status_code=401, detail="Usuario no autenticado")
    return user
