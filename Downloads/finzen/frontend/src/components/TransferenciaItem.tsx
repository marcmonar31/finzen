import { useRef, useState } from "react";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, ArrowLeftRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Transferencia } from "@/types/api";
import { formatCurrency, formatDate } from "@/lib/format";
import Decimal from "decimal.js";

interface Props {
  transferencia: Transferencia;
  onDelete?: (t: Transferencia) => void;
}

const MAX_SWIPE = 88;
const TRIGGER   = 60;
const LOCK_PX   = 8;

function ConfirmDelete({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
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
          <p className="font-bold text-fg text-base text-center mb-1">
            {t("transferencias.eliminar_confirm")}
          </p>
          <p className="text-fg-muted text-sm text-center mb-6">
            {t("transferencias.eliminar_desc")}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3.5 rounded-2xl bg-surface-2 text-fg font-semibold text-sm active:scale-95 transition-transform"
            >
              {t("common.cancelar")}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3.5 rounded-2xl bg-[#FF5C5C] text-white font-semibold text-sm active:scale-95 transition-transform"
            >
              {t("common.si_eliminar")}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

export function TransferenciaItem({ transferencia: transf, onDelete }: Props) {
  const { t } = useTranslation();
  const orig = transf.movimiento_origen;
  const dest = transf.movimiento_destino;

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
    contentRef.current.style.transition = animated
      ? "transform 260ms cubic-bezier(0.25,0.46,0.45,0.94)"
      : "none";
    contentRef.current.style.transform = `translateX(${x}px)`;
  }

  function doDelete() {
    const wrap    = wrapRef.current;
    const content = contentRef.current;
    if (!wrap || !content) return;

    const h = wrap.offsetHeight;
    content.style.transition = "transform 200ms ease-in";
    content.style.transform  = "translateX(-110%)";

    setTimeout(() => {
      wrap.style.height         = `${h}px`;
      void wrap.offsetHeight;
      wrap.style.transition     = "height 200ms ease, border-top-width 200ms ease";
      wrap.style.height         = "0px";
      wrap.style.borderTopWidth = "0px";

      setTimeout(() => {
        setGone(true);
        onDelete?.(transf);
      }, 200);
    }, 200);
  }

  function onDown(e: React.PointerEvent) {
    startX.current = e.clientX;
    startY.current = e.clientY;
    currX.current  = 0;
    locked.current = null;
    if (contentRef.current) contentRef.current.style.transition = "none";
  }

  function onMove(e: React.PointerEvent) {
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    if (!locked.current) {
      if (Math.hypot(dx, dy) < LOCK_PX) return;
      locked.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      if (locked.current === "h") {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }
    }

    if (locked.current !== "h") return;

    let x = Math.min(dx, 0);
    if (Math.abs(x) > MAX_SWIPE) {
      x = -(MAX_SWIPE + (Math.abs(x) - MAX_SWIPE) * 0.15);
    }
    currX.current = x;
    if (contentRef.current) {
      contentRef.current.style.transform = `translateX(${x}px)`;
    }
  }

  function onUp() {
    if (locked.current !== "h") { locked.current = null; return; }
    locked.current = null;

    const x = currX.current;
    if (x <= -TRIGGER) {
      translate(0, true);
      setTimeout(() => setShowConfirm(true), 60);
    } else {
      translate(0, true);
    }
  }

  function onCancel() {
    locked.current = null;
    translate(0, true);
  }

  if (gone) return null;

  return (
    <>
      <div ref={wrapRef} className="relative overflow-hidden">

        {/* Delete background — solo en móvil */}
        {!isDesktop && (
          <div className="absolute inset-y-0 right-0 w-1/2 flex items-center justify-end pr-5 bg-[#FF5C5C]">
            <div className="flex flex-col items-center gap-0.5">
              <Trash2 className="w-5 h-5 text-white" />
              <span className="text-[10px] font-bold text-white uppercase tracking-wide">{t("common.eliminar")}</span>
            </div>
          </div>
        )}

        {/* Swipeable content row */}
        <div
          ref={contentRef}
          className="relative z-10 flex items-center gap-3 py-3 px-4 bg-surface"
          style={{ touchAction: "pan-y", WebkitUserSelect: "none", userSelect: "none" }}
          onPointerDown={isDesktop ? undefined : onDown}
          onPointerMove={isDesktop ? undefined : onMove}
          onPointerUp={isDesktop ? undefined : onUp}
          onPointerCancel={isDesktop ? undefined : onCancel}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center flex-shrink-0 pointer-events-none">
            <ArrowLeftRight className="w-5 h-5 text-fg-muted" />
          </div>

          <div className="flex-1 min-w-0 pointer-events-none">
            <p className="font-semibold text-fg text-sm truncate">
              {orig?.cuenta_nombre && dest?.cuenta_nombre
                ? `${orig.cuenta_nombre} → ${dest.cuenta_nombre}`
                : (orig?.concepto ?? t("movimientos.transferencia"))}
            </p>
            <p className="text-xs text-fg-muted truncate">
              {formatDate(orig?.fecha ?? transf.creado_en.slice(0, 10))}
            </p>
          </div>

          <div className="text-right flex-shrink-0 pointer-events-none">
            {orig && (
              <p className="font-bold text-sm tabular-nums text-fg-muted">
                {formatCurrency(new Decimal(orig.importe).abs().toString(), orig.moneda)}
              </p>
            )}
            {dest && orig && orig.moneda !== dest.moneda && (
              <p className="text-xs text-fg-subtle tabular-nums">
                → {formatCurrency(new Decimal(dest.importe).abs().toString(), dest.moneda)}
              </p>
            )}
          </div>

          {/* Botón inline — solo en escritorio */}
          {isDesktop && (
            <div className="ml-2">
              <button
                onClick={() => setShowConfirm(true)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-fg-muted hover:text-[#FF5C5C] hover:bg-surface-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {showConfirm && (
        <ConfirmDelete
          onConfirm={() => { setShowConfirm(false); doDelete(); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}
