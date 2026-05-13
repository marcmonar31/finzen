import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import type { Cuenta } from "@/types/api";
import { formatCurrency } from "@/lib/format";
import { useUsuarioStore } from "@/stores/usuario";

interface Props {
  cuenta: Cuenta;
  onEdit:   (c: Cuenta) => void;
  onDelete: (c: Cuenta) => void;
}

const TIPO_LABEL: Record<string, string> = {
  efectivo: "Efectivo", corriente: "Corriente", ahorro: "Ahorro",
  tarjeta_credito: "Tarjeta crédito", inversion: "Inversión",
  cripto: "Cripto", prestamo: "Préstamo", hipoteca: "Hipoteca", otro: "Otro",
};

const MAX_SWIPE = 88;
const TRIGGER   = 60;
const LOCK_PX   = 8;

// ── Confirm delete sheet ──────────────────────────────────────────────────────
function ConfirmDelete({
  cuenta,
  onConfirm,
  onCancel,
}: {
  cuenta: Cuenta;
  onConfirm: () => void;
  onCancel:  () => void;
}) {
  const n = cuenta.num_movimientos;
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
          <p className="font-bold text-fg text-base text-center mb-2">
            ¿Eliminar {cuenta.emoji ?? "🏦"} {cuenta.nombre}?
          </p>
          <p className="text-fg-muted text-sm text-center mb-6 leading-relaxed">
            {n > 0
              ? `Esta cuenta tiene ${n} movimiento${n !== 1 ? "s" : ""} que también quedarán archivados. Esta acción no se puede deshacer desde la app.`
              : "La cuenta quedará archivada. Esta acción no se puede deshacer desde la app."
            }
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3.5 rounded-2xl bg-surface-2 text-fg font-semibold text-sm active:scale-95 transition-transform"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3.5 rounded-2xl bg-[#FF5C5C] text-white font-semibold text-sm active:scale-95 transition-transform"
            >
              Sí, eliminar todo
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function CuentaItem({ cuenta, onEdit, onDelete }: Props) {
  const discreto = useUsuarioStore((s) => s.usuario?.ocultar_importes ?? false);
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
      setTimeout(() => { setGone(true); onDelete(cuenta); }, 200);
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
      setTimeout(() => onEdit(cuenta), 220);
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
        {/* Edit bg — left half */}
        <div className="absolute inset-y-0 left-0 w-1/2 flex items-center pl-5 bg-ink rounded-l-2xl">
          <div className="flex flex-col items-center gap-0.5">
            <Pencil className="w-5 h-5 text-[#C7FF6B]" />
            <span className="text-[10px] font-bold text-[#C7FF6B] uppercase tracking-wide">Editar</span>
          </div>
        </div>

        {/* Delete bg — right half */}
        <div className="absolute inset-y-0 right-0 w-1/2 flex items-center justify-end pr-5 bg-[#FF5C5C] rounded-r-2xl">
          <div className="flex flex-col items-center gap-0.5">
            <Trash2 className="w-5 h-5 text-white" />
            <span className="text-[10px] font-bold text-white uppercase tracking-wide">Eliminar</span>
          </div>
        </div>

        {/* Swipeable content */}
        <div
          ref={contentRef}
          className="relative z-10 bg-surface rounded-2xl p-5 flex items-center gap-3"
          style={{ touchAction: "pan-y", WebkitUserSelect: "none", userSelect: "none" }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onCancel}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 pointer-events-none"
            style={{ backgroundColor: cuenta.color ? `${cuenta.color}22` : "#F2F2F4" }}
          >
            {cuenta.emoji ?? "🏦"}
          </div>
          <div className="flex-1 min-w-0 pointer-events-none">
            <p className="font-semibold text-fg truncate">{cuenta.nombre}</p>
            <p className="text-xs text-fg-muted">{TIPO_LABEL[cuenta.tipo] ?? cuenta.tipo}</p>
          </div>
          <div className="text-right flex-shrink-0 pointer-events-none">
            <p className={clsx(
              "font-bold tabular-nums",
              cuenta.saldo && parseFloat(cuenta.saldo) >= 0 ? "text-fg" : "text-[#FF5C5C]"
            )}>
              {discreto ? "••••" : (cuenta.saldo != null ? formatCurrency(cuenta.saldo, cuenta.moneda) : "—")}
            </p>
            <p className="text-xs text-fg-subtle">{cuenta.moneda}</p>
          </div>
        </div>
      </div>

      {showConfirm && (
        <ConfirmDelete
          cuenta={cuenta}
          onConfirm={() => { setShowConfirm(false); doDelete(); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}
