import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from database import get_session
from deps import get_current_user, get_current_workspace
from models.amigo import AmigoExterno
from models.cuenta import Cuenta
from models.grupo import GastoCompartido, GastoReparto, Grupo, GrupoMiembro, Liquidacion
from models.movimiento import Movimiento
from models.usuario import Usuario
from models.workspace import Workspace
from schemas.grupo import (
    BalanceGrupoOut, GastoCompartidoCreate, GastoCompartidoOut, GastoRepartoOut,
    GrupoCreate, GrupoMiembroOut, GrupoOut, GrupoUpdate, LiquidacionCreate, LiquidacionOut,
)
from services.conversion import convertir
from services.liquidacion import calcular_balance_grupo, calcular_repartos, transferencias_optimas

router = APIRouter(prefix="/grupos", tags=["grupos"])


def _verificar_miembro(grupo_id: str, usuario_id: str, session: Session) -> GrupoMiembro:
    miembro = session.exec(
        select(GrupoMiembro).where(
            GrupoMiembro.grupo_id == grupo_id,
            GrupoMiembro.usuario_id == usuario_id,
            GrupoMiembro.activo == True,  # noqa: E712
        )
    ).first()
    if not miembro:
        raise HTTPException(403, "No eres miembro activo de este grupo")
    return miembro


def _nombre_miembro(m: GrupoMiembro, session: Session) -> str:
    if m.apodo:
        return m.apodo
    if m.usuario_id:
        u = session.get(Usuario, m.usuario_id)
        return u.nombre if u else "?"
    if m.externo_id:
        e = session.get(AmigoExterno, m.externo_id)
        return e.nombre if e else "Externo"
    return "?"


def _miembro_out(m: GrupoMiembro, session: Session) -> GrupoMiembroOut:
    return GrupoMiembroOut(
        id=m.id,
        grupo_id=m.grupo_id,
        usuario_id=m.usuario_id,
        externo_id=m.externo_id,
        nombre_display=_nombre_miembro(m, session),
        rol=m.rol,
        activo=m.activo,
    )


# ──────────────────────────────────────────
# Grupos CRUD
# ──────────────────────────────────────────

@router.post("", response_model=GrupoOut)
def crear_grupo(
    body: GrupoCreate,
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    cuenta_id: Optional[str] = None

    # Si es_cuenta_real, crear una cuenta en el workspace indicado
    if body.es_cuenta_real:
        if not body.workspace_id:
            raise HTTPException(400, "workspace_id requerido para cuenta real")
        cuenta = Cuenta(
            id=str(uuid.uuid4()),
            workspace_id=body.workspace_id,
            nombre=body.nombre,
            tipo="otro",
            moneda=body.moneda_principal,
            creado_por=current_user.id,
        )
        session.add(cuenta)
        session.flush()
        cuenta_id = cuenta.id

    grupo = Grupo(
        nombre=body.nombre,
        emoji=body.emoji,
        descripcion=body.descripcion,
        moneda_principal=body.moneda_principal,
        es_cuenta_real=body.es_cuenta_real,
        cuenta_id=cuenta_id,
        modo_reparto_default=body.modo_reparto_default,
        creado_por=current_user.id,
    )
    session.add(grupo)
    session.flush()

    # Añadir al creador como admin
    miembro_creador = GrupoMiembro(
        grupo_id=grupo.id,
        usuario_id=current_user.id,
        rol="admin",
    )
    session.add(miembro_creador)

    # Añadir miembros iniciales
    for uid in body.miembro_usuario_ids:
        if uid != current_user.id:
            session.add(GrupoMiembro(grupo_id=grupo.id, usuario_id=uid))

    for ext_id in body.miembro_externo_ids:
        session.add(GrupoMiembro(grupo_id=grupo.id, externo_id=ext_id))

    session.commit()
    session.refresh(grupo)

    miembros = session.exec(select(GrupoMiembro).where(GrupoMiembro.grupo_id == grupo.id)).all()
    return GrupoOut(
        id=grupo.id,
        nombre=grupo.nombre,
        emoji=grupo.emoji,
        descripcion=grupo.descripcion,
        moneda_principal=grupo.moneda_principal,
        es_cuenta_real=grupo.es_cuenta_real,
        cuenta_id=grupo.cuenta_id,
        modo_reparto_default=grupo.modo_reparto_default,
        creado_por=grupo.creado_por,
        creado_en=grupo.creado_en,
        cerrado_en=grupo.cerrado_en,
        miembros=[_miembro_out(m, session) for m in miembros],
    )


@router.get("", response_model=List[GrupoOut])
def listar_grupos(
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Lista grupos donde el usuario es miembro activo."""
    miembros = session.exec(
        select(GrupoMiembro).where(
            GrupoMiembro.usuario_id == current_user.id,
            GrupoMiembro.activo == True,  # noqa: E712
        )
    ).all()

    resultado = []
    for m in miembros:
        grupo = session.get(Grupo, m.grupo_id)
        if grupo and not grupo.archivado_en:
            todos_miembros = session.exec(select(GrupoMiembro).where(GrupoMiembro.grupo_id == grupo.id)).all()
            resultado.append(GrupoOut(
                id=grupo.id,
                nombre=grupo.nombre,
                emoji=grupo.emoji,
                descripcion=grupo.descripcion,
                moneda_principal=grupo.moneda_principal,
                es_cuenta_real=grupo.es_cuenta_real,
                cuenta_id=grupo.cuenta_id,
                modo_reparto_default=grupo.modo_reparto_default,
                creado_por=grupo.creado_por,
                creado_en=grupo.creado_en,
                cerrado_en=grupo.cerrado_en,
                miembros=[_miembro_out(tm, session) for tm in todos_miembros],
            ))
    return resultado


@router.get("/{grupo_id}", response_model=GrupoOut)
def obtener_grupo(
    grupo_id: str,
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    grupo = session.get(Grupo, grupo_id)
    if not grupo or grupo.archivado_en:
        raise HTTPException(404, "Grupo no encontrado")

    # Verificar pertenencia
    miembro = session.exec(
        select(GrupoMiembro).where(
            GrupoMiembro.grupo_id == grupo_id,
            GrupoMiembro.usuario_id == current_user.id,
            GrupoMiembro.activo == True,  # noqa: E712
        )
    ).first()
    if not miembro:
        raise HTTPException(403, "No eres miembro de este grupo")

    todos_miembros = session.exec(select(GrupoMiembro).where(GrupoMiembro.grupo_id == grupo_id)).all()
    return GrupoOut(
        id=grupo.id,
        nombre=grupo.nombre,
        emoji=grupo.emoji,
        descripcion=grupo.descripcion,
        moneda_principal=grupo.moneda_principal,
        es_cuenta_real=grupo.es_cuenta_real,
        cuenta_id=grupo.cuenta_id,
        modo_reparto_default=grupo.modo_reparto_default,
        creado_por=grupo.creado_por,
        creado_en=grupo.creado_en,
        cerrado_en=grupo.cerrado_en,
        miembros=[_miembro_out(m, session) for m in todos_miembros],
    )


@router.patch("/{grupo_id}", response_model=GrupoOut)
def actualizar_grupo(
    grupo_id: str,
    body: GrupoUpdate,
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    grupo = session.get(Grupo, grupo_id)
    if not grupo or grupo.archivado_en:
        raise HTTPException(404, "Grupo no encontrado")

    miembro = session.exec(
        select(GrupoMiembro).where(
            GrupoMiembro.grupo_id == grupo_id,
            GrupoMiembro.usuario_id == current_user.id,
            GrupoMiembro.activo == True,  # noqa: E712
        )
    ).first()
    if not miembro:
        raise HTTPException(403, "No eres miembro de este grupo")

    if body.nombre is not None:
        grupo.nombre = body.nombre
    if body.emoji is not None:
        grupo.emoji = body.emoji

    session.add(grupo)
    session.commit()
    session.refresh(grupo)

    todos_miembros = session.exec(select(GrupoMiembro).where(GrupoMiembro.grupo_id == grupo_id)).all()
    return GrupoOut(
        id=grupo.id,
        nombre=grupo.nombre,
        emoji=grupo.emoji,
        descripcion=grupo.descripcion,
        moneda_principal=grupo.moneda_principal,
        es_cuenta_real=grupo.es_cuenta_real,
        cuenta_id=grupo.cuenta_id,
        modo_reparto_default=grupo.modo_reparto_default,
        creado_por=grupo.creado_por,
        creado_en=grupo.creado_en,
        cerrado_en=grupo.cerrado_en,
        miembros=[_miembro_out(m, session) for m in todos_miembros],
    )


@router.delete("/{grupo_id}")
def eliminar_grupo(
    grupo_id: str,
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    grupo = session.get(Grupo, grupo_id)
    if not grupo or grupo.archivado_en:
        raise HTTPException(404, "Grupo no encontrado")
    if grupo.creado_por != current_user.id:
        raise HTTPException(403, "Solo el creador puede eliminar el grupo")

    grupo.archivado_en = datetime.utcnow()
    session.add(grupo)
    session.commit()
    return {"ok": True}


@router.post("/{grupo_id}/miembros")
def añadir_miembro(
    grupo_id: str,
    usuario_id: Optional[str] = None,
    externo_id: Optional[str] = None,
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    grupo = session.get(Grupo, grupo_id)
    if not grupo or grupo.archivado_en:
        raise HTTPException(404, "Grupo no encontrado")
    _verificar_miembro(grupo_id, current_user.id, session)
    if not usuario_id and not externo_id:
        raise HTTPException(400, "Indica usuario_id o externo_id")

    nuevo = GrupoMiembro(grupo_id=grupo_id, usuario_id=usuario_id, externo_id=externo_id)
    session.add(nuevo)
    session.commit()
    return {"ok": True, "miembro_id": nuevo.id}


@router.delete("/{grupo_id}/salir")
def salir_grupo(
    grupo_id: str,
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    miembro = session.exec(
        select(GrupoMiembro).where(
            GrupoMiembro.grupo_id == grupo_id,
            GrupoMiembro.usuario_id == current_user.id,
            GrupoMiembro.activo == True,  # noqa: E712
        )
    ).first()
    if not miembro:
        raise HTTPException(404, "No eres miembro activo de este grupo")

    # Verificar balance = 0
    balance = calcular_balance_grupo(grupo_id, session)
    mi_balance = balance.get(miembro.id, Decimal("0"))
    if mi_balance != Decimal("0"):
        raise HTTPException(400, f"Tu balance es {mi_balance}. Liquida tus deudas antes de salir")

    miembro.activo = False
    miembro.salido_en = datetime.utcnow()
    session.add(miembro)
    session.commit()
    return {"ok": True}


@router.post("/{grupo_id}/cerrar")
def cerrar_grupo(
    grupo_id: str,
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    grupo = session.get(Grupo, grupo_id)
    if not grupo or grupo.creado_por != current_user.id:
        raise HTTPException(403, "Solo el creador puede cerrar el grupo")
    if grupo.cerrado_en:
        raise HTTPException(400, "El grupo ya está cerrado")

    balance = calcular_balance_grupo(grupo_id, session)
    pendientes = [v for v in balance.values() if v != Decimal("0")]
    if pendientes:
        raise HTTPException(400, "Hay balances pendientes. Liquida todas las deudas antes de cerrar")

    grupo.cerrado_en = datetime.utcnow()
    session.add(grupo)
    session.commit()
    return {"ok": True}


# ──────────────────────────────────────────
# Balance y liquidaciones óptimas
# ──────────────────────────────────────────

@router.get("/{grupo_id}/balance", response_model=BalanceGrupoOut)
def balance_grupo(
    grupo_id: str,
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    grupo = session.get(Grupo, grupo_id)
    if not grupo or grupo.archivado_en:
        raise HTTPException(404, "Grupo no encontrado")
    _verificar_miembro(grupo_id, current_user.id, session)

    balance = calcular_balance_grupo(grupo_id, session)
    sugerencias = transferencias_optimas(balance)
    return BalanceGrupoOut(balance=balance, transferencias_optimas=sugerencias)


# ──────────────────────────────────────────
# Gastos compartidos
# ──────────────────────────────────────────

@router.post("/{grupo_id}/gastos", response_model=GastoCompartidoOut)
def crear_gasto(
    grupo_id: str,
    body: GastoCompartidoCreate,
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    grupo = session.get(Grupo, grupo_id)
    if not grupo or grupo.archivado_en:
        raise HTTPException(404, "Grupo no encontrado")
    _verificar_miembro(grupo_id, current_user.id, session)
    if grupo.cerrado_en:
        raise HTTPException(400, "El grupo está cerrado")

    # Convertir importe a moneda_principal del grupo
    importe_conv, tasa = convertir(
        body.importe, body.moneda, grupo.moneda_principal, body.fecha, session
    )

    # Crear el gasto
    gasto = GastoCompartido(
        grupo_id=grupo_id,
        concepto=body.concepto,
        importe=body.importe,
        moneda=body.moneda,
        importe_convertido=importe_conv,
        tasa_cambio=tasa,
        fecha=body.fecha,
        categoria_id=body.categoria_id,
        pagador_id=body.pagador_id,
        modo_reparto=body.modo_reparto,
        afecta_cuenta_personal=body.afecta_cuenta_personal,
        cuenta_personal_id=body.cuenta_personal_id,
        creado_por=current_user.id,
    )
    session.add(gasto)
    session.flush()

    # Calcular repartos
    miembro_ids = body.miembro_ids or [r.miembro_id for r in body.repartos]
    if not miembro_ids:
        # Por defecto todos los miembros activos
        todos = session.exec(
            select(GrupoMiembro).where(GrupoMiembro.grupo_id == grupo_id, GrupoMiembro.activo == True)  # noqa: E712
        ).all()
        miembro_ids = [m.id for m in todos]

    if body.modo_reparto == "igualitario":
        montos = calcular_repartos(importe_conv, miembro_ids, "igualitario")
    elif body.modo_reparto == "porcentajes":
        pcts = {r.miembro_id: r.porcentaje or Decimal("0") for r in body.repartos}
        montos = calcular_repartos(importe_conv, miembro_ids, "porcentajes", porcentajes=pcts)
    elif body.modo_reparto == "partes":
        pts = {r.miembro_id: r.partes or 1 for r in body.repartos}
        montos = calcular_repartos(importe_conv, miembro_ids, "partes", partes=pts)
    elif body.modo_reparto == "manual":
        manuales = {r.miembro_id: r.importe_manual or Decimal("0") for r in body.repartos}
        montos = calcular_repartos(importe_conv, miembro_ids, "manual", montos_manuales=manuales)
    else:
        montos = calcular_repartos(importe_conv, miembro_ids, "igualitario")

    reparto_objs = []
    for mid, monto in montos.items():
        rep_input = next((r for r in body.repartos if r.miembro_id == mid), None)
        reparto = GastoReparto(
            gasto_id=gasto.id,
            miembro_id=mid,
            importe_asignado=monto,
            partes=rep_input.partes if rep_input else None,
            porcentaje=rep_input.porcentaje if rep_input else None,
        )
        session.add(reparto)
        reparto_objs.append(reparto)

    # Si afecta cuenta personal del pagador, crear movimiento
    movimiento_id: Optional[str] = None
    if body.afecta_cuenta_personal and body.cuenta_personal_id:
        mov = Movimiento(
            workspace_id=_workspace_de_cuenta(body.cuenta_personal_id, session),
            cuenta_id=body.cuenta_personal_id,
            tipo="gasto",
            importe=body.importe,
            moneda=body.moneda,
            importe_base=importe_conv,
            tasa_cambio=tasa,
            fecha=body.fecha,
            categoria_id=body.categoria_id or body.categoria_id,
            concepto=body.concepto,
            fuente="grupo_compartido",
            fuente_id=gasto.id,
            creado_por=current_user.id,
        )
        session.add(mov)
        session.flush()
        movimiento_id = mov.id
        gasto.movimiento_id = movimiento_id
        session.add(gasto)

    session.commit()
    session.refresh(gasto)

    return GastoCompartidoOut(
        id=gasto.id,
        grupo_id=gasto.grupo_id,
        concepto=gasto.concepto,
        importe=gasto.importe,
        moneda=gasto.moneda,
        importe_convertido=gasto.importe_convertido,
        tasa_cambio=gasto.tasa_cambio,
        fecha=gasto.fecha,
        categoria_id=gasto.categoria_id,
        pagador_id=gasto.pagador_id,
        modo_reparto=gasto.modo_reparto,
        afecta_cuenta_personal=gasto.afecta_cuenta_personal,
        movimiento_id=gasto.movimiento_id,
        creado_por=gasto.creado_por,
        creado_en=gasto.creado_en,
        repartos=[GastoRepartoOut(
            id=r.id, miembro_id=r.miembro_id, importe_asignado=r.importe_asignado,
            partes=r.partes, porcentaje=r.porcentaje,
        ) for r in reparto_objs],
    )


def _workspace_de_cuenta(cuenta_id: str, session: Session) -> str:
    cuenta = session.get(Cuenta, cuenta_id)
    return cuenta.workspace_id if cuenta else ""


@router.get("/{grupo_id}/gastos", response_model=List[GastoCompartidoOut])
def listar_gastos(
    grupo_id: str,
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    grupo = session.get(Grupo, grupo_id)
    if not grupo or grupo.archivado_en:
        raise HTTPException(404, "Grupo no encontrado")
    _verificar_miembro(grupo_id, current_user.id, session)
    gastos = session.exec(
        select(GastoCompartido).where(
            GastoCompartido.grupo_id == grupo_id,
            GastoCompartido.archivado_en == None,  # noqa: E711
        )
    ).all()

    resultado = []
    for gasto in gastos:
        repartos = session.exec(select(GastoReparto).where(GastoReparto.gasto_id == gasto.id)).all()
        resultado.append(GastoCompartidoOut(
            id=gasto.id,
            grupo_id=gasto.grupo_id,
            concepto=gasto.concepto,
            importe=gasto.importe,
            moneda=gasto.moneda,
            importe_convertido=gasto.importe_convertido,
            tasa_cambio=gasto.tasa_cambio,
            fecha=gasto.fecha,
            categoria_id=gasto.categoria_id,
            pagador_id=gasto.pagador_id,
            modo_reparto=gasto.modo_reparto,
            afecta_cuenta_personal=gasto.afecta_cuenta_personal,
            movimiento_id=gasto.movimiento_id,
            creado_por=gasto.creado_por,
            creado_en=gasto.creado_en,
            repartos=[GastoRepartoOut(
                id=r.id, miembro_id=r.miembro_id, importe_asignado=r.importe_asignado,
                partes=r.partes, porcentaje=r.porcentaje,
            ) for r in repartos],
        ))
    return resultado


@router.delete("/{grupo_id}/gastos/{gasto_id}", status_code=204)
def archivar_gasto(
    grupo_id: str,
    gasto_id: str,
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    grupo = session.get(Grupo, grupo_id)
    if not grupo or grupo.archivado_en:
        raise HTTPException(404, "Grupo no encontrado")
    _verificar_miembro(grupo_id, current_user.id, session)
    gasto = session.get(GastoCompartido, gasto_id)
    if not gasto or gasto.grupo_id != grupo_id or gasto.archivado_en:
        raise HTTPException(404, "Gasto no encontrado")
    gasto.archivado_en = datetime.utcnow()
    session.add(gasto)
    session.commit()


# ──────────────────────────────────────────
# Liquidaciones
# ──────────────────────────────────────────

@router.post("/{grupo_id}/liquidaciones", response_model=LiquidacionOut)
def registrar_liquidacion(
    grupo_id: str,
    body: LiquidacionCreate,
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    grupo = session.get(Grupo, grupo_id)
    if not grupo or grupo.archivado_en:
        raise HTTPException(404, "Grupo no encontrado")
    _verificar_miembro(grupo_id, current_user.id, session)

    liq = Liquidacion(
        grupo_id=grupo_id,
        de_miembro_id=body.de_miembro_id,
        a_miembro_id=body.a_miembro_id,
        importe=body.importe,
        moneda=body.moneda,
        estado="pendiente",
    )

    # Crear movimiento de pago en cuenta del que paga (opcional)
    if body.cuenta_pago_id:
        ws = _workspace_de_cuenta(body.cuenta_pago_id, session)
        mov_pago = Movimiento(
            workspace_id=ws,
            cuenta_id=body.cuenta_pago_id,
            tipo="gasto",
            importe=body.importe,
            moneda=body.moneda,
            importe_base=body.importe,
            tasa_cambio=Decimal("1"),
            fecha=date.today(),
            concepto=f"Liquidación grupo {grupo.nombre}",
            fuente="grupo_compartido",
            fuente_id=liq.id,
            creado_por=current_user.id,
        )
        session.add(mov_pago)
        session.flush()
        liq.movimiento_pago_id = mov_pago.id

    # Crear movimiento de cobro en cuenta del que recibe (opcional)
    if body.cuenta_cobro_id:
        ws = _workspace_de_cuenta(body.cuenta_cobro_id, session)
        mov_cobro = Movimiento(
            workspace_id=ws,
            cuenta_id=body.cuenta_cobro_id,
            tipo="ingreso",
            importe=body.importe,
            moneda=body.moneda,
            importe_base=body.importe,
            tasa_cambio=Decimal("1"),
            fecha=date.today(),
            concepto=f"Liquidación grupo {grupo.nombre}",
            fuente="grupo_compartido",
            fuente_id=liq.id,
            creado_por=current_user.id,
        )
        session.add(mov_cobro)
        session.flush()
        liq.movimiento_cobro_id = mov_cobro.id

    session.add(liq)
    session.commit()
    session.refresh(liq)

    return LiquidacionOut(
        id=liq.id,
        grupo_id=liq.grupo_id,
        de_miembro_id=liq.de_miembro_id,
        a_miembro_id=liq.a_miembro_id,
        importe=liq.importe,
        moneda=liq.moneda,
        movimiento_pago_id=liq.movimiento_pago_id,
        movimiento_cobro_id=liq.movimiento_cobro_id,
        estado=liq.estado,
        creado_en=liq.creado_en,
        confirmado_en=liq.confirmado_en,
    )


@router.post("/{grupo_id}/liquidaciones/{liq_id}/confirmar", response_model=LiquidacionOut)
def confirmar_liquidacion(
    grupo_id: str,
    liq_id: str,
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    grupo = session.get(Grupo, grupo_id)
    if not grupo or grupo.archivado_en:
        raise HTTPException(404, "Grupo no encontrado")
    _verificar_miembro(grupo_id, current_user.id, session)
    liq = session.get(Liquidacion, liq_id)
    if not liq or liq.grupo_id != grupo_id:
        raise HTTPException(404, "Liquidación no encontrada")
    if liq.estado != "pendiente":
        raise HTTPException(400, "La liquidación ya fue procesada")

    liq.estado = "confirmada"
    liq.confirmado_en = datetime.utcnow()
    session.add(liq)
    session.commit()
    session.refresh(liq)

    return LiquidacionOut(
        id=liq.id,
        grupo_id=liq.grupo_id,
        de_miembro_id=liq.de_miembro_id,
        a_miembro_id=liq.a_miembro_id,
        importe=liq.importe,
        moneda=liq.moneda,
        movimiento_pago_id=liq.movimiento_pago_id,
        movimiento_cobro_id=liq.movimiento_cobro_id,
        estado=liq.estado,
        creado_en=liq.creado_en,
        confirmado_en=liq.confirmado_en,
    )


@router.get("/{grupo_id}/liquidaciones", response_model=List[LiquidacionOut])
def listar_liquidaciones(
    grupo_id: str,
    current_user: Usuario = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    grupo = session.get(Grupo, grupo_id)
    if not grupo or grupo.archivado_en:
        raise HTTPException(404, "Grupo no encontrado")
    _verificar_miembro(grupo_id, current_user.id, session)
    liqs = session.exec(
        select(Liquidacion).where(Liquidacion.grupo_id == grupo_id)
    ).all()
    return [LiquidacionOut(
        id=l.id, grupo_id=l.grupo_id, de_miembro_id=l.de_miembro_id, a_miembro_id=l.a_miembro_id,
        importe=l.importe, moneda=l.moneda, movimiento_pago_id=l.movimiento_pago_id,
        movimiento_cobro_id=l.movimiento_cobro_id, estado=l.estado,
        creado_en=l.creado_en, confirmado_en=l.confirmado_en,
    ) for l in liqs]
