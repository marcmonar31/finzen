import { useEffect, useRef, useState } from "react";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Target, ChevronDown, PiggyBank, Pencil, Trash2 } from "lucide-react";
import { AppIcon, ICON_LIST, ICON_MAP } from "@/components/AppIcon";
import { showFlash } from "@/stores/flash";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { useObjetivos, useCrearObjetivo, useActualizarObjetivo, useArchivarObjetivo, useAportar } from "@/hooks/useObjetivos";
import { useCuentas } from "@/hooks/useCuentas";
import { useWorkspaceStore } from "@/stores/workspace";
import type { ObjetivoOut } from "@/types/api";
import { formatCurrency, formatDate } from "@/lib/format";

// ── Constants ────────────────────────────────────────────────────────────────
const MAX_SWIPE = 88;
const TRIGGER   = 60;
const LOCK_PX   = 8;

// ── ConfirmDelete portal ──────────────────────────────────────────────────────
function ConfirmDelete({ nombre, onConfirm, onCancel }: { nombre: string; onConfirm: () => void; onCancel: () => void }) {
  const { t } = useTranslation();
  return createPortal(
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1001] flex items-end"
        style={{ background: "rgba(0,0,0,0.45)" }}
        onClick={onCancel}
      >
        <motion.div
          key="sheet"
          initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="w-full bg-surface rounded-t-3xl p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-10 h-1 bg-border-ui rounded-full mx-auto mb-5" />
          <p className="font-bold text-fg text-base text-center mb-1">{t("objetivos.eliminar_confirm")}</p>
          <p className="text-fg-muted text-sm text-center mb-6">"{nombre}" {t("objetivos.eliminado_desc")}</p>
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 py-3.5 rounded-2xl bg-surface-2 text-fg font-semibold text-sm active:scale-95 transition-transform">
              {t("common.cancelar")}
            </button>
            <button onClick={onConfirm} className="flex-1 py-3.5 rounded-2xl bg-[#FF5C5C] text-white font-semibold text-sm active:scale-95 transition-transform">
              {t("common.si_eliminar")}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// ── AportarSheet ──────────────────────────────────────────────────────────────
function AportarSheet({ objetivo, onClose }: { objetivo: ObjetivoOut; onClose: () => void }) {
  const { t } = useTranslation();
  const aportar  = useAportar(objetivo.id);
  const { data: cuentas = [] } = useCuentas();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const [importe,  setImporte]  = useState("");
  const [cuentaId, setCuentaId] = useState("");
  const [concepto, setConcepto] = useState("");

  async function handleAportar() {
    const imp = parseFloat(importe);
    if (!imp || imp <= 0) { showFlash(t("objetivos.importe_invalido"), "error"); return; }
    if (!cuentaId) { showFlash(t("objetivos.cuenta_requerida"), "error"); return; }
    const cuenta = cuentas.find((c) => c.id === cuentaId);
    try {
      await aportar.mutateAsync({
        importe:   imp.toFixed(2),
        moneda:    cuenta?.moneda ?? workspace?.moneda_base ?? "EUR",
        fecha:     new Date().toISOString().split("T")[0],
        cuenta_id: cuentaId,
        concepto:  concepto.trim() || undefined,
      });
      showFlash(t("objetivos.aportacion_registrada"));
      onClose();
    } catch {
      showFlash(t("common.error"), "error");
    }
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20 backdrop-blur-md z-[900] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          key="sheet"
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ type: "spring", damping: 28, stiffness: 380 }}
          className="w-full max-w-md bg-surface rounded-3xl p-6 shadow-[var(--shadow-floating)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-fg text-base flex items-center gap-1.5">
                {t("objetivos.aportar_a")} <AppIcon name={objetivo.emoji} size={16} className="text-fg-muted" /> {objetivo.nombre}
              </h2>
              <p className="text-xs text-fg-muted mt-0.5">
                {t("objetivos.falta_label")} {formatCurrency(objetivo.falta, objetivo.moneda)}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <input
              type="number" inputMode="decimal" placeholder="0,00"
              className="w-full bg-surface-2 rounded-xl px-4 py-3 text-3xl font-bold text-fg text-center focus:outline-none"
              value={importe} onChange={(e) => setImporte(e.target.value)}
            />
            <div className="relative">
              <select
                value={cuentaId}
                onChange={(e) => setCuentaId(e.target.value)}
                className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg appearance-none focus:outline-none pr-9"
              >
                <option value="">{t("objetivos.desde_cuenta")}</option>
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.moneda})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle pointer-events-none" />
            </div>
            <input
              placeholder={t("objetivos.nota_opcional")}
              className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
              value={concepto} onChange={(e) => setConcepto(e.target.value)}
            />
          </div>
          <div className="flex gap-3 mt-5">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 rounded-2xl bg-surface-2 text-fg font-semibold text-sm active:scale-95 transition-transform"
            >
              {t("common.cancelar")}
            </button>
            <button
              onClick={handleAportar}
              disabled={aportar.isPending}
              className="flex-1 py-3.5 rounded-2xl bg-ink text-white font-semibold text-sm disabled:opacity-60 active:scale-95 transition-transform"
            >
              {aportar.isPending ? t("common.guardando") : t("objetivos.aportar")}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// ── ObjetivoSheet (crear / editar) ────────────────────────────────────────────
function ObjetivoSheet({ onClose, objetivo }: { onClose: () => void; objetivo?: ObjetivoOut | null }) {
  const { t } = useTranslation();
  const crear     = useCrearObjetivo();
  const actualizar = useActualizarObjetivo();
  const workspace  = useWorkspaceStore((s) => s.workspace);
  const moneda     = workspace?.moneda_base ?? "EUR";
  const editando   = !!objetivo;

  const [nombre,  setNombre]  = useState("");
  const [icono,   setIcono]   = useState("target");
  const [importe, setImporte] = useState("");
  const [fecha,   setFecha]   = useState("");

  useEffect(() => {
    if (objetivo) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setNombre(objetivo.nombre);
      setIcono(objetivo.emoji && ICON_MAP[objetivo.emoji] ? objetivo.emoji : "target");
      setImporte(String(parseFloat(objetivo.importe_objetivo)));
      setFecha(objetivo.fecha_objetivo ? String(objetivo.fecha_objetivo) : "");
    } else {
      setNombre(""); setIcono("target"); setImporte(""); setFecha("");
    }
  }, [objetivo]);

  async function handleGuardar() {
    if (!nombre.trim() || !importe) { showFlash(t("objetivos.nombre_importe_req"), "error"); return; }
    try {
      if (editando && objetivo) {
        await actualizar.mutateAsync({
          id: objetivo.id,
          nombre: nombre.trim(),
          emoji: icono,
          importe_objetivo: parseFloat(importe).toFixed(2),
          fecha_objetivo: fecha || null,
        });
        showFlash(t("objetivos.actualizado"));
      } else {
        await crear.mutateAsync({
          nombre: nombre.trim(), emoji: icono,
          importe_objetivo: parseFloat(importe).toFixed(2),
          moneda,
          fecha_objetivo: fecha || null,
        });
        showFlash(t("objetivos.creado"));
      }
      onClose();
    } catch { showFlash(t("common.error"), "error"); }
  }

  const isPending = crear.isPending || actualizar.isPending;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20 backdrop-blur-md z-[900] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          key="sheet"
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ type: "spring", damping: 28, stiffness: 380 }}
          className="w-full max-w-md bg-surface rounded-3xl p-6 shadow-[var(--shadow-floating)]"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="font-bold text-fg text-lg mb-4">
            {editando ? t("objetivos.editar") : t("objetivos.nuevo")}
          </h2>
          <div className="space-y-3">
            {/* Nombre */}
            <input
              className="w-full px-4 py-3 rounded-xl bg-surface-2 text-sm text-fg focus:outline-none"
              placeholder={t("objetivos.nombre_placeholder")}
              value={nombre} onChange={(e) => setNombre(e.target.value)}
            />
            {/* Icono */}
            <div>
              <p className="text-xs text-fg-muted mb-2 font-medium">{t("objetivos.icono")}</p>
              <div className="grid grid-cols-7 gap-1.5">
                {ICON_LIST.map((key) => {
                  const Icon = ICON_MAP[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setIcono(key)}
                      className={clsx(
                        "w-full aspect-square rounded-xl flex items-center justify-center transition-colors",
                        icono === key ? "bg-ink text-white" : "bg-surface-2 text-fg-muted hover:bg-surface-3"
                      )}
                    >
                      <Icon size={18} />
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Importe */}
            <input
              type="number" inputMode="decimal" placeholder="0,00"
              className="w-full px-4 py-3 rounded-xl bg-surface-2 text-sm text-fg focus:outline-none"
              value={importe} onChange={(e) => setImporte(e.target.value)}
            />
            {/* Fecha límite */}
            <div>
              <p className="text-xs text-fg-muted mb-1 font-medium">{t("objetivos.fecha_limite_op")}</p>
              <div className="overflow-hidden">
                <input
                  type="date"
                  className="w-full max-w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
                  value={fecha} onChange={(e) => setFecha(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 rounded-2xl bg-surface-2 text-fg font-semibold text-sm active:scale-95 transition-transform"
            >
              {t("common.cancelar")}
            </button>
            <button
              onClick={handleGuardar}
              disabled={isPending}
              className="flex-1 py-3.5 rounded-2xl bg-ink text-white font-semibold text-sm disabled:opacity-60 active:scale-95 transition-transform"
            >
              {isPending ? t("common.guardando") : editando ? t("common.guardar_cambios") : t("common.crear")}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// ── ObjetivoItem ──────────────────────────────────────────────────────────────
function ObjetivoItem({
  objetivo, onEdit, onAportar, onDelete,
}: {
  objetivo: ObjetivoOut;
  onEdit:    (o: ObjetivoOut) => void;
  onAportar: (o: ObjetivoOut) => void;
  onDelete:  (o: ObjetivoOut) => void;
}) {
  const { t } = useTranslation();
  const pct      = objetivo.porcentaje;
  const barColor = pct >= 100 ? "bg-[#5BAA1F]" : pct >= 60 ? "bg-[#5BAA1F]" : "bg-ink";

  const isDesktop = useIsDesktop();

  const wrapRef    = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const startX     = useRef(0);
  const startY     = useRef(0);
  const currX      = useRef(0);
  const locked     = useRef<"h" | "v" | null>(null);
  const moved      = useRef(false);

  const [gone,        setGone]        = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  function translate(x: number, animated = false) {
    if (!contentRef.current) return;
    contentRef.current.style.transition = animated ? "transform 260ms cubic-bezier(0.25,0.46,0.45,0.94)" : "none";
    contentRef.current.style.transform  = `translateX(${x}px)`;
  }

  function doDelete() {
    const wrap = wrapRef.current; const content = contentRef.current;
    if (!wrap || !content) return;
    const h = wrap.offsetHeight;
    content.style.transition = "transform 200ms ease-in";
    content.style.transform  = "translateX(-110%)";
    setTimeout(() => {
      wrap.style.height = `${h}px`; void wrap.offsetHeight;
      wrap.style.transition = "height 200ms ease"; wrap.style.height = "0px";
      setTimeout(() => { setGone(true); onDelete(objetivo); }, 200);
    }, 200);
  }

  function onDown(e: React.PointerEvent) {
    startX.current = e.clientX; startY.current = e.clientY; currX.current = 0;
    locked.current = null; moved.current = false;
    if (contentRef.current) contentRef.current.style.transition = "none";
  }

  function onMove(e: React.PointerEvent) {
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (Math.hypot(dx, dy) >= LOCK_PX) moved.current = true;
    if (!locked.current) {
      if (Math.hypot(dx, dy) < LOCK_PX) return;
      locked.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      if (locked.current === "h") (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    if (locked.current !== "h") return;
    let x = dx;
    if (Math.abs(x) > MAX_SWIPE) x = Math.sign(x) * (MAX_SWIPE + (Math.abs(x) - MAX_SWIPE) * 0.15);
    currX.current = x;
    if (contentRef.current) contentRef.current.style.transform = `translateX(${x}px)`;
  }

  function onUp() {
    if (locked.current !== "h") {
      if (!moved.current) onEdit(objetivo);
      locked.current = null;
      return;
    }
    locked.current = null;
    const x = currX.current;
    if (x >= TRIGGER) {
      translate(0, true);
      setTimeout(() => onAportar(objetivo), 220);
    } else if (x <= -TRIGGER) {
      translate(0, true);
      setTimeout(() => setShowConfirm(true), 60);
    } else {
      translate(0, true);
    }
  }

  function onCancel() { locked.current = null; translate(0, true); }

  if (gone) return null;

  return (
    <>
      <div ref={wrapRef} className="relative overflow-hidden rounded-2xl shadow-[var(--shadow-card)]">

        {/* Swipe backgrounds — solo en móvil */}
        {!isDesktop && (
          <>
            <div className="absolute inset-y-0 left-0 w-1/2 flex items-center pl-5 bg-[#5BAA1F] rounded-l-2xl">
              <div className="flex flex-col items-center gap-0.5">
                <PiggyBank className="w-5 h-5 text-white" />
                <span className="text-[10px] font-bold text-white uppercase tracking-wide">{t("objetivos.aportar")}</span>
              </div>
            </div>
            <div className="absolute inset-y-0 right-0 w-1/2 flex items-center justify-end pr-5 bg-[#FF5C5C] rounded-r-2xl">
              <div className="flex flex-col items-center gap-0.5">
                <Trash2 className="w-5 h-5 text-white" />
                <span className="text-[10px] font-bold text-white uppercase tracking-wide">{t("common.eliminar")}</span>
              </div>
            </div>
          </>
        )}

        {/* Card content */}
        <div
          ref={contentRef}
          className="relative z-10 bg-surface rounded-2xl p-4"
          style={{ touchAction: "pan-y", WebkitUserSelect: "none", userSelect: "none" }}
          onPointerDown={isDesktop ? undefined : onDown}
          onPointerMove={isDesktop ? undefined : onMove}
          onPointerUp={isDesktop ? undefined : onUp}
          onPointerCancel={isDesktop ? undefined : onCancel}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 pointer-events-none">
              <div className="w-9 h-9 rounded-xl bg-surface-2 flex items-center justify-center flex-shrink-0">
                <AppIcon name={objetivo.emoji} size={18} className="text-fg-muted" />
              </div>
              <div>
                <p className="font-semibold text-fg text-sm">{objetivo.nombre}</p>
                {objetivo.fecha_objetivo && (
                  <p className="text-xs text-fg-muted">
                    {t("objetivos.limite")}: {formatDate(objetivo.fecha_objetivo)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {isDesktop && (
                <>
                  <button
                    type="button"
                    onClick={() => onAportar(objetivo)}
                    className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center hover:bg-[#5BAA1F] hover:text-white transition-colors"
                  >
                    <PiggyBank className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(objetivo)}
                    className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center hover:bg-ink hover:text-white transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirm(true)}
                    className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center hover:bg-[#FF5C5C] hover:text-white transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <div className="text-right pointer-events-none ml-1">
                <p className="font-bold text-sm text-fg tabular-nums">{pct.toFixed(0)}%</p>
                {pct >= 100 && <p className="text-xs text-[#5BAA1F] font-semibold">{t("objetivos.completado")}</p>}
              </div>
            </div>
          </div>

          <div className="h-2 bg-surface-2 rounded-full overflow-hidden mb-2 pointer-events-none">
            <div
              className={clsx("h-full rounded-full transition-all duration-500", barColor)}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>

          <div className="flex justify-between text-xs text-fg-muted pointer-events-none">
            <span>
              {t("objetivos.aportado_label")} <span className="font-medium text-fg">{formatCurrency(objetivo.importe_aportado, objetivo.moneda)}</span>
            </span>
            <span>
              {t("objetivos.meta")} <span className="font-medium text-fg">{formatCurrency(objetivo.importe_objetivo, objetivo.moneda)}</span>
            </span>
          </div>
        </div>
      </div>

      {showConfirm && (
        <ConfirmDelete
          nombre={objetivo.nombre}
          onConfirm={() => { setShowConfirm(false); doDelete(); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}

// ── Objetivos page ────────────────────────────────────────────────────────────
export function Objetivos() {
  const { t } = useTranslation();
  const { data: objetivos = [], isLoading } = useObjetivos();
  const archivar = useArchivarObjetivo();
  const [showNuevo, setShowNuevo] = useState(false);
  const [editando,  setEditando]  = useState<ObjetivoOut | null>(null);
  const [aportando, setAportando] = useState<ObjetivoOut | null>(null);

  const activos    = objetivos.filter((o) => o.activo && o.porcentaje < 100);
  const completados = objetivos.filter((o) => o.porcentaje >= 100);

  async function handleDelete(o: ObjetivoOut) {
    try {
      await archivar.mutateAsync(o.id);
      showFlash(t("objetivos.eliminado"), "delete");
    } catch {
      showFlash(t("common.error"), "error");
    }
  }

  return (
    <div className="min-h-full bg-app pb-24">
      {/* Header — píldora flotante */}
      <div className="pt-10 px-4 pb-4">
        <div className="bg-ink rounded-3xl px-5 py-4 flex items-center justify-between shadow-[var(--shadow-floating)]">
          <h1 className="text-white font-bold text-2xl">{t("nav.objetivos")}</h1>
          <button
            onClick={() => setShowNuevo(true)}
            className="w-9 h-9 rounded-full bg-[#C7FF6B] flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4 text-fg" />
          </button>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-surface rounded-2xl p-4 animate-pulse shadow-[var(--shadow-card)]">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
                <div className="h-2 bg-gray-100 rounded-full mb-2" />
                <div className="flex justify-between">
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && objetivos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface shadow-[var(--shadow-card)] flex items-center justify-center mb-4">
              <Target className="w-8 h-8 text-fg-muted" />
            </div>
            <p className="font-bold text-fg mb-1">{t("objetivos.sin_objetivos")}</p>
            <p className="text-fg-muted text-sm mb-5">{t("objetivos.ahorra")}</p>
            <button
              onClick={() => setShowNuevo(true)}
              className="bg-ink text-white rounded-full px-6 py-2.5 text-sm font-semibold"
            >
              {t("objetivos.crear")}
            </button>
          </div>
        )}

        {activos.length > 0 && (
          <div className="space-y-2">
            {activos.map((o) => (
              <ObjetivoItem
                key={o.id}
                objetivo={o}
                onEdit={setEditando}
                onAportar={setAportando}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {completados.length > 0 && (
          <div className="pt-2">
            <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">{t("objetivos.completados")}</p>
            <div className="space-y-2 opacity-60">
              {completados.map((o) => (
                <ObjetivoItem
                  key={o.id}
                  objetivo={o}
                  onEdit={setEditando}
                  onAportar={setAportando}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sheets */}
      {(showNuevo || !!editando) && (
        <ObjetivoSheet
          objetivo={editando}
          onClose={() => { setShowNuevo(false); setEditando(null); }}
        />
      )}
      {aportando && (
        <AportarSheet objetivo={aportando} onClose={() => setAportando(null)} />
      )}
    </div>
  );
}
