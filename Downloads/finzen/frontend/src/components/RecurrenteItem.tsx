import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Pause, Play, Pencil, Trash2, ArrowDownLeft, ArrowUpRight, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Recurrente } from "@/types/api";
import { useUsuarioStore } from "@/stores/usuario";

interface Props {
  recurrente: Recurrente;
  onEdit?:   (r: Recurrente) => void;
  onToggle?: (r: Recurrente) => void;
  onDelete?: (r: Recurrente) => void;
}

const TIPO_ICON: Record<string, React.ReactNode> = {
  ingreso: <ArrowDownLeft className="w-5 h-5 text-fg-muted" />,
  gasto:   <ArrowUpRight  className="w-5 h-5 text-fg-muted" />,
};

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
          <p className="font-bold text-fg text-base text-center mb-1">{t("recurrentes.eliminar_confirm")}</p>
          <p className="text-fg-muted text-sm text-center mb-6">"{nombre}" {t("recurrentes.eliminado_desc")}</p>
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

export function RecurrenteItem({ recurrente: r, onEdit, onToggle, onDelete }: Props) {
  const { t } = useTranslation();
  const discreto = useUsuarioStore((s) => s.usuario?.ocultar_importes ?? false);

  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const wrapRef    = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const startX     = useRef(0);
  const startY     = useRef(0);
  const currX      = useRef(0);
  const locked     = useRef<"h" | "v" | null>(null);
  const moved      = useRef(false);

  const frecuenciaLabel: Record<string, string> = {
    diario:         t("recurrentes.freq_dia"),
    semanal:        t("recurrentes.freq_semana"),
    cada_4_semanas: t("recurrentes.freq_4semanas"),
    mensual:        t("recurrentes.freq_mes"),
    anual:          t("recurrentes.freq_anio"),
  };

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
      setTimeout(() => { setGone(true); onDelete?.(r); }, 200);
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
      if (!moved.current) onEdit?.(r);
      locked.current = null;
      return;
    }
    locked.current = null;
    const x = currX.current;
    if (x >= TRIGGER) {
      translate(0, true);
      setTimeout(() => onToggle?.(r), 220);
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
            <div className={clsx(
              "absolute inset-y-0 left-0 w-1/2 flex items-center pl-5 rounded-l-2xl",
              r.activo ? "bg-amber-400" : "bg-[#5BAA1F]"
            )}>
              <div className="flex flex-col items-center gap-0.5">
                {r.activo
                  ? <Pause className="w-5 h-5 text-white" />
                  : <Play  className="w-5 h-5 text-white" />
                }
                <span className="text-[10px] font-bold text-white uppercase tracking-wide">
                  {r.activo ? t("common.pausar") : t("common.reanudar")}
                </span>
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
          className="relative z-10 bg-surface rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{ touchAction: "pan-y", WebkitUserSelect: "none", userSelect: "none" }}
          onPointerDown={isDesktop ? undefined : onDown}
          onPointerMove={isDesktop ? undefined : onMove}
          onPointerUp={isDesktop ? undefined : onUp}
          onPointerCancel={isDesktop ? undefined : onCancel}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center flex-shrink-0 pointer-events-none">
            {TIPO_ICON[r.tipo] ?? <RefreshCw className="w-5 h-5 text-fg-muted" />}
          </div>
          <div className="flex-1 min-w-0 pointer-events-none">
            <p className="font-semibold text-fg text-sm truncate">{r.nombre}</p>
            <p className="text-xs text-fg-muted">
              {frecuenciaLabel[r.frecuencia] ?? r.frecuencia} · {t("recurrentes.proximo")}: {formatDate(r.proxima_ejecucion)}
            </p>
          </div>
          <p className={clsx(
            "font-bold text-sm tabular-nums flex-shrink-0 pointer-events-none",
            r.tipo === "ingreso" ? "text-[#5BAA1F]" : "text-fg"
          )}>
            {discreto ? "••••" : `${r.tipo === "ingreso" ? "+" : "-"}${formatCurrency(r.importe, r.moneda)}`}
          </p>

          {/* Botones inline — solo en escritorio */}
          {isDesktop && (
            <div className="flex items-center gap-1 ml-1">
              <button
                type="button"
                onClick={() => onToggle?.(r)}
                className={clsx(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                  r.activo
                    ? "bg-surface-2 text-fg-muted hover:bg-amber-400 hover:text-white"
                    : "bg-surface-2 text-fg-muted hover:bg-[#5BAA1F] hover:text-white"
                )}
              >
                {r.activo ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => onEdit?.(r)}
                className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center hover:bg-ink hover:text-white transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center hover:bg-[#FF5C5C] hover:text-white transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {showConfirm && (
        <ConfirmDelete
          nombre={r.nombre}
          onConfirm={() => { setShowConfirm(false); doDelete(); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}
