import hashlib
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, Tuple
from fastapi import HTTPException
from sqlmodel import Session

from models.movimiento import Movimiento
from models.transferencia import Transferencia
from models.cuenta import Cuenta
from services.conversion import convertir


def crear_transferencia(
    workspace_id: str,
    workspace_moneda_base: str,
    usuario_id: str,
    cuenta_origen_id: str,
    cuenta_destino_id: str,
    importe_origen: Decimal,
    fecha: date,
    concepto: str,
    session: Session,
    importe_destino: Optional[Decimal] = None,
    notas: Optional[str] = None,
) -> Transferencia:
    if cuenta_origen_id == cuenta_destino_id:
        raise HTTPException(400, "Las cuentas de origen y destino deben ser distintas")

    cuenta_orig = session.get(Cuenta, cuenta_origen_id)
    if not cuenta_orig or cuenta_orig.workspace_id != workspace_id:
        raise HTTPException(400, "Cuenta origen no válida")
    if cuenta_orig.archivado_en:
        raise HTTPException(400, "La cuenta origen está archivada")

    from services.saldos import saldo_cuenta
    saldo_orig = saldo_cuenta(cuenta_origen_id, session)
    if importe_origen > saldo_orig:
        raise HTTPException(400, f"Saldo insuficiente. Disponible: {saldo_orig:.2f} {cuenta_orig.moneda}")

    cuenta_dest = session.get(Cuenta, cuenta_destino_id)
    if not cuenta_dest or cuenta_dest.workspace_id != workspace_id:
        raise HTTPException(400, "Cuenta destino no válida")
    if cuenta_dest.archivado_en:
        raise HTTPException(400, "La cuenta destino está archivada")

    # Determine destination amount
    if cuenta_orig.moneda == cuenta_dest.moneda:
        importe_dest_calc = importe_origen
    elif importe_destino is not None:
        importe_dest_calc = importe_destino
    else:
        importe_dest_calc, _ = convertir(
            importe_origen, cuenta_orig.moneda, cuenta_dest.moneda, fecha, session
        )

    # Convert to workspace base currency for importe_base field
    importe_base_orig, tasa_orig = convertir(
        importe_origen, cuenta_orig.moneda, workspace_moneda_base, fecha, session
    )
    importe_base_dest, tasa_dest = convertir(
        importe_dest_calc, cuenta_dest.moneda, workspace_moneda_base, fecha, session
    )

    def _hash(cuenta_id: str, importe: Decimal) -> str:
        raw = f"{workspace_id}|{cuenta_id}|{fecha.isoformat()}|{importe}|{concepto}"
        return hashlib.sha256(raw.encode()).hexdigest()

    mov_orig = Movimiento(
        workspace_id=workspace_id,
        cuenta_id=cuenta_origen_id,
        tipo="transferencia_origen",
        importe=importe_origen,
        moneda=cuenta_orig.moneda,
        importe_base=importe_base_orig,
        tasa_cambio=tasa_orig,
        fecha=fecha,
        concepto=concepto,
        notas=notas,
        hash_idempotencia=_hash(cuenta_origen_id, importe_origen),
        fuente="manual",
        estado="confirmado",
        creado_por=usuario_id,
    )

    mov_dest = Movimiento(
        workspace_id=workspace_id,
        cuenta_id=cuenta_destino_id,
        tipo="transferencia_destino",
        importe=importe_dest_calc,
        moneda=cuenta_dest.moneda,
        importe_base=importe_base_dest,
        tasa_cambio=tasa_dest,
        fecha=fecha,
        concepto=concepto,
        notas=notas,
        hash_idempotencia=_hash(cuenta_destino_id, importe_dest_calc),
        fuente="manual",
        estado="confirmado",
        creado_por=usuario_id,
    )

    session.add(mov_orig)
    session.add(mov_dest)
    session.flush()

    transferencia = Transferencia(
        workspace_id=workspace_id,
        movimiento_origen_id=mov_orig.id,
        movimiento_destino_id=mov_dest.id,
    )
    session.add(transferencia)
    session.flush()

    mov_orig.transferencia_id = transferencia.id
    mov_dest.transferencia_id = transferencia.id
    session.add(mov_orig)
    session.add(mov_dest)

    session.commit()
    session.refresh(transferencia)
    return transferencia
