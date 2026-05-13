import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { useCategorias } from "@/hooks/useCategorias";
import { useCuentas } from "@/hooks/useCuentas";
import type { FiltrosMovimientos } from "@/hooks/useMovimientos";

// ── Helpers de fecha ──────────────────────────────────────────────────────────

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function hoy(): string { return iso(new Date()); }

function inicioSemana(): string {
  const d = new Date();
  const day = d.getDay();
  const lunes = new Date(d);
  lunes.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return iso(lunes);
}

function inicioMes(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function rangoSemanaPassada(): { desde: string; hasta: string } {
  const d = new Date();
  const day = d.getDay();
  const lunes = new Date(d);
  lunes.setDate(d.getDate() - (day === 0 ? 6 : day - 1) - 7);
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  return { desde: iso(lunes), hasta: iso(domingo) };
}

function rangoMesPasado(): { desde: string; hasta: string } {
  const d = new Date();
  const year = d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear();
  const month = d.getMonth() === 0 ? 12 : d.getMonth();
  const ultimo = new Date(d.getFullYear(), d.getMonth(), 0).getDate();
  const m = String(month).padStart(2, "0");
  return { desde: `${year}-${m}-01`, hasta: `${year}-${m}-${ultimo}` };
}

function inicioAnio(): string {
  return `${new Date().getFullYear()}-01-01`;
}

// ── Periodos predefinidos ─────────────────────────────────────────────────────

type PeriodoKey = "hoy" | "esta_semana" | "este_mes" | "semana_pasada" | "mes_pasado" | "este_anio" | "personalizado";

function periodoDates(key: PeriodoKey): { desde: string; hasta: string } | null {
  switch (key) {
    case "hoy":           return { desde: hoy(), hasta: hoy() };
    case "esta_semana":   return { desde: inicioSemana(), hasta: hoy() };
    case "este_mes":      return { desde: inicioMes(), hasta: hoy() };
    case "semana_pasada": return rangoSemanaPassada();
    case "mes_pasado":    return rangoMesPasado();
    case "este_anio":     return { desde: inicioAnio(), hasta: hoy() };
    default:              return null;
  }
}

// ── Componente ────────────────────────────────────────────────────────────────

export interface FiltrosAplicados extends FiltrosMovimientos {
  _periodoLabel?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onAplicar: (filtros: FiltrosAplicados) => void;
  filtrosActuales: FiltrosAplicados;
}

export function FiltroMovimientosSheet({ open, onClose, onAplicar, filtrosActuales }: Props) {
  const { t } = useTranslation();

  const PERIODOS: { key: PeriodoKey; label: string }[] = [
    { key: "hoy",           label: t("filtros.hoy") },
    { key: "esta_semana",   label: t("filtros.esta_semana") },
    { key: "este_mes",      label: t("filtros.este_mes") },
    { key: "semana_pasada", label: t("filtros.semana_pasada") },
    { key: "mes_pasado",    label: t("filtros.mes_pasado") },
    { key: "este_anio",     label: t("filtros.este_anio") },
    { key: "personalizado", label: t("filtros.personalizado") },
  ];

  const [tipo,       setTipo]      = useState<"" | "ingreso" | "gasto">(filtrosActuales.tipo ?? "");
  const [periodo,    setPeriodo]   = useState<PeriodoKey | "">(
    filtrosActuales._periodoLabel
      ? (PERIODOS.find(p => p.label === filtrosActuales._periodoLabel)?.key ?? "")
      : ""
  );
  const [desdeCustom, setDesdeCustom] = useState(filtrosActuales.fecha_desde ?? "");
  const [hastaCustom, setHastaCustom] = useState(filtrosActuales.fecha_hasta ?? "");
  const [catId,      setCatId]     = useState(filtrosActuales.categoria_id ?? "");
  const [cuentaId,   setCuentaId]  = useState(filtrosActuales.cuenta_id ?? "");

  const { data: categorias = [] } = useCategorias();
  const { data: cuentas = [] }    = useCuentas();

  function handleAplicar() {
    const f: FiltrosAplicados = { limit: 200 };

    if (tipo) f.tipo = tipo;
    if (catId) f.categoria_id = catId;
    if (cuentaId) f.cuenta_id = cuentaId;

    if (periodo && periodo !== "personalizado") {
      const rango = periodoDates(periodo);
      if (rango) {
        f.fecha_desde = rango.desde;
        f.fecha_hasta = rango.hasta;
        f._periodoLabel = PERIODOS.find(p => p.key === periodo)?.label;
      }
    } else if (periodo === "personalizado") {
      if (desdeCustom) f.fecha_desde = desdeCustom;
      if (hastaCustom) f.fecha_hasta = hastaCustom;
      f._periodoLabel = t("filtros.personalizado");
    }

    onAplicar(f);
    onClose();
  }

  function handleLimpiar() {
    setTipo(""); setPeriodo(""); setDesdeCustom(""); setHastaCustom(""); setCatId(""); setCuentaId("");
    onAplicar({ limit: 100 });
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
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
            className="w-full max-w-md bg-surface rounded-3xl shadow-[var(--shadow-floating)] overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#F2F2F4]">
              <h2 className="font-bold text-fg text-lg">{t("filtros.titulo")}</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
                <X className="w-4 h-4 text-fg" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-5">

              {/* Tipo */}
              <div>
                <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-2">{t("common.tipo")}</p>
                <div className="grid grid-cols-3 gap-2">
                  {([["", t("filtros.tipo_todos")], ["ingreso", t("filtros.tipo_ingresos")], ["gasto", t("filtros.tipo_gastos")]] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setTipo(val as "" | "ingreso" | "gasto")}
                      className={clsx(
                        "rounded-2xl py-2.5 text-sm font-semibold transition-colors",
                        tipo === val
                          ? val === "ingreso" ? "bg-[#C7FF6B] text-fg"
                            : val === "gasto" ? "bg-[#FF5C5C] text-white"
                            : "bg-ink text-white"
                          : "bg-surface-2 text-fg-muted"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Período */}
              <div>
                <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-2">{t("common.periodo")}</p>
                <div className="grid grid-cols-2 gap-2">
                  {PERIODOS.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setPeriodo(key === periodo ? "" : key)}
                      className={clsx(
                        "rounded-2xl py-2.5 text-sm font-semibold transition-colors",
                        periodo === key ? "bg-ink text-white" : "bg-surface-2 text-fg-muted"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Rango personalizado */}
                {periodo === "personalizado" && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-fg-muted mb-1">{t("common.desde")}</p>
                      <div className="relative overflow-hidden">
                        <input
                          type="date"
                          value={desdeCustom}
                          onChange={(e) => setDesdeCustom(e.target.value)}
                          className="w-full max-w-full bg-surface-2 rounded-xl px-3 py-2.5 text-sm text-fg focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-fg-muted mb-1">{t("common.hasta")}</p>
                      <div className="relative overflow-hidden">
                        <input
                          type="date"
                          value={hastaCustom}
                          onChange={(e) => setHastaCustom(e.target.value)}
                          className="w-full max-w-full bg-surface-2 rounded-xl px-3 py-2.5 text-sm text-fg focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Cuenta */}
              {cuentas.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-2">{t("common.cuenta")}</p>
                  <div className="relative">
                    <select
                      value={cuentaId}
                      onChange={(e) => setCuentaId(e.target.value)}
                      className="w-full appearance-none bg-surface-2 rounded-xl px-4 py-2.5 text-sm text-fg focus:outline-none pr-9"
                    >
                      <option value="">{t("filtros.todas_cuentas")}</option>
                      {cuentas.map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre} ({c.moneda})</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Categoría */}
              {categorias.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-2">{t("common.categoria")}</p>
                  <div className="relative">
                    <select
                      value={catId}
                      onChange={(e) => setCatId(e.target.value)}
                      className="w-full appearance-none bg-surface-2 rounded-xl px-4 py-2.5 text-sm text-fg focus:outline-none pr-9"
                    >
                      <option value="">{t("common.todas_categorias")}</option>
                      {categorias.map((c) => (
                        <option key={c.id} value={c.id}>{c.emoji} {c.nombre}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted pointer-events-none" />
                  </div>
                </div>
              )}
            </div>

            {/* Botones */}
            <div className="px-5 pb-6 pt-2 space-y-2">
              <button
                onClick={handleAplicar}
                className="w-full bg-ink text-white rounded-2xl py-3.5 font-semibold active:scale-95 transition-transform"
              >
                {t("common.buscar")}
              </button>
              <button
                onClick={handleLimpiar}
                className="w-full text-fg-muted text-sm py-2"
              >
                {t("filtros.limpiar")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
