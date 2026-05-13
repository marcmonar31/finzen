import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronDown, ChevronUp, Trash2, Pencil, PiggyBank, Landmark, Home, CreditCard, Handshake, Banknote, X, type LucideIcon } from "lucide-react";
import { showFlash } from "@/stores/flash";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { useDeudas, useCrearDeuda, useActualizarDeuda, useArchivarDeuda, useCuotas, useCrearPagoAnticipado } from "@/hooks/useDeudas";
import { useWorkspaceStore } from "@/stores/workspace";
import type { DeudaOut } from "@/types/api";
import { formatCurrency } from "@/lib/format";

const TIPO_ICON: Record<string, LucideIcon> = {
  prestamo: Landmark,
  hipoteca: Home,
  tarjeta:  CreditCard,
  personal: Handshake,
};

function calcularPrestamo(importeStr: string, tasaStr: string, cuotasStr: string) {
  const P = parseFloat(importeStr);
  const n = parseInt(cuotasStr);
  const tasaAnual = parseFloat(tasaStr);
  if (!P || !n || P <= 0 || n <= 0 || isNaN(P) || isNaN(n)) return null;
  if (tasaAnual <= 0 || isNaN(tasaAnual)) {
    return { cuotaMensual: P / n, totalPagado: P, totalIntereses: 0 };
  }
  const r = tasaAnual / 12 / 100;
  const factor = Math.pow(1 + r, n);
  const cuotaMensual = (P * r * factor) / (factor - 1);
  const totalPagado = cuotaMensual * n;
  const totalIntereses = totalPagado - P;
  return { cuotaMensual, totalPagado, totalIntereses };
}

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
        <p className="font-bold text-fg text-base text-center mb-1">{t("deudas.eliminar_confirm")}</p>
        <p className="text-fg-muted text-sm text-center mb-6">"{nombre}" {t("deudas.eliminar_desc")}</p>
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

// ── EditDeudaSheet ────────────────────────────────────────────────────────────

function EditDeudaSheet({ deuda, onClose }: { deuda: DeudaOut; onClose: () => void }) {
  const { t } = useTranslation();
  const actualizar = useActualizarDeuda();
  const [nombre, setNombre] = useState(deuda.nombre);
  const [tasa, setTasa] = useState(deuda.tasa_interes_anual);
  const [numCuotas, setNumCuotas] = useState(deuda.num_cuotas ? String(deuda.num_cuotas) : "");
  const [diaCuota, setDiaCuota] = useState(String(deuda.dia_cuota));

  async function handleGuardar() {
    if (!nombre.trim()) { showFlash(t("deudas.nombre_importe_req"), "error"); return; }
    try {
      await actualizar.mutateAsync({
        id: deuda.id,
        nombre: nombre.trim(),
        tasa_interes_anual: tasa || "0",
        num_cuotas: numCuotas ? parseInt(numCuotas) : null,
        dia_cuota: parseInt(diaCuota) || 1,
      });
      showFlash(t("deudas.actualizada"));
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
            <h2 className="font-bold text-lg text-fg">{t("deudas.editar")}</h2>
            <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
              <X className="w-4 h-4 text-fg" />
            </button>
          </div>
          <input
            className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
            placeholder={t("deudas.nombre_placeholder")} value={nombre} onChange={(e) => setNombre(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-fg-muted font-semibold uppercase tracking-wide">{t("deudas.tipo_interes")}</label>
              <input type="number" inputMode="decimal"
                className="w-full mt-1 bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
                value={tasa} onChange={(e) => setTasa(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-fg-muted font-semibold uppercase tracking-wide">{t("deudas.num_cuotas")}</label>
              <input type="number" inputMode="numeric"
                className="w-full mt-1 bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
                value={numCuotas} onChange={(e) => setNumCuotas(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-fg-muted font-semibold uppercase tracking-wide">{t("deudas.dia_cuota")}</label>
              <input type="number" inputMode="numeric" min="1" max="28"
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

// ── AportarSheet ──────────────────────────────────────────────────────────────

function calcularAhorro(saldoActual: number, extra: number, tasaAnual: number, cuotaMensual: number) {
  if (!extra || extra <= 0 || extra >= saldoActual) return null;
  const r = tasaAnual / 12 / 100;

  function cuotasRestantes(capital: number) {
    if (r === 0) return Math.ceil(capital / cuotaMensual);
    const ln = Math.log(cuotaMensual / (cuotaMensual - r * capital));
    return Math.ceil(ln / Math.log(1 + r));
  }

  const nAntes = cuotasRestantes(saldoActual);
  const nuevoSaldo = saldoActual - extra;
  const nDespues = cuotasRestantes(nuevoSaldo);
  const cuotasAhorradas = Math.max(0, nAntes - nDespues);
  const interesesAntes = nAntes * cuotaMensual - saldoActual;
  const interesesDespues = nDespues * cuotaMensual - nuevoSaldo;
  const interesesAhorrados = Math.max(0, interesesAntes - interesesDespues);

  return { cuotasAhorradas, interesesAhorrados, nAntes, nDespues };
}

function AportarSheet({ deuda, onClose }: { deuda: DeudaOut; onClose: () => void }) {
  const { t } = useTranslation();
  const crear = useCrearPagoAnticipado(deuda.id);
  const [importe, setImporte] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [notas, setNotas] = useState("");

  const saldo = parseFloat(deuda.saldo_pendiente ?? deuda.importe_total);
  const calc = calcularPrestamo(deuda.importe_total, deuda.tasa_interes_anual, String(deuda.num_cuotas ?? 0));
  const cuotaMensual = calc?.cuotaMensual ?? 0;
  const tasa = parseFloat(deuda.tasa_interes_anual);

  const preview = importe && parseFloat(importe) > 0
    ? calcularAhorro(saldo, parseFloat(importe), tasa, cuotaMensual)
    : null;

  const fmt = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  async function handleAportar() {
    const imp = parseFloat(importe);
    if (!imp || imp <= 0) { showFlash(t("deudas.importe_invalido"), "error"); return; }
    try {
      await crear.mutateAsync({ fecha, importe: imp.toFixed(2), notas: notas.trim() || undefined });
      showFlash(t("deudas.pago_registrado"));
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
            <h2 className="font-bold text-lg text-fg">{t("deudas.aportar_titulo")}</h2>
            <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
              <X className="w-4 h-4 text-fg" />
            </button>
          </div>

          <div className="bg-surface-2 rounded-xl px-4 py-2.5 flex justify-between">
            <span className="text-sm text-fg-muted">{t("deudas.saldo_pendiente")}</span>
            <span className="text-sm font-semibold text-fg">{fmt(saldo)} {deuda.moneda}</span>
          </div>

          <input
            type="number" inputMode="decimal"
            placeholder={t("deudas.importe_extra")}
            className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
            value={importe} onChange={(e) => setImporte(e.target.value)}
            autoFocus
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-fg-muted font-semibold uppercase tracking-wide">{t("common.fecha")}</label>
              <input type="date"
                className="w-full mt-1 bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
                value={fecha} onChange={(e) => setFecha(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-fg-muted font-semibold uppercase tracking-wide">{t("common.notas")}</label>
              <input
                className="w-full mt-1 bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
                placeholder={t("deudas.notas_pago")}
                value={notas} onChange={(e) => setNotas(e.target.value)}
              />
            </div>
          </div>

          {preview && (
            <div className="bg-[#C7FF6B]/20 rounded-2xl px-4 py-3 space-y-1.5">
              <p className="text-xs font-semibold text-[#5BAA1F] uppercase tracking-wide">{t("deudas.ahorro_estimado")}</p>
              <div className="flex justify-between text-sm">
                <span className="text-fg-muted">{t("deudas.cuotas_ahorradas")}</span>
                <span className="font-bold text-fg">−{preview.cuotasAhorradas} {t("deudas.meses")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-fg-muted">{t("deudas.intereses_ahorrados")}</span>
                <span className="font-bold text-[#5BAA1F]">−{fmt(preview.interesesAhorrados)} {deuda.moneda}</span>
              </div>
              <div className="flex justify-between text-xs text-fg-subtle pt-0.5">
                <span>{t("deudas.cuotas_antes")}</span>
                <span>{preview.nAntes} → {preview.nDespues} {t("deudas.cuotas")}</span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" className="flex-1 py-3.5 rounded-2xl bg-surface-2 text-fg font-semibold text-sm" onClick={onClose}>
              {t("common.cancelar")}
            </button>
            <button
              type="button"
              className="flex-1 py-3.5 rounded-2xl bg-ink text-white font-semibold text-sm disabled:opacity-60 active:scale-95 transition-transform"
              onClick={handleAportar} disabled={crear.isPending}
            >
              {crear.isPending ? t("common.guardando") : t("deudas.registrar_pago")}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── DeudaCard ─────────────────────────────────────────────────────────────────

function DeudaCard({ deuda }: { deuda: DeudaOut }) {
  const { t } = useTranslation();
  const archivar = useArchivarDeuda();
  const [expandida, setExpandida] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAportar, setShowAportar] = useState(false);
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
        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowEdit(true)} className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center hover:bg-surface-3 transition-colors">
            <Pencil className="w-3.5 h-3.5 text-fg-muted" />
          </button>
          <button onClick={() => setShowConfirm(true)} className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center hover:bg-surface-3 transition-colors">
            <Trash2 className="w-3.5 h-3.5 text-fg-muted" />
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
        <div className="flex flex-col items-end gap-1.5">
          {deuda.num_cuotas && (
            <button
              onClick={() => setExpandida((v) => !v)}
              className="flex items-center gap-1 text-xs text-accent-info font-semibold"
            >
              {t("deudas.cuotas")} {expandida ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
          <button
            onClick={() => setShowAportar(true)}
            className="flex items-center gap-1 text-xs font-semibold text-[#5BAA1F] bg-[#C7FF6B]/20 rounded-lg px-2 py-1 active:scale-95 transition-transform"
          >
            <PiggyBank size={11} />
            {t("deudas.aportar")}
          </button>
        </div>
      </div>

      {(deuda.tipo === "prestamo" || deuda.tipo === "hipoteca") && deuda.num_cuotas && (() => {
        const calc = calcularPrestamo(deuda.importe_total, deuda.tasa_interes_anual, String(deuda.num_cuotas));
        if (!calc || calc.totalIntereses <= 0) return null;
        const fmt = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        return (
          <div className="mt-3 flex items-center justify-between bg-orange-50 dark:bg-orange-950/30 rounded-xl px-3 py-2">
            <span className="text-xs text-fg-muted">{t("deudas.total_pagado")}</span>
            <div className="text-right">
              <span className="text-sm font-bold text-fg">{fmt(calc.totalPagado)} {deuda.moneda}</span>
              <span className="text-xs text-orange-500 ml-2">+{fmt(calc.totalIntereses)} {t("deudas.en_intereses")}</span>
            </div>
          </div>
        );
      })()}

      {expandida && <TablaAmortizacion deudaId={deuda.id} />}

      {showEdit && <EditDeudaSheet deuda={deuda} onClose={() => setShowEdit(false)} />}
      {showAportar && <AportarSheet deuda={deuda} onClose={() => setShowAportar(false)} />}
      {showConfirm && (
        <ConfirmDelete
          nombre={deuda.nombre}
          onConfirm={() => { setShowConfirm(false); handleArchivar(); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
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
            {(tipo === "prestamo" || tipo === "hipoteca") && (() => {
              const calc = calcularPrestamo(importe, tasa, numCuotas);
              if (!calc) return null;
              const fmt = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              return (
                <div className="bg-orange-50 dark:bg-orange-950/30 rounded-2xl px-4 py-3 space-y-1.5">
                  <p className="text-xs font-semibold text-orange-500 uppercase tracking-wide">{t("deudas.resumen_prestamo")}</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-fg-muted">{t("deudas.cuota_mensual")}</span>
                    <span className="font-semibold text-fg">{fmt(calc.cuotaMensual)} {moneda}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-fg-muted">{t("deudas.total_intereses")}</span>
                    <span className="font-semibold text-orange-500">+{fmt(calc.totalIntereses)} {moneda}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-orange-200 dark:border-orange-900 pt-1.5">
                    <span className="text-fg font-semibold">{t("deudas.total_pagado")}</span>
                    <span className="font-bold text-fg">{fmt(calc.totalPagado)} {moneda}</span>
                  </div>
                </div>
              );
            })()}
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

  const { workspace } = useWorkspaceStore();
  const monedaBase = workspace?.moneda_base ?? "EUR";
  const activas = deudas.filter((d) => d.activa);
  const totalDeuda = activas
    .filter((d) => d.moneda === monedaBase)
    .reduce((acc, d) => acc + parseFloat(d.saldo_pendiente ?? d.importe_total), 0);
  const todasMismaMoneda = activas.length > 0 && activas.every((d) => d.moneda === monedaBase);

  return (
    <div className="min-h-full bg-app pb-24">
      <div className="pt-10 px-4 pb-4">
        <div className="bg-ink rounded-3xl px-5 py-4 flex items-center justify-between shadow-[var(--shadow-floating)]">
          <div>
            <h1 className="text-white font-bold text-2xl">{t("nav.deudas")}</h1>
            {todasMismaMoneda && (
              <p className="text-white/50 text-xs mt-0.5">
                {t("deudas.total")} {formatCurrency(totalDeuda.toFixed(2), monedaBase)}
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
