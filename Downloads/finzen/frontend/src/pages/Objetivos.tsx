import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Target, ChevronDown, PiggyBank, Pencil, Trash2 } from "lucide-react";
import { showFlash } from "@/stores/flash";
import { clsx } from "clsx";
import { useObjetivos, useCrearObjetivo, useActualizarObjetivo, useArchivarObjetivo, useAportar } from "@/hooks/useObjetivos";
import { useCuentas } from "@/hooks/useCuentas";
import { useWorkspaceStore } from "@/stores/workspace";
import type { ObjetivoOut } from "@/types/api";
import { formatCurrency } from "@/lib/format";

// ── Constants ────────────────────────────────────────────────────────────────
const MAX_SWIPE = 88;
const TRIGGER   = 60;
const LOCK_PX   = 8;

// ── ConfirmDelete portal ──────────────────────────────────────────────────────
function ConfirmDelete({ nombre, onConfirm, onCancel }: { nombre: string; onConfirm: () => void; onCancel: () => void }) {
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
          <p className="font-bold text-fg text-base text-center mb-1">¿Eliminar este objetivo?</p>
          <p className="text-fg-muted text-sm text-center mb-6">"{nombre}" se archivará definitivamente.</p>
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 py-3.5 rounded-2xl bg-surface-2 text-fg font-semibold text-sm active:scale-95 transition-transform">
              Cancelar
            </button>
            <button onClick={onConfirm} className="flex-1 py-3.5 rounded-2xl bg-[#FF5C5C] text-white font-semibold text-sm active:scale-95 transition-transform">
              Sí, eliminar
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
  const aportar  = useAportar(objetivo.id);
  const { data: cuentas = [] } = useCuentas();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const [importe,  setImporte]  = useState("");
  const [cuentaId, setCuentaId] = useState("");
  const [concepto, setConcepto] = useState("");

  async function handleAportar() {
    const imp = parseFloat(importe);
    if (!imp || imp <= 0) { showFlash("Introduce un importe válido", "error"); return; }
    if (!cuentaId) { showFlash("Selecciona una cuenta", "error"); return; }
    const cuenta = cuentas.find((c) => c.id === cuentaId);
    try {
      await aportar.mutateAsync({
        importe:   imp.toFixed(2),
        moneda:    cuenta?.moneda ?? workspace?.moneda_base ?? "EUR",
        fecha:     new Date().toISOString().split("T")[0],
        cuenta_id: cuentaId,
        concepto:  concepto.trim() || undefined,
      });
      showFlash("Aportación registrada");
      onClose();
    } catch {
      showFlash("Error al registrar la aportación", "error");
    }
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[900] flex items-end"
        style={{ background: "rgba(0,0,0,0.45)" }}
        onClick={onClose}
      >
        <motion.div
          key="sheet"
          initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="w-full bg-surface rounded-t-3xl p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-10 h-1 bg-border-ui rounded-full mx-auto mb-5" />
          <h2 className="font-bold text-fg text-base mb-1">
            Aportar a {objetivo.emoji} {objetivo.nombre}
          </h2>
          <p className="text-xs text-fg-muted mb-5">
            Falta {formatCurrency(objetivo.falta, objetivo.moneda)}
          </p>
          <div className="space-y-3">
            {/* Importe */}
            <input
              type="number" inputMode="decimal" placeholder="0,00"
              className="w-full bg-surface-2 rounded-xl px-4 py-3 text-3xl font-bold text-fg text-center focus:outline-none"
              value={importe} onChange={(e) => setImporte(e.target.value)}
            />
            {/* Cuenta */}
            <div className="relative">
              <select
                value={cuentaId}
                onChange={(e) => setCuentaId(e.target.value)}
                className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg appearance-none focus:outline-none pr-9"
              >
                <option value="">¿Desde qué cuenta?</option>
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji ?? "🏦"} {c.nombre} ({c.moneda})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle pointer-events-none" />
            </div>
            {/* Concepto */}
            <input
              placeholder="Nota (opcional)"
              className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
              value={concepto} onChange={(e) => setConcepto(e.target.value)}
            />
          </div>
          <div className="flex gap-3 mt-5">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 rounded-2xl bg-surface-2 text-fg font-semibold text-sm active:scale-95 transition-transform"
            >
              Cancelar
            </button>
            <button
              onClick={handleAportar}
              disabled={aportar.isPending}
              className="flex-1 py-3.5 rounded-2xl bg-ink text-white font-semibold text-sm disabled:opacity-60 active:scale-95 transition-transform"
            >
              {aportar.isPending ? "Guardando…" : "Aportar"}
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
  const crear     = useCrearObjetivo();
  const actualizar = useActualizarObjetivo();
  const workspace  = useWorkspaceStore((s) => s.workspace);
  const moneda     = workspace?.moneda_base ?? "EUR";
  const editando   = !!objetivo;

  const [nombre,  setNombre]  = useState("");
  const [emoji,   setEmoji]   = useState("🎯");
  const [importe, setImporte] = useState("");
  const [fecha,   setFecha]   = useState("");

  useEffect(() => {
    if (objetivo) {
      setNombre(objetivo.nombre);
      setEmoji(objetivo.emoji);
      setImporte(String(parseFloat(objetivo.importe_objetivo)));
      setFecha(objetivo.fecha_objetivo ? String(objetivo.fecha_objetivo) : "");
    } else {
      setNombre(""); setEmoji("🎯"); setImporte(""); setFecha("");
    }
  }, [objetivo]);

  async function handleGuardar() {
    if (!nombre.trim() || !importe) { showFlash("Nombre e importe obligatorios", "error"); return; }
    try {
      if (editando && objetivo) {
        await actualizar.mutateAsync({
          id: objetivo.id,
          nombre: nombre.trim(),
          emoji,
          importe_objetivo: parseFloat(importe).toFixed(2),
          fecha_objetivo: fecha || null,
        });
        showFlash("Objetivo actualizado");
      } else {
        await crear.mutateAsync({
          nombre: nombre.trim(), emoji,
          importe_objetivo: parseFloat(importe).toFixed(2),
          moneda,
          fecha_objetivo: fecha || null,
        });
        showFlash("Objetivo creado");
      }
      onClose();
    } catch { showFlash("Error al guardar el objetivo", "error"); }
  }

  const isPending = crear.isPending || actualizar.isPending;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[900] flex items-end"
        style={{ background: "rgba(0,0,0,0.45)" }}
        onClick={onClose}
      >
        <motion.div
          key="sheet"
          initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="w-full bg-surface rounded-t-3xl p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-10 h-1 bg-border-ui rounded-full mx-auto mb-5" />
          <h2 className="font-bold text-fg text-lg mb-4">
            {editando ? "Editar objetivo" : "Nuevo objetivo"}
          </h2>
          <div className="space-y-3">
            {/* Emoji + nombre */}
            <div className="flex gap-2">
              <input
                className="w-14 text-2xl text-center bg-surface-2 rounded-xl focus:outline-none"
                value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={2}
              />
              <input
                className="flex-1 px-4 py-3 rounded-xl bg-surface-2 text-sm text-fg focus:outline-none"
                placeholder="Nombre del objetivo"
                value={nombre} onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            {/* Importe */}
            <input
              type="number" inputMode="decimal" placeholder="0,00"
              className="w-full px-4 py-3 rounded-xl bg-surface-2 text-sm text-fg focus:outline-none"
              value={importe} onChange={(e) => setImporte(e.target.value)}
            />
            {/* Fecha límite */}
            <div>
              <p className="text-xs text-fg-muted mb-1 font-medium">Fecha límite (opcional)</p>
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
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={isPending}
              className="flex-1 py-3.5 rounded-2xl bg-ink text-white font-semibold text-sm disabled:opacity-60 active:scale-95 transition-transform"
            >
              {isPending ? "Guardando…" : editando ? "Guardar cambios" : "Crear"}
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
  const pct      = objetivo.porcentaje;
  const barColor = pct >= 100 ? "bg-[#5BAA1F]" : pct >= 60 ? "bg-[#5BAA1F]" : "bg-ink";

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

        {/* Aportar background — left (swipe right) */}
        <div className="absolute inset-y-0 left-0 w-1/2 flex items-center pl-5 bg-[#5BAA1F] rounded-l-2xl">
          <div className="flex flex-col items-center gap-0.5">
            <PiggyBank className="w-5 h-5 text-white" />
            <span className="text-[10px] font-bold text-white uppercase tracking-wide">Aportar</span>
          </div>
        </div>

        {/* Delete background — right (swipe left) */}
        <div className="absolute inset-y-0 right-0 w-1/2 flex items-center justify-end pr-5 bg-[#FF5C5C] rounded-r-2xl">
          <div className="flex flex-col items-center gap-0.5">
            <Trash2 className="w-5 h-5 text-white" />
            <span className="text-[10px] font-bold text-white uppercase tracking-wide">Eliminar</span>
          </div>
        </div>

        {/* Swipeable card content */}
        <div
          ref={contentRef}
          className="relative z-10 bg-surface rounded-2xl p-4"
          style={{ touchAction: "pan-y", WebkitUserSelect: "none", userSelect: "none" }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onCancel}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="flex items-start justify-between mb-3 pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{objetivo.emoji}</span>
              <div>
                <p className="font-semibold text-fg text-sm">{objetivo.nombre}</p>
                {objetivo.fecha_objetivo && (
                  <p className="text-xs text-fg-muted">
                    Límite: {new Date(objetivo.fecha_objetivo).toLocaleDateString("es-ES")}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-sm text-fg tabular-nums">{pct.toFixed(0)}%</p>
              {pct >= 100 && <p className="text-xs text-[#5BAA1F] font-semibold">Completado</p>}
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
              Aportado: <span className="font-medium text-fg">{formatCurrency(objetivo.importe_aportado, objetivo.moneda)}</span>
            </span>
            <span>
              Meta: <span className="font-medium text-fg">{formatCurrency(objetivo.importe_objetivo, objetivo.moneda)}</span>
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
      showFlash("Objetivo eliminado", "delete");
    } catch {
      showFlash("Error al eliminar", "error");
    }
  }

  return (
    <div className="min-h-full bg-app pb-24">
      {/* Header — píldora flotante */}
      <div className="pt-10 px-4 pb-4">
        <div className="bg-ink rounded-3xl px-5 py-4 flex items-center justify-between shadow-[var(--shadow-floating)]">
          <h1 className="text-white font-bold text-2xl">Objetivos</h1>
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
            <div className="w-16 h-16 rounded-2xl bg-surface shadow-[var(--shadow-card)] flex items-center justify-center text-3xl mb-4">
              🎯
            </div>
            <p className="font-bold text-fg mb-1">Sin objetivos</p>
            <p className="text-fg-muted text-sm mb-5">Ahorra con propósito</p>
            <button
              onClick={() => setShowNuevo(true)}
              className="bg-ink text-white rounded-full px-6 py-2.5 text-sm font-semibold"
            >
              Crear objetivo
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
            <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">Completados</p>
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
