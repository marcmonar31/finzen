import hashlib
from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from database import get_session
from models.movimiento import Movimiento, MovimientoEtiqueta
from models.cuenta import Cuenta
from models.categoria import Categoria
from models.etiqueta import Etiqueta
from models.workspace import Workspace
from models.usuario import Usuario
from deps import get_current_user
from deps import get_current_workspace
from schemas.movimiento import MovimientoCreate, MovimientoUpdate, MovimientoOut
from services.conversion import convertir

router = APIRouter(prefix="/movimientos", tags=["movimientos"])


def _hash(workspace_id: str, cuenta_id: str, fecha: date, importe: Decimal, concepto: str) -> str:
    raw = f"{workspace_id}|{cuenta_id}|{fecha.isoformat()}|{importe}|{concepto}"
    return hashlib.sha256(raw.encode()).hexdigest()


def _enrich(mov: Movimiento, session: Session) -> MovimientoOut:
    out = MovimientoOut.model_validate(mov)
    if mov.categoria_id:
        cat = session.get(Categoria, mov.categoria_id)
        if cat:
            out.categoria_emoji = cat.emoji
            out.categoria_nombre = cat.nombre
    return out


@router.get("", response_model=List[MovimientoOut])
def listar(
    cuenta_id: Optional[str] = Query(None),
    categoria_id: Optional[str] = Query(None),
    tipo: Optional[str] = Query(None),
    busqueda: Optional[str] = Query(None),
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    q = select(Movimiento).where(
        Movimiento.workspace_id == workspace.id,
        Movimiento.archivado_en.is_(None),  # type: ignore[union-attr]
    )
    if cuenta_id:
        q = q.where(Movimiento.cuenta_id == cuenta_id)
    if categoria_id:
        q = q.where(Movimiento.categoria_id == categoria_id)
    if tipo:
        q = q.where(Movimiento.tipo == tipo)
    if busqueda:
        q = q.where(Movimiento.concepto.ilike(f"%{busqueda}%"))  # type: ignore[union-attr]
    if fecha_desde:
        q = q.where(Movimiento.fecha >= fecha_desde)
    if fecha_hasta:
        q = q.where(Movimiento.fecha <= fecha_hasta)
    q = q.order_by(Movimiento.fecha.desc(), Movimiento.creado_en.desc())  # type: ignore[union-attr]
    q = q.offset(offset).limit(limit)
    movs = session.exec(q).all()
    return [_enrich(m, session) for m in movs]


@router.post("", response_model=MovimientoOut, status_code=201)
def crear(
    body: MovimientoCreate,
    workspace: Workspace = Depends(get_current_workspace),
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    cuenta = session.get(Cuenta, body.cuenta_id)
    if not cuenta or cuenta.workspace_id != workspace.id:
        raise HTTPException(400, "Cuenta no encontrada en este workspace")
    if cuenta.archivado_en:
        raise HTTPException(400, "La cuenta está archivada")

    if body.categoria_id:
        cat = session.get(Categoria, body.categoria_id)
        if not cat or cat.workspace_id != workspace.id:
            raise HTTPException(400, "Categoría no encontrada")

    hash_idempotencia = _hash(workspace.id, body.cuenta_id, body.fecha, body.importe, body.concepto)
    existente = session.exec(
        select(Movimiento).where(Movimiento.hash_idempotencia == hash_idempotencia)
    ).first()
    if existente:
        raise HTTPException(409, "Movimiento duplicado (hash de idempotencia coincide)")

    importe_base, tasa = convertir(body.importe, body.moneda, workspace.moneda_base, body.fecha, session)

    mov = Movimiento(
        workspace_id=workspace.id,
        cuenta_id=body.cuenta_id,
        tipo=body.tipo,
        importe=body.importe,
        moneda=body.moneda,
        importe_base=importe_base,
        tasa_cambio=tasa,
        fecha=body.fecha,
        categoria_id=body.categoria_id,
        concepto=body.concepto,
        notas=body.notas,
        hash_idempotencia=hash_idempotencia,
        creado_por=current_user.id,
    )
    session.add(mov)
    session.flush()

    for etiqueta_id in body.etiqueta_ids:
        et = session.get(Etiqueta, etiqueta_id)
        if et and et.workspace_id == workspace.id:
            session.add(MovimientoEtiqueta(movimiento_id=mov.id, etiqueta_id=etiqueta_id))

    session.commit()
    session.refresh(mov)

    # Disparar motor de reglas (no crítico: fallo no cancela el movimiento)
    try:
        from services.reglas_engine import procesar_movimiento_creado
        procesar_movimiento_creado(mov, session)
    except Exception:
        pass

    return _enrich(mov, session)


@router.get("/{mov_id}", response_model=MovimientoOut)
def get_movimiento(
    mov_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    mov = session.get(Movimiento, mov_id)
    if not mov or mov.workspace_id != workspace.id:
        raise HTTPException(404, "Movimiento no encontrado")
    return _enrich(mov, session)


@router.patch("/{mov_id}", response_model=MovimientoOut)
def actualizar(
    mov_id: str,
    body: MovimientoUpdate,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    mov = session.get(Movimiento, mov_id)
    if not mov or mov.workspace_id != workspace.id:
        raise HTTPException(404, "Movimiento no encontrado")
    if mov.archivado_en:
        raise HTTPException(400, "El movimiento está archivado")

    datos = body.model_dump(exclude_unset=True)
    etiqueta_ids = datos.pop("etiqueta_ids", None)

    for campo, valor in datos.items():
        setattr(mov, campo, valor)
    mov.actualizado_en = datetime.utcnow()

    if etiqueta_ids is not None:
        session.exec(
            select(MovimientoEtiqueta).where(MovimientoEtiqueta.movimiento_id == mov_id)
        )
        for me in session.exec(select(MovimientoEtiqueta).where(MovimientoEtiqueta.movimiento_id == mov_id)).all():
            session.delete(me)
        for eid in etiqueta_ids:
            session.add(MovimientoEtiqueta(movimiento_id=mov_id, etiqueta_id=eid))

    session.add(mov)
    session.commit()
    session.refresh(mov)
    return _enrich(mov, session)


@router.delete("/{mov_id}", status_code=204)
def archivar(
    mov_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    mov = session.get(Movimiento, mov_id)
    if not mov or mov.workspace_id != workspace.id:
        raise HTTPException(404, "Movimiento no encontrado")
    mov.archivado_en = datetime.utcnow()
    session.add(mov)
    session.commit()


@router.get("/dashboard/resumen", response_model=dict)
def resumen_dashboard(
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    from services.saldos import saldo_total_workspace
    from models.cuenta import Cuenta as CuentaModel

    saldo_total = saldo_total_workspace(workspace.id, session)

    ultimos = session.exec(
        select(Movimiento).where(
            Movimiento.workspace_id == workspace.id,
            Movimiento.archivado_en.is_(None),  # type: ignore[union-attr]
        ).order_by(Movimiento.fecha.desc(), Movimiento.creado_en.desc()).limit(5)  # type: ignore[union-attr]
    ).all()

    return {
        "saldo_total": str(saldo_total),
        "moneda_base": workspace.moneda_base,
        "ultimos_movimientos": [_enrich(m, session).model_dump(mode="json") for m in ultimos],
    }
