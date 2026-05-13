"""
Crea usuarios demo y workspaces de ejemplo con categorías y cuentas por defecto.
Ejecutar: python seed.py
Es idempotente: puede correrse varias veces sin duplicar datos.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlmodel import Session, select
from database import engine
from models.usuario import Usuario
from models.workspace import Workspace
from models.miembro import WorkspaceMiembro
from services.workspace_defaults import seed_workspace_defaults


USUARIOS_DEMO = [
    {"usuario_unico": "martin", "nombre": "Martín García", "avatar_emoji": "🧑"},
    {"usuario_unico": "maria", "nombre": "María López", "avatar_emoji": "👩"},
    {"usuario_unico": "pedro", "nombre": "Pedro Ruiz", "avatar_emoji": "🧔"},
]


def seed():
    with Session(engine) as session:
        usuarios_existentes = session.exec(select(Usuario)).all()

        if not usuarios_existentes:
            usuarios = []
            for datos in USUARIOS_DEMO:
                u = Usuario(**datos)
                session.add(u)
                usuarios.append(u)
            session.flush()

            martin, maria, pedro = usuarios

            workspaces_data = [
                (Workspace(nombre="Personal Martín", emoji="🏠", moneda_base="EUR", owner_id=martin.id), martin.id),
                (Workspace(nombre="Personal María", emoji="🌸", moneda_base="EUR", owner_id=maria.id), maria.id),
                (Workspace(nombre="Personal Pedro", emoji="⚡", moneda_base="EUR", owner_id=pedro.id), pedro.id),
            ]

            workspaces = []
            for ws, _ in workspaces_data:
                session.add(ws)
                workspaces.append(ws)
            session.flush()

            ws_martin, ws_maria, ws_pedro = workspaces

            membresias = [
                WorkspaceMiembro(workspace_id=ws_martin.id, usuario_id=martin.id, rol="owner"),
                WorkspaceMiembro(workspace_id=ws_maria.id, usuario_id=maria.id, rol="owner"),
                WorkspaceMiembro(workspace_id=ws_pedro.id, usuario_id=pedro.id, rol="owner"),
            ]
            for m in membresias:
                session.add(m)
            session.flush()

            for ws, owner_id in workspaces_data:
                seed_workspace_defaults(ws.id, owner_id, session)

            session.commit()

            print("Seed completado:")
            for u in usuarios:
                print(f"  Usuario @{u.usuario_unico} — id: {u.id}")
        else:
            # Idempotente: siembra defaults para workspaces que no los tengan aún
            print("Usuarios ya existen. Comprobando defaults de workspaces…")
            all_ws = session.exec(select(Workspace)).all()
            for ws in all_ws:
                seed_workspace_defaults(ws.id, ws.owner_id, session)
            session.commit()
            print(f"  Defaults comprobados para {len(all_ws)} workspace(s).")


if __name__ == "__main__":
    seed()
