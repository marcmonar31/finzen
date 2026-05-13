import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/format";
import type { Presupuesto } from "@/types/api";

interface Props {
  presupuesto: Presupuesto;
  onLongPress?: () => void;
}

export function PresupuestoBar({ presupuesto: p, onLongPress }: Props) {
  const { t } = useTranslation();
  const { consumido, restante, porcentaje, alerta } = p.estado;
  const pct = Math.min(porcentaje, 100);

  const periodLabel: Record<string, string> = {
    mensual:    t("presupuestos.periodo_mensual"),
    semanal:    t("presupuestos.periodo_semanal"),
    trimestral: t("presupuestos.periodo_trimestral"),
    anual:      t("presupuestos.periodo_anual"),
  };

  const barColor  = alerta === "superado" ? "bg-[#FF5C5C]" : alerta === "advertencia" ? "bg-amber-400" : "bg-[#5BAA1F]";
  const textColor = alerta === "superado" ? "text-[#FF5C5C]" : alerta === "advertencia" ? "text-amber-500" : "text-[#5BAA1F]";

  return (
    <div
      className="bg-surface rounded-2xl p-4 shadow-[var(--shadow-card)] cursor-default"
      onContextMenu={(e) => { e.preventDefault(); onLongPress?.(); }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-fg text-sm">{p.nombre}</p>
          <p className="text-xs text-fg-muted">
            {formatCurrency(p.importe, p.moneda)} / {periodLabel[p.periodo] ?? p.periodo}
          </p>
        </div>
        <div className="text-right">
          <p className={clsx("font-bold text-sm tabular-nums", textColor)}>
            {porcentaje.toFixed(0)}%
          </p>
          {alerta === "superado" && (
            <p className="text-xs text-[#FF5C5C] font-medium">{t("presupuestos.superado")}</p>
          )}
        </div>
      </div>

      <div className="h-2 bg-surface-2 rounded-full overflow-hidden mb-2">
        <div
          className={clsx("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-fg-muted">
        <span>
          {t("presupuestos.gastado")} <span className="font-medium text-fg">{formatCurrency(consumido, p.moneda)}</span>
        </span>
        <span>
          {parseFloat(restante) >= 0 ? (
            <>{t("presupuestos.restante_label")} <span className="font-medium text-fg">{formatCurrency(restante, p.moneda)}</span></>
          ) : (
            <span className="text-[#FF5C5C] font-medium">
              +{formatCurrency(Math.abs(parseFloat(restante)).toString(), p.moneda)} {t("presupuestos.extra")}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
