import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Plus, RefreshCw, X, Pencil, Trash2 } from "lucide-react";
import { showFlash } from "@/stores/flash";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import {
  useActivos,
  useCartera,
  useCrearActivo,
  useCrearPosicion,
  useActualizarPrecios,
  useActualizarPosicion,
  useCerrarPosicion,
} from "@/hooks/useInversiones";
import type { PosicionDetalle } from "@/types/api";

const TIPOS = ["accion", "etf", "cripto", "fondo", "materia_prima"];

// ── ConfirmDelete ─────────────────────────────────────────────────────────────

function ConfirmDelete({ nombre, onConfirm, onCancel }: { nombre: string; onConfirm: () => void; onCancel: () => void }) {
  const { t } = useTranslation();
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/20 backdrop-blur-md z-[1001] flex items-center justify-center p-6"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: "spring", damping: 28, stiffness: 380 }}
        className="w-full max-w-sm bg-surface rounded-3xl p-6 shadow-[var(--shadow-floating)]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-bold text-fg text-base text-center mb-1">{t("inversiones.cerrar_posicion_confirm")}</p>
        <p className="text-fg-muted text-sm text-center mb-6">"{nombre}"</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3.5 rounded-2xl bg-surface-2 text-fg font-semibold text-sm active:scale-95 transition-transform">
            {t("common.cancelar")}
          </button>
          <button onClick={onConfirm} className="flex-1 py-3.5 rounded-2xl bg-[#FF5C5C] text-white font-semibold text-sm active:scale-95 transition-transform">
            {t("common.si_eliminar")}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

function plColor(valor: string) {
  const n = parseFloat(valor);
  if (n > 0) return "text-accent-positive";
  if (n < 0) return "text-accent-danger";
  return "text-fg-subtle";
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

  const labelCls = "text-xs text-fg-muted font-semibold uppercase tracking-wide";
  const inputCls = "w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/20 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: "spring", damping: 28, stiffness: 380 }}
        className="w-full max-w-md bg-surface rounded-3xl max-h-[90vh] overflow-y-auto shadow-[var(--shadow-floating)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg text-fg">{t("inversiones.nueva")}</h2>
            <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
              <X className="w-4 h-4 text-fg" />
            </button>
          </div>

          {/* Tab selector */}
          <div className="flex gap-2">
            {(["nueva", "existente"] as const).map((tabVal) => (
              <button
                key={tabVal}
                onClick={() => setTab(tabVal)}
                className={clsx(
                  "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                  tab === tabVal ? "bg-ink text-white" : "bg-surface-2 text-fg-muted"
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
                  <label className={labelCls}>{t("inversiones.ticker")}</label>
                  <input
                    className={`${inputCls} mt-1 uppercase`}
                    placeholder="AAPL"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="w-24">
                  <label className={labelCls}>{t("common.moneda")}</label>
                  <input
                    className={`${inputCls} mt-1 uppercase`}
                    placeholder="USD"
                    value={moneda}
                    onChange={(e) => setMoneda(e.target.value.toUpperCase())}
                    maxLength={3}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>{t("inversiones.nombre_activo")}</label>
                <input
                  className={`${inputCls} mt-1`}
                  placeholder="Apple Inc."
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>{t("common.tipo")}</label>
                <select className={`${inputCls} mt-1`} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  {TIPOS.map((tp) => (
                    <option key={tp} value={tp}>{t(`inversion_tipos.${tp}`, { defaultValue: tp })}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label className={labelCls}>{t("inversiones.selecciona_activo")}</label>
              <select className={`${inputCls} mt-1`} value={activoId} onChange={(e) => setActivoId(e.target.value)}>
                <option value="">--</option>
                {activos.map((a) => (
                  <option key={a.id} value={a.id}>{a.ticker} — {a.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>{t("inversiones.cantidad")}</label>
              <input type="number" inputMode="decimal" className={`${inputCls} mt-1`}
                placeholder="10.5" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t("inversiones.precio_medio")}</label>
              <input type="number" inputMode="decimal" className={`${inputCls} mt-1`}
                placeholder="220.00" value={precioMedio} onChange={(e) => setPrecioMedio(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" className="flex-1 py-3.5 rounded-2xl bg-surface-2 text-fg font-semibold text-sm" onClick={onClose}>
              {t("common.cancelar")}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={crearActivo.isPending || crearPosicion.isPending}
              className="flex-1 py-3.5 rounded-2xl bg-ink text-white font-semibold text-sm disabled:opacity-60 active:scale-95 transition-transform"
            >
              {crearActivo.isPending || crearPosicion.isPending ? t("common.guardando") : t("inversiones.anadir_posicion")}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── EditPosicionSheet ─────────────────────────────────────────────────────────

function EditPosicionSheet({ pos, onClose }: { pos: PosicionDetalle; onClose: () => void }) {
  const { t } = useTranslation();
  const actualizar = useActualizarPosicion();
  const [cantidad, setCantidad] = useState(pos.cantidad);
  const [precioMedio, setPrecioMedio] = useState(pos.precio_medio);

  async function handleGuardar() {
    try {
      await actualizar.mutateAsync({ posId: pos.posicion_id, cantidad, precio_medio: precioMedio });
      showFlash(t("inversiones.posicion_actualizada"));
      onClose();
    } catch { showFlash(t("common.error"), "error"); }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/20 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: "spring", damping: 28, stiffness: 380 }}
        className="w-full max-w-md bg-surface rounded-3xl shadow-[var(--shadow-floating)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg text-fg">{pos.ticker}</h2>
              <p className="text-xs text-fg-muted">{pos.nombre}</p>
            </div>
            <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
              <X className="w-4 h-4 text-fg" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-fg-muted font-semibold uppercase tracking-wide">{t("inversiones.cantidad")}</label>
              <input type="number" inputMode="decimal"
                className="w-full mt-1 bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
                value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-fg-muted font-semibold uppercase tracking-wide">{t("inversiones.precio_medio")}</label>
              <input type="number" inputMode="decimal"
                className="w-full mt-1 bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
                value={precioMedio} onChange={(e) => setPrecioMedio(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" className="flex-1 py-3.5 rounded-2xl bg-surface-2 text-fg font-semibold text-sm" onClick={onClose}>
              {t("common.cancelar")}
            </button>
            <button type="button"
              className="flex-1 py-3.5 rounded-2xl bg-ink text-white font-semibold text-sm disabled:opacity-60 active:scale-95 transition-transform"
              onClick={handleGuardar} disabled={actualizar.isPending}
            >
              {actualizar.isPending ? t("common.guardando") : t("common.guardar")}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── PosicionCard ──────────────────────────────────────────────────────────────

function PosicionCard({ pos }: { pos: PosicionDetalle }) {
  const { t } = useTranslation();
  const cerrar = useCerrarPosicion();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const positivo = parseFloat(pos.pl_absoluto) >= 0;

  async function handleCerrar() {
    try {
      await cerrar.mutateAsync(pos.posicion_id);
      showFlash(t("inversiones.posicion_cerrada"), "delete");
    } catch {
      showFlash(t("inversiones.error_cerrar"), "error");
    }
  }

  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-fg">{pos.ticker}</span>
            <span className="text-xs text-fg-subtle bg-surface-2 px-2 py-0.5 rounded-full">{t(`inversion_tipos.${pos.tipo}`, { defaultValue: pos.tipo })}</span>
          </div>
          <p className="text-xs text-fg-muted mt-0.5">{pos.nombre}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="font-semibold text-fg">{pos.moneda} {fmt(pos.valor_actual)}</p>
          <p className={clsx("text-sm font-medium", plColor(pos.pl_absoluto))}>
            {positivo ? "+" : ""}{fmt(pos.pl_absoluto)} ({positivo ? "+" : ""}{fmt(pos.pl_pct)}%)
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-fg-subtle">{t("inversiones.cantidad")}</p>
          <p className="text-sm font-medium text-fg">{parseFloat(pos.cantidad).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-fg-subtle">{t("inversiones.precio_medio")}</p>
          <p className="text-sm font-medium text-fg">{fmt(pos.precio_medio)}</p>
        </div>
        <div>
          <p className="text-xs text-fg-subtle">{t("inversiones.precio_actual")}</p>
          <p className="text-sm font-medium text-fg">
            {pos.precio_actual ? fmt(pos.precio_actual) : "–"}
            {pos.variacion_dia && (
              <span className={clsx("text-xs ml-1", parseFloat(pos.variacion_dia) >= 0 ? "text-accent-positive" : "text-accent-danger")}>
                ({parseFloat(pos.variacion_dia) >= 0 ? "+" : ""}{fmt(pos.variacion_dia)}%)
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-1.5 justify-end">
        <button onClick={() => setShowEdit(true)} className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center hover:bg-surface-3 transition-colors">
          <Pencil className="w-3.5 h-3.5 text-fg-muted" />
        </button>
        <button onClick={() => setShowConfirm(true)} className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center hover:bg-surface-3 transition-colors">
          <Trash2 className="w-3.5 h-3.5 text-fg-muted" />
        </button>
      </div>

      {showEdit && <EditPosicionSheet pos={pos} onClose={() => setShowEdit(false)} />}
      {showConfirm && (
        <ConfirmDelete
          nombre={pos.ticker}
          onConfirm={() => { setShowConfirm(false); handleCerrar(); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
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
    <div className="min-h-full bg-app pb-24">
      <div className="pt-10 px-4 pb-4">
        <div className="bg-ink rounded-3xl px-5 py-4 flex items-center justify-between shadow-[var(--shadow-floating)]">
          <h1 className="text-white font-bold text-2xl">{t("nav.inversiones")}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleActualizar}
              disabled={actualizarPrecios.isPending}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
            >
              <RefreshCw size={16} className={`text-white ${actualizarPrecios.isPending ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setShowSheet(true)}
              className="w-9 h-9 rounded-full bg-[#C7FF6B] flex items-center justify-center active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4 text-fg" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 max-w-2xl mx-auto">

        {/* Resumen cartera */}
        {cartera && (
          <div className="bg-ink rounded-3xl p-5 text-white mb-4 shadow-[var(--shadow-floating)]">
            <p className="text-white/50 text-sm mb-1">{t("inversiones.valor_total")}</p>
            <p className="text-3xl font-bold mb-3">
              {parseFloat(cartera.total_actual).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className="flex gap-6">
              <div>
                <p className="text-white/50 text-xs">{t("inversiones.invertido")}</p>
                <p className="font-semibold">{fmt(cartera.total_coste)}</p>
              </div>
              <div>
                <p className="text-white/50 text-xs">{t("inversiones.pl_total")}</p>
                <div className="flex items-center gap-1">
                  {plPositivo ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  <p className={clsx("font-semibold", plPositivo ? "text-[#C7FF6B]" : "text-red-300")}>
                    {plPositivo ? "+" : ""}{fmt(cartera.pl_total)} ({plPositivo ? "+" : ""}{fmt(cartera.pl_pct_total)}%)
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lista posiciones */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface rounded-2xl p-4 animate-pulse shadow-[var(--shadow-card)]">
                <div className="flex justify-between mb-3">
                  <div className="space-y-1.5">
                    <div className="h-4 bg-surface-2 rounded w-16" />
                    <div className="h-3 bg-surface-2 rounded w-28" />
                  </div>
                  <div className="space-y-1.5 items-end flex flex-col">
                    <div className="h-4 bg-surface-2 rounded w-20" />
                    <div className="h-3 bg-surface-2 rounded w-14" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[1,2,3].map((j) => <div key={j} className="h-8 bg-surface-2 rounded" />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {cartera && cartera.posiciones.length === 0 && (
          <div className="text-center py-12 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-surface shadow-[var(--shadow-card)] flex items-center justify-center mb-4">
              <TrendingUp className="w-8 h-8 text-fg-muted" />
            </div>
            <p className="font-bold text-fg mb-1">{t("inversiones.sin_inversiones")}</p>
            <p className="text-fg-muted text-sm">{t("inversiones.sin_inversiones_desc")}</p>
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
