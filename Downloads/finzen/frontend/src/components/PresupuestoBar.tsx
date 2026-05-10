import { clsx } from "clsx";
import { formatCurrency } from "@/lib/format";
import type { Presupuesto } from "@/types/api";

interface Props {
  presupuesto: Presupuesto;
  onLongPress?: () => void;
}

const PERIODO_LABEL: Record<string, string> = {
  mensual: "mes",
  semanal: "semana",
  trimestral: "trimestre",
  anual: "año",
};

export function PresupuestoBar({ presupuesto: p, onLongPress }: Props) {
  const { consumido, restante, porcentaje, alerta } = p.estado;
  const pct = Math.min(porcentaje, 100);

  const barColor =
    alerta === "superado"
      ? "bg-red-500"
      : alerta === "advertencia"
      ? "bg-amber-400"
      : "bg-[#5BAA1F]";

  const textColor =
    alerta === "superado"
      ? "text-red-500"
      : alerta === "advertencia"
      ? "text-amber-500"
      : "text-[#5BAA1F]";

  return (
    <div
      className="bg-white rounded-2xl p-4 shadow-[var(--shadow-card)] cursor-default"
      onContextMenu={(e) => { e.preventDefault(); onLongPress?.(); }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-ink text-sm">{p.nombre}</p>
          <p className="text-xs text-[#6B6B6F]">
            {formatCurrency(p.importe, p.moneda)} / {PERIODO_LABEL[p.periodo] ?? p.periodo}
          </p>
        </div>
        <div className="text-right">
          <p className={clsx("font-bold text-sm tabular-nums", textColor)}>
            {porcentaje.toFixed(0)}%
          </p>
          {alerta === "superado" && (
            <p className="text-xs text-red-500 font-medium">Superado</p>
          )}
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="h-2 bg-[#F2F2F4] rounded-full overflow-hidden mb-2">
        <div
          className={clsx("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-[#6B6B6F]">
        <span>
          Gastado: <span className="font-medium text-ink">{formatCurrency(consumido, p.moneda)}</span>
        </span>
        <span>
          {parseFloat(restante) >= 0 ? (
            <>Restante: <span className="font-medium text-ink">{formatCurrency(restante, p.moneda)}</span></>
          ) : (
            <span className="text-red-500 font-medium">
              +{formatCurrency(Math.abs(parseFloat(restante)).toString(), p.moneda)} extra
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
