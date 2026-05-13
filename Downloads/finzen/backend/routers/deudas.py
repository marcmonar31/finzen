import calendar
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from database import get_session
from deps import get_current_user, get_current_workspace
from models.cuenta import Cuenta
from models.deuda import Deuda, PagoAnticipado
from models.usuario import Usuario
from models.workspace import Workspace
from schemas.deuda import (
    CuotaOut, DeudaCreate, DeudaOut, DeudaUpdate,
    PagoAnticipadoCreate, PagoAnticipadoOut,
)

router = APIRouter(prefix="/deudas", tags=["deudas"])


def _dia_seguro(año: int, mes: int, dia: int) -> date:
    ultimo = calendar.monthrange(año, mes)[1]
    return date(año, mes, min(dia, ultimo))


def _cuotas_frances(
    importe: Decimal,
    tasa_anual: Decimal,
    num_cuotas: int,
    fecha_inicio: date,
    dia_cuota: int,
    pagos_anticipados: Optional[List[PagoAnticipado]] = None,
) -> List[CuotaOut]:
    """
    Tabla de amortización francesa con soporte de pagos anticipados.
    Los pagos extra reducen el capital en su fecha y acortan el plazo
    manteniendo la misma cuota mensual (amortización reduciendo plazo).
    """
    tasa_mensual = tasa_anual / 12 / 100
    if tasa_mensual == 0:
        cuota = importe / num_cuotas
    else:
        tm = float(tasa_mensual)
        cuota = Decimal(str(float(importe) * tm / (1 - (1 + tm) ** -num_cuotas)))

    pagos = sorted(pagos_anticipados or [], key=lambda p: p.fecha)

    saldo = importe
    cuotas = []
    fecha = _dia_seguro(fecha_inicio.year, fecha_inicio.month, dia_cuota)
    if fecha <= fecha_inicio:
        siguiente = fecha_inicio + relativedelta(months=1)
        fecha = _dia_seguro(siguiente.year, siguiente.month, dia_cuota)

    pago_idx = 0
    i = 0
    max_iter = num_cuotas + len(pagos) + 12

    while saldo > Decimal("0.01") and i < max_iter:
        # Aplicar pagos anticipados anteriores a esta fecha de cuota
        while pago_idx < len(pagos) and pagos[pago_idx].fecha < fecha:
            extra = min(pagos[pago_idx].importe, saldo)
            saldo = max(Decimal("0"), saldo - extra)
            pago_idx += 1
            if saldo <= Decimal("0.01"):
                break

        if saldo <= Decimal("0.01"):
            break

        i += 1
        intereses = (saldo * tasa_mensual).quantize(Decimal("0.01"))
        capital = min((cuota - intereses).quantize(Decimal("0.01")), saldo)
        saldo = max(Decimal("0"), saldo - capital)

        cuotas.append(CuotaOut(
            numero=i,
            fecha=fecha,
            importe=str((capital + intereses).quantize(Decimal("0.01"))),
            capital=str(capital),
            intereses=str(intereses),
            saldo_pendiente=str(saldo.quantize(Decimal("0.01"))),
        ))

        siguiente = fecha + relativedelta(months=1)
        fecha = _dia_seguro(siguiente.year, siguiente.month, dia_cuota)

    return cuotas


def _get_pagos(deuda_id: str, session: Session) -> List[PagoAnticipado]:
    return list(session.exec(
        select(PagoAnticipado)
        .where(PagoAnticipado.deuda_id == deuda_id)
        .order_by(PagoAnticipado.fecha)
    ).all())


@router.get("", response_model=List[DeudaOut])
def listar(
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    deudas = session.exec(
        select(Deuda).where(
            Deuda.workspace_id == workspace.id,
            Deuda.archivado_en == None,  # noqa: E711
        ).order_by(Deuda.creado_en)
    ).all()

    hoy = date.today()
    resultado = []
    for d in deudas:
        saldo_pendiente = None
        if d.num_cuotas:
            pagos = _get_pagos(d.id, session)
            cuotas = _cuotas_frances(
                d.importe_total, d.tasa_interes_anual, d.num_cuotas,
                d.fecha_inicio, d.dia_cuota, pagos,
            )
            pagadas = [c for c in cuotas if c.fecha <= hoy]
            if pagadas:
                saldo_pendiente = pagadas[-1].saldo_pendiente
            else:
                saldo_pendiente = str(d.importe_total)
        resultado.append(DeudaOut.from_orm(d, saldo_pendiente=saldo_pendiente))
    return resultado


@router.post("", response_model=DeudaOut, status_code=201)
def crear(
    body: DeudaCreate,
    current_user: Usuario = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    if body.cuenta_id:
        cuenta = session.get(Cuenta, body.cuenta_id)
        if not cuenta or cuenta.workspace_id != workspace.id:
            raise HTTPException(400, "Cuenta no válida para este workspace")

    deuda = Deuda(
        workspace_id=workspace.id,
        creado_por=current_user.id,
        **body.model_dump(),
    )
    session.add(deuda)
    session.commit()
    session.refresh(deuda)
    return DeudaOut.from_orm(deuda)


@router.get("/{deuda_id}", response_model=DeudaOut)
def obtener(
    deuda_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    deuda = session.get(Deuda, deuda_id)
    if not deuda or deuda.workspace_id != workspace.id or deuda.archivado_en:
        raise HTTPException(404, "Deuda no encontrada")
    saldo_pendiente = None
    if deuda.num_cuotas:
        pagos = _get_pagos(deuda_id, session)
        cuotas = _cuotas_frances(
            deuda.importe_total, deuda.tasa_interes_anual, deuda.num_cuotas,
            deuda.fecha_inicio, deuda.dia_cuota, pagos,
        )
        hoy = date.today()
        pagadas = [c for c in cuotas if c.fecha <= hoy]
        saldo_pendiente = pagadas[-1].saldo_pendiente if pagadas else str(deuda.importe_total)
    return DeudaOut.from_orm(deuda, saldo_pendiente=saldo_pendiente)


@router.patch("/{deuda_id}", response_model=DeudaOut)
def actualizar(
    deuda_id: str,
    body: DeudaUpdate,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    deuda = session.get(Deuda, deuda_id)
    if not deuda or deuda.workspace_id != workspace.id or deuda.archivado_en:
        raise HTTPException(404, "Deuda no encontrada")
    if body.cuenta_id is not None:
        cuenta = session.get(Cuenta, body.cuenta_id)
        if not cuenta or cuenta.workspace_id != workspace.id:
            raise HTTPException(400, "Cuenta no válida para este workspace")
    for campo, valor in body.model_dump(exclude_unset=True).items():
        setattr(deuda, campo, valor)
    session.add(deuda)
    session.commit()
    session.refresh(deuda)
    return DeudaOut.from_orm(deuda)


@router.delete("/{deuda_id}", status_code=204)
def archivar(
    deuda_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    deuda = session.get(Deuda, deuda_id)
    if not deuda or deuda.workspace_id != workspace.id or deuda.archivado_en:
        raise HTTPException(404, "Deuda no encontrada")
    deuda.archivado_en = datetime.utcnow()
    session.add(deuda)
    session.commit()


@router.get("/{deuda_id}/cuotas", response_model=List[CuotaOut])
def tabla_amortizacion(
    deuda_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    deuda = session.get(Deuda, deuda_id)
    if not deuda or deuda.workspace_id != workspace.id:
        raise HTTPException(404, "Deuda no encontrada")
    if not deuda.num_cuotas:
        raise HTTPException(400, "Esta deuda no tiene número de cuotas definido")
    pagos = _get_pagos(deuda_id, session)
    return _cuotas_frances(
        deuda.importe_total, deuda.tasa_interes_anual, deuda.num_cuotas,
        deuda.fecha_inicio, deuda.dia_cuota, pagos,
    )


# ── Pagos anticipados ──────────────────────────────────────────────────────────

@router.get("/{deuda_id}/pagos", response_model=List[PagoAnticipadoOut])
def listar_pagos(
    deuda_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    deuda = session.get(Deuda, deuda_id)
    if not deuda or deuda.workspace_id != workspace.id:
        raise HTTPException(404, "Deuda no encontrada")
    pagos = _get_pagos(deuda_id, session)
    return [
        PagoAnticipadoOut(
            id=p.id, deuda_id=p.deuda_id, fecha=p.fecha,
            importe=str(p.importe), notas=p.notas, creado_en=p.creado_en,
        )
        for p in pagos
    ]


@router.post("/{deuda_id}/pagos", response_model=PagoAnticipadoOut, status_code=201)
def crear_pago(
    deuda_id: str,
    body: PagoAnticipadoCreate,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    deuda = session.get(Deuda, deuda_id)
    if not deuda or deuda.workspace_id != workspace.id or deuda.archivado_en:
        raise HTTPException(404, "Deuda no encontrada")
    pago = PagoAnticipado(
        deuda_id=deuda_id,
        fecha=body.fecha,
        importe=body.importe,
        notas=body.notas,
    )
    session.add(pago)
    session.commit()
    session.refresh(pago)
    return PagoAnticipadoOut(
        id=pago.id, deuda_id=pago.deuda_id, fecha=pago.fecha,
        importe=str(pago.importe), notas=pago.notas, creado_en=pago.creado_en,
    )


@router.delete("/{deuda_id}/pagos/{pago_id}", status_code=204)
def eliminar_pago(
    deuda_id: str,
    pago_id: str,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    deuda = session.get(Deuda, deuda_id)
    if not deuda or deuda.workspace_id != workspace.id:
        raise HTTPException(404, "Deuda no encontrada")
    pago = session.get(PagoAnticipado, pago_id)
    if not pago or pago.deuda_id != deuda_id:
        raise HTTPException(404, "Pago no encontrado")
    session.delete(pago)
    session.commit()
