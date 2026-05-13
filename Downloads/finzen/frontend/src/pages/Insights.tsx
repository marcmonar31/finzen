import { TrendingUp, AlertTriangle, RefreshCw, Repeat, Coffee, Zap } from "lucide-react";
import { clsx } from "clsx";
import { useInsights } from "@/hooks/useInsights";
import type { FactorSalud, InsightAnomalia } from "@/types/api";
import { formatCurrency } from "@/lib/format";

// ── SaludScore ────────────────────────────────────────────────────────────────

function SaludScore({ score, nivel, factores }: { score: number; nivel: string; factores: FactorSalud[] }) {
  const COLOR: Record<string, string> = {
    excelente: "text-green-600",
    bueno: "text-accent-positive",
    regular: "text-orange-400",
    mejorable: "text-red-400",
  };
  const BG: Record<string, string> = {
    excelente: "bg-green-50",
    bueno: "bg-yellow-50",
    regular: "bg-orange-50",
    mejorable: "bg-red-50",
  };
  const ARCO: Record<string, string> = {
    excelente: "#22c55e",
    bueno: "#C7FF6B",
    regular: "#fb923c",
    mejorable: "#f87171",
  };

  const radius = 54;
  const circunferencia = 2 * Math.PI * radius;

  return (
    <div className={clsx("rounded-2xl p-4 shadow-sm", BG[nivel] ?? "bg-gray-50")}>
      <h3 className="text-xs font-semibold text-fg/40 uppercase tracking-wide mb-3">Salud financiera</h3>
      <div className="flex items-center gap-4">
        {/* Arco SVG */}
        <div className="relative w-32 h-16 flex-shrink-0">
          <svg width="128" height="72" viewBox="0 0 128 72">
            <path
              d="M 10 64 A 54 54 0 0 1 118 64"
              fill="none" stroke="#e5e7eb" strokeWidth="10" strokeLinecap="round"
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
            <span className="text-xs text-fg/40 capitalize">{nivel}</span>
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
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-ink/30 rounded-full"
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
  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={16} className="text-accent-info" />
        <h3 className="text-sm font-semibold text-fg">Predicción de saldo</h3>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {datos.map((d) => {
          const saldo = parseFloat(d.saldo_proyectado);
          return (
            <div key={d.dias} className="text-center bg-gray-50 rounded-xl p-2">
              <p className="text-xs text-fg/40 mb-1">+{d.dias} días</p>
              <p className={clsx("text-sm font-bold", saldo >= 0 ? "text-fg" : "text-red-500")}>
                {saldo.toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
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
  if (!subs.length) return null;
  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Repeat size={16} className="text-purple-500" />
        <h3 className="text-sm font-semibold text-fg">Suscripciones detectadas</h3>
        <span className="ml-auto text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{subs.length}</span>
      </div>
      <div className="space-y-2">
        {subs.map((s) => (
          <div key={s.concepto} className="flex items-center justify-between">
            <p className="text-sm text-fg truncate">{s.concepto}</p>
            <div className="text-right flex-shrink-0 ml-2">
              <p className="text-sm font-semibold text-fg">{formatCurrency(s.importe_medio, s.moneda)}/mes</p>
              <p className="text-xs text-fg/40">{s.num_ocurrencias} pagos</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-fg/30 mt-3">
        Total mensual: {subs.reduce((a, s) => a + parseFloat(s.importe_medio), 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
      </p>
    </div>
  );
}

// ── HormigaCard ───────────────────────────────────────────────────────────────

function HormigaCard({ items }: { items: Array<{ concepto: string; num_ocurrencias_mes: number; total_mes: string; moneda: string }> }) {
  if (!items.length) return null;
  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Coffee size={16} className="text-amber-500" />
        <h3 className="text-sm font-semibold text-fg">Gastos hormiga</h3>
        <span className="ml-auto text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">{items.length}</span>
      </div>
      <div className="space-y-2">
        {items.slice(0, 5).map((item) => (
          <div key={item.concepto} className="flex items-center justify-between">
            <div>
              <p className="text-sm text-fg">{item.concepto}</p>
              <p className="text-xs text-fg/40">{item.num_ocurrencias_mes}× este mes</p>
            </div>
            <p className="text-sm font-semibold text-amber-600">{formatCurrency(item.total_mes, item.moneda)}/mes</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── AnomaliaCard ──────────────────────────────────────────────────────────────

function AnomaliaCard({ anomalias }: { anomalias: InsightAnomalia[] }) {
  if (!anomalias.length) return null;
  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm border border-red-100">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={16} className="text-red-400" />
        <h3 className="text-sm font-semibold text-fg">Gastos inusuales</h3>
        <span className="ml-auto text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full">{anomalias.length}</span>
      </div>
      <div className="space-y-2">
        {anomalias.map((a) => (
          <div key={a.movimiento_id ?? a.concepto} className="flex items-center justify-between">
            <div>
              <p className="text-sm text-fg">{a.concepto}</p>
              <p className="text-xs text-fg/40">{new Date(a.fecha + "T00:00:00").toLocaleDateString("es-ES")} · {parseFloat(a.factor).toFixed(1)}× sobre la media</p>
            </div>
            <p className="text-sm font-semibold text-red-500">{formatCurrency(a.importe, a.moneda)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Insights ──────────────────────────────────────────────────────────────────

export function Insights() {
  const { data, isLoading, refetch, isFetching } = useInsights();

  return (
    <div className="min-h-full bg-app pb-24">
      <div className="bg-ink px-4 pt-10 pb-5 rounded-b-3xl mb-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <h1 className="text-white text-xl font-bold">Insights</h1>
            <p className="text-white/50 text-xs mt-0.5">Análisis automático de tus finanzas</p>
          </div>
          <button
            onClick={() => refetch()}
            className={clsx(
              "p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors",
              isFetching && "animate-spin"
            )}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="px-4 max-w-2xl mx-auto space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-fg/40 text-sm">Analizando tus finanzas...</div>
        ) : !data ? (
          <div className="text-center py-12">
            <Zap size={36} className="mx-auto text-fg/20 mb-3" />
            <p className="text-fg/50 text-sm">Añade movimientos para ver insights</p>
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
                Sin patrones detectados todavía. Añade más movimientos para análisis más ricos.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
