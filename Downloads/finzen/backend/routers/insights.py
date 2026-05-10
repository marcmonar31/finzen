from fastapi import APIRouter, Depends
from sqlmodel import Session

from database import get_session
from deps import get_current_workspace
from models.workspace import Workspace
from services.deteccion import detectar_anomalias, detectar_gastos_hormiga, detectar_suscripciones
from services.prediccion import predecir_saldo
from services.salud_score import calcular_salud_score

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("")
def todos_los_insights(
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    return {
        "prediccion": predecir_saldo(workspace.id, session),
        "suscripciones": detectar_suscripciones(workspace.id, session),
        "gastos_hormiga": detectar_gastos_hormiga(workspace.id, session),
        "anomalias": detectar_anomalias(workspace.id, session),
        "salud": calcular_salud_score(workspace.id, session),
    }


@router.get("/prediccion")
def prediccion(
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    return predecir_saldo(workspace.id, session)


@router.get("/suscripciones")
def suscripciones(
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    return detectar_suscripciones(workspace.id, session)


@router.get("/gastos-hormiga")
def gastos_hormiga(
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    return detectar_gastos_hormiga(workspace.id, session)


@router.get("/anomalias")
def anomalias(
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    return detectar_anomalias(workspace.id, session)


@router.get("/salud")
def salud(
    workspace: Workspace = Depends(get_current_workspace),
    session: Session = Depends(get_session),
):
    return calcular_salud_score(workspace.id, session)
