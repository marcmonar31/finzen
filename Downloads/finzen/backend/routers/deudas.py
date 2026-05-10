from datetime import date, datetime
from decimal import Decimal
from typing import List

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from database import get_session
from deps import get_current_user, get_current_workspace
from models.deuda import Deuda
from models.usuario import Usuario
from models.workspace import Workspace
from schemas.deuda import CuotaOut, DeudaCreate, DeudaOut, DeudaUpdate

router = APIRouter(prefix="/deudas", tags=["deudas"])


def _cuotas_frances(
    importe: Decimal,
    tasa_anual: Decimal,
    num_cuotas: int,
    fecha_inicio: date,
    dia_cuota: int,
) -> List[CuotaOut]:
    """Tabla de amortización francesa (cuota constante)."""
    tasa_mensual = tasa_anual / 12 / 100
    if tasa_mensual == 0:
        cuota = importe / num_cuotas
    else:
        tm = float(tasa_mensual)
        cuota = Decimal(str(float(importe) * tm / (1 - (1 + tm) ** -num_cuotas)))

    saldo = importe
    cuotas = []
    fecha = fecha_inicio.replace(day=dia_cuota)
    if fecha <= fecha_inicio:
        fecha = (fecha_inicio + relativedelta(months=1)).replace(day=dia_cuota)

    for i in range(1, num_cuotas + 1):
        intereses = (saldo * tasa_mensual).quantize(Decimal("0.01"))
        capital = (cuota - intereses).quantize(Decimal("0.01"))
        saldo = max(Decimal("0"), saldo - capital)
        cuotas.append(CuotaOut(
            numero=i,
            fecha=fecha,
            importe=str(cuota.quantize(Decimal("0.01"))),
            capital=str(capital),
            intereses=str(intereses),
            saldo_pendiente=str(saldo.quantize(Decimal("0.01"))),
        ))
        fecha = (fecha + relativedelta(months=1)).replace(day=dia_cuota)

    return cuotas


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
    return [DeudaOut.from_orm(d) for d in deudas]


@router.post("", response_model=DeudaOut, status_code=201)
def crear(
    body: DeudaCreate,
    current_user: Usuario = Depends(get_current_user),
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    deuda = Deuda(
        workspace_id=workspace.id,
        creado_por=current_user.id,
        **body.model_dump(),
    )
    session.add(deuda)
    session.commit()
    session.refresh(deuda)
    return DeudaOut.from_orm(deuda)


@router.patch("/{deuda_id}", response_model=DeudaOut)
def actualizar(
    deuda_id: str,
    body: DeudaUpdate,
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    deuda = session.get(Deuda, deuda_id)
    if not deuda or deuda.workspace_id != workspace.id:
        raise HTTPException(404, "Deuda no encontrada")
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
    if not deuda or deuda.workspace_id != workspace.id:
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
    return _cuotas_frances(
        deuda.importe_total,
        deuda.tasa_interes_anual,
        deuda.num_cuotas,
        deuda.fecha_inicio,
        deuda.dia_cuota,
    )
