import { useState, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Play, Pause, Trash2, Zap, ArrowDown, X, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { showFlash } from "@/stores/flash";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { useReglas, useActualizarRegla, useArchivarRegla, useCrearRegla } from "@/hooks/useReglas";
import { formatDate } from "@/lib/format";
import type { ReglaOut } from "@/types/api";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Condicion {
  _id: string;
  campo: string;
  operador: string;
  valor: string;
  negado: boolean;
}

interface Accion {
  _id: string;
  tipo: string;
  [key: string]: unknown;
}

interface TriggerDef  { key: string; label: string; desc: string }
interface TriggerGroup { groupKey: string; groupLabel: string; triggers: TriggerDef[] }

// ── EjemploCard ───────────────────────────────────────────────────────────────

function EjemploCard({ onCrear }: { onCrear: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="bg-surface rounded-3xl p-5 shadow-[var(--shadow-card)]">
      <p className="font-bold text-fg text-sm mb-1">{t("reglas.ejemplo_titulo")}</p>
      <p className="text-xs text-fg-muted mb-5">{t("reglas.ejemplo_subtitulo")}</p>
      <div className="space-y-1">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-[10px] font-bold text-fg-muted">1</span>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-fg-muted uppercase tracking-wider mb-0.5">{t("reglas.ejemplo_cuando")}</p>
            <p className="text-sm font-medium text-fg">{t("reglas.ejemplo_trigger_txt")}</p>
          </div>
        </div>
        <div className="ml-3 pl-0.5"><ArrowDown size={14} className="text-fg-subtle ml-0.5" /></div>
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-[10px] font-bold text-fg-muted">2</span>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-fg-muted uppercase tracking-wider mb-0.5">{t("reglas.ejemplo_si")}</p>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs bg-surface-2 rounded-lg px-2 py-1 text-fg font-medium">tipo = ingreso</span>
              <span className="text-xs bg-surface-2 rounded-lg px-2 py-1 text-fg font-medium">importe ≥ 1.000 €</span>
            </div>
          </div>
        </div>
        <div className="ml-3 pl-0.5"><ArrowDown size={14} className="text-fg-subtle ml-0.5" /></div>
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#C7FF6B] flex items-center justify-center flex-shrink-0 mt-0.5">
            <Zap size={13} className="text-fg" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-fg-muted uppercase tracking-wider mb-0.5">{t("reglas.ejemplo_entonces")}</p>
            <p className="text-sm font-medium text-fg">{t("reglas.ejemplo_accion_txt")}</p>
          </div>
        </div>
      </div>
      <div className="mt-5 pt-4 border-t border-[var(--color-border-ui,#E8E8EA)]">
        <p className="text-xs text-fg-muted mb-3">{t("reglas.ejemplo_desc")}</p>
        <button
          onClick={onCrear}
          className="w-full py-3 rounded-2xl bg-ink text-white font-semibold text-sm active:scale-95 transition-transform"
        >
          {t("reglas.crear_mi_primera")}
        </button>
      </div>
    </div>
  );
}

// ── NuevaReglaSheet ────────────────────────────────────────────────────────────

function NuevaReglaSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const crearRegla = useCrearRegla();
  const uid = useId();
  const makeId = () => `${uid}-${Math.random().toString(36).slice(2)}`;

  // ─ Definición de triggers agrupados ─────────────────────────────────────────
  const TRIGGER_GROUPS: TriggerGroup[] = [
    {
      groupKey: "transaccion",
      groupLabel: t("reglas.grupo_transaccion"),
      triggers: [
        { key: "transaccion_ingreso",  label: t("reglas.trigger_ingreso"),  desc: t("reglas.trigger_ingreso_desc") },
        { key: "transaccion_gasto",    label: t("reglas.trigger_gasto"),    desc: t("reglas.trigger_gasto_desc") },
        { key: "transaccion_importe",  label: t("reglas.trigger_importe"),  desc: t("reglas.trigger_importe_desc") },
        { key: "transaccion_texto",    label: t("reglas.trigger_texto"),    desc: t("reglas.trigger_texto_desc") },
        { key: "transaccion_cuenta",   label: t("reglas.trigger_cuenta_especifica"), desc: t("reglas.trigger_cuenta_especifica_desc") },
      ],
    },
    {
      groupKey: "temporal",
      groupLabel: t("reglas.grupo_temporal"),
      triggers: [
        { key: "fecha_periodica",          label: t("reglas.trigger_periodico"),   desc: t("reglas.trigger_periodico_desc") },
        { key: "fecha_dia_mes",            label: t("reglas.trigger_dia_mes"),     desc: t("reglas.trigger_dia_mes_desc") },
        { key: "fecha_ultimo_dia_habil",   label: t("reglas.trigger_ultimo_dia"),  desc: t("reglas.trigger_ultimo_dia_desc") },
      ],
    },
    {
      groupKey: "estado",
      groupLabel: t("reglas.grupo_estado"),
      triggers: [
        { key: "umbral_saldo",          label: t("reglas.trigger_umbral_saldo"),       desc: t("reglas.trigger_umbral_saldo_desc") },
        { key: "objetivo_porcentaje",   label: t("reglas.trigger_objetivo_pct"),       desc: t("reglas.trigger_objetivo_pct_desc") },
        { key: "presupuesto_porcentaje",label: t("reglas.trigger_presupuesto_pct"),    desc: t("reglas.trigger_presupuesto_pct_desc") },
      ],
    },
    {
      groupKey: "manual",
      groupLabel: t("reglas.grupo_manual"),
      triggers: [
        { key: "manual", label: t("reglas.trigger_manual"), desc: t("reglas.trigger_manual_desc") },
      ],
    },
  ];

  // ─ Definición de acciones agrupadas ─────────────────────────────────────────
  const ACCION_GROUPS: { groupLabel: string; tipos: string[] }[] = [
    {
      groupLabel: t("reglas.grupo_accion_dinero"),
      tipos: ["transferir_fijo", "transferir_porcentaje", "transferir_porcentaje_saldo", "transferir_redondeo"],
    },
    {
      groupLabel: t("reglas.grupo_accion_clasificar"),
      tipos: ["asignar_categoria", "anadir_etiqueta"],
    },
    {
      groupLabel: t("reglas.grupo_accion_notificar"),
      tipos: ["notificar", "marcar_revision"],
    },
    {
      groupLabel: t("reglas.grupo_accion_encadenar"),
      tipos: ["pausar_regla", "activar_regla"],
    },
  ];

  const ACCION_LABEL: Record<string, string> = {
    transferir_fijo:              t("reglas.accion_transferir_fijo"),
    transferir_porcentaje:        t("reglas.accion_transferir_pct"),
    transferir_porcentaje_saldo:  t("reglas.accion_transferir_pct_saldo"),
    transferir_redondeo:          t("reglas.accion_redondeo"),
    asignar_categoria:            t("reglas.accion_categoria"),
    anadir_etiqueta:              t("reglas.accion_etiqueta"),
    notificar:                    t("reglas.accion_notificar"),
    marcar_revision:              t("reglas.accion_marcar"),
    pausar_regla:                 t("reglas.accion_pausar"),
    activar_regla:                t("reglas.accion_activar"),
  };

  const ACCION_DESC: Record<string, string> = {
    transferir_fijo:              t("reglas.accion_transferir_fijo_desc"),
    transferir_porcentaje:        t("reglas.accion_transferir_pct_desc"),
    transferir_porcentaje_saldo:  t("reglas.accion_transferir_pct_saldo_desc"),
    transferir_redondeo:          t("reglas.accion_redondeo_desc"),
    asignar_categoria:            t("reglas.accion_categoria_desc"),
    anadir_etiqueta:              t("reglas.accion_etiqueta_desc"),
    notificar:                    t("reglas.accion_notificar_desc"),
    marcar_revision:              t("reglas.accion_marcar_desc"),
    pausar_regla:                 t("reglas.accion_pausar_desc"),
    activar_regla:                t("reglas.accion_activar_desc"),
  };

  const CAMPO_LABEL: Record<string, string> = {
    tipo:             t("reglas.campo_tipo"),
    importe:          t("reglas.campo_importe"),
    concepto:         t("reglas.campo_concepto"),
    categoria_nombre: t("reglas.campo_categoria"),
    comercio:         t("reglas.campo_comercio"),
    moneda:           t("reglas.campo_moneda"),
    etiqueta:         t("reglas.campo_etiqueta"),
  };

  const CAMPO_HINT: Record<string, string> = {
    tipo:             t("reglas.campo_tipo_hint"),
    importe:          t("reglas.campo_importe_hint"),
    concepto:         t("reglas.campo_concepto_hint"),
    categoria_nombre: t("reglas.campo_categoria_hint"),
    comercio:         t("reglas.campo_comercio_hint"),
    moneda:           t("reglas.campo_moneda_hint"),
    etiqueta:         t("reglas.campo_etiqueta_hint"),
  };

  // ─ Estado ───────────────────────────────────────────────────────────────────
  const [nombre,          setNombre]          = useState("");
  const [descripcion,     setDescripcion]     = useState("");
  const [triggerTipo,     setTriggerTipo]     = useState("transaccion_ingreso");
  const [triggerConfig,   setTriggerConfig]   = useState<Record<string, unknown>>({});
  const [modoCondiciones, setModoCondiciones] = useState<"AND" | "OR">("AND");
  const [maxEjecMes,      setMaxEjecMes]      = useState("");
  const [condiciones,     setCondiciones]     = useState<Condicion[]>([]);
  const [acciones,        setAcciones]        = useState<Accion[]>([]);
  const [showVariables,   setShowVariables]   = useState(false);

  function updateTriggerConfig(key: string, value: unknown) {
    setTriggerConfig((prev) => ({ ...prev, [key]: value }));
  }

  function reset() {
    setNombre(""); setDescripcion(""); setTriggerTipo("transaccion_ingreso");
    setTriggerConfig({}); setModoCondiciones("AND"); setMaxEjecMes("");
    setCondiciones([]); setAcciones([]); setShowVariables(false);
  }

  function handleClose() { reset(); onClose(); }

  // ─ Condiciones ──────────────────────────────────────────────────────────────
  function addCondicion() {
    setCondiciones((p) => [...p, { _id: makeId(), campo: "tipo", operador: "eq", valor: "", negado: false }]);
  }
  function removeCondicion(id: string) {
    setCondiciones((p) => p.filter((c) => c._id !== id));
  }
  function updateCondicion(id: string, field: keyof Omit<Condicion, "_id">, value: string | boolean) {
    setCondiciones((p) => p.map((c) => c._id === id ? { ...c, [field]: value } : c));
  }

  // ─ Acciones ─────────────────────────────────────────────────────────────────
  function addAccion() {
    setAcciones((p) => [...p, { _id: makeId(), tipo: "transferir_porcentaje" }]);
  }
  function removeAccion(id: string) {
    setAcciones((p) => p.filter((a) => a._id !== id));
  }
  function updateAccion(id: string, field: string, value: unknown) {
    setAcciones((p) => p.map((a) => a._id === id ? { ...a, [field]: value } : a));
  }

  // ─ Validación porcentajes ────────────────────────────────────────────────────
  const totalPorcentaje = acciones
    .filter((a) => a.tipo === "transferir_porcentaje" || a.tipo === "transferir_porcentaje_saldo")
    .reduce((s, a) => s + (parseFloat(String(a.porcentaje ?? "0")) || 0), 0);

  // ─ Submit ────────────────────────────────────────────────────────────────────
  async function handleGuardar() {
    if (!nombre.trim()) { showFlash(t("reglas.nombre_req"), "error"); return; }
    if (acciones.length === 0) { showFlash(t("reglas.accion_req"), "error"); return; }
    const condicionesPayload = condiciones.map(({ _id: _, ...c }) => c);
    const accionesPayload    = acciones.map(({ _id: _, ...a }) => a);
    try {
      await crearRegla.mutateAsync({
        nombre:              nombre.trim(),
        descripcion:         descripcion.trim() || undefined,
        trigger_tipo:        triggerTipo,
        trigger_config:      triggerConfig,
        condiciones:         condicionesPayload,
        modo_condiciones:    modoCondiciones,
        acciones:            accionesPayload,
        max_ejecuciones_mes: maxEjecMes ? parseInt(maxEjecMes, 10) : undefined,
      });
      showFlash(t("reglas.creada"));
      handleClose();
    } catch {
      showFlash(t("common.error"), "error");
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/20 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", damping: 28, stiffness: 380 }}
            className="w-full max-w-md bg-surface rounded-3xl max-h-[90vh] overflow-y-auto shadow-[var(--shadow-floating)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 space-y-5">

              {/* ── Header ── */}
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg text-fg">{t("reglas.nueva")}</h2>
                <button type="button" onClick={handleClose} className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
                  <X className="w-4 h-4 text-fg" />
                </button>
              </div>

              {/* ── Nombre + Descripción ── */}
              <div className="space-y-2">
                <input
                  className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
                  value={nombre} onChange={(e) => setNombre(e.target.value)}
                  placeholder={t("reglas.nombre_placeholder")}
                />
                <input
                  className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
                  value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
                  placeholder={t("reglas.descripcion_placeholder")}
                />
              </div>

              {/* ── Disparador ── */}
              <div>
                <p className="text-xs text-fg-muted mb-1 font-semibold uppercase tracking-wide">{t("reglas.trigger")}</p>
                <p className="text-xs text-fg-subtle mb-3">{t("reglas.trigger_help")}</p>

                <div className="space-y-3">
                  {TRIGGER_GROUPS.map((group) => (
                    <div key={group.groupKey}>
                      <p className="text-[10px] font-bold text-fg-muted uppercase tracking-widest mb-1.5 px-1">{group.groupLabel}</p>
                      <div className="space-y-1.5">
                        {group.triggers.map((tr) => (
                          <button
                            key={tr.key}
                            type="button"
                            onClick={() => { setTriggerTipo(tr.key); setTriggerConfig({}); }}
                            className={clsx(
                              "w-full flex flex-col px-4 py-3 rounded-xl text-left transition-all",
                              triggerTipo === tr.key ? "bg-ink text-white" : "bg-surface-2 text-fg"
                            )}
                          >
                            <span className="text-sm font-semibold">{tr.label}</span>
                            <span className={clsx("text-xs mt-0.5", triggerTipo === tr.key ? "text-white/65" : "text-fg-muted")}>
                              {tr.desc}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Config dinámica del disparador ── */}
                {(triggerTipo === "transaccion_importe") && (
                  <div className="mt-3 bg-surface-2 rounded-xl p-3 space-y-2">
                    <p className="text-xs text-fg-muted font-medium">{t("reglas.config_umbral_operador")}</p>
                    <div className="flex gap-2">
                      <select
                        value={String(triggerConfig.operador ?? "gte")}
                        onChange={(e) => updateTriggerConfig("operador", e.target.value)}
                        className="flex-1 bg-surface rounded-lg px-3 py-2 text-xs text-fg appearance-none focus:outline-none"
                      >
                        <option value="gte">{t("reglas.op_mayor_igual")}</option>
                        <option value="lte">{t("reglas.op_menor_igual")}</option>
                        <option value="eq">{t("reglas.op_exactamente")}</option>
                      </select>
                      <input
                        type="number" min="0"
                        value={String(triggerConfig.importe ?? "")}
                        onChange={(e) => updateTriggerConfig("importe", e.target.value)}
                        placeholder="1000"
                        className="flex-1 bg-surface rounded-lg px-3 py-2 text-xs text-fg focus:outline-none"
                      />
                    </div>
                    <p className="text-[11px] text-fg-subtle">{t("reglas.config_importe_hint")}</p>
                  </div>
                )}

                {(triggerTipo === "transaccion_texto") && (
                  <div className="mt-3 bg-surface-2 rounded-xl p-3 space-y-1.5">
                    <p className="text-xs text-fg-muted font-medium">{t("reglas.config_texto_buscar")}</p>
                    <input
                      value={String(triggerConfig.texto ?? "")}
                      onChange={(e) => updateTriggerConfig("texto", e.target.value)}
                      placeholder={t("reglas.config_texto_placeholder")}
                      className="w-full bg-surface rounded-lg px-3 py-2 text-xs text-fg focus:outline-none"
                    />
                    <p className="text-[11px] text-fg-subtle">{t("reglas.config_texto_hint")}</p>
                  </div>
                )}

                {(triggerTipo === "fecha_periodica") && (
                  <div className="mt-3 bg-surface-2 rounded-xl p-3 space-y-1.5">
                    <p className="text-xs text-fg-muted font-medium">{t("reglas.config_periodo")}</p>
                    <select
                      value={String(triggerConfig.periodo ?? "mensual")}
                      onChange={(e) => updateTriggerConfig("periodo", e.target.value)}
                      className="w-full bg-surface rounded-lg px-3 py-2 text-xs text-fg appearance-none focus:outline-none"
                    >
                      <option value="diario">{t("reglas.periodo_diario")}</option>
                      <option value="semanal">{t("reglas.periodo_semanal")}</option>
                      <option value="mensual">{t("reglas.periodo_mensual")}</option>
                      <option value="anual">{t("reglas.periodo_anual")}</option>
                    </select>
                    <p className="text-[11px] text-fg-subtle">{t("reglas.config_periodo_hint")}</p>
                  </div>
                )}

                {(triggerTipo === "fecha_dia_mes") && (
                  <div className="mt-3 bg-surface-2 rounded-xl p-3 space-y-1.5">
                    <p className="text-xs text-fg-muted font-medium">{t("reglas.config_dia_num")}</p>
                    <input
                      type="number" min="1" max="28"
                      value={String(triggerConfig.dia ?? "")}
                      onChange={(e) => updateTriggerConfig("dia", e.target.value)}
                      placeholder="1 – 28"
                      className="w-full bg-surface rounded-lg px-3 py-2 text-xs text-fg focus:outline-none"
                    />
                    <p className="text-[11px] text-fg-subtle">{t("reglas.config_dia_hint")}</p>
                  </div>
                )}

                {(triggerTipo === "umbral_saldo" || triggerTipo === "objetivo_porcentaje" || triggerTipo === "presupuesto_porcentaje") && (
                  <div className="mt-3 bg-surface-2 rounded-xl p-3 space-y-2">
                    <p className="text-xs text-fg-muted font-medium">{t("reglas.config_umbral_operador")}</p>
                    <div className="flex gap-2">
                      <select
                        value={String(triggerConfig.operador ?? "gte")}
                        onChange={(e) => updateTriggerConfig("operador", e.target.value)}
                        className="flex-1 bg-surface rounded-lg px-3 py-2 text-xs text-fg appearance-none focus:outline-none"
                      >
                        <option value="gte">{t("reglas.op_supera")}</option>
                        <option value="lte">{t("reglas.op_cae_bajo")}</option>
                      </select>
                      <input
                        type="number" min="0"
                        value={String(triggerConfig.umbral ?? "")}
                        onChange={(e) => updateTriggerConfig("umbral", e.target.value)}
                        placeholder={triggerTipo === "umbral_saldo" ? "1000" : "80"}
                        className="flex-1 bg-surface rounded-lg px-3 py-2 text-xs text-fg focus:outline-none"
                      />
                    </div>
                    <p className="text-[11px] text-fg-subtle">
                      {triggerTipo === "umbral_saldo"
                        ? t("reglas.config_umbral_saldo_hint")
                        : t("reglas.config_umbral_pct_hint")}
                    </p>
                  </div>
                )}
              </div>

              {/* ── Condiciones ── */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-fg-muted font-semibold uppercase tracking-wide">{t("reglas.condiciones")}</p>
                  <button
                    type="button" onClick={addCondicion}
                    className="text-xs text-fg-muted bg-surface-2 rounded-lg px-2 py-1 hover:bg-ink hover:text-white transition-colors"
                  >
                    + {t("reglas.add_condicion")}
                  </button>
                </div>
                <p className="text-xs text-fg-subtle mb-2">{t("reglas.condiciones_help")}</p>

                {condiciones.length > 0 && (
                  <>
                    {/* Modo AND/OR */}
                    <div className="flex bg-surface-2 rounded-2xl p-1 gap-1 mb-3">
                      {(["AND", "OR"] as const).map((m) => (
                        <button
                          key={m} type="button" onClick={() => setModoCondiciones(m)}
                          className={clsx(
                            "flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all",
                            modoCondiciones === m ? "bg-ink text-white shadow" : "text-fg-muted"
                          )}
                        >
                          {m} — {m === "AND" ? t("reglas.modo_todas") : t("reglas.modo_alguna")}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-fg-subtle mb-3 px-1">
                      {modoCondiciones === "AND" ? t("reglas.modo_help_and") : t("reglas.modo_help_or")}
                    </p>
                    <p className="text-[11px] text-fg-subtle mb-2 px-1 italic">{t("reglas.operadores_leyenda")}</p>
                  </>
                )}

                <div className="space-y-3">
                  {condiciones.map((c) => (
                    <div key={c._id} className="space-y-1.5">
                      <div className="flex gap-1.5 items-center">
                        {/* Botón NOT */}
                        <button
                          type="button"
                          onClick={() => updateCondicion(c._id, "negado", !c.negado)}
                          title={t("reglas.not_tooltip")}
                          className={clsx(
                            "text-[10px] px-1.5 py-1 rounded-lg font-bold font-mono transition-colors flex-shrink-0",
                            c.negado ? "bg-[#FF5C5C] text-white" : "bg-surface-2 text-fg-muted"
                          )}
                        >
                          NO
                        </button>
                        <select
                          value={c.campo}
                          onChange={(e) => updateCondicion(c._id, "campo", e.target.value)}
                          className="flex-1 bg-surface-2 rounded-xl px-2 py-2 text-xs text-fg appearance-none focus:outline-none"
                        >
                          {Object.entries(CAMPO_LABEL).map(([k, label]) => (
                            <option key={k} value={k}>{label}</option>
                          ))}
                        </select>
                        <select
                          value={c.operador}
                          onChange={(e) => updateCondicion(c._id, "operador", e.target.value)}
                          className="bg-surface-2 rounded-xl px-2 py-2 text-xs text-fg appearance-none focus:outline-none"
                        >
                          <option value="eq">= {t("reglas.op_eq")}</option>
                          <option value="neq">≠ {t("reglas.op_neq")}</option>
                          <option value="gte">≥ {t("reglas.op_gte")}</option>
                          <option value="lte">≤ {t("reglas.op_lte")}</option>
                          <option value="contiene">~ {t("reglas.op_contiene")}</option>
                        </select>
                        <input
                          value={c.valor}
                          onChange={(e) => updateCondicion(c._id, "valor", e.target.value)}
                          placeholder={t("reglas.valor_placeholder")}
                          className="flex-1 bg-surface-2 rounded-xl px-2 py-2 text-xs text-fg focus:outline-none"
                        />
                        <button
                          type="button" onClick={() => removeCondicion(c._id)}
                          className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center hover:bg-[#FF5C5C] hover:text-white transition-colors flex-shrink-0"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 pl-1">
                        {c.negado && (
                          <span className="text-[10px] text-[#FF5C5C] font-semibold">{t("reglas.not_activo")}</span>
                        )}
                        {CAMPO_HINT[c.campo] && (
                          <p className="text-[11px] text-fg-subtle italic">{CAMPO_HINT[c.campo]}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {condiciones.length === 0 && (
                  <p className="text-xs text-fg-subtle italic px-1">{t("reglas.sin_condiciones_hint")}</p>
                )}
              </div>

              {/* ── Límite ejecuciones ── */}
              <div>
                <p className="text-xs text-fg-muted mb-1 font-semibold uppercase tracking-wide">{t("reglas.limite_ejecuciones")}</p>
                <p className="text-xs text-fg-subtle mb-2">{t("reglas.limite_help")}</p>
                <input
                  type="number" min="1" inputMode="numeric"
                  className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
                  value={maxEjecMes} onChange={(e) => setMaxEjecMes(e.target.value)}
                  placeholder={t("reglas.sin_limite")}
                />
              </div>

              {/* ── Acciones ── */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-fg-muted font-semibold uppercase tracking-wide">{t("reglas.acciones")}</p>
                  <button
                    type="button" onClick={addAccion}
                    className="text-xs text-fg-muted bg-surface-2 rounded-lg px-2 py-1 hover:bg-ink hover:text-white transition-colors"
                  >
                    + {t("reglas.add_accion")}
                  </button>
                </div>
                <p className="text-xs text-fg-subtle mb-2">{t("reglas.acciones_help")}</p>

                {acciones.length === 0 && (
                  <p className="text-xs text-fg-subtle italic px-1">{t("reglas.sin_acciones_hint")}</p>
                )}

                <div className="space-y-2">
                  {acciones.map((a, idx) => (
                    <div key={a._id} className="bg-surface-2 rounded-xl p-3 space-y-2">
                      {/* Orden + selector + eliminar */}
                      <div className="flex gap-1.5 items-center">
                        <span className="text-[10px] font-bold text-fg-subtle w-4 text-center flex-shrink-0">{idx + 1}</span>
                        <Zap size={12} className="text-[#5BAA1F] flex-shrink-0" />
                        <select
                          value={a.tipo}
                          onChange={(e) => updateAccion(a._id, "tipo", e.target.value)}
                          className="flex-1 bg-surface rounded-lg px-3 py-1.5 text-xs text-fg appearance-none focus:outline-none"
                        >
                          {ACCION_GROUPS.map((group) => (
                            <optgroup key={group.groupLabel} label={group.groupLabel}>
                              {group.tipos.map((tipo) => (
                                <option key={tipo} value={tipo}>{ACCION_LABEL[tipo]}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        <button
                          type="button" onClick={() => removeAccion(a._id)}
                          className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center hover:bg-[#FF5C5C] hover:text-white transition-colors flex-shrink-0"
                        >
                          <X size={12} />
                        </button>
                      </div>

                      {/* Descripción de la acción */}
                      {ACCION_DESC[a.tipo] && (
                        <p className="text-[11px] text-fg-muted pl-5">{ACCION_DESC[a.tipo]}</p>
                      )}

                      {/* Config extra por tipo */}
                      {a.tipo === "transferir_porcentaje" && (
                        <div className="pl-5 space-y-1">
                          <input
                            type="number" min="1" max="100"
                            value={String(a.porcentaje ?? "")}
                            onChange={(e) => updateAccion(a._id, "porcentaje", e.target.value)}
                            placeholder={t("reglas.porcentaje_placeholder")}
                            className="w-full bg-surface rounded-lg px-3 py-1.5 text-xs text-fg focus:outline-none"
                          />
                          <p className="text-[11px] text-fg-subtle">{t("reglas.porcentaje_help")}</p>
                        </div>
                      )}

                      {a.tipo === "transferir_porcentaje_saldo" && (
                        <div className="pl-5 space-y-1">
                          <input
                            type="number" min="1" max="100"
                            value={String(a.porcentaje ?? "")}
                            onChange={(e) => updateAccion(a._id, "porcentaje", e.target.value)}
                            placeholder={t("reglas.porcentaje_placeholder")}
                            className="w-full bg-surface rounded-lg px-3 py-1.5 text-xs text-fg focus:outline-none"
                          />
                          <p className="text-[11px] text-fg-subtle">{t("reglas.porcentaje_saldo_help")}</p>
                        </div>
                      )}

                      {a.tipo === "transferir_fijo" && (
                        <div className="pl-5 space-y-1">
                          <input
                            type="number" min="0"
                            value={String(a.importe ?? "")}
                            onChange={(e) => updateAccion(a._id, "importe", e.target.value)}
                            placeholder={t("reglas.importe_placeholder")}
                            className="w-full bg-surface rounded-lg px-3 py-1.5 text-xs text-fg focus:outline-none"
                          />
                          <p className="text-[11px] text-fg-subtle">{t("reglas.importe_fijo_help")}</p>
                        </div>
                      )}

                      {a.tipo === "anadir_etiqueta" && (
                        <div className="pl-5 space-y-1">
                          <input
                            value={String(a.etiqueta ?? "")}
                            onChange={(e) => updateAccion(a._id, "etiqueta", e.target.value)}
                            placeholder={t("reglas.etiqueta_placeholder")}
                            className="w-full bg-surface rounded-lg px-3 py-1.5 text-xs text-fg focus:outline-none"
                          />
                          <p className="text-[11px] text-fg-subtle">{t("reglas.etiqueta_help")}</p>
                        </div>
                      )}

                      {a.tipo === "notificar" && (
                        <div className="pl-5 space-y-1">
                          <input
                            value={String(a.mensaje ?? "")}
                            onChange={(e) => updateAccion(a._id, "mensaje", e.target.value)}
                            placeholder={t("reglas.mensaje_placeholder")}
                            className="w-full bg-surface rounded-lg px-3 py-1.5 text-xs text-fg focus:outline-none"
                          />
                          <p className="text-[11px] text-fg-subtle">{t("reglas.mensaje_help")}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Indicador de porcentaje total */}
                {totalPorcentaje > 0 && (
                  <div className={clsx(
                    "mt-3 rounded-xl p-3 flex items-start gap-2",
                    totalPorcentaje > 100 ? "bg-amber-50 text-amber-700" : "bg-surface-2 text-fg-muted"
                  )}>
                    {totalPorcentaje > 100
                      ? <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                      : <Zap size={14} className="flex-shrink-0 mt-0.5 text-[#5BAA1F]" />
                    }
                    <p className="text-xs">
                      {totalPorcentaje > 100
                        ? t("reglas.warn_porcentaje_total", { total: totalPorcentaje.toFixed(0) })
                        : t("reglas.info_porcentaje_total", { total: totalPorcentaje.toFixed(0), resto: (100 - totalPorcentaje).toFixed(0) })
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* ── Variables disponibles (colapsable) ── */}
              <div className="border border-surface-2 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowVariables((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <div>
                    <p className="text-xs font-semibold text-fg-muted">{t("reglas.variables_titulo")}</p>
                    <p className="text-[11px] text-fg-subtle">{t("reglas.variables_subtitulo")}</p>
                  </div>
                  {showVariables ? <ChevronUp size={14} className="text-fg-subtle" /> : <ChevronDown size={14} className="text-fg-subtle" />}
                </button>

                {showVariables && (
                  <div className="px-4 pb-4 space-y-2 border-t border-surface-2 pt-3">
                    {[
                      { v: "{{importe_disparador}}", d: t("reglas.var_importe") },
                      { v: "{{importe_disparador * 0.4}}", d: t("reglas.var_importe_calc") },
                      { v: "{{saldo(\"cuenta\")}}",   d: t("reglas.var_saldo") },
                      { v: "{{objetivo(\"meta\").restante}}", d: t("reglas.var_objetivo") },
                      { v: "{{suma_mes(\"categoria\")}}", d: t("reglas.var_suma_mes") },
                    ].map(({ v, d }) => (
                      <div key={v} className="flex items-start gap-2">
                        <code className="text-[10px] bg-surface rounded px-1.5 py-0.5 text-fg font-mono flex-shrink-0">{v}</code>
                        <p className="text-[11px] text-fg-muted">{d}</p>
                      </div>
                    ))}
                    <p className="text-[11px] text-fg-subtle italic pt-1">{t("reglas.variables_nota")}</p>
                  </div>
                )}
              </div>

              {/* ── Botones ── */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  className="flex-1 py-3.5 rounded-2xl bg-surface-2 text-fg font-semibold text-sm active:scale-95 transition-transform"
                  onClick={handleClose}
                >
                  {t("common.cancelar")}
                </button>
                <button
                  type="button"
                  className="flex-1 py-3.5 rounded-2xl bg-ink text-white font-semibold text-sm disabled:opacity-60 active:scale-95 transition-transform"
                  onClick={handleGuardar}
                  disabled={crearRegla.isPending}
                >
                  {crearRegla.isPending ? t("common.guardando") : t("reglas.crear")}
                </button>
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── ReglaCard ──────────────────────────────────────────────────────────────────

function ReglaCard({ regla }: { regla: ReglaOut }) {
  const { t } = useTranslation();
  const actualizar = useActualizarRegla();
  const archivar   = useArchivarRegla();

  const TRIGGER_LABEL: Record<string, string> = {
    transaccion_ingreso:      t("reglas.trigger_ingreso"),
    transaccion_gasto:        t("reglas.trigger_gasto"),
    transaccion_importe:      t("reglas.trigger_importe"),
    transaccion_texto:        t("reglas.trigger_texto"),
    transaccion_cuenta:       t("reglas.trigger_cuenta_especifica"),
    fecha_periodica:          t("reglas.trigger_periodico"),
    fecha_dia_mes:            t("reglas.trigger_dia_mes"),
    fecha_ultimo_dia_habil:   t("reglas.trigger_ultimo_dia"),
    umbral_saldo:             t("reglas.trigger_umbral_saldo"),
    objetivo_porcentaje:      t("reglas.trigger_objetivo_pct"),
    presupuesto_porcentaje:   t("reglas.trigger_presupuesto_pct"),
    manual:                   t("reglas.trigger_manual"),
    movimiento_creado:        t("reglas.trigger_crear"),
    fecha_calendario:         t("reglas.trigger_fecha"),
    umbral_presupuesto:       t("reglas.trigger_umbral_presupuesto"),
  };

  async function handleToggle() {
    try { await actualizar.mutateAsync({ id: regla.id, activa: !regla.activa }); }
    catch { showFlash(t("common.error"), "error"); }
  }

  async function handleArchivar() {
    try { await archivar.mutateAsync(regla.id); showFlash(t("reglas.eliminada"), "delete"); }
    catch { showFlash(t("common.error"), "error"); }
  }

  const acciones:    Array<Record<string, unknown>> = regla.acciones   ?? [];
  const condiciones: Array<Record<string, unknown>> = regla.condiciones ?? [];

  return (
    <div className={clsx("bg-surface rounded-2xl p-4 shadow-[var(--shadow-card)] transition-opacity", !regla.activa && "opacity-50")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Zap size={14} className={clsx(regla.activa ? "text-[#5BAA1F]" : "text-fg-muted")} />
            <span className="font-semibold text-fg text-sm truncate">{regla.nombre}</span>
          </div>
          {regla.descripcion && <p className="text-xs text-fg-muted mt-0.5 line-clamp-1">{regla.descripcion}</p>}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-2 text-fg-muted">
              {TRIGGER_LABEL[regla.trigger_tipo] ?? regla.trigger_tipo}
            </span>
            {condiciones.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-surface-2 text-fg-muted">
                {condiciones.length} {condiciones.length !== 1 ? t("reglas.condicion_pl") : t("reglas.condicion_sg")}
              </span>
            )}
            {acciones.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-surface-2 text-[#5BAA1F] font-medium">
                {acciones.length} {acciones.length !== 1 ? t("reglas.accion_pl") : t("reglas.accion_sg")}
              </span>
            )}
          </div>
          {regla.ultima_ejecucion && (
            <p className="text-xs text-fg-subtle mt-1">{t("reglas.ultima_ejecucion")}: {formatDate(regla.ultima_ejecucion)}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleToggle}
            className={clsx(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
              regla.activa ? "bg-surface-2 text-fg-muted hover:bg-amber-400 hover:text-white"
                           : "bg-surface-2 text-fg-muted hover:bg-[#5BAA1F] hover:text-white"
            )}
            title={regla.activa ? t("common.pausar") : t("common.reanudar")}
          >
            {regla.activa ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            onClick={handleArchivar}
            className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center hover:bg-[#FF5C5C] hover:text-white transition-colors"
            title={t("common.eliminar")}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reglas (main) ──────────────────────────────────────────────────────────────

export function Reglas() {
  const { t } = useTranslation();
  const { data: reglas = [], isLoading } = useReglas();
  const [showSheet, setShowSheet] = useState(false);

  const activas  = reglas.filter((r) =>  r.activa);
  const pausadas = reglas.filter((r) => !r.activa);

  return (
    <div className="min-h-full bg-app pb-24">
      <div className="pt-10 px-4 pb-4">
        <div className="bg-ink rounded-3xl px-5 py-4 flex items-center justify-between shadow-[var(--shadow-floating)]">
          <h1 className="text-white font-bold text-2xl">{t("nav.reglas")}</h1>
          <button
            onClick={() => setShowSheet(true)}
            className="w-9 h-9 rounded-full bg-[#C7FF6B] flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4 text-fg" />
          </button>
        </div>
      </div>

      <div className="px-4 max-w-2xl mx-auto space-y-3">
        {isLoading && (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="bg-surface rounded-2xl p-4 animate-pulse shadow-[var(--shadow-card)]">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && (
          <>
            {activas.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">{t("reglas.activas")}</p>
                <div className="space-y-2">{activas.map((r) => <ReglaCard key={r.id} regla={r} />)}</div>
              </section>
            )}
            {pausadas.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2 mt-2">{t("reglas.pausadas")}</p>
                <div className="space-y-2">{pausadas.map((r) => <ReglaCard key={r.id} regla={r} />)}</div>
              </section>
            )}
            {reglas.length === 0 && (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="w-16 h-16 rounded-2xl bg-surface shadow-[var(--shadow-card)] flex items-center justify-center mb-4">
                  <Zap className="w-8 h-8 text-fg-muted" />
                </div>
                <p className="font-bold text-fg mb-1">{t("reglas.sin_reglas")}</p>
                <p className="text-fg-muted text-sm">{t("reglas.sin_reglas_desc")}</p>
              </div>
            )}
            {reglas.length === 0 && <EjemploCard onCrear={() => setShowSheet(true)} />}
          </>
        )}
      </div>

      <NuevaReglaSheet open={showSheet} onClose={() => setShowSheet(false)} />
    </div>
  );
}
