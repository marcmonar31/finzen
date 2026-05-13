import { useState } from "react";
import { TrendingUp, TrendingDown, Plus, RefreshCw, X } from "lucide-react";
import { showFlash } from "@/stores/flash";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import {
  useActivos,
  useCartera,
  useCrearActivo,
  useCrearPosicion,
  useActualizarPrecios,
  useCerrarPosicion,
} from "@/hooks/useInversiones";
import type { PosicionDetalle } from "@/types/api";

const TIPOS = ["accion", "etf", "cripto", "fondo", "materia_prima"];

function plColor(valor: string) {
  const n = parseFloat(valor);
  if (n > 0) return "text-emerald-600";
  if (n < 0) return "text-red-500";
  return "text-gray-500";
}

function fmt(val: string, decimals = 2) {
  return parseFloat(val).toFixed(decimals);
}

// ── NuevaPosicionSheet ────────────────────────────────────────────────────────

function NuevaPosicionSheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { data: activos = [] } = useActivos();
  const crearActivo = useCrearActivo();
  const crearPosicion = useCrearPosicion();

  const [tab, setTab] = useState<"nueva" | "existente">("nueva");
  const [ticker, setTicker] = useState("");
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("accion");
  const [moneda, setMoneda] = useState("USD");
  const [activoId, setActivoId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [precioMedio, setPrecioMedio] = useState("");

  async function handleSubmit() {
    if (!cantidad || !precioMedio) { showFlash(t("inversiones.rellena_campos"), "error"); return; }

    let resolvedActivoId = activoId;

    if (tab === "nueva") {
      if (!ticker || !nombre) { showFlash(t("inversiones.ticker_nombre_req"), "error"); return; }
      try {
        const activo = await crearActivo.mutateAsync({ ticker, nombre, tipo, moneda });
        resolvedActivoId = activo.id;
      } catch (e: unknown) {
        showFlash(e instanceof Error ? e.message : t("inversiones.error_activo"), "error");
        return;
      }
    }

    if (!resolvedActivoId) { showFlash(t("inversiones.selecciona_activo"), "error"); return; }

    try {
      await crearPosicion.mutateAsync({ activo_id: resolvedActivoId, cantidad, precio_medio: precioMedio });
      showFlash(t("inversiones.posicion_anadida"));
      onClose();
    } catch (e: unknown) {
      showFlash(e instanceof Error ? e.message : t("common.error"), "error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{t("inversiones.nueva")}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        {/* Tab selector */}
        <div className="flex gap-2 mb-4">
          {(["nueva", "existente"] as const).map((tabVal) => (
            <button
              key={tabVal}
              onClick={() => setTab(tabVal)}
              className={clsx(
                "flex-1 py-2 rounded-xl text-sm font-medium transition-colors",
                tab === tabVal ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"
              )}
            >
              {tabVal === "nueva" ? t("inversiones.activo_nuevo") : t("inversiones.activo_existente")}
            </button>
          ))}
        </div>

        {tab === "nueva" ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">{t("inversiones.ticker")}</label>
                <input
                  className="w-full border rounded-xl px-3 py-2 text-sm uppercase"
                  placeholder="AAPL"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                />
              </div>
              <div className="w-28">
                <label className="text-xs text-gray-500 mb-1 block">{t("common.moneda")}</label>
                <input
                  className="w-full border rounded-xl px-3 py-2 text-sm uppercase"
                  placeholder="USD"
                  value={moneda}
                  onChange={(e) => setMoneda(e.target.value.toUpperCase())}
                  maxLength={3}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{t("inversiones.nombre_activo")}</label>
              <input
                className="w-full border rounded-xl px-3 py-2 text-sm"
                placeholder="Apple Inc."
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{t("common.tipo")}</label>
              <select
                className="w-full border rounded-xl px-3 py-2 text-sm"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              >
                {TIPOS.map((tp) => (
                  <option key={tp} value={tp}>{t(`inversion_tipos.${tp}`, { defaultValue: tp })}</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div>
            <label className="text-xs text-gray-500 mb-1 block">{t("inversiones.selecciona_activo")}</label>
            <select
              className="w-full border rounded-xl px-3 py-2 text-sm"
              value={activoId}
              onChange={(e) => setActivoId(e.target.value)}
            >
              <option value="">--</option>
              {activos.map((a) => (
                <option key={a.id} value={a.id}>{a.ticker} — {a.nombre}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-2 mt-3">
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">{t("inversiones.cantidad")}</label>
            <input
              type="number"
              inputMode="decimal"
              className="w-full border rounded-xl px-3 py-2 text-sm"
              placeholder="10,5"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">{t("inversiones.precio_medio")}</label>
            <input
              type="number"
              inputMode="decimal"
              className="w-full border rounded-xl px-3 py-2 text-sm"
              placeholder="220,00"
              value={precioMedio}
              onChange={(e) => setPrecioMedio(e.target.value)}
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={crearActivo.isPending || crearPosicion.isPending}
          className="mt-5 w-full bg-indigo-600 text-white py-3 rounded-2xl font-medium text-sm disabled:opacity-50"
        >
          {crearActivo.isPending || crearPosicion.isPending ? t("common.guardando") : t("inversiones.anadir_posicion")}
        </button>
      </div>
    </div>
  );
}

// ── PosicionCard ──────────────────────────────────────────────────────────────

function PosicionCard({ pos }: { pos: PosicionDetalle }) {
  const { t } = useTranslation();
  const cerrar = useCerrarPosicion();
  const positivo = parseFloat(pos.pl_absoluto) >= 0;

  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900">{pos.ticker}</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{t(`inversion_tipos.${pos.tipo}`, { defaultValue: pos.tipo })}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{pos.nombre}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-gray-900">{pos.moneda} {fmt(pos.valor_actual)}</p>
          <p className={clsx("text-sm font-medium", plColor(pos.pl_absoluto))}>
            {positivo ? "+" : ""}{fmt(pos.pl_absoluto)} ({positivo ? "+" : ""}{fmt(pos.pl_pct)}%)
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-gray-400">{t("inversiones.cantidad")}</p>
          <p className="text-sm font-medium">{parseFloat(pos.cantidad).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">{t("inversiones.precio_medio")}</p>
          <p className="text-sm font-medium">{fmt(pos.precio_medio)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">{t("inversiones.precio_actual")}</p>
          <p className="text-sm font-medium">
            {pos.precio_actual ? fmt(pos.precio_actual) : "–"}
            {pos.variacion_dia && (
              <span className={clsx("text-xs ml-1", parseFloat(pos.variacion_dia) >= 0 ? "text-emerald-500" : "text-red-400")}>
                ({parseFloat(pos.variacion_dia) >= 0 ? "+" : ""}{fmt(pos.variacion_dia)}%)
              </span>
            )}
          </p>
        </div>
      </div>

      <button
        onClick={async () => {
          if (!confirm(`${t("inversiones.cerrar_posicion_confirm")} ${pos.ticker}?`)) return;
          try {
            await cerrar.mutateAsync(pos.posicion_id);
            showFlash(t("inversiones.posicion_cerrada"), "delete");
          } catch {
            showFlash(t("inversiones.error_cerrar"), "error");
          }
        }}
        className="mt-3 w-full text-xs text-red-400 hover:text-red-600 py-1"
      >
        {t("inversiones.cerrar_posicion")}
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Inversiones() {
  const { t } = useTranslation();
  const { data: cartera, isLoading } = useCartera();
  const actualizarPrecios = useActualizarPrecios();
  const [showSheet, setShowSheet] = useState(false);

  const plTotal = cartera ? parseFloat(cartera.pl_total) : 0;
  const plPositivo = plTotal >= 0;

  async function handleActualizar() {
    try {
      const r = await actualizarPrecios.mutateAsync(undefined);
      const res = r as { actualizados: number };
      showFlash(`${t("inversiones.precios_actualizados")} (${res.actualizados})`);
    } catch {
      showFlash(t("common.error"), "error");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-28">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t("nav.inversiones")}</h1>
          <div className="flex gap-2">
            <button
              onClick={handleActualizar}
              disabled={actualizarPrecios.isPending}
              className="p-2 bg-surface rounded-xl shadow-sm text-gray-500 hover:text-indigo-600 disabled:opacity-50"
            >
              <RefreshCw size={18} className={actualizarPrecios.isPending ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => setShowSheet(true)}
              className="p-2 bg-indigo-600 rounded-xl text-white"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Resumen cartera */}
        {cartera && (
          <div className="bg-indigo-600 rounded-3xl p-5 text-white mb-6">
            <p className="text-indigo-200 text-sm mb-1">{t("inversiones.valor_total")}</p>
            <p className="text-3xl font-bold mb-3">
              {parseFloat(cartera.total_actual).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className="flex gap-4">
              <div>
                <p className="text-indigo-200 text-xs">{t("inversiones.invertido")}</p>
                <p className="font-semibold">{fmt(cartera.total_coste)}</p>
              </div>
              <div>
                <p className="text-indigo-200 text-xs">{t("inversiones.pl_total")}</p>
                <div className="flex items-center gap-1">
                  {plPositivo ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  <p className={clsx("font-semibold", plPositivo ? "text-emerald-300" : "text-red-300")}>
                    {plPositivo ? "+" : ""}{fmt(cartera.pl_total)} ({plPositivo ? "+" : ""}{fmt(cartera.pl_pct_total)}%)
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lista posiciones */}
        {isLoading && (
          <div className="text-center py-12 text-gray-400">{t("inversiones.cargando")}</div>
        )}

        {cartera && cartera.posiciones.length === 0 && (
          <div className="text-center py-12 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-surface shadow-[var(--shadow-card)] flex items-center justify-center mb-4">
              <TrendingUp className="w-8 h-8 text-fg-muted" />
            </div>
            <p className="text-gray-500">{t("inversiones.sin_inversiones")}</p>
            <p className="text-sm text-gray-400 mt-1">{t("inversiones.sin_inversiones_desc")}</p>
          </div>
        )}

        {cartera && cartera.posiciones.length > 0 && (
          <div className="space-y-3">
            {cartera.posiciones.map((pos) => (
              <PosicionCard key={pos.posicion_id} pos={pos} />
            ))}
          </div>
        )}
      </div>

      {showSheet && <NuevaPosicionSheet onClose={() => setShowSheet(false)} />}
    </div>
  );
}
