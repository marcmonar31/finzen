"""
Siembra categorías y cuentas por defecto al crear un workspace.
"""
from datetime import date
from decimal import Decimal
from sqlmodel import Session, select
from models.categoria import Categoria
from models.cuenta import Cuenta

CATEGORIAS_DEFAULT = [
    # ── Ingresos ──────────────────────────────────
    {"nombre": "Nómina",        "tipo": "ingreso", "emoji": "briefcase",    "color": "#C7FF6B"},
    {"nombre": "Freelance",     "tipo": "ingreso", "emoji": "monitor",      "color": "#C7FF6B"},
    {"nombre": "Inversiones",   "tipo": "ingreso", "emoji": "trending-up",  "color": "#C7FF6B"},
    {"nombre": "Regalos",       "tipo": "ingreso", "emoji": "gift",         "color": "#C7FF6B"},
    {"nombre": "Otros ingresos","tipo": "ingreso", "emoji": "plus",         "color": "#C7FF6B"},
    # ── Gastos (padres) ───────────────────────────
    {"nombre": "Vivienda",   "tipo": "gasto", "emoji": "home",          "color": "#4A90E2", "hijos": [
        "Alquiler", "Hipoteca", "Suministros", "Mantenimiento",
    ]},
    {"nombre": "Comida",     "tipo": "gasto", "emoji": "utensils",      "color": "#FF9A4D", "hijos": [
        "Supermercado", "Restaurantes", "Cafés", "Delivery",
    ]},
    {"nombre": "Transporte", "tipo": "gasto", "emoji": "car",           "color": "#B57BFF", "hijos": [
        "Combustible", "Transporte público", "Taxi", "Mantenimiento coche",
    ]},
    {"nombre": "Salud",      "tipo": "gasto", "emoji": "heart",         "color": "#FF5C5C", "hijos": [
        "Médico", "Farmacia", "Seguros",
    ]},
    {"nombre": "Ocio",       "tipo": "gasto", "emoji": "gamepad-2",     "color": "#FFD84D", "hijos": [
        "Cine", "Suscripciones", "Viajes", "Eventos",
    ]},
    {"nombre": "Personal",   "tipo": "gasto", "emoji": "user",          "color": "#FF6BB5", "hijos": [
        "Ropa", "Belleza", "Regalos",
    ]},
    {"nombre": "Educación",  "tipo": "gasto", "emoji": "book-open",     "color": "#4DD8C7", "hijos": [
        "Cursos", "Libros", "Material",
    ]},
    {"nombre": "Otros gastos","tipo": "gasto","emoji": "package",        "color": "#B0B0B4"},
]


def seed_workspace_defaults(workspace_id: str, creado_por: str, session: Session) -> None:
    ya_tiene_categorias = session.exec(
        select(Categoria).where(Categoria.workspace_id == workspace_id)
    ).first()

    if not ya_tiene_categorias:
        orden = 0
        for cat in CATEGORIAS_DEFAULT:
            padre = Categoria(
                workspace_id=workspace_id,
                nombre=cat["nombre"],
                tipo=cat["tipo"],
                emoji=cat.get("emoji"),
                color=cat.get("color"),
                orden=orden,
            )
            session.add(padre)
            session.flush()
            orden += 1

            for nombre_hijo in cat.get("hijos", []):  # type: ignore[union-attr]
                hijo = Categoria(
                    workspace_id=workspace_id,
                    nombre=nombre_hijo,
                    tipo=cat["tipo"],
                    parent_id=padre.id,
                    emoji=cat.get("emoji"),
                    orden=orden,
                )
                session.add(hijo)
                orden += 1

    ya_tiene_cuentas = session.exec(
        select(Cuenta).where(Cuenta.workspace_id == workspace_id)
    ).first()

    if not ya_tiene_cuentas:
        session.add(Cuenta(
            workspace_id=workspace_id,
            nombre="Efectivo",
            tipo="efectivo",
            moneda="EUR",
            emoji="wallet",
            color="#C7FF6B",
            saldo_inicial=Decimal("0"),
            fecha_saldo_inicial=date.today(),
            creado_por=creado_por,
            orden=1,
        ))
        session.add(Cuenta(
            workspace_id=workspace_id,
            nombre="Banco principal",
            tipo="corriente",
            moneda="EUR",
            emoji="landmark",
            color="#4A90E2",
            saldo_inicial=Decimal("0"),
            fecha_saldo_inicial=date.today(),
            creado_por=creado_por,
            orden=0,
        ))
