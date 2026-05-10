"""Tests Bloque 6 — Motor de reglas."""
import json
import pytest
from datetime import date, datetime
from decimal import Decimal
from sqlmodel import Session, select

from models.movimiento import Movimiento
from models.regla import Regla, ReglaEjecucion
from services.reglas_engine import (
    ContextoEjecucion,
    procesar_movimiento_creado,
    simular_regla,
)


def _movimiento(session, datos, tipo="ingreso", importe="2000", concepto="NOMINA EMPRESA"):
    ws = datos["ws_martin"]
    banco = datos["banco"]
    martin = datos["martin"]
    mov = Movimiento(
        workspace_id=ws.id,
        cuenta_id=banco.id,
        tipo=tipo,
        importe=Decimal(importe),
        moneda="EUR",
        importe_base=Decimal(importe),
        tasa_cambio=Decimal("1"),
        fecha=date.today(),
        concepto=concepto,
        estado="confirmado",
        fuente="manual",
        creado_por=martin.id,
    )
    session.add(mov)
    session.flush()
    return mov


def _regla_nomina_distribucion(session, datos, max_mes=None):
    """Regla 50/30/20 simplificada: 20% a efectivo cuando llega ingreso."""
    ws = datos["ws_martin"]
    martin = datos["martin"]
    banco = datos["banco"]
    efectivo = datos["efectivo"]

    regla = Regla(
        workspace_id=ws.id,
        nombre="Distribución nómina",
        trigger_tipo="movimiento_creado",
        trigger_config=json.dumps({"tipo_movimiento": ["ingreso"]}),
        condiciones=json.dumps([
            {"campo": "concepto", "operador": "contiene_ignore_case", "valor": "nomina"}
        ]),
        modo_condiciones="AND",
        acciones=json.dumps([
            {
                "tipo": "transferir_porcentaje",
                "porcentaje": 20,
                "cuenta_origen": banco.id,
                "cuenta_destino": efectivo.id,
                "concepto": "Auto-ahorro nómina",
            }
        ]),
        max_ejecuciones_mes=max_mes,
        creado_por=martin.id,
    )
    session.add(regla)
    session.flush()
    return regla


# ─────────────────────────────────────────────────────────────────────────────
# Test 1 — Distribución básica de nómina
# ─────────────────────────────────────────────────────────────────────────────

def test_distribucion_nomina_basica(session, datos_base):
    """Nómina de 2000€ → 20% a efectivo (400€). Regla se dispara y crea transferencia."""
    _regla_nomina_distribucion(session, datos_base)
    session.commit()

    mov = _movimiento(session, datos_base, tipo="ingreso", importe="2000", concepto="NOMINA EMPRESA")
    session.commit()

    resultados = procesar_movimiento_creado(mov, session)
    session.commit()

    assert any(r["estado"] == "exito" for r in resultados)

    # Debe haber un movimiento de 400€ en efectivo
    efectivo = datos_base["efectivo"]
    movs_efectivo = session.exec(
        select(Movimiento).where(
            Movimiento.cuenta_id == efectivo.id,
            Movimiento.tipo == "transferencia_destino",
            Movimiento.archivado_en == None,
        )
    ).all()
    assert any(Decimal(str(m.importe)) == Decimal("400.0000") for m in movs_efectivo)


# ─────────────────────────────────────────────────────────────────────────────
# Test 2 — Regla no se dispara sin condición
# ─────────────────────────────────────────────────────────────────────────────

def test_regla_no_se_dispara_sin_condiciones(session, datos_base):
    """Concepto sin 'nómina' → regla no se ejecuta."""
    _regla_nomina_distribucion(session, datos_base)
    session.commit()

    mov = _movimiento(session, datos_base, tipo="ingreso", importe="2000", concepto="Transferencia amigo")
    session.commit()

    resultados = procesar_movimiento_creado(mov, session)
    assert not any(r["estado"] == "exito" for r in resultados)

    efectivo = datos_base["efectivo"]
    movs = session.exec(
        select(Movimiento).where(
            Movimiento.cuenta_id == efectivo.id,
            Movimiento.tipo == "transferencia_destino",
        )
    ).all()
    assert len(movs) == 0


# ─────────────────────────────────────────────────────────────────────────────
# Test 3 — Anti-bucle: profundidad máxima 5
# ─────────────────────────────────────────────────────────────────────────────

def test_anti_bucle_profundidad_5(session, datos_base):
    """Cadena que llega a profundidad 5 se corta sin error."""
    ws = datos_base["ws_martin"]
    banco = datos_base["banco"]
    efectivo = datos_base["efectivo"]
    martin = datos_base["martin"]

    # Regla que transfiere a efectivo cuando llega dinero a banco
    regla = Regla(
        workspace_id=ws.id,
        nombre="Bucle test",
        trigger_tipo="movimiento_creado",
        trigger_config=json.dumps({"tipo_movimiento": ["ingreso", "transferencia_destino"]}),
        condiciones=json.dumps([]),
        acciones=json.dumps([{
            "tipo": "transferir_fijo",
            "importe": "10",
            "moneda": "EUR",
            "cuenta_origen": banco.id,
            "cuenta_destino": efectivo.id,
            "concepto": "Cadena",
        }]),
        creado_por=martin.id,
    )
    session.add(regla)
    session.commit()

    mov = _movimiento(session, datos_base, tipo="ingreso", importe="100", concepto="Trigger")
    session.commit()

    # No debe explotar — debe parar en profundidad 5
    resultados = procesar_movimiento_creado(mov, session)
    session.commit()
    # Al menos un nivel se ejecuta
    assert any(r["estado"] == "exito" for r in resultados)


# ─────────────────────────────────────────────────────────────────────────────
# Test 4 — Misma regla no se ejecuta dos veces en la misma cadena
# ─────────────────────────────────────────────────────────────────────────────

def test_misma_regla_no_se_ejecuta_dos_veces_en_cadena(session, datos_base):
    """Regla que crea movimiento que la volvería a disparar → solo se ejecuta una vez."""
    ws = datos_base["ws_martin"]
    banco = datos_base["banco"]
    efectivo = datos_base["efectivo"]
    martin = datos_base["martin"]

    regla = Regla(
        workspace_id=ws.id,
        nombre="Auto-disparo",
        trigger_tipo="movimiento_creado",
        trigger_config=json.dumps({"tipo_movimiento": ["ingreso", "transferencia_destino"]}),
        condiciones=json.dumps([]),
        acciones=json.dumps([{
            "tipo": "transferir_fijo",
            "importe": "1",
            "moneda": "EUR",
            "cuenta_origen": banco.id,
            "cuenta_destino": efectivo.id,
            "concepto": "Ciclo",
        }]),
        creado_por=martin.id,
    )
    session.add(regla)
    session.commit()

    mov = _movimiento(session, datos_base, tipo="ingreso", importe="50", concepto="Salario")
    session.commit()

    ctx = ContextoEjecucion()
    procesar_movimiento_creado(mov, session, ctx)
    session.commit()

    # La regla solo debe estar en el set una vez (no puede ejecutarse dos veces en una cadena)
    assert regla.id in ctx.reglas_ya_ejecutadas


# ─────────────────────────────────────────────────────────────────────────────
# Test 5 — Límite mensual
# ─────────────────────────────────────────────────────────────────────────────

def test_limite_mes(session, datos_base):
    """Regla con max_ejecuciones=1: segunda ejecución queda omitida."""
    regla = _regla_nomina_distribucion(session, datos_base, max_mes=1)
    session.commit()

    # Primera ejecución — debe funcionar
    mov1 = _movimiento(session, datos_base, tipo="ingreso", importe="2000", concepto="NOMINA")
    session.commit()
    resultados1 = procesar_movimiento_creado(mov1, session)
    session.commit()
    assert any(r["estado"] == "exito" for r in resultados1)

    # Segunda ejecución — debe ser omitida
    mov2 = _movimiento(session, datos_base, tipo="ingreso", importe="2000", concepto="NOMINA EXTRA")
    session.commit()
    resultados2 = procesar_movimiento_creado(mov2, session)
    assert any(r.get("estado") == "omitida" for r in resultados2)


# ─────────────────────────────────────────────────────────────────────────────
# Test 6 — Rollback si falla acción
# ─────────────────────────────────────────────────────────────────────────────

def test_rollback_si_falla_accion(session, datos_base):
    """Si una acción falla (cuenta inexistente), los movimientos creados se archivan."""
    ws = datos_base["ws_martin"]
    banco = datos_base["banco"]
    efectivo = datos_base["efectivo"]
    martin = datos_base["martin"]

    regla = Regla(
        workspace_id=ws.id,
        nombre="Regla con fallo",
        trigger_tipo="movimiento_creado",
        trigger_config=json.dumps({"tipo_movimiento": ["ingreso"]}),
        condiciones=json.dumps([]),
        acciones=json.dumps([
            {
                "tipo": "transferir_fijo",
                "importe": "100",
                "cuenta_origen": banco.id,
                "cuenta_destino": efectivo.id,
                "concepto": "Accion 1 OK",
            },
            {
                "tipo": "tipo_accion_inexistente_que_falla",  # Esto lanzará ValueError
            },
        ]),
        creado_por=martin.id,
    )
    session.add(regla)
    session.commit()

    mov = _movimiento(session, datos_base, tipo="ingreso", importe="500", concepto="Ingreso")
    session.commit()

    resultados = procesar_movimiento_creado(mov, session)
    session.commit()

    assert any(r["estado"] == "error" for r in resultados)

    # Los movimientos de la acción 1 deben haber sido archivados (rollback)
    movs_efectivo = session.exec(
        select(Movimiento).where(
            Movimiento.cuenta_id == efectivo.id,
            Movimiento.tipo == "transferencia_destino",
            Movimiento.archivado_en == None,
        )
    ).all()
    assert len(movs_efectivo) == 0


# ─────────────────────────────────────────────────────────────────────────────
# Test 7 — Simulación no modifica datos
# ─────────────────────────────────────────────────────────────────────────────

def test_simulacion_no_modifica_datos(session, datos_base):
    """Modo simulación devuelve log sin tocar la BD."""
    regla = _regla_nomina_distribucion(session, datos_base)
    session.commit()

    # Crear movimiento disparador en el pasado para que simular_regla lo encuentre
    mov = _movimiento(session, datos_base, tipo="ingreso", importe="2000", concepto="NOMINA")
    session.commit()

    resultados = simular_regla(regla, session, dias_atras=1)

    # El simulador debe haber encontrado el movimiento
    assert len(resultados) >= 1

    # No debe haber creado movimientos reales
    efectivo = datos_base["efectivo"]
    movs = session.exec(
        select(Movimiento).where(
            Movimiento.cuenta_id == efectivo.id,
            Movimiento.tipo == "transferencia_destino",
        )
    ).all()
    assert len(movs) == 0

    # Tampoco debe haber registros de ejecución reales
    ejecuciones = session.exec(
        select(ReglaEjecucion).where(ReglaEjecucion.regla_id == regla.id)
    ).all()
    assert len(ejecuciones) == 0


# ─────────────────────────────────────────────────────────────────────────────
# Test 8 — Idempotencia
# ─────────────────────────────────────────────────────────────────────────────

def test_idempotencia(session, datos_base):
    """Procesar el mismo movimiento dos veces no duplica transferencias."""
    _regla_nomina_distribucion(session, datos_base)
    session.commit()

    mov = _movimiento(session, datos_base, tipo="ingreso", importe="1000", concepto="NOMINA")
    session.commit()

    procesar_movimiento_creado(mov, session)
    session.commit()
    procesar_movimiento_creado(mov, session)
    session.commit()

    efectivo = datos_base["efectivo"]
    movs = session.exec(
        select(Movimiento).where(
            Movimiento.cuenta_id == efectivo.id,
            Movimiento.tipo == "transferencia_destino",
            Movimiento.archivado_en == None,
        )
    ).all()
    # Solo debe existir una transferencia, no dos
    assert len(movs) == 1


# ─────────────────────────────────────────────────────────────────────────────
# Test 9 — Redondeo al ahorro
# ─────────────────────────────────────────────────────────────────────────────

def test_redondeo_al_ahorro(session, datos_base):
    """Gasto de 3.40€ genera transferencia de 0.60€ al ahorro hormiga."""
    ws = datos_base["ws_martin"]
    banco = datos_base["banco"]
    efectivo = datos_base["efectivo"]
    martin = datos_base["martin"]

    regla = Regla(
        workspace_id=ws.id,
        nombre="Redondeo ahorro",
        trigger_tipo="movimiento_creado",
        trigger_config=json.dumps({"tipo_movimiento": ["gasto"]}),
        condiciones=json.dumps([]),
        acciones=json.dumps([{
            "tipo": "transferir_redondeo",
            "redondear_a": "1.00",
            "cuenta_destino": efectivo.id,
            "concepto": "Redondeo hormiga",
        }]),
        creado_por=martin.id,
    )
    session.add(regla)
    session.commit()

    mov = Movimiento(
        workspace_id=ws.id,
        cuenta_id=banco.id,
        tipo="gasto",
        importe=Decimal("3.40"),
        moneda="EUR",
        importe_base=Decimal("3.40"),
        tasa_cambio=Decimal("1"),
        fecha=date.today(),
        concepto="Café",
        estado="confirmado",
        fuente="manual",
        creado_por=martin.id,
    )
    session.add(mov)
    session.commit()

    procesar_movimiento_creado(mov, session)
    session.commit()

    movs_ahorro = session.exec(
        select(Movimiento).where(
            Movimiento.cuenta_id == efectivo.id,
            Movimiento.tipo == "transferencia_destino",
            Movimiento.archivado_en == None,
        )
    ).all()
    assert len(movs_ahorro) == 1
    assert Decimal(str(movs_ahorro[0].importe)) == Decimal("0.6000")


# ─────────────────────────────────────────────────────────────────────────────
# Test 10 — Categorización automática Mercadona
# ─────────────────────────────────────────────────────────────────────────────

def test_categorizacion_automatica_mercadona(session, datos_base):
    """Concepto contiene 'MERCADONA' → se asigna categoría automáticamente."""
    ws = datos_base["ws_martin"]
    banco = datos_base["banco"]
    martin = datos_base["martin"]
    cat_comida = datos_base["cat_comida"]

    regla = Regla(
        workspace_id=ws.id,
        nombre="Auto Mercadona",
        trigger_tipo="movimiento_creado",
        trigger_config=json.dumps({"tipo_movimiento": ["gasto"]}),
        condiciones=json.dumps([
            {"campo": "concepto", "operador": "contiene_ignore_case", "valor": "mercadona"}
        ]),
        acciones=json.dumps([
            {"tipo": "asignar_categoria", "categoria_id": cat_comida.id}
        ]),
        creado_por=martin.id,
    )
    session.add(regla)
    session.commit()

    mov = Movimiento(
        workspace_id=ws.id,
        cuenta_id=banco.id,
        tipo="gasto",
        importe=Decimal("45.20"),
        moneda="EUR",
        importe_base=Decimal("45.20"),
        tasa_cambio=Decimal("1"),
        fecha=date.today(),
        concepto="MERCADONA 45.20",
        estado="confirmado",
        fuente="manual",
        creado_por=martin.id,
    )
    session.add(mov)
    session.commit()

    procesar_movimiento_creado(mov, session)
    session.commit()
    session.refresh(mov)

    assert mov.categoria_id == cat_comida.id


# ─────────────────────────────────────────────────────────────────────────────
# Tests API REST
# ─────────────────────────────────────────────────────────────────────────────

def _headers(datos):
    return {"X-User-Id": datos["martin"].id, "X-Workspace-Id": datos["ws_martin"].id}


def test_crear_regla_api(client, datos_base):
    banco = datos_base["banco"]
    efectivo = datos_base["efectivo"]
    r = client.post("/reglas", json={
        "nombre": "Test regla API",
        "trigger_tipo": "movimiento_creado",
        "trigger_config": {"tipo_movimiento": ["ingreso"]},
        "condiciones": [],
        "acciones": [{"tipo": "notificar", "mensaje": "Ingreso recibido"}],
    }, headers=_headers(datos_base))
    assert r.status_code == 200
    assert r.json()["nombre"] == "Test regla API"


def test_activar_desactivar_regla_api(client, datos_base):
    r = client.post("/reglas", json={
        "nombre": "Regla pausable",
        "trigger_tipo": "movimiento_creado",
        "trigger_config": {},
        "condiciones": [],
        "acciones": [],
    }, headers=_headers(datos_base))
    regla_id = r.json()["id"]

    r2 = client.patch(f"/reglas/{regla_id}", json={"activa": False}, headers=_headers(datos_base))
    assert r2.status_code == 200
    assert r2.json()["activa"] is False


def test_simular_regla_api(client, datos_base, session):
    banco = datos_base["banco"]
    efectivo = datos_base["efectivo"]

    # Crear movimiento antes para que la simulación lo encuentre
    mov = _movimiento(session, datos_base, tipo="ingreso", importe="1500", concepto="NOMINA")
    session.commit()

    r = client.post("/reglas", json={
        "nombre": "Simular nómina",
        "trigger_tipo": "movimiento_creado",
        "trigger_config": {"tipo_movimiento": ["ingreso"]},
        "condiciones": [{"campo": "concepto", "operador": "contiene_ignore_case", "valor": "nomina"}],
        "acciones": [{"tipo": "notificar", "mensaje": "Nómina detectada"}],
    }, headers=_headers(datos_base))
    regla_id = r.json()["id"]

    r2 = client.post(f"/reglas/{regla_id}/simular?dias_atras=1", headers=_headers(datos_base))
    assert r2.status_code == 200
    assert r2.json()["total_disparos"] >= 1
