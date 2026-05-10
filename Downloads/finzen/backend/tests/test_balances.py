"""Tests Bloque 5 — Cálculo de balances y liquidaciones óptimas."""
import pytest
from decimal import Decimal
from sqlmodel import Session

from models.grupo import Grupo, GrupoMiembro, GastoCompartido, GastoReparto, Liquidacion
from services.liquidacion import calcular_balance_grupo, calcular_repartos, transferencias_optimas


def _grupo(session, creado_por, moneda="EUR") -> Grupo:
    g = Grupo(nombre="Test", moneda_principal=moneda, creado_por=creado_por)
    session.add(g)
    session.flush()
    return g


def _miembro(session, grupo_id, usuario_id) -> GrupoMiembro:
    m = GrupoMiembro(grupo_id=grupo_id, usuario_id=usuario_id)
    session.add(m)
    session.flush()
    return m


def _gasto(session, grupo_id, pagador_id, importe, reparto: dict) -> None:
    """reparto: {miembro_id: importe_asignado}"""
    from datetime import date
    g = GastoCompartido(
        grupo_id=grupo_id,
        concepto="Gasto test",
        importe=Decimal(str(importe)),
        moneda="EUR",
        importe_convertido=Decimal(str(importe)),
        tasa_cambio=Decimal("1"),
        fecha=date.today(),
        pagador_id=pagador_id,
        creado_por=pagador_id,  # simplificación: usamos el miembro_id como creado_por
    )
    session.add(g)
    session.flush()
    for mid, imp in reparto.items():
        session.add(GastoReparto(gasto_id=g.id, miembro_id=mid, importe_asignado=Decimal(str(imp))))
    session.flush()


def test_balance_basico_dos_miembros(session, datos_base):
    """A paga 80, repartido igualitario con B → A:+40, B:-40"""
    martin = datos_base["martin"]
    maria = datos_base["maria"]
    grupo = _grupo(session, martin.id)
    m_a = _miembro(session, grupo.id, martin.id)
    m_b = _miembro(session, grupo.id, maria.id)

    _gasto(session, grupo.id, m_a.id, "80", {m_a.id: "40", m_b.id: "40"})
    session.commit()

    balance = calcular_balance_grupo(grupo.id, session)
    assert balance[m_a.id] == Decimal("40.0000")
    assert balance[m_b.id] == Decimal("-40.0000")


def test_reparto_porcentajes():
    """Gasto 100€: A paga 70%, B paga 30%"""
    montos = calcular_repartos(
        Decimal("100"),
        ["a", "b"],
        "porcentajes",
        porcentajes={"a": Decimal("70"), "b": Decimal("30")},
    )
    assert montos["a"] == Decimal("70.0000")
    assert montos["b"] == Decimal("30.0000")
    assert sum(montos.values()) == Decimal("100")


def test_reparto_partes():
    """Gasto 100€: A 2 partes, B 1 parte, C 1 parte → A:50, B:25, C:25"""
    montos = calcular_repartos(
        Decimal("100"),
        ["a", "b", "c"],
        "partes",
        partes={"a": 2, "b": 1, "c": 1},
    )
    assert montos["a"] == Decimal("50.0000")
    assert montos["b"] == Decimal("25.0000")
    assert montos["c"] == Decimal("25.0000")


def test_reparto_igualitario_residuo():
    """10€ entre 3: asegura que la suma sea exactamente 10."""
    montos = calcular_repartos(Decimal("10"), ["a", "b", "c"], "igualitario")
    assert sum(montos.values()) == Decimal("10")


def test_liquidacion_reduce_balance(session, datos_base):
    """A debe 40 a B. A liquida 40 (confirmada). Balance ambos = 0."""
    martin = datos_base["martin"]
    maria = datos_base["maria"]
    grupo = _grupo(session, martin.id)
    m_a = _miembro(session, grupo.id, martin.id)
    m_b = _miembro(session, grupo.id, maria.id)

    _gasto(session, grupo.id, m_b.id, "80", {m_a.id: "40", m_b.id: "40"})

    # m_a debe 40 a m_b. Registrar liquidación confirmada.
    liq = Liquidacion(
        grupo_id=grupo.id,
        de_miembro_id=m_a.id,
        a_miembro_id=m_b.id,
        importe=Decimal("40"),
        moneda="EUR",
        estado="confirmada",
    )
    session.add(liq)
    session.commit()

    balance = calcular_balance_grupo(grupo.id, session)
    assert balance[m_a.id] == Decimal("0.0000")
    assert balance[m_b.id] == Decimal("0.0000")


def test_liquidacion_optima_3_miembros():
    """Caso: 3 personas con deudas cruzadas → mínimas transferencias."""
    # balance: A: +90, B: -30, C: -60
    balance = {
        "a": Decimal("90"),
        "b": Decimal("-30"),
        "c": Decimal("-60"),
    }
    transferencias = transferencias_optimas(balance)
    # Basta con 2 transferencias
    assert len(transferencias) == 2
    # Suma pagos == suma cobros
    total_paga = sum(t["importe"] for t in transferencias)
    assert total_paga == Decimal("90")


def test_liquidacion_optima_equilibrada():
    """Todos tienen balance 0 → sin transferencias."""
    balance = {"a": Decimal("0"), "b": Decimal("0")}
    assert transferencias_optimas(balance) == []


def test_no_cerrar_grupo_con_balances_pendientes(client, datos_base):
    martin = datos_base["martin"]
    maria = datos_base["maria"]
    ws = datos_base["ws_martin"]

    r = client.post("/grupos", json={
        "nombre": "Piso", "moneda_principal": "EUR",
        "miembro_usuario_ids": [maria.id],
        "workspace_id": ws.id,
    }, headers={"X-User-Id": martin.id, "X-Workspace-Id": ws.id})
    grupo_id = r.json()["id"]

    # Obtener miembro_id del pagador (martin)
    miembros = r.json()["miembros"]
    m_martin = next(m for m in miembros if m["usuario_id"] == martin.id)
    m_maria = next(m for m in miembros if m["usuario_id"] == maria.id)

    from datetime import date
    client.post(f"/grupos/{grupo_id}/gastos", json={
        "grupo_id": grupo_id,
        "concepto": "Cena",
        "importe": "80",
        "moneda": "EUR",
        "fecha": date.today().isoformat(),
        "pagador_id": m_martin["id"],
        "modo_reparto": "igualitario",
        "miembro_ids": [m_martin["id"], m_maria["id"]],
    }, headers={"X-User-Id": martin.id, "X-Workspace-Id": ws.id})

    # Intentar cerrar con balance pendiente
    r_cerrar = client.post(f"/grupos/{grupo_id}/cerrar", headers={"X-User-Id": martin.id, "X-Workspace-Id": ws.id})
    assert r_cerrar.status_code == 400
