import re
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, or_

from database import get_session
from deps import get_current_user
from models.amigo import Amigo, AmigoExterno
from models.usuario import Usuario
from schemas.amigo import AmigoExternoCreate, AmigoExternoOut, AmigoOut, AmigoSolicitudCreate

router = APIRouter(prefix="/amigos", tags=["amigos"])

USUARIO_UNICO_RE = re.compile(r"^[a-z][a-z0-9_.]{2,29}$")


# ──────────────────────────────────────────
# Búsqueda de usuarios
# ──────────────────────────────────────────

@router.get("/buscar", response_model=List[dict])
def buscar_usuario(q: str, current_user: Usuario = Depends(get_current_user), session: Session = Depends(get_session)):
    """Busca usuarios por @usuario_unico (sin el @). Excluye al propio usuario."""
    handle = q.lstrip("@").lower()
    resultados = session.exec(
        select(Usuario).where(
            Usuario.usuario_unico.contains(handle),  # type: ignore[attr-defined]
            Usuario.id != current_user.id,
            Usuario.activo == True,  # noqa: E712
        )
    ).all()
    return [{"id": u.id, "usuario_unico": u.usuario_unico, "nombre": u.nombre, "avatar_emoji": u.avatar_emoji} for u in resultados[:20]]


# ──────────────────────────────────────────
# Solicitudes de amistad
# ──────────────────────────────────────────

@router.post("/solicitud", response_model=AmigoOut)
def enviar_solicitud(
    body: AmigoSolicitudCreate,
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    handle = body.receptor_usuario_unico.lstrip("@").lower()
    receptor = session.exec(select(Usuario).where(Usuario.usuario_unico == handle)).first()
    if not receptor:
        raise HTTPException(404, "Usuario no encontrado")
    if receptor.id == current_user.id:
        raise HTTPException(400, "No puedes enviarte una solicitud a ti mismo")

    # Verificar que no exista ya una relación
    existente = session.exec(
        select(Amigo).where(
            or_(
                (Amigo.solicitante_id == current_user.id) & (Amigo.receptor_id == receptor.id),
                (Amigo.solicitante_id == receptor.id) & (Amigo.receptor_id == current_user.id),
            )
        )
    ).first()
    if existente:
        raise HTTPException(400, "Ya existe una relación con este usuario")

    amigo = Amigo(solicitante_id=current_user.id, receptor_id=receptor.id)
    session.add(amigo)
    session.commit()
    session.refresh(amigo)

    return AmigoOut(
        id=amigo.id,
        usuario_id=receptor.id,
        nombre=receptor.nombre,
        usuario_unico=receptor.usuario_unico,
        avatar_emoji=receptor.avatar_emoji,
        estado=amigo.estado,
        soy_solicitante=True,
    )


@router.post("/{amigo_id}/aceptar", response_model=AmigoOut)
def aceptar_solicitud(
    amigo_id: str,
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    rel = session.get(Amigo, amigo_id)
    if not rel or rel.receptor_id != current_user.id:
        raise HTTPException(404, "Solicitud no encontrada")
    if rel.estado != "pendiente":
        raise HTTPException(400, "La solicitud ya fue procesada")

    rel.estado = "aceptado"
    rel.actualizado_en = datetime.utcnow()
    session.add(rel)
    session.commit()
    session.refresh(rel)

    solicitante = session.get(Usuario, rel.solicitante_id)
    return AmigoOut(
        id=rel.id,
        usuario_id=rel.solicitante_id,
        nombre=solicitante.nombre if solicitante else "",
        usuario_unico=solicitante.usuario_unico if solicitante else "",
        avatar_emoji=solicitante.avatar_emoji if solicitante else "👤",
        estado=rel.estado,
        soy_solicitante=False,
    )


@router.post("/{amigo_id}/rechazar")
def rechazar_solicitud(
    amigo_id: str,
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    rel = session.get(Amigo, amigo_id)
    if not rel or rel.receptor_id != current_user.id:
        raise HTTPException(404, "Solicitud no encontrada")
    if rel.estado != "pendiente":
        raise HTTPException(400, "La solicitud ya fue procesada")

    rel.estado = "rechazado"
    rel.actualizado_en = datetime.utcnow()
    session.add(rel)
    session.commit()
    return {"ok": True}


@router.get("", response_model=List[AmigoOut])
def listar_amigos(
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Lista amigos aceptados del usuario actual."""
    relaciones = session.exec(
        select(Amigo).where(
            Amigo.estado == "aceptado",
            or_(Amigo.solicitante_id == current_user.id, Amigo.receptor_id == current_user.id),
        )
    ).all()

    resultado = []
    for rel in relaciones:
        soy_solicitante = rel.solicitante_id == current_user.id
        otro_id = rel.receptor_id if soy_solicitante else rel.solicitante_id
        otro = session.get(Usuario, otro_id)
        if otro:
            resultado.append(AmigoOut(
                id=rel.id,
                usuario_id=otro.id,
                nombre=otro.nombre,
                usuario_unico=otro.usuario_unico,
                avatar_emoji=otro.avatar_emoji,
                estado=rel.estado,
                soy_solicitante=soy_solicitante,
            ))
    return resultado


@router.get("/pendientes", response_model=List[AmigoOut])
def listar_pendientes(
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Solicitudes pendientes recibidas por el usuario actual."""
    relaciones = session.exec(
        select(Amigo).where(
            Amigo.receptor_id == current_user.id,
            Amigo.estado == "pendiente",
        )
    ).all()

    resultado = []
    for rel in relaciones:
        solicitante = session.get(Usuario, rel.solicitante_id)
        if solicitante:
            resultado.append(AmigoOut(
                id=rel.id,
                usuario_id=solicitante.id,
                nombre=solicitante.nombre,
                usuario_unico=solicitante.usuario_unico,
                avatar_emoji=solicitante.avatar_emoji,
                estado=rel.estado,
                soy_solicitante=False,
            ))
    return resultado


# ──────────────────────────────────────────
# Amigos externos
# ──────────────────────────────────────────

@router.post("/externos", response_model=AmigoExternoOut)
def crear_externo(
    body: AmigoExternoCreate,
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    externo = AmigoExterno(
        creado_por=current_user.id,
        nombre=body.nombre,
        email=body.email,
        telefono=body.telefono,
    )
    session.add(externo)
    session.commit()
    session.refresh(externo)
    return AmigoExternoOut(
        id=externo.id,
        nombre=externo.nombre,
        email=externo.email,
        telefono=externo.telefono,
        usuario_real_id=externo.usuario_real_id,
        creado_en=externo.creado_en,
    )


@router.get("/externos", response_model=List[AmigoExternoOut])
def listar_externos(
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    externos = session.exec(
        select(AmigoExterno).where(
            AmigoExterno.creado_por == current_user.id,
            AmigoExterno.archivado_en == None,  # noqa: E711
        )
    ).all()
    return [AmigoExternoOut(
        id=e.id, nombre=e.nombre, email=e.email, telefono=e.telefono,
        usuario_real_id=e.usuario_real_id, creado_en=e.creado_en,
    ) for e in externos]


@router.post("/externos/{externo_id}/vincular/{usuario_real_id}")
def vincular_externo_a_real(
    externo_id: str,
    usuario_real_id: str,
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Vincula un amigo externo con un usuario real de la app."""
    externo = session.get(AmigoExterno, externo_id)
    if not externo or externo.creado_por != current_user.id:
        raise HTTPException(404, "Amigo externo no encontrado")
    usuario_real = session.get(Usuario, usuario_real_id)
    if not usuario_real:
        raise HTTPException(404, "Usuario no encontrado")

    externo.usuario_real_id = usuario_real_id
    session.add(externo)
    session.commit()
    return {"ok": True}
