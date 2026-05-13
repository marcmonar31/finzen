import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Receipt, ArrowRight, CheckCircle, X, AlertCircle, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useGrupo, useGastosGrupo, useBalanceGrupo, useCrearGasto,
  useRegistrarLiquidacion, useConfirmarLiquidacion, useLiquidacionesGrupo,
  useActualizarGrupo, useEliminarGrupo, useSalirGrupo,
} from "@/hooks/useGrupos";
import { useUsuarioStore } from "@/stores/usuario";
import { formatCurrency, formatDate } from "@/lib/format";
import { clsx } from "clsx";
import { showFlash } from "@/stores/flash";
import { AppIcon, ICON_LIST, ICON_MAP } from "@/components/AppIcon";
import Decimal from "decimal.js";

interface Props {
  grupoId: string;
  onBack: () => void;
}

function GrupoIcon({ value, size = 22, className }: { value?: string | null; size?: number; className?: string }) {
  if (!value) return <Receipt size={size} className={className ?? "text-white/80"} />;
  if (ICON_MAP[value]) return <AppIcon name={value} size={size} className={className ?? "text-white/80"} />;
  return <span className="text-2xl leading-none">{value}</span>;
}

// ── NuevoGastoModal ────────────────────────────────────────────────────────────

function NuevoGastoModal({ open, onClose, grupoId }: { open: boolean; onClose: () => void; grupoId: string }) {
  const { t } = useTranslation();
  const { data: grupo } = useGrupo(grupoId);
  const crearGasto = useCrearGasto();

  const [concepto,  setConcepto]  = useState("");
  const [importe,   setImporte]   = useState("");
  const [fecha,     setFecha]     = useState(new Date().toISOString().slice(0, 10));
  const [pagadorId, setPagadorId] = useState("");

  function handleClose() {
    setConcepto(""); setImporte(""); setPagadorId("");
    setFecha(new Date().toISOString().slice(0, 10));
    onClose();
  }

  async function handleCrear() {
    if (!concepto || !importe || !pagadorId || !grupo) return;
    const todosIds = grupo.miembros.filter((m) => m.activo).map((m) => m.id);
    try {
      await crearGasto.mutateAsync({
        grupo_id: grupoId, concepto, importe,
        moneda: grupo.moneda_principal, fecha, pagador_id: pagadorId,
        modo_reparto: "igualitario", miembro_ids: todosIds,
      });
      showFlash(t("grupo_detalle.gasto_anadido"));
      handleClose();
    } catch (e: unknown) {
      showFlash(e instanceof Error ? e.message : t("common.error"), "error");
    }
  }

  const miembrosActivos = grupo?.miembros.filter((m) => m.activo) ?? [];
  const importeNum = parseFloat(importe.replace(",", ".")) || 0;
  const porPersona = miembrosActivos.length > 0 && importeNum > 0
    ? new Decimal(importeNum).div(miembrosActivos.length)
    : null;

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
            className="w-full max-w-sm bg-surface rounded-3xl shadow-[var(--shadow-floating)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg text-fg">{t("grupo_detalle.nuevo_gasto")}</h2>
                <button type="button" onClick={handleClose} className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
                  <X className="w-4 h-4 text-fg" />
                </button>
              </div>

              {/* Importe grande + preview reparto */}
              <div className="text-center bg-surface-2 rounded-2xl py-4">
                <input
                  type="number"
                  value={importe}
                  onChange={(e) => setImporte(e.target.value)}
                  placeholder="0,00"
                  inputMode="decimal"
                  className="w-full text-center text-4xl font-bold text-fg bg-transparent focus:outline-none"
                  autoFocus
                />
                {porPersona ? (
                  <p className="text-xs text-[#5BAA1F] font-medium mt-1">
                    ÷ {miembrosActivos.length} {t("grupo_detalle.personas")} = {formatCurrency(porPersona.toFixed(2), grupo?.moneda_principal ?? "EUR")} {t("grupo_detalle.cada_uno")}
                  </p>
                ) : (
                  <p className="text-xs text-fg-muted mt-1">{grupo?.moneda_principal}</p>
                )}
              </div>

              {/* Concepto */}
              <input
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder={t("common.concepto")}
                className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
              />

              {/* ¿Quién pagó? */}
              <div>
                <p className="text-xs text-fg-muted mb-2 font-semibold uppercase tracking-wide">{t("grupo_detalle.quien_pago")}</p>
                <div className="space-y-1.5">
                  {miembrosActivos.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPagadorId(m.id)}
                      className={clsx(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left",
                        pagadorId === m.id ? "bg-ink text-white" : "bg-surface-2 text-fg"
                      )}
                    >
                      <div className={clsx(
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                        pagadorId === m.id ? "bg-white/10 text-white" : "bg-surface text-fg-muted"
                      )}>
                        {m.nombre_display.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="font-semibold text-sm">{m.nombre_display}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fecha */}
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
              />

              {/* Botones */}
              <div className="flex gap-3">
                <button type="button" onClick={handleClose}
                  className="flex-1 py-3 rounded-2xl bg-surface-2 text-fg font-semibold text-sm">
                  {t("common.cancelar")}
                </button>
                <button type="button" onClick={handleCrear}
                  disabled={!concepto || !importe || !pagadorId || crearGasto.isPending}
                  className="flex-1 py-3 rounded-2xl bg-ink text-white font-semibold text-sm disabled:opacity-60">
                  {crearGasto.isPending ? t("grupo_detalle.anadiendo") : t("grupo_detalle.anadir_gasto")}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── SaldarModal ────────────────────────────────────────────────────────────────

function SaldarModal({ open, onClose, grupoId }: { open: boolean; onClose: () => void; grupoId: string }) {
  const { t } = useTranslation();
  const { data: grupo } = useGrupo(grupoId);
  const { data: balanceData } = useBalanceGrupo(grupoId);
  const registrarLiq = useRegistrarLiquidacion();
  const [registrandoTodas, setRegistrandoTodas] = useState(false);

  const moneda = grupo?.moneda_principal ?? "EUR";

  const miembroNombre = (mid: string) =>
    grupo?.miembros.find((m) => m.id === mid)?.nombre_display ?? "?";

  async function handleRegistrarTodas() {
    if (!balanceData) return;
    setRegistrandoTodas(true);
    try {
      for (const transf of balanceData.transferencias_optimas) {
        await registrarLiq.mutateAsync({
          grupo_id: grupoId,
          de_miembro_id: transf.de as string,
          a_miembro_id:  transf.a  as string,
          importe: new Decimal(transf.importe.toString()).toFixed(2),
          moneda,
        });
      }
      showFlash(t("grupo_detalle.liquidaciones_registradas"));
      onClose();
    } catch {
      showFlash(t("common.error"), "error");
    } finally {
      setRegistrandoTodas(false);
    }
  }

  const transferencias = balanceData?.transferencias_optimas ?? [];

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
            className="w-full max-w-sm bg-surface rounded-3xl shadow-[var(--shadow-floating)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg text-fg">{t("grupo_detalle.saldar_titulo")}</h2>
                <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
                  <X className="w-4 h-4 text-fg" />
                </button>
              </div>

              {transferencias.length === 0 ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <CheckCircle size={44} className="text-[#5BAA1F]" />
                  <p className="text-center text-[#5BAA1F] font-semibold">{t("grupo_detalle.todos_a_cero")}</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-fg-muted">{t("grupo_detalle.saldar_desc")}</p>
                  <div className="space-y-2">
                    {transferencias.map((transf, i) => (
                      <div key={i} className="bg-surface-2 rounded-2xl px-4 py-3 flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-surface flex items-center justify-center text-xs font-bold text-fg-muted flex-shrink-0">
                          {miembroNombre(transf.de as string).slice(0, 1).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-fg flex-1 truncate">{miembroNombre(transf.de as string)}</span>
                        <ArrowRight size={14} className="text-fg-muted flex-shrink-0" />
                        <span className="text-sm font-semibold text-fg flex-1 text-right truncate">{miembroNombre(transf.a as string)}</span>
                        <span className="font-bold text-fg tabular-nums text-sm ml-1 flex-shrink-0">
                          {formatCurrency(new Decimal(transf.importe.toString()).toFixed(2), moneda)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-fg-subtle text-center">{t("grupo_detalle.registrar_liquidacion")}</p>
                  <button
                    type="button"
                    onClick={handleRegistrarTodas}
                    disabled={registrandoTodas}
                    className="w-full bg-ink text-white rounded-2xl py-3 font-semibold text-sm disabled:opacity-60 active:scale-95 transition-transform"
                  >
                    {registrandoTodas
                      ? t("common.guardando")
                      : transferencias.length === 1
                        ? t("grupo_detalle.registrar_primera")
                        : t("grupo_detalle.registrar_todas", { n: transferencias.length })}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── EditarGrupoModal ───────────────────────────────────────────────────────────

function EditarGrupoModal({ open, onClose, grupoId, onDeleted }: {
  open: boolean;
  onClose: () => void;
  grupoId: string;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const { data: grupo } = useGrupo(grupoId);
  const usuario = useUsuarioStore((s) => s.usuario);
  const actualizar = useActualizarGrupo();
  const eliminar = useEliminarGrupo();
  const salir = useSalirGrupo();

  const [nombre,          setNombre]          = useState("");
  const [icon,            setIcon]            = useState("handshake");
  const [confirmDestruc,  setConfirmDestruc]  = useState(false);

  useEffect(() => {
    if (grupo && open) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setNombre(grupo.nombre);
      setIcon(grupo.emoji ?? "handshake");
      setConfirmDestruc(false);
    }
  }, [grupo, open]);

  function handleClose() { setConfirmDestruc(false); onClose(); }

  const esCreador = grupo?.creado_por === usuario?.id;

  async function handleGuardar() {
    if (!nombre.trim()) return;
    try {
      await actualizar.mutateAsync({ id: grupoId, data: { nombre: nombre.trim(), emoji: icon } });
      showFlash(t("grupos.editado"));
      handleClose();
    } catch (e: unknown) {
      showFlash(e instanceof Error ? e.message : t("common.error"), "error");
    }
  }

  async function handleSalir() {
    try {
      await salir.mutateAsync(grupoId);
      showFlash(t("grupos.salido"));
      handleClose();
      onDeleted();
    } catch (e: unknown) {
      showFlash(e instanceof Error ? e.message : t("common.error"), "error");
    }
  }

  async function handleEliminar() {
    try {
      await eliminar.mutateAsync(grupoId);
      showFlash(t("grupos.eliminado"));
      handleClose();
      onDeleted();
    } catch (e: unknown) {
      showFlash(e instanceof Error ? e.message : t("common.error"), "error");
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

              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg text-fg">{t("grupos.editar_grupo")}</h2>
                <button type="button" onClick={handleClose} className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
                  <X className="w-4 h-4 text-fg" />
                </button>
              </div>

              {/* Nombre */}
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder={t("grupos.nombre_placeholder")}
                className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
              />

              {/* Icon picker */}
              <div>
                <p className="text-xs text-fg-muted mb-2 font-semibold uppercase tracking-wide">{t("common.icono")}</p>
                <div className="grid grid-cols-6 gap-2 max-h-[168px] overflow-y-auto">
                  {ICON_LIST.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setIcon(key)}
                      className={`h-10 rounded-xl flex items-center justify-center transition-all ${icon === key ? "bg-ink ring-2 ring-ink ring-offset-1" : "bg-surface-2"}`}
                    >
                      <AppIcon name={key} size={18} className={icon === key ? "text-white" : "text-fg-muted"} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Save */}
              <div className="flex gap-3">
                <button type="button" onClick={handleClose}
                  className="flex-1 py-3.5 rounded-2xl bg-surface-2 text-fg font-semibold text-sm">
                  {t("common.cancelar")}
                </button>
                <button type="button" onClick={handleGuardar}
                  disabled={!nombre.trim() || actualizar.isPending}
                  className="flex-1 py-3.5 rounded-2xl bg-ink text-white font-semibold text-sm disabled:opacity-60 active:scale-95 transition-transform">
                  {actualizar.isPending ? t("common.guardando") : t("common.guardar")}
                </button>
              </div>

              {/* Danger zone */}
              <div className="border-t border-[var(--color-border-ui,#E8E8EA)] pt-4">
                {!confirmDestruc ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDestruc(true)}
                    className="w-full py-3 rounded-2xl bg-red-50 text-red-500 font-semibold text-sm active:scale-95 transition-transform"
                  >
                    {esCreador ? t("grupos.eliminar_grupo") : t("grupos.salir_grupo")}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-center text-fg-muted px-2">
                      {esCreador ? t("grupos.eliminar_aviso") : t("grupos.salir_aviso")}
                    </p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setConfirmDestruc(false)}
                        className="flex-1 py-3 rounded-2xl bg-surface-2 text-fg font-semibold text-sm">
                        {t("common.cancelar")}
                      </button>
                      <button
                        type="button"
                        onClick={esCreador ? handleEliminar : handleSalir}
                        disabled={eliminar.isPending || salir.isPending}
                        className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-semibold text-sm disabled:opacity-60 active:scale-95 transition-transform"
                      >
                        {(eliminar.isPending || salir.isPending)
                          ? t("common.cargando")
                          : esCreador ? t("grupos.confirmar_eliminar") : t("grupos.confirmar_salir")}
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── GrupoDetalle (main) ────────────────────────────────────────────────────────

export function GrupoDetalle({ grupoId, onBack }: Props) {
  const { t } = useTranslation();
  const { data: grupo } = useGrupo(grupoId);
  const { data: gastos = [] } = useGastosGrupo(grupoId);
  const { data: balanceData } = useBalanceGrupo(grupoId);
  const { data: liquidaciones = [] } = useLiquidacionesGrupo(grupoId);
  const usuario = useUsuarioStore((s) => s.usuario);
  const confirmarLiq = useConfirmarLiquidacion();

  const [showNuevoGasto, setShowNuevoGasto] = useState(false);
  const [showSaldar,     setShowSaldar]     = useState(false);
  const [showEditar,     setShowEditar]     = useState(false);

  if (!grupo) {
    return (
      <div className="min-h-full bg-app flex items-center justify-center">
        <p className="text-fg-muted text-sm">{t("common.cargando")}</p>
      </div>
    );
  }

  const moneda      = grupo.moneda_principal;
  const miActivoId  = grupo.miembros.find((m) => m.usuario_id === usuario?.id)?.id;
  const miBalance   = miActivoId && balanceData?.balance
    ? new Decimal(balanceData.balance[miActivoId] ?? "0")
    : new Decimal("0");

  const todosSaldados = balanceData?.transferencias_optimas.length === 0;

  const totalGastado = gastos.reduce(
    (sum, g) => sum.add(new Decimal(g.importe_convertido || g.importe)),
    new Decimal("0")
  );

  const miembroNombre = (mid: string) =>
    grupo.miembros.find((m) => m.id === mid)?.nombre_display ?? "?";

  async function handleConfirmarLiq(liq_id: string) {
    try {
      await confirmarLiq.mutateAsync({ grupo_id: grupoId, liq_id });
      showFlash(t("grupo_detalle.liquidacion_confirmada"));
    } catch { showFlash(t("common.error"), "error"); }
  }

  const liquidacionesPendientes = liquidaciones.filter((l) => l.estado === "pendiente");

  const gastosOrdenados = [...gastos].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );

  const balanceLabel = miBalance.gt(0)
    ? t("grupo_detalle.te_deben")
    : miBalance.lt(0)
      ? t("grupo_detalle.debes")
      : t("grupo_detalle.en_paz");

  return (
    <div className="min-h-full bg-app pb-24">

      {/* ── Header ── */}
      <div className="pt-10 px-4 pb-4">
        <div className="bg-ink rounded-3xl px-5 pt-4 pb-5 shadow-[var(--shadow-floating)]">

          {/* Nav row */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={onBack} className="flex items-center gap-1.5 text-white/60 hover:text-white/80 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">{t("nav.grupos")}</span>
            </button>
            <button
              onClick={() => setShowEditar(true)}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center active:scale-95 transition-transform"
            >
              <Settings size={14} className="text-white/70" />
            </button>
          </div>

          {/* Grupo info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <GrupoIcon value={grupo.emoji} size={22} className="text-white/80" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-bold text-xl truncate">{grupo.nombre}</h1>
              <p className="text-white/50 text-xs">
                {grupo.miembros.filter((m) => m.activo).length} {t("grupos.miembros")} · {grupo.es_cuenta_real ? t("grupo_detalle.cuenta_real") : t("grupo_detalle.solo_gastos")}
              </p>
            </div>
          </div>

          {/* Balance + total */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/10 rounded-2xl px-4 py-3">
              <p className="text-white/50 text-[11px] mb-0.5">{t("grupo_detalle.tu_balance")}</p>
              <p className={clsx(
                "text-xl font-bold tabular-nums",
                miBalance.gt(0) ? "text-[#C7FF6B]" : miBalance.lt(0) ? "text-red-400" : "text-white"
              )}>
                {miBalance.gte(0) ? "+" : ""}{formatCurrency(miBalance.abs().toFixed(2), moneda)}
              </p>
              <p className={clsx(
                "text-[10px] font-medium mt-0.5",
                miBalance.gt(0) ? "text-[#C7FF6B]/70" : miBalance.lt(0) ? "text-red-400/70" : "text-white/40"
              )}>
                {balanceLabel}
              </p>
            </div>
            <div className="bg-white/10 rounded-2xl px-4 py-3">
              <p className="text-white/50 text-[11px] mb-0.5">{t("grupo_detalle.total_gastado")}</p>
              <p className="text-xl font-bold tabular-nums text-white">
                {formatCurrency(totalGastado.toFixed(2), moneda)}
              </p>
              <p className="text-[10px] text-white/40 mt-0.5">
                {gastos.length} {gastos.length === 1 ? t("grupo_detalle.gasto_sg") : t("grupo_detalle.gasto_pl")}
              </p>
            </div>
          </div>

        </div>
      </div>

      <div className="px-4 pt-0 space-y-4 max-w-2xl mx-auto">

        {/* ── Acciones ── */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowNuevoGasto(true)}
            className="flex-1 bg-ink text-white rounded-2xl py-3 font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4" />
            {t("grupo_detalle.anadir_gasto")}
          </button>
          <button
            onClick={() => setShowSaldar(true)}
            disabled={todosSaldados}
            className="flex-1 bg-surface text-fg rounded-2xl py-3 font-semibold text-sm shadow-[var(--shadow-card)] active:scale-95 transition-transform disabled:opacity-40"
          >
            {todosSaldados ? t("grupo_detalle.todos_saldados") : t("grupo_detalle.saldar_deudas")}
          </button>
        </div>

        {/* ── Miembros y balances ── */}
        <section>
          <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">{t("grupo_detalle.miembros")}</p>
          <div className="bg-surface rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
            {grupo.miembros.filter((m) => m.activo).map((m, i, arr) => {
              const bal = balanceData?.balance
                ? new Decimal(balanceData.balance[m.id] ?? "0")
                : new Decimal("0");
              const esSelf = m.id === miActivoId;
              return (
                <div
                  key={m.id}
                  className={`flex items-center gap-3 px-4 py-3 ${i < arr.length - 1 ? "border-b border-[var(--color-border-ui,#E8E8EA)]" : ""}`}
                >
                  <div className={clsx(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                    esSelf ? "bg-ink text-white" : "bg-surface-2 text-fg-muted"
                  )}>
                    {m.nombre_display.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-fg text-sm truncate">
                      {m.nombre_display}
                      {esSelf && <span className="ml-1.5 text-[10px] text-fg-subtle font-normal">(tú)</span>}
                    </p>
                  </div>
                  <p className={clsx(
                    "text-sm font-bold tabular-nums flex-shrink-0",
                    bal.gt(0) ? "text-[#5BAA1F]" : bal.lt(0) ? "text-red-500" : "text-fg-muted"
                  )}>
                    {bal.gte(0) ? "+" : ""}{formatCurrency(bal.abs().toFixed(2), moneda)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Liquidaciones pendientes ── */}
        {liquidacionesPendientes.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider">{t("grupo_detalle.liquidaciones")}</p>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-600 rounded-full px-2 py-0.5">
                {liquidacionesPendientes.length}
              </span>
            </div>
            <div className="bg-surface rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
              {liquidacionesPendientes.map((l, i) => {
                const meDebes    = l.de_miembro_id === miActivoId;
                const meDebenAMi = l.a_miembro_id  === miActivoId;
                const meAfecta   = meDebes || meDebenAMi;
                return (
                  <div
                    key={l.id}
                    className={clsx(
                      "flex items-center gap-3 px-4 py-3",
                      i < liquidacionesPendientes.length - 1 ? "border-b border-[var(--color-border-ui,#E8E8EA)]" : "",
                      meAfecta && "bg-amber-50/50"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={clsx("text-sm font-semibold", meDebes ? "text-red-500" : "text-fg")}>
                          {miembroNombre(l.de_miembro_id)}
                        </span>
                        <ArrowRight size={12} className="text-fg-muted flex-shrink-0" />
                        <span className={clsx("text-sm font-semibold", meDebenAMi ? "text-[#5BAA1F]" : "text-fg")}>
                          {miembroNombre(l.a_miembro_id)}
                        </span>
                      </div>
                      <p className="text-xs text-fg-muted mt-0.5">
                        {formatCurrency(l.importe, l.moneda)}
                        {meDebes    && <span className="ml-1.5 text-red-500 font-medium">{t("grupo_detalle.debes_pagar")}</span>}
                        {meDebenAMi && <span className="ml-1.5 text-[#5BAA1F] font-medium">{t("grupo_detalle.te_van_a_pagar")}</span>}
                      </p>
                    </div>
                    {meDebenAMi && (
                      <button
                        onClick={() => handleConfirmarLiq(l.id)}
                        disabled={confirmarLiq.isPending}
                        className="bg-ink text-white text-xs px-3 py-1.5 rounded-full font-semibold active:scale-95 transition-transform flex-shrink-0 disabled:opacity-60"
                      >
                        {t("grupo_detalle.confirmar")}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Historial de gastos ── */}
        <section>
          <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">{t("grupo_detalle.historial")}</p>

          {gastosOrdenados.length === 0 ? (
            <div className="bg-surface rounded-2xl shadow-[var(--shadow-card)] flex flex-col items-center py-10 gap-2">
              <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center">
                <Receipt size={18} className="text-fg-muted" />
              </div>
              <p className="text-sm text-fg-muted">{t("grupo_detalle.sin_gastos")}</p>
              <button
                onClick={() => setShowNuevoGasto(true)}
                className="text-xs font-semibold text-fg-muted underline underline-offset-2 mt-1"
              >
                {t("grupo_detalle.anadir_primero")}
              </button>
            </div>
          ) : (
            <div className="bg-surface rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
              {gastosOrdenados.map((g, i) => {
                const esPagador = g.pagador_id === miActivoId;
                return (
                  <div
                    key={g.id}
                    className={`flex items-center gap-3 px-4 py-3 ${i < gastosOrdenados.length - 1 ? "border-b border-[var(--color-border-ui,#E8E8EA)]" : ""}`}
                  >
                    <div className={clsx(
                      "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                      esPagador ? "bg-[#C7FF6B]/20" : "bg-surface-2"
                    )}>
                      <Receipt size={18} className={esPagador ? "text-fg" : "text-fg-muted"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-fg text-sm truncate">{g.concepto}</p>
                      <p className="text-xs text-fg-muted">
                        {esPagador ? t("grupo_detalle.pagaste") : `${t("grupo_detalle.pago")} ${miembroNombre(g.pagador_id)}`}
                        {" · "}{formatDate(g.fecha)}
                      </p>
                    </div>
                    <p className="font-bold text-sm tabular-nums text-fg flex-shrink-0">
                      {formatCurrency(g.importe, g.moneda)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Aviso grupo cerrado */}
        {grupo.cerrado_en && (
          <div className="flex items-center gap-2 bg-surface rounded-2xl px-4 py-3 shadow-[var(--shadow-card)]">
            <AlertCircle size={16} className="text-fg-muted flex-shrink-0" />
            <p className="text-xs text-fg-muted">{t("grupo_detalle.cerrado_aviso")}</p>
          </div>
        )}

      </div>

      <NuevoGastoModal open={showNuevoGasto} onClose={() => setShowNuevoGasto(false)} grupoId={grupoId} />
      <SaldarModal    open={showSaldar}      onClose={() => setShowSaldar(false)}     grupoId={grupoId} />
      <EditarGrupoModal
        open={showEditar}
        onClose={() => setShowEditar(false)}
        grupoId={grupoId}
        onDeleted={onBack}
      />
    </div>
  );
}
