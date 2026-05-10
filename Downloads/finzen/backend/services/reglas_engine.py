"""
Motor de reglas de Finzen.

Arquitectura: TRIGGER → CONDICIONES → ACCIONES
Salvaguardas: anti-bucle (profundidad ≤5), una regla por cadena, límites mensuales,
              idempotencia, rollback transaccional.
"""
import hashlib
import json
import re
import uuid
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from decimal import ROUND_UP, Decimal
from typing import Any, Dict, List, Optional, Set

from sqlmodel import Session, select

from models.cuenta import Cuenta
from models.etiqueta import Etiqueta
from models.movimiento import Movimiento, MovimientoEtiqueta
from models.regla import Regla, ReglaEjecucion
from models.transferencia import Transferencia

MAX_PROFUNDIDAD = 5


@dataclass
class ContextoEjecucion:
    profundidad: int = 0
    reglas_ya_ejecutadas: Set[str] = field(default_factory=set)
    simulacion: bool = False
    log: List[Dict] = field(default_factory=list)


# ─────────────────────────────────────────────────────────────────────────────
# Punto de entrada principal
# ─────────────────────────────────────────────────────────────────────────────

def procesar_movimiento_creado(
    movimiento: Movimiento,
    session: Session,
    contexto: Optional[ContextoEjecucion] = None,
) -> List[Dict]:
    """
    Evalúa todas las reglas activas para un movimiento recién creado.
    Devuelve lista de resultados de ejecución.
    """
    if contexto is None:
        contexto = ContextoEjecucion()

    if contexto.profundidad >= MAX_PROFUNDIDAD:
        return []

    reglas = session.exec(
        select(Regla).where(
            Regla.workspace_id == movimiento.workspace_id,
            Regla.activa == True,  # noqa: E712
            Regla.trigger_tipo == "movimiento_creado",
            Regla.archivado_en == None,  # noqa: E711
        ).order_by(Regla.orden)
    ).all()

    resultados = []
    for regla in reglas:
        if regla.id in contexto.reglas_ya_ejecutadas:
            continue

        trigger_config = json.loads(regla.trigger_config or "{}")
        if not _trigger_movimiento_aplica(trigger_config, movimiento):
            continue

        condiciones = json.loads(regla.condiciones or "[]")
        if condiciones and not _condiciones_se_cumplen(condiciones, regla.modo_condiciones, movimiento):
            continue

        if regla.max_ejecuciones_mes and _excede_limite_mes(regla, session):
            if not contexto.simulacion:
                _registrar_ejecucion(regla, movimiento, "omitida", session, razon="limite_mensual")
            resultados.append({"regla_id": regla.id, "estado": "omitida", "razon": "limite_mensual"})
            continue

        contexto.reglas_ya_ejecutadas.add(regla.id)
        res = _ejecutar_regla(regla, movimiento, contexto, session)
        resultados.append(res)

    return resultados


# ─────────────────────────────────────────────────────────────────────────────
# Evaluación de trigger
# ─────────────────────────────────────────────────────────────────────────────

def _trigger_movimiento_aplica(config: Dict, movimiento: Movimiento) -> bool:
    tipos = config.get("tipo_movimiento", [])
    if tipos and movimiento.tipo not in tipos:
        return False

    cuentas = config.get("cuentas", [])
    if cuentas and movimiento.cuenta_id not in cuentas:
        return False

    return True


# ─────────────────────────────────────────────────────────────────────────────
# Evaluación de condiciones
# ─────────────────────────────────────────────────────────────────────────────

def _condiciones_se_cumplen(condiciones: List[Dict], modo: str, movimiento: Movimiento) -> bool:
    results = [_evaluar_condicion(c, movimiento) for c in condiciones]
    if modo == "OR":
        return any(results)
    return all(results)


def _evaluar_condicion(cond: Dict, movimiento: Movimiento) -> bool:
    campo = cond.get("campo", "")
    operador = cond.get("operador", "igual")
    valor = cond.get("valor")
    actual = _get_campo_movimiento(campo, movimiento)
    if actual is None and campo not in ("categoria_id", "notas"):
        return False
    return _aplicar_operador(actual, operador, valor)


def _get_campo_movimiento(campo: str, movimiento: Movimiento) -> Any:
    simple = {
        "concepto": movimiento.concepto,
        "importe": movimiento.importe,
        "importe_base": movimiento.importe_base,
        "moneda": movimiento.moneda,
        "tipo": movimiento.tipo,
        "categoria_id": movimiento.categoria_id,
        "cuenta_id": movimiento.cuenta_id,
        "fuente": movimiento.fuente,
        "notas": movimiento.notas,
    }
    if campo in simple:
        return simple[campo]
    if campo == "dia_semana":
        dias = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
        return dias[movimiento.fecha.weekday()]
    if campo == "dia_mes":
        return movimiento.fecha.day
    return None


def _aplicar_operador(actual: Any, operador: str, valor: Any) -> bool:
    try:
        if operador == "igual":
            return str(actual) == str(valor)
        if operador == "contiene":
            return str(valor) in str(actual)
        if operador == "contiene_ignore_case":
            return str(valor).lower() in str(actual or "").lower()
        if operador == "empieza_por":
            return str(actual or "").startswith(str(valor))
        if operador == "regex":
            return bool(re.search(str(valor), str(actual or ""), re.IGNORECASE))
        if operador == "mayor_que":
            return Decimal(str(actual)) > Decimal(str(valor))
        if operador == "menor_que":
            return Decimal(str(actual)) < Decimal(str(valor))
        if operador == "mayor_igual":
            return Decimal(str(actual)) >= Decimal(str(valor))
        if operador == "menor_igual":
            return Decimal(str(actual)) <= Decimal(str(valor))
        if operador == "entre":
            vals = valor if isinstance(valor, list) else [valor]
            v1, v2 = Decimal(str(vals[0])), Decimal(str(vals[1]))
            return v1 <= Decimal(str(actual)) <= v2
        if operador == "es_alguno_de":
            vals = valor if isinstance(valor, list) else [valor]
            return str(actual) in [str(v) for v in vals]
        if operador == "no_es":
            return str(actual) != str(valor)
        if operador == "es_verdadero":
            return bool(actual)
        if operador == "es_falso":
            return not bool(actual)
    except Exception:
        return False
    return False


# ─────────────────────────────────────────────────────────────────────────────
# Límites mensuales
# ─────────────────────────────────────────────────────────────────────────────

def _excede_limite_mes(regla: Regla, session: Session) -> bool:
    if not regla.max_ejecuciones_mes:
        return False
    inicio_dt = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    ejecuciones = session.exec(
        select(ReglaEjecucion).where(
            ReglaEjecucion.regla_id == regla.id,
            ReglaEjecucion.estado == "exito",
            ReglaEjecucion.ejecutado_en >= inicio_dt,
        )
    ).all()
    return len(ejecuciones) >= regla.max_ejecuciones_mes


# ─────────────────────────────────────────────────────────────────────────────
# Ejecución de regla
# ─────────────────────────────────────────────────────────────────────────────

def _ejecutar_regla(
    regla: Regla,
    movimiento: Movimiento,
    contexto: ContextoEjecucion,
    session: Session,
) -> Dict:
    acciones = json.loads(regla.acciones or "[]")
    movimientos_creados: List[Movimiento] = []

    try:
        for idx, accion in enumerate(acciones):
            resultado_accion = _aplicar_accion(accion, movimiento, contexto, session, regla, idx)
            mov_creado = resultado_accion.get("movimiento_creado")
            if mov_creado:
                movimientos_creados.append(mov_creado)

        if not contexto.simulacion:
            regla.ultima_ejecucion = datetime.utcnow()
            session.add(regla)
            session.commit()
            _registrar_ejecucion(
                regla, movimiento, "exito", session,
                movimientos_ids=[m.id for m in movimientos_creados],
            )

        # Cascade: process newly created movements
        for nuevo_mov in movimientos_creados:
            nuevo_ctx = ContextoEjecucion(
                profundidad=contexto.profundidad + 1,
                reglas_ya_ejecutadas=set(contexto.reglas_ya_ejecutadas),
                simulacion=contexto.simulacion,
            )
            procesar_movimiento_creado(nuevo_mov, session, nuevo_ctx)

        return {"regla_id": regla.id, "estado": "exito", "movimientos_creados": len(movimientos_creados)}

    except Exception as e:
        # Rollback: archive movements created in THIS rule
        for m in movimientos_creados:
            m.archivado_en = datetime.utcnow()
            if not contexto.simulacion:
                session.add(m)
        if not contexto.simulacion:
            session.commit()
            _registrar_ejecucion(regla, movimiento, "error", session, error=str(e))

        return {"regla_id": regla.id, "estado": "error", "error": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# Acciones
# ─────────────────────────────────────────────────────────────────────────────

def _aplicar_accion(
    accion: Dict,
    movimiento: Movimiento,
    contexto: ContextoEjecucion,
    session: Session,
    regla: Regla,
    accion_idx: int,
) -> Dict:
    tipo = accion.get("tipo", "")

    if tipo == "asignar_categoria":
        return _accion_asignar_categoria(accion, movimiento, contexto, session)
    if tipo == "anadir_etiqueta":
        return _accion_anadir_etiqueta(accion, movimiento, contexto, session)
    if tipo == "transferir_porcentaje":
        return _accion_transferir(accion, movimiento, contexto, session, regla, accion_idx, modo="porcentaje")
    if tipo == "transferir_fijo":
        return _accion_transferir(accion, movimiento, contexto, session, regla, accion_idx, modo="fijo")
    if tipo == "transferir_redondeo":
        return _accion_transferir_redondeo(accion, movimiento, contexto, session, regla, accion_idx)
    if tipo == "crear_movimiento_previsto":
        return _accion_crear_movimiento_previsto(accion, movimiento, contexto, session, regla, accion_idx)
    if tipo == "notificar":
        msg = accion.get("mensaje", "")
        contexto.log.append({"tipo": "notificacion", "mensaje": msg, "nivel": accion.get("nivel", "info")})
        return {}
    if tipo == "pausar_regla":
        return _accion_pausar_regla(accion, contexto, session)
    raise ValueError(f"Tipo de acción desconocido: {tipo}")


def _accion_asignar_categoria(accion: Dict, movimiento: Movimiento, contexto: ContextoEjecucion, session: Session) -> Dict:
    cat_id = accion.get("categoria_id")
    if not cat_id:
        raise ValueError("asignar_categoria requiere categoria_id")
    contexto.log.append({"tipo": "asignar_categoria", "movimiento_id": movimiento.id, "categoria_id": cat_id})
    if not contexto.simulacion:
        movimiento.categoria_id = cat_id
        movimiento.actualizado_en = datetime.utcnow()
        session.add(movimiento)
    return {}


def _accion_anadir_etiqueta(accion: Dict, movimiento: Movimiento, contexto: ContextoEjecucion, session: Session) -> Dict:
    etiqueta_id = accion.get("etiqueta_id")
    if not etiqueta_id:
        raise ValueError("anadir_etiqueta requiere etiqueta_id")
    contexto.log.append({"tipo": "anadir_etiqueta", "movimiento_id": movimiento.id, "etiqueta_id": etiqueta_id})
    if not contexto.simulacion:
        existente = session.get(MovimientoEtiqueta, (movimiento.id, etiqueta_id))
        if not existente:
            session.add(MovimientoEtiqueta(movimiento_id=movimiento.id, etiqueta_id=etiqueta_id))
    return {}


def _accion_transferir(
    accion: Dict,
    movimiento: Movimiento,
    contexto: ContextoEjecucion,
    session: Session,
    regla: Regla,
    accion_idx: int,
    modo: str,
) -> Dict:
    cuenta_origen_id = accion.get("cuenta_origen") or movimiento.cuenta_id
    cuenta_destino_id = accion.get("cuenta_destino")
    if not cuenta_destino_id:
        raise ValueError("transferir requiere cuenta_destino")

    if modo == "porcentaje":
        pct = Decimal(str(accion.get("porcentaje", 0)))
        importe = (movimiento.importe * pct / Decimal("100")).quantize(Decimal("0.0001"))
    else:
        importe = Decimal(str(accion.get("importe", "0")))

    if importe <= Decimal("0"):
        return {}

    concepto = accion.get("concepto", f"Auto-transferencia regla {regla.nombre}")
    moneda = accion.get("moneda") or movimiento.moneda

    # Idempotencia
    hash_origen = _hash_regla(regla.id, movimiento.id, accion_idx, "origen")
    hash_destino = _hash_regla(regla.id, movimiento.id, accion_idx, "destino")

    contexto.log.append({"tipo": f"transferir_{modo}", "importe": str(importe), "moneda": moneda,
                         "cuenta_origen": cuenta_origen_id, "cuenta_destino": cuenta_destino_id})
    if contexto.simulacion:
        return {}

    mov_origen = Movimiento(
        workspace_id=movimiento.workspace_id,
        cuenta_id=cuenta_origen_id,
        tipo="transferencia_origen",
        importe=importe,
        moneda=moneda,
        importe_base=importe,
        tasa_cambio=Decimal("1"),
        fecha=movimiento.fecha,
        concepto=concepto,
        fuente="regla",
        fuente_id=regla.id,
        hash_idempotencia=hash_origen,
        creado_por=movimiento.creado_por,
    )
    mov_destino = Movimiento(
        workspace_id=movimiento.workspace_id,
        cuenta_id=cuenta_destino_id,
        tipo="transferencia_destino",
        importe=importe,
        moneda=moneda,
        importe_base=importe,
        tasa_cambio=Decimal("1"),
        fecha=movimiento.fecha,
        concepto=concepto,
        fuente="regla",
        fuente_id=regla.id,
        hash_idempotencia=hash_destino,
        creado_por=movimiento.creado_por,
    )
    # Check idempotencia
    existing = session.exec(
        select(Movimiento).where(Movimiento.hash_idempotencia == hash_origen)
    ).first()
    if existing:
        return {}

    session.add(mov_origen)
    session.add(mov_destino)
    session.flush()

    transferencia = Transferencia(
        workspace_id=movimiento.workspace_id,
        movimiento_origen_id=mov_origen.id,
        movimiento_destino_id=mov_destino.id,
    )
    session.add(transferencia)
    session.flush()

    return {"movimiento_creado": mov_destino}


def _accion_transferir_redondeo(
    accion: Dict,
    movimiento: Movimiento,
    contexto: ContextoEjecucion,
    session: Session,
    regla: Regla,
    accion_idx: int,
) -> Dict:
    redondear_a = Decimal(str(accion.get("redondear_a", "1.00")))
    cuenta_destino_id = accion.get("cuenta_destino")
    if not cuenta_destino_id:
        raise ValueError("transferir_redondeo requiere cuenta_destino")

    # Redondear al múltiplo superior
    importe = movimiento.importe
    redondeado = (importe / redondear_a).to_integral_value(rounding=ROUND_UP) * redondear_a
    diferencia = (redondeado - importe).quantize(Decimal("0.0001"))

    if diferencia <= Decimal("0"):
        return {}

    # Reutilizar lógica de transferir_fijo
    accion_sintetica = {
        "cuenta_origen": movimiento.cuenta_id,
        "cuenta_destino": cuenta_destino_id,
        "importe": str(diferencia),
        "concepto": accion.get("concepto", "Redondeo al ahorro"),
    }
    return _accion_transferir(accion_sintetica, movimiento, contexto, session, regla, accion_idx, modo="fijo")


def _accion_crear_movimiento_previsto(
    accion: Dict,
    movimiento: Movimiento,
    contexto: ContextoEjecucion,
    session: Session,
    regla: Regla,
    accion_idx: int,
) -> Dict:
    cuenta_id = accion.get("cuenta_id") or movimiento.cuenta_id
    importe = Decimal(str(accion.get("importe", "0")))
    moneda = accion.get("moneda") or movimiento.moneda
    concepto = accion.get("concepto", "Movimiento previsto")
    dias_offset = int(accion.get("dias_offset", 0))
    fecha_prevista = movimiento.fecha + timedelta(days=dias_offset)
    hash_prev = _hash_regla(regla.id, movimiento.id, accion_idx, "previsto")

    contexto.log.append({"tipo": "crear_movimiento_previsto", "concepto": concepto, "fecha": str(fecha_prevista)})
    if contexto.simulacion:
        return {}

    existing = session.exec(select(Movimiento).where(Movimiento.hash_idempotencia == hash_prev)).first()
    if existing:
        return {}

    mov = Movimiento(
        workspace_id=movimiento.workspace_id,
        cuenta_id=cuenta_id,
        tipo="gasto",
        importe=importe,
        moneda=moneda,
        importe_base=importe,
        tasa_cambio=Decimal("1"),
        fecha=fecha_prevista,
        concepto=concepto,
        categoria_id=accion.get("categoria_id"),
        estado="previsto",
        fuente="regla",
        fuente_id=regla.id,
        hash_idempotencia=hash_prev,
        creado_por=movimiento.creado_por,
    )
    session.add(mov)
    session.flush()
    return {"movimiento_creado": mov}


def _accion_pausar_regla(accion: Dict, contexto: ContextoEjecucion, session: Session) -> Dict:
    regla_id = accion.get("regla_id")
    if not regla_id:
        raise ValueError("pausar_regla requiere regla_id")
    contexto.log.append({"tipo": "pausar_regla", "regla_id": regla_id})
    if not contexto.simulacion:
        regla = session.get(Regla, regla_id)
        if regla:
            regla.activa = False
            session.add(regla)
    return {}


# ─────────────────────────────────────────────────────────────────────────────
# Registro de ejecuciones
# ─────────────────────────────────────────────────────────────────────────────

def _registrar_ejecucion(
    regla: Regla,
    movimiento: Movimiento,
    estado: str,
    session: Session,
    movimientos_ids: Optional[List[str]] = None,
    razon: Optional[str] = None,
    error: Optional[str] = None,
) -> None:
    ejec = ReglaEjecucion(
        regla_id=regla.id,
        workspace_id=regla.workspace_id,
        trigger_movimiento_id=movimiento.id,
        estado=estado,
        movimientos_creados_ids=json.dumps(movimientos_ids or []),
        razon_omision=razon,
        error=error,
    )
    session.add(ejec)
    session.commit()


# ─────────────────────────────────────────────────────────────────────────────
# Simulación
# ─────────────────────────────────────────────────────────────────────────────

def simular_regla(regla: Regla, session: Session, dias_atras: int = 30) -> List[Dict]:
    """
    Ejecuta la regla en modo dry-run sobre los últimos N días de movimientos.
    No escribe nada en BD. Devuelve log de lo que habría hecho.
    """
    desde = date.today() - timedelta(days=dias_atras)
    movimientos = session.exec(
        select(Movimiento).where(
            Movimiento.workspace_id == regla.workspace_id,
            Movimiento.fecha >= desde,
            Movimiento.archivado_en == None,  # noqa: E711
            Movimiento.estado == "confirmado",
        )
    ).all()

    resultados = []
    for mov in movimientos:
        trigger_config = json.loads(regla.trigger_config or "{}")
        if regla.trigger_tipo != "movimiento_creado":
            continue
        if not _trigger_movimiento_aplica(trigger_config, mov):
            continue
        condiciones = json.loads(regla.condiciones or "[]")
        if condiciones and not _condiciones_se_cumplen(condiciones, regla.modo_condiciones, mov):
            continue

        ctx = ContextoEjecucion(simulacion=True)
        res = _ejecutar_regla(regla, mov, ctx, session)
        res["movimiento_id"] = mov.id
        res["movimiento_concepto"] = mov.concepto
        res["movimiento_fecha"] = str(mov.fecha)
        res["acciones_log"] = ctx.log
        resultados.append(res)

    return resultados


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _hash_regla(regla_id: str, trigger_id: str, accion_idx: int, sufijo: str = "") -> str:
    raw = f"regla:{regla_id}:trigger:{trigger_id}:idx:{accion_idx}:{sufijo}"
    return hashlib.sha256(raw.encode()).hexdigest()
