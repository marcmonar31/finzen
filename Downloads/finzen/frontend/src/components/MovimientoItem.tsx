import type { Movimiento } from "@/types/api";
import { formatCurrency } from "@/lib/format";
import Decimal from "decimal.js";
import { clsx } from "clsx";
import { ArrowLeftRight } from "lucide-react";

interface Props {
  movimiento: Movimiento;
  onLongPress?: () => void;
  monedaBase?: string;
}

const TIPO_SIGNO: Record<string, 1 | -1> = {
  ingreso: 1,
  transferencia_destino: 1,
  gasto: -1,
  transferencia_origen: -1,
  ajuste: 1,
};

function esTransferencia(tipo: string) {
  return tipo === "transferencia_origen" || tipo === "transferencia_destino";
}

export function MovimientoItem({ movimiento: m, onLongPress, monedaBase }: Props) {
  const positivo = (TIPO_SIGNO[m.tipo] ?? 1) > 0;
  const importe = new Decimal(m.importe);
  const importeBase = new Decimal(m.importe_base);
  const signo = positivo ? "+" : "-";
  const esTrans = esTransferencia(m.tipo);
  const muestraBase = monedaBase && monedaBase !== m.moneda;

  return (
    <div
      className="flex items-center gap-3 py-3 px-0 active:bg-gray-50 rounded-xl transition-colors cursor-default"
      onContextMenu={(e) => { e.preventDefault(); onLongPress?.(); }}
    >
      {/* Icono */}
      <div className="w-10 h-10 rounded-xl bg-[#F2F2F4] flex items-center justify-center text-xl flex-shrink-0">
        {esTrans
          ? <ArrowLeftRight className="w-5 h-5 text-[#6B6B6F]" />
          : (m.categoria_emoji ?? (positivo ? "💰" : "💸"))
        }
      </div>

      {/* Texto */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-ink text-sm truncate">{m.concepto}</p>
        <p className="text-xs text-[#6B6B6F] truncate">
          {esTrans
            ? (m.tipo === "transferencia_origen" ? "Transferencia saliente" : "Transferencia entrante")
            : (m.categoria_nombre ?? m.tipo)
          }
        </p>
      </div>

      {/* Importe */}
      <div className="text-right flex-shrink-0">
        <p className={clsx(
          "font-bold text-sm tabular-nums",
          esTrans ? "text-[#6B6B6F]" : (positivo ? "text-[#5BAA1F]" : "text-ink")
        )}>
          {signo}{formatCurrency(importe.abs().toString(), m.moneda)}
        </p>
        {muestraBase && (
          <p className="text-xs text-[#A0A0A4]">
            ≈ {formatCurrency(importeBase.abs().toString(), monedaBase)}
          </p>
        )}
        {!muestraBase && (
          <p className="text-xs text-[#A0A0A4]">
            {m.fecha.slice(8, 10)}/{m.fecha.slice(5, 7)}
          </p>
        )}
      </div>
    </div>
  );
}
