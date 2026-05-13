import { useRef, useState } from "react";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/format";
import type { Presupuesto } from "@/types/api";

interface Props {
  presupuesto: Presupuesto;
  onEdit?:   (p: Presupuesto) => void;
  onDelete?: (p: Presupuesto) => void;
}

const MAX_SWIPE = 88;
const TRIGGER   = 60;
const LOCK_PX   = 8;

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
          <p className="font-bold text-fg text-base text-center mb-1">{t("presupuestos.eliminar_confirm")}</p>
          <p className="text-fg-muted text-sm text-center mb-6">"{nombre}" {t("presupuestos.eliminado_desc")}</p>
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

export function PresupuestoItem({ presupuesto: p, onEdit, onDelete }: Props) {
  const { t } = useTranslation();
  const { consumido, restante, porcentaje, alerta } = p.estado;
  const pct = Math.min(porcentaje, 100);

  const barColor  = alerta === "superado" ? "bg-[#FF5C5C]" : alerta === "advertencia" ? "bg-amber-400" : "bg-[#5BAA1F]";
  const textColor = alerta === "superado" ? "text-[#FF5C5C]" : alerta === "advertencia" ? "text-amber-500" : "text-[#5BAA1F]";

  const periodLabel: Record<string, string> = {
    mensual: t("presupuestos.periodo_mes"),
    semanal: t("presupuestos.periodo_semana"),
    trimestral: t("presupuestos.periodo_trimestre"),
    anual: t("presupuestos.periodo_anio"),
  };

  const isDesktop = useIsDesktop();

  const wrapRef    = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const startX     = useRef(0);
  const startY     = useRef(0);
  const currX      = useRef(0);
  const locked     = useRef<"h" | "v" | null>(null);

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
      setTimeout(() => { setGone(true); onDelete?.(p); }, 200);
    }, 200);
  }

  function onDown(e: React.PointerEvent) {
    startX.current = e.clientX; startY.current = e.clientY; currX.current = 0; locked.current = null;
    if (contentRef.current) contentRef.current.style.transition = "none";
  }

  function onMove(e: React.PointerEvent) {
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
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
    if (locked.current !== "h") { locked.current = null; return; }
    locked.current = null;
    const x = currX.current;
    if (x >= TRIGGER) {
      translate(0, true);
      setTimeout(() => onEdit?.(p), 220);
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
            <div className="absolute inset-y-0 left-0 w-1/2 flex items-center pl-5 bg-ink rounded-l-2xl">
              <div className="flex flex-col items-center gap-0.5">
                <Pencil className="w-5 h-5 text-[#C7FF6B]" />
                <span className="text-[10px] font-bold text-[#C7FF6B] uppercase tracking-wide">{t("common.editar")}</span>
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

        {/* Swipeable card content */}
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
            <div className="pointer-events-none">
              <p className="font-semibold text-fg text-sm">{p.nombre}</p>
              <p className="text-xs text-fg-muted">
                {formatCurrency(p.importe, p.moneda)} / {periodLabel[p.periodo] ?? p.periodo}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {isDesktop && (
                <>
                  <button
                    type="button"
                    onClick={() => onEdit?.(p)}
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
                <p className={clsx("font-bold text-sm tabular-nums", textColor)}>
                  {porcentaje.toFixed(0)}%
                </p>
                {alerta === "superado" && (
                  <p className="text-xs text-[#FF5C5C] font-medium">{t("presupuestos.superado")}</p>
                )}
              </div>
            </div>
          </div>

          <div className="h-2 bg-surface-2 rounded-full overflow-hidden mb-2 pointer-events-none">
            <div
              className={clsx("h-full rounded-full transition-all duration-500", barColor)}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="flex justify-between text-xs text-fg-muted pointer-events-none">
            <span>
              {t("presupuestos.gastado")} <span className="font-medium text-fg">{formatCurrency(consumido, p.moneda)}</span>
            </span>
            <span>
              {parseFloat(restante) >= 0 ? (
                <>{t("presupuestos.restante_label")} <span className="font-medium text-fg">{formatCurrency(restante, p.moneda)}</span></>
              ) : (
                <span className="text-[#FF5C5C] font-medium">
                  +{formatCurrency(Math.abs(parseFloat(restante)).toString(), p.moneda)} {t("presupuestos.extra")}
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {showConfirm && (
        <ConfirmDelete
          nombre={p.nombre}
          onConfirm={() => { setShowConfirm(false); doDelete(); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}
