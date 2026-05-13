import { useRef, useState } from "react";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2, ArrowLeftRight, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { AppIcon } from "@/components/AppIcon";
import { useTranslation } from "react-i18next";
import type { Movimiento } from "@/types/api";
import { formatCurrency } from "@/lib/format";
import Decimal from "decimal.js";
import { clsx } from "clsx";
import { useUsuarioStore } from "@/stores/usuario";

interface Props {
  movimiento: Movimiento;
  monedaBase?: string;
  onEdit?: (m: Movimiento) => void;
  onDelete?: (m: Movimiento) => void;
}

const TIPO_SIGNO: Record<string, 1 | -1> = {
  ingreso: 1,
  transferencia_destino: 1,
  gasto: -1,
  transferencia_origen: -1,
  ajuste: 1,
};

const MAX_SWIPE = 88;
const TRIGGER   = 60;
const LOCK_PX   = 8;

function esTransferencia(tipo: string) {
  return tipo === "transferencia_origen" || tipo === "transferencia_destino";
}

// ── Confirm delete sheet (portal) ─────────────────────────────────────────────
function ConfirmDelete({
  concepto,
  onConfirm,
  onCancel,
}: {
  concepto: string;
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
            {t("movimientos.eliminar_confirm")}
          </p>
          <p className="text-fg-muted text-sm text-center mb-6">
            "{concepto}" {t("movimientos.eliminar_desc")}
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

// ── Main component ─────────────────────────────────────────────────────────────
export function MovimientoItem({ movimiento: m, monedaBase, onEdit, onDelete }: Props) {
  const { t } = useTranslation();
  const discreto    = useUsuarioStore((s) => s.usuario?.ocultar_importes ?? false);
  const positivo    = (TIPO_SIGNO[m.tipo] ?? 1) > 0;
  const importe     = new Decimal(m.importe);
  const importeBase = new Decimal(m.importe_base);
  const signo       = positivo ? "+" : "-";
  const esTrans     = esTransferencia(m.tipo);
  const muestraBase = monedaBase && monedaBase !== m.moneda;

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
        onDelete?.(m);
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

    let x = dx;
    if (Math.abs(x) > MAX_SWIPE) {
      x = Math.sign(x) * (MAX_SWIPE + (Math.abs(x) - MAX_SWIPE) * 0.15);
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
    if (x >= TRIGGER) {
      translate(0, true);
      setTimeout(() => onEdit?.(m), 220);
    } else if (x <= -TRIGGER) {
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

        {/* Swipe backgrounds — solo en móvil */}
        {!isDesktop && (
          <>
            <div className="absolute inset-y-0 left-0 w-1/2 flex items-center pl-5 bg-ink">
              <div className="flex flex-col items-center gap-0.5">
                <Pencil className="w-5 h-5 text-[#C7FF6B]" />
                <span className="text-[10px] font-bold text-[#C7FF6B] uppercase tracking-wide">{t("common.editar")}</span>
              </div>
            </div>
            <div className="absolute inset-y-0 right-0 w-1/2 flex items-center justify-end pr-5 bg-[#FF5C5C]">
              <div className="flex flex-col items-center gap-0.5">
                <Trash2 className="w-5 h-5 text-white" />
                <span className="text-[10px] font-bold text-white uppercase tracking-wide">{t("common.eliminar")}</span>
              </div>
            </div>
          </>
        )}

        {/* Fila del movimiento */}
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
          {/* Icono */}
          <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center flex-shrink-0 pointer-events-none">
            {esTrans
              ? <ArrowLeftRight className="w-5 h-5 text-fg-muted" />
              : <AppIcon name={m.categoria_emoji} size={20} className="text-fg-muted"
                  fallback={positivo ? ArrowDownLeft : ArrowUpRight} />
            }
          </div>

          {/* Texto */}
          <div className="flex-1 min-w-0 pointer-events-none">
            <p className="font-semibold text-fg text-sm truncate">
              {esTrans
                ? (m.cuenta_nombre && m.cuenta_contraparte_nombre
                    ? `${m.cuenta_nombre} → ${m.cuenta_contraparte_nombre}`
                    : m.concepto)
                : m.concepto}
            </p>
            <p className="text-xs text-fg-muted truncate">
              {esTrans
                ? t("movimientos.transferencia")
                : [m.cuenta_nombre, m.categoria_nombre].filter(Boolean).join(" · ") || m.tipo}
            </p>
          </div>

          {/* Importe */}
          <div className="text-right flex-shrink-0 pointer-events-none">
            <p className={clsx(
              "font-bold text-sm tabular-nums",
              esTrans ? "text-fg-muted" : (positivo ? "text-[#5BAA1F]" : "text-[#FF5C5C]")
            )}>
              {discreto ? "••••" : `${signo}${formatCurrency(importe.abs().toString(), m.moneda)}`}
            </p>
            {muestraBase && !discreto ? (
              <p className="text-xs text-fg-subtle">
                ≈ {formatCurrency(importeBase.abs().toString(), monedaBase)}
              </p>
            ) : (
              <p className="text-xs text-fg-subtle">
                {m.fecha.slice(8, 10)}/{m.fecha.slice(5, 7)}
              </p>
            )}
          </div>

          {/* Botones inline — solo en escritorio, visibles al hacer hover */}
          {isDesktop && (
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => onEdit?.(m)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-fg-muted hover:text-fg hover:bg-surface-2 transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
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
          concepto={m.concepto}
          onConfirm={() => { setShowConfirm(false); doDelete(); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}
