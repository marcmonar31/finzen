import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from sqlmodel.pool import StaticPool

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from database import get_session
from models.usuario import Usuario
from models.workspace import Workspace
from models.miembro import WorkspaceMiembro


@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        yield session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app, raise_server_exceptions=True)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture(name="usuarios_demo")
def usuarios_demo_fixture(session: Session):
    martin = Usuario(usuario_unico="martin", nombre="Martín García", avatar_emoji="🧑")
    maria = Usuario(usuario_unico="maria", nombre="María López", avatar_emoji="👩")
    pedro = Usuario(usuario_unico="pedro", nombre="Pedro Ruiz", avatar_emoji="🧔")
    for u in [martin, maria, pedro]:
        session.add(u)
    session.flush()

    ws_martin = Workspace(nombre="Personal Martín", emoji="🏠", moneda_base="EUR", owner_id=martin.id)
    ws_familia = Workspace(nombre="Familia García", emoji="👨‍👩‍👧", moneda_base="EUR", owner_id=martin.id)
    for ws in [ws_martin, ws_familia]:
        session.add(ws)
    session.flush()

    session.add(WorkspaceMiembro(workspace_id=ws_martin.id, usuario_id=martin.id, rol="owner"))
    session.add(WorkspaceMiembro(workspace_id=ws_familia.id, usuario_id=martin.id, rol="owner"))
    session.add(WorkspaceMiembro(workspace_id=ws_familia.id, usuario_id=maria.id, rol="editor"))
    session.commit()

    return {
        "martin": martin,
        "maria": maria,
        "pedro": pedro,
        "ws_martin": ws_martin,
        "ws_familia": ws_familia,
    }
