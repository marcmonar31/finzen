"""
Crea usuarios demo y workspaces de ejemplo.
Ejecutar: python seed.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlmodel import Session, select
from database import engine
from models.usuario import Usuario
from models.workspace import Workspace
from models.miembro import WorkspaceMiembro


USUARIOS_DEMO = [
    {"usuario_unico": "martin", "nombre": "Martín García", "avatar_emoji": "🧑"},
    {"usuario_unico": "maria", "nombre": "María López", "avatar_emoji": "👩"},
    {"usuario_unico": "pedro", "nombre": "Pedro Ruiz", "avatar_emoji": "🧔"},
]


def seed():
    with Session(engine) as session:
        usuarios_existentes = session.exec(select(Usuario)).all()
        if usuarios_existentes:
            print("Base de datos ya tiene datos. Saltando seed.")
            return

        usuarios = []
        for datos in USUARIOS_DEMO:
            u = Usuario(**datos)
            session.add(u)
            usuarios.append(u)
        session.flush()

        martin, maria, pedro = usuarios

        ws_martin = Workspace(nombre="Personal Martín", emoji="🏠", moneda_base="EUR", owner_id=martin.id)
        ws_maria = Workspace(nombre="Personal María", emoji="🌸", moneda_base="EUR", owner_id=maria.id)
        ws_pedro = Workspace(nombre="Personal Pedro", emoji="⚡", moneda_base="EUR", owner_id=pedro.id)
        ws_familia = Workspace(nombre="Familia García", emoji="👨‍👩‍👧", moneda_base="EUR", owner_id=martin.id)

        for ws in [ws_martin, ws_maria, ws_pedro, ws_familia]:
            session.add(ws)
        session.flush()

        membresias = [
            WorkspaceMiembro(workspace_id=ws_martin.id, usuario_id=martin.id, rol="owner"),
            WorkspaceMiembro(workspace_id=ws_maria.id, usuario_id=maria.id, rol="owner"),
            WorkspaceMiembro(workspace_id=ws_pedro.id, usuario_id=pedro.id, rol="owner"),
            WorkspaceMiembro(workspace_id=ws_familia.id, usuario_id=martin.id, rol="owner"),
            WorkspaceMiembro(workspace_id=ws_familia.id, usuario_id=maria.id, rol="editor"),
            WorkspaceMiembro(workspace_id=ws_familia.id, usuario_id=pedro.id, rol="editor"),
        ]
        for m in membresias:
            session.add(m)

        session.commit()

        print("Seed completado:")
        for u in usuarios:
            print(f"  Usuario @{u.usuario_unico} — id: {u.id}")
        print(f"  Workspace 'Familia García' — id: {ws_familia.id}")


if __name__ == "__main__":
    seed()
