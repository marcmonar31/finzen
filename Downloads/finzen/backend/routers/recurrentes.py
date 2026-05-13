from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from database import get_session
from models.recurrente import Recurrente
from models.cuenta import Cuenta
from models.categoria import Categoria
from models.workspace import Workspace
from models.usuario import Usuario
from deps import get_current_user
from deps import get_current_workspace
from schemas.recurrente import RecurrenteCreate, RecurrenteUpdate, RecurrenteOut
from services.recurrentes_svc import calcular_proxima_ejecucion

router = APIRouter(prefix="/recurrentes", tags=["recurrentes"])


@router.get("", response_model=List[RecurrenteOut])
def listar(
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    return session.exec(
        select(Recurrente).where(
            Recurrente.workspace_id == workspace.id,
            Recurrente.archivado_en.is_(None),  # type: ignore[union-attr]
        ).order_by(Recurrente.proxima_ejecucion)  # type: ignore[union-attr]
    ).all()


@router.post("", response_model=RecurrenteOut, status_code=201)
def crear(
    body: RecurrenteCreate,
    workspace: Workspace = Depends(get_current_workspace),
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    cuenta = session.get(Cuenta, body.cuenta_id)
    if not cuenta or cuenta.workspace_id != workspace.id:
        raise HTTPException(400, "Cuenta no válida")
    if cuenta.archivado_en:
        raise HTTPException(400, "La cuenta está archivada")

    if body.categoria_id:
        cat = session.get(Categoria, body.categoria_id)
        if not cat or cat.workspace_id != workspace.id:
            raise HTTPException(400, "Categoría no válida")

    rec = Recurrente(
        workspace_id=workspace.id,
        nombre=body.nombre,
        tipo=body.tipo,
        importe=body.importe,
        moneda=body.moneda,
        cuenta_id=body.cuenta_id,
        categoria_id=body.categoria_id,
        frecuencia=body.frecuencia,
        dia_mes=body.dia_mes,
        proxima_ejecucion=body.fecha_inicio,
        notas=body.notas,
        creado_por=current_user.id,
    )
    session.add(rec)
    session.commit()
    session.refresh(rec)
    return rec


@router.patch("/{rec_id}", response_model=RecurrenteOut)
def actualizar(
    rec_id: str,
    body: RecurrenteUpdate,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    rec = session.get(Recurrente, rec_id)
    if not rec or rec.workspace_id != workspace.id or rec.archivado_en:
        raise HTTPException(404, "Recurrente no encontrado")

    datos = body.model_dump(exclude_unset=True)

    if "cuenta_id" in datos:
        cuenta = session.get(Cuenta, datos["cuenta_id"])
        if not cuenta or cuenta.workspace_id != workspace.id:
            raise HTTPException(400, "Cuenta no válida")
        if cuenta.archivado_en:
            raise HTTPException(400, "La cuenta está archivada")

    if "categoria_id" in datos and datos["categoria_id"] is not None:
        cat = session.get(Categoria, datos["categoria_id"])
        if not cat or cat.workspace_id != workspace.id:
            raise HTTPException(400, "Categoría no válida")

    for campo, valor in datos.items():
        setattr(rec, campo, valor)

    session.add(rec)
    session.commit()
    session.refresh(rec)
    return rec


@router.post("/{rec_id}/ejecutar", response_model=RecurrenteOut)
def ejecutar_manualmente(
    rec_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    """Ejecuta el recurrente ahora (para testing o ejecución manual)."""
    from models.movimiento import Movimiento
    from services.conversion import convertir

    rec = session.get(Recurrente, rec_id)
    if not rec or rec.workspace_id != workspace.id or rec.archivado_en:
        raise HTTPException(404, "Recurrente no encontrado")
    if not rec.activo:
        raise HTTPException(400, "El recurrente está pausado")

    ws = session.get(Workspace, workspace.id)
    importe_base, tasa = convertir(
        rec.importe, rec.moneda, ws.moneda_base, rec.proxima_ejecucion, session
    )
    mov = Movimiento(
        workspace_id=rec.workspace_id,
        cuenta_id=rec.cuenta_id,
        tipo=rec.tipo,
        importe=rec.importe,
        moneda=rec.moneda,
        importe_base=importe_base,
        tasa_cambio=tasa,
        fecha=rec.proxima_ejecucion,
        categoria_id=rec.categoria_id,
        concepto=rec.nombre,
        notas=rec.notas,
        fuente="recurrente",
        fuente_id=rec.id,
        estado="confirmado",
        creado_por=ws.owner_id,
    )
    session.add(mov)

    rec.proxima_ejecucion = calcular_proxima_ejecucion(
        rec.frecuencia, rec.proxima_ejecucion, rec.dia_mes
    )
    session.add(rec)
    session.commit()
    session.refresh(rec)
    return rec


@router.delete("/{rec_id}", status_code=204)
def archivar(
    rec_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    rec = session.get(Recurrente, rec_id)
    if not rec or rec.workspace_id != workspace.id or rec.archivado_en:
        raise HTTPException(404, "Recurrente no encontrado")
    rec.archivado_en = datetime.utcnow()
    session.add(rec)
    session.commit()
