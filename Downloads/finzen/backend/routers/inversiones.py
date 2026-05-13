from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlmodel import Session, select

from database import get_session
from deps import get_current_user, get_current_workspace
from models.inversion import Activo, Posicion, PrecioActual
from models.usuario import Usuario
from models.workspace import Workspace
from services.inversiones_calc import resumen_cartera
from services.precios_inversion import obtener_precio

router = APIRouter(prefix="/inversiones", tags=["inversiones"])

_MAX_CANTIDAD = Decimal("999999999999.99999999")
_MAX_PRECIO = Decimal("99999999999999.9999")
TIPOS_ACTIVO = ("accion", "etf", "cripto", "materia_prima", "fondo")


# ── Schemas ────────────────────────────────────────────────────────────────────

class ActivoCreate(BaseModel):
    ticker: str
    nombre: str
    tipo: str = "accion"
    moneda: str = "USD"

    @field_validator("ticker")
    @classmethod
    def ticker_valido(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("El ticker no puede estar vacío")
        if len(stripped) > 20:
            raise ValueError("El ticker no puede superar 20 caracteres")
        return stripped.upper()

    @field_validator("nombre")
    @classmethod
    def nombre_valido(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("El nombre no puede estar vacío")
        if len(stripped) > 200:
            raise ValueError("El nombre no puede superar 200 caracteres")
        return stripped

    @field_validator("tipo")
    @classmethod
    def tipo_valido(cls, v: str) -> str:
        if v not in TIPOS_ACTIVO:
            raise ValueError(f"tipo debe ser uno de {TIPOS_ACTIVO}")
        return v


class PosicionCreate(BaseModel):
    activo_id: str
    cantidad: Decimal
    precio_medio: Decimal
    moneda: str = "USD"
    cuenta_id: Optional[str] = None

    @field_validator("cantidad")
    @classmethod
    def cantidad_valida(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("La cantidad debe ser mayor que 0")
        if v > _MAX_CANTIDAD:
            raise ValueError(f"La cantidad no puede superar {_MAX_CANTIDAD}")
        return v

    @field_validator("precio_medio")
    @classmethod
    def precio_valido(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("El precio_medio debe ser mayor que 0")
        if v > _MAX_PRECIO:
            raise ValueError(f"El precio_medio no puede superar {_MAX_PRECIO}")
        return v


class PosicionUpdate(BaseModel):
    cantidad: Optional[Decimal] = None
    precio_medio: Optional[Decimal] = None
    activa: Optional[bool] = None

    @field_validator("cantidad")
    @classmethod
    def cantidad_valida(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None:
            if v <= 0:
                raise ValueError("La cantidad debe ser mayor que 0")
            if v > _MAX_CANTIDAD:
                raise ValueError(f"La cantidad no puede superar {_MAX_CANTIDAD}")
        return v

    @field_validator("precio_medio")
    @classmethod
    def precio_valido(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None:
            if v <= 0:
                raise ValueError("El precio_medio debe ser mayor que 0")
            if v > _MAX_PRECIO:
                raise ValueError(f"El precio_medio no puede superar {_MAX_PRECIO}")
        return v


# ── Activos ────────────────────────────────────────────────────────────────────

@router.get("/activos")
def listar_activos(
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    activos = session.exec(
        select(Activo).where(Activo.workspace_id == workspace.id)
    ).all()
    return activos


@router.post("/activos", status_code=201)
def crear_activo(
    body: ActivoCreate,
    current_user: Usuario = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    activo = Activo(
        workspace_id=workspace.id,
        ticker=body.ticker,
        nombre=body.nombre,
        tipo=body.tipo,
        moneda=body.moneda,
        creado_por=current_user.id,
    )
    session.add(activo)
    session.commit()
    session.refresh(activo)
    return activo


# ── Posiciones ─────────────────────────────────────────────────────────────────

@router.get("/posiciones")
def listar_posiciones(
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    return resumen_cartera(workspace.id, session)


@router.post("/posiciones", status_code=201)
def crear_posicion(
    body: PosicionCreate,
    current_user: Usuario = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    activo = session.get(Activo, body.activo_id)
    if not activo or activo.workspace_id != workspace.id:
        raise HTTPException(400, "Activo no encontrado en este workspace")

    posicion = Posicion(
        workspace_id=workspace.id,
        activo_id=body.activo_id,
        cantidad=body.cantidad,
        precio_medio=body.precio_medio,
        moneda=body.moneda,
        cuenta_id=body.cuenta_id,
        creado_por=current_user.id,
    )
    session.add(posicion)
    session.commit()
    session.refresh(posicion)

    # Intentar obtener precio actual al crear la posición
    try:
        resultado = obtener_precio(activo.ticker, activo.tipo)
        if resultado:
            precio, moneda, variacion = resultado
            existente = session.exec(
                select(PrecioActual).where(PrecioActual.activo_id == activo.id)
            ).first()
            if existente:
                existente.precio = precio
                existente.variacion_dia = variacion
                existente.actualizado_en = datetime.utcnow()
                session.add(existente)
            else:
                session.add(PrecioActual(activo_id=activo.id, precio=precio, moneda=moneda, variacion_dia=variacion))
            session.commit()
    except Exception:
        pass  # No crítico
    finally:
        session.refresh(posicion)

    return posicion


@router.patch("/posiciones/{pos_id}")
def actualizar_posicion(
    pos_id: str,
    body: PosicionUpdate,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    pos = session.get(Posicion, pos_id)
    if not pos or pos.workspace_id != workspace.id:
        raise HTTPException(404, "Posición no encontrada")
    for campo, valor in body.model_dump(exclude_unset=True).items():
        setattr(pos, campo, valor)
    session.add(pos)
    session.commit()
    session.refresh(pos)
    return pos


@router.delete("/posiciones/{pos_id}", status_code=204)
def cerrar_posicion(
    pos_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    pos = session.get(Posicion, pos_id)
    if not pos or pos.workspace_id != workspace.id:
        raise HTTPException(404, "Posición no encontrada")
    pos.activa = False
    session.add(pos)
    session.commit()


# ── Precios ────────────────────────────────────────────────────────────────────

@router.post("/precios/actualizar")
def actualizar_precios_manual(
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    """Actualiza los precios de todos los activos del workspace bajo demanda."""
    activos = session.exec(
        select(Activo).where(Activo.workspace_id == workspace.id)
    ).all()
    resultados = []
    for activo in activos:
        res = obtener_precio(activo.ticker, activo.tipo)
        if res:
            precio, moneda, variacion = res
            existente = session.exec(
                select(PrecioActual).where(PrecioActual.activo_id == activo.id)
            ).first()
            if existente:
                existente.precio = precio
                existente.variacion_dia = variacion
                existente.actualizado_en = datetime.utcnow()
                session.add(existente)
            else:
                session.add(PrecioActual(activo_id=activo.id, precio=precio, moneda=moneda, variacion_dia=variacion))
            resultados.append({"ticker": activo.ticker, "precio": str(precio), "ok": True})
        else:
            resultados.append({"ticker": activo.ticker, "ok": False})
    session.commit()
    return {"actualizados": len([r for r in resultados if r["ok"]]), "detalle": resultados}


@router.get("/buscar/{ticker}")
def buscar_ticker(
    ticker: str,
    tipo: str = "accion",
):
    """Busca precio actual de un ticker antes de añadirlo."""
    resultado = obtener_precio(ticker.upper(), tipo)
    if not resultado:
        raise HTTPException(404, f"No se encontró precio para {ticker}")
    precio, moneda, variacion = resultado
    return {"ticker": ticker.upper(), "precio": str(precio), "moneda": moneda, "variacion_dia": str(variacion) if variacion else None}
