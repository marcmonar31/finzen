import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronDown, ChevronUp, Trash2, Landmark, Home, CreditCard, Handshake, Banknote, X, type LucideIcon } from "lucide-react";
import { showFlash } from "@/stores/flash";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { useDeudas, useCrearDeuda, useArchivarDeuda, useCuotas } from "@/hooks/useDeudas";
import { useWorkspaceStore } from "@/stores/workspace";
import type { DeudaOut } from "@/types/api";
import { formatCurrency } from "@/lib/format";

const TIPO_ICON: Record<string, LucideIcon> = {
  prestamo: Landmark,
  hipoteca: Home,
  tarjeta:  CreditCard,
  personal: Handshake,
};

// ── TablaAmortizacion ─────────────────────────────────────────────────────────

function TablaAmortizacion({ deudaId }: { deudaId: string }) {
  const { t } = useTranslation();
  const { data: cuotas = [], isLoading } = useCuotas(deudaId);
  const [mostrar, setMostrar] = useState(6);

  if (isLoading) return <div className="text-xs text-fg/40 py-2 text-center">{t("deudas.cargando_cuotas")}</div>;
  if (!cuotas.length) return null;

  const hoy = new Date().toISOString().split("T")[0];
  const cuotasVista = cuotas.slice(0, mostrar);

  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-fg/40 uppercase tracking-wide mb-2">
        {t("deudas.cuadro_amortizacion")} ({cuotas.length} {t("deudas.cuotas")})
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-fg/40">
              <th className="text-left py-1">{t("deudas.num")}</th>
              <th className="text-left py-1">{t("common.fecha")}</th>
              <th className="text-right py-1">{t("deudas.capital")}</th>
              <th className="text-right py-1">{t("deudas.intereses")}</th>
              <th className="text-right py-1">{t("deudas.cuota")}</th>
              <th className="text-right py-1">{t("deudas.pendiente")}</th>
            </tr>
          </thead>
          <tbody>
            {cuotasVista.map((c) => (
              <tr
                key={c.numero}
                className={clsx(
                  "border-t border-gray-50",
                  c.fecha < hoy ? "text-fg/30" : "text-fg"
                )}
              >
                <td className="py-1">{c.numero}</td>
                <td className="py-1">{new Date(c.fecha + "T00:00:00").toLocaleDateString(undefined, { month: "short", year: "2-digit", day: "numeric" })}</td>
                <td className="text-right py-1">{parseFloat(c.capital).toFixed(0)}€</td>
                <td className="text-right py-1 text-orange-400">{parseFloat(c.intereses).toFixed(0)}€</td>
                <td className="text-right py-1 font-semibold">{parseFloat(c.importe).toFixed(0)}€</td>
                <td className="text-right py-1 text-fg/50">{parseFloat(c.saldo_pendiente).toFixed(0)}€</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {mostrar < cuotas.length && (
        <button
          onClick={() => setMostrar(cuotas.length)}
          className="text-xs text-accent-info mt-2 w-full text-center"
        >{t("deudas.ver_todas")} ({cuotas.length})</button>
      )}
    </div>
  );
}

// ── DeudaCard ─────────────────────────────────────────────────────────────────

function DeudaCard({ deuda }: { deuda: DeudaOut }) {
  const { t } = useTranslation();
  const archivar = useArchivarDeuda();
  const [expandida, setExpandida] = useState(false);
  const tasa = parseFloat(deuda.tasa_interes_anual);

  async function handleArchivar() {
    try { await archivar.mutateAsync(deuda.id); showFlash(t("deudas.eliminada"), "delete"); }
    catch { showFlash(t("common.error"), "error"); }
  }

  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-surface-2 flex items-center justify-center flex-shrink-0">
            {(() => { const Icon = TIPO_ICON[deuda.tipo] ?? Banknote; return <Icon size={16} className="text-fg-muted" />; })()}
          </div>
          <div>
            <p className="font-semibold text-fg text-sm">{deuda.nombre}</p>
            <p className="text-xs text-fg/40">{t(`deudas.tipo_${deuda.tipo}`, { defaultValue: deuda.tipo })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleArchivar} className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100">
            <Trash2 size={12} className="text-red-400" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-xs text-fg-muted mb-0.5">{t("deudas.saldo_pendiente")}</p>
          <p className="text-2xl font-bold text-fg">
            {formatCurrency(deuda.saldo_pendiente ?? deuda.importe_total, deuda.moneda)}
          </p>
          <div className="flex items-center gap-3 mt-1">
            {deuda.saldo_pendiente && (
              <span className="text-xs text-fg-subtle">
                {t("deudas.de")} {formatCurrency(deuda.importe_total, deuda.moneda)}
              </span>
            )}
            {tasa > 0 && (
              <span className="text-xs text-orange-500">{tasa.toFixed(2)}% TAE</span>
            )}
            <span className="text-xs text-fg-muted">{t("deudas.dia_cuota_mes", { dia: deuda.dia_cuota })}</span>
          </div>
        </div>
        {deuda.num_cuotas && (
          <button
            onClick={() => setExpandida((v) => !v)}
            className="flex items-center gap-1 text-xs text-accent-info font-semibold"
          >
            {t("deudas.cuotas")} {expandida ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>

      {expandida && <TablaAmortizacion deudaId={deuda.id} />}
    </div>
  );
}

// ── NuevaDeudaSheet ───────────────────────────────────────────────────────────

function NuevaDeudaSheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const crear = useCrearDeuda();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const moneda = workspace?.moneda_base ?? "EUR";
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("prestamo");
  const [importe, setImporte] = useState("");
  const [tasa, setTasa] = useState("0");
  const [numCuotas, setNumCuotas] = useState("");
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split("T")[0]);
  const [diaCuota, setDiaCuota] = useState("1");

  async function handleCrear() {
    if (!nombre.trim() || !importe) { showFlash(t("deudas.nombre_importe_req"), "error"); return; }
    try {
      await crear.mutateAsync({
        nombre: nombre.trim(), tipo,
        importe_total: parseFloat(importe).toFixed(2),
        moneda,
        tasa_interes_anual: tasa || "0",
        num_cuotas: numCuotas ? parseInt(numCuotas) : null,
        fecha_inicio: fechaInicio,
        dia_cuota: parseInt(diaCuota) || 1,
      });
      showFlash(t("deudas.registrada"));
      onClose();
    } catch { showFlash(t("common.error"), "error"); }
  }

  return (
    <AnimatePresence>
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
              <h2 className="font-bold text-lg text-fg">{t("deudas.registrar")}</h2>
              <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
                <X className="w-4 h-4 text-fg" />
              </button>
            </div>
            <input
              className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
              placeholder={t("deudas.nombre_placeholder")} value={nombre} onChange={(e) => setNombre(e.target.value)}
              autoFocus
            />
            <select
              className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
              value={tipo} onChange={(e) => setTipo(e.target.value)}
            >
              <option value="prestamo">{t("deudas.tipo_prestamo")}</option>
              <option value="hipoteca">{t("deudas.tipo_hipoteca")}</option>
              <option value="tarjeta">{t("deudas.tipo_tarjeta")}</option>
              <option value="personal">{t("deudas.tipo_personal")}</option>
            </select>
            <input
              type="number" inputMode="decimal" placeholder={t("deudas.importe_total")}
              className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
              value={importe} onChange={(e) => setImporte(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-fg-muted font-semibold uppercase tracking-wide">{t("deudas.tipo_interes")}</label>
                <input
                  type="number" inputMode="decimal" placeholder="0"
                  className="w-full mt-1 bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
                  value={tasa} onChange={(e) => setTasa(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-fg-muted font-semibold uppercase tracking-wide">{t("deudas.num_cuotas")}</label>
                <input
                  type="number" inputMode="numeric" placeholder={t("deudas.sin_limite")}
                  className="w-full mt-1 bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
                  value={numCuotas} onChange={(e) => setNumCuotas(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-fg-muted font-semibold uppercase tracking-wide">{t("deudas.fecha_inicio")}</label>
                <input type="date"
                  className="w-full mt-1 bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
                  value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-fg-muted font-semibold uppercase tracking-wide">{t("deudas.dia_cuota")}</label>
                <input
                  type="number" inputMode="numeric" min="1" max="28" placeholder="1"
                  className="w-full mt-1 bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
                  value={diaCuota} onChange={(e) => setDiaCuota(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" className="flex-1 py-3.5 rounded-2xl bg-surface-2 text-fg font-semibold text-sm" onClick={onClose}>
                {t("common.cancelar")}
              </button>
              <button
                type="button"
                className="flex-1 py-3.5 rounded-2xl bg-ink text-white font-semibold text-sm disabled:opacity-60 active:scale-95 transition-transform"
                onClick={handleCrear} disabled={crear.isPending}
              >
                {crear.isPending ? t("common.guardando") : t("deudas.registrar")}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Deudas ────────────────────────────────────────────────────────────────────

export function Deudas() {
  const { t } = useTranslation();
  const { data: deudas = [], isLoading } = useDeudas();
  const [showNueva, setShowNueva] = useState(false);

  const activas = deudas.filter((d) => d.activa);
  const totalDeuda = activas.reduce((acc, d) => acc + parseFloat(d.saldo_pendiente ?? d.importe_total), 0);

  return (
    <div className="min-h-full bg-app pb-24">
      <div className="pt-10 px-4 pb-4">
        <div className="bg-ink rounded-3xl px-5 py-4 flex items-center justify-between shadow-[var(--shadow-floating)]">
          <div>
            <h1 className="text-white font-bold text-2xl">{t("nav.deudas")}</h1>
            {activas.length > 0 && (
              <p className="text-white/50 text-xs mt-0.5">
                {t("deudas.total")} {totalDeuda.toLocaleString(undefined, { style: "currency", currency: "EUR" })}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowNueva(true)}
            className="w-9 h-9 rounded-full bg-[#C7FF6B] flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4 text-fg" />
          </button>
        </div>
      </div>

      <div className="px-4 max-w-2xl mx-auto">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface rounded-2xl p-4 animate-pulse shadow-[var(--shadow-card)]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-surface-2 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 bg-surface-2 rounded w-2/5" />
                    <div className="h-3 bg-surface-2 rounded w-1/4" />
                  </div>
                </div>
                <div className="h-7 bg-surface-2 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : activas.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface shadow-[var(--shadow-card)] flex items-center justify-center mb-4">
              <Banknote className="w-8 h-8 text-fg-muted" />
            </div>
            <p className="font-bold text-fg mb-1">{t("deudas.sin_deudas")}</p>
            <p className="text-fg-muted text-sm mb-6">{t("deudas.sin_deudas_desc")}</p>
            <button
              onClick={() => setShowNueva(true)}
              className="bg-ink text-white rounded-2xl px-6 py-3 text-sm font-semibold active:scale-95 transition-transform"
            >
              {t("deudas.nueva")}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {activas.map((d) => <DeudaCard key={d.id} deuda={d} />)}
          </div>
        )}
      </div>

      {showNueva && <NuevaDeudaSheet onClose={() => setShowNueva(false)} />}
    </div>
  );
}
