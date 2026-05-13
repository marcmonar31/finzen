import { TrendingUp, AlertTriangle, RefreshCw, Repeat, Coffee, Zap } from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { useInsights } from "@/hooks/useInsights";
import type { FactorSalud, InsightAnomalia } from "@/types/api";
import { formatCurrency } from "@/lib/format";

// ── SaludScore ────────────────────────────────────────────────────────────────

function SaludScore({ score, nivel, factores }: { score: number; nivel: string; factores: FactorSalud[] }) {
  const { t } = useTranslation();
  const COLOR: Record<string, string> = {
    excelente: "text-accent-positive",
    bueno:     "text-accent-positive",
    regular:   "text-accent-warning",
    mejorable: "text-accent-danger",
  };
  const ARCO: Record<string, string> = {
    excelente: "#C7FF6B",
    bueno:     "#C7FF6B",
    regular:   "#FF9A4D",
    mejorable: "#FF5C5C",
  };

  const radius = 54;
  const circunferencia = 2 * Math.PI * radius;

  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm">
      <h3 className="text-xs font-semibold text-fg-subtle uppercase tracking-wide mb-3">{t("insights.salud_financiera")}</h3>
      <div className="flex items-center gap-4">
        {/* Arco SVG */}
        <div className="relative w-32 h-16 flex-shrink-0">
          <svg width="128" height="72" viewBox="0 0 128 72">
            <path
              d="M 10 64 A 54 54 0 0 1 118 64"
              fill="none" stroke="var(--fz-border)" strokeWidth="10" strokeLinecap="round"
            />
            <path
              d="M 10 64 A 54 54 0 0 1 118 64"
              fill="none"
              stroke={ARCO[nivel] ?? "#e5e7eb"}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${circunferencia / 2}`}
              strokeDashoffset={`${circunferencia / 2 * (1 - score / 100)}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
            <span className={clsx("text-2xl font-bold", COLOR[nivel])}>{score}</span>
            <span className="text-xs text-fg/40 capitalize">{t(`insights.nivel_${nivel}`, { defaultValue: nivel })}</span>
          </div>
        </div>
        {/* Factores */}
        <div className="flex-1 space-y-1.5">
          {factores.map((f) => (
            <div key={f.nombre}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-fg/60 truncate">{f.nombre}</span>
                <span className="font-semibold text-fg flex-shrink-0 ml-1">{f.puntos}/{f.max_puntos}</span>
              </div>
              <div className="h-1 bg-surface-3 rounded-full overflow-hidden">
                <div
                  className="h-full bg-fg-muted rounded-full"
                  style={{ width: `${(f.puntos / f.max_puntos) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Prediccion ────────────────────────────────────────────────────────────────

function PrediccionCard({ datos }: { datos: Array<{ dias: number; fecha: string; saldo_proyectado: string }> }) {
  const { t } = useTranslation();
  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={16} className="text-accent-info" />
        <h3 className="text-sm font-semibold text-fg">{t("insights.prediccion_saldo")}</h3>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {datos.map((d) => {
          const saldo = parseFloat(d.saldo_proyectado);
          return (
            <div key={d.dias} className="text-center bg-surface-2 rounded-xl p-2">
              <p className="text-xs text-fg-subtle mb-1">+{d.dias} {t("insights.dias")}</p>
              <p className={clsx("text-sm font-bold", saldo >= 0 ? "text-fg" : "text-accent-danger")}>
                {saldo.toLocaleString(undefined, { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── SuscripcionesCard ─────────────────────────────────────────────────────────

function SuscripcionesCard({ subs }: { subs: Array<{ concepto: string; importe_medio: string; moneda: string; num_ocurrencias: number }> }) {
  const { t } = useTranslation();
  if (!subs.length) return null;
  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Repeat size={16} className="text-accent-info" />
        <h3 className="text-sm font-semibold text-fg">{t("insights.suscripciones")}</h3>
        <span className="ml-auto text-xs bg-surface-2 text-fg-muted px-2 py-0.5 rounded-full">{subs.length}</span>
      </div>
      <div className="space-y-2">
        {subs.map((s) => (
          <div key={s.concepto} className="flex items-center justify-between">
            <p className="text-sm text-fg truncate">{s.concepto}</p>
            <div className="text-right flex-shrink-0 ml-2">
              <p className="text-sm font-semibold text-fg">{formatCurrency(s.importe_medio, s.moneda)}/mes</p>
              <p className="text-xs text-fg-subtle">{s.num_ocurrencias} {t("insights.pagos")}</p>
            </div>
          </div>
        ))}
      </div>
      {subs.every((s) => s.moneda === subs[0].moneda) && (
        <p className="text-xs text-fg-subtle mt-3">
          {t("insights.total_mensual")} {formatCurrency(
            subs.reduce((a, s) => a + parseFloat(s.importe_medio), 0).toFixed(2),
            subs[0].moneda,
          )}
        </p>
      )}
    </div>
  );
}

// ── HormigaCard ───────────────────────────────────────────────────────────────

function HormigaCard({ items }: { items: Array<{ concepto: string; num_ocurrencias_mes: number; total_mes: string; moneda: string }> }) {
  const { t } = useTranslation();
  if (!items.length) return null;
  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Coffee size={16} className="text-accent-warning" />
        <h3 className="text-sm font-semibold text-fg">{t("insights.gastos_hormiga")}</h3>
        <span className="ml-auto text-xs bg-surface-2 text-fg-muted px-2 py-0.5 rounded-full">{items.length}</span>
      </div>
      <div className="space-y-2">
        {items.slice(0, 5).map((item) => (
          <div key={item.concepto} className="flex items-center justify-between">
            <div>
              <p className="text-sm text-fg">{item.concepto}</p>
              <p className="text-xs text-fg-subtle">{item.num_ocurrencias_mes}{t("insights.veces_mes")}</p>
            </div>
            <p className="text-sm font-semibold text-accent-warning">{formatCurrency(item.total_mes, item.moneda)}/mes</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── AnomaliaCard ──────────────────────────────────────────────────────────────

function AnomaliaCard({ anomalias }: { anomalias: InsightAnomalia[] }) {
  const { t } = useTranslation();
  if (!anomalias.length) return null;
  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm border border-border-ui">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={16} className="text-accent-danger" />
        <h3 className="text-sm font-semibold text-fg">{t("insights.gastos_inusuales")}</h3>
        <span className="ml-auto text-xs bg-surface-2 text-fg-muted px-2 py-0.5 rounded-full">{anomalias.length}</span>
      </div>
      <div className="space-y-2">
        {anomalias.map((a) => (
          <div key={a.movimiento_id ?? a.concepto} className="flex items-center justify-between">
            <div>
              <p className="text-sm text-fg">{a.concepto}</p>
              <p className="text-xs text-fg-subtle">{new Date(a.fecha + "T00:00:00").toLocaleDateString()} · {parseFloat(a.factor).toFixed(1)}{t("insights.sobre_media")}</p>
            </div>
            <p className="text-sm font-semibold text-accent-danger">{formatCurrency(a.importe, a.moneda)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Insights ──────────────────────────────────────────────────────────────────

export function Insights() {
  const { t } = useTranslation();
  const { data, isLoading, refetch, isFetching } = useInsights();

  return (
    <div className="min-h-full bg-app pb-24">
      <div className="pt-10 px-4 pb-4">
        <div className="bg-ink rounded-3xl px-5 py-4 flex items-center justify-between shadow-[var(--shadow-floating)]">
          <div>
            <h1 className="text-white font-bold text-2xl">{t("insights.titulo")}</h1>
            <p className="text-white/50 text-xs mt-0.5">{t("insights.descripcion")}</p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
          >
            <RefreshCw size={16} className={`text-white ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="px-4 max-w-2xl mx-auto space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface rounded-2xl p-4 animate-pulse shadow-[var(--shadow-card)]">
                <div className="h-3 bg-surface-2 rounded w-1/3 mb-3" />
                <div className="flex gap-4">
                  <div className="w-32 h-16 bg-surface-2 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    {[1, 2, 3].map((j) => <div key={j} className="h-3 bg-surface-2 rounded" />)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !data ? (
          <div className="text-center py-12">
            <Zap size={36} className="mx-auto text-fg/20 mb-3" />
            <p className="text-fg/50 text-sm">{t("insights.sin_datos")}</p>
          </div>
        ) : (
          <>
            <SaludScore score={data.salud.score} nivel={data.salud.nivel} factores={data.salud.factores} />
            <PrediccionCard datos={data.prediccion} />
            <AnomaliaCard anomalias={data.anomalias} />
            <SuscripcionesCard subs={data.suscripciones} />
            <HormigaCard items={data.gastos_hormiga} />
            {!data.suscripciones.length && !data.gastos_hormiga.length && !data.anomalias.length && (
              <div className="text-center py-6 text-fg/30 text-xs">
                {t("insights.sin_patrones")}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
