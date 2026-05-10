import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

const SECTIONS = [
  { id: "dashboard",    emoji: "🏠", label: "Inicio" },
  { id: "cuentas",      emoji: "💳", label: "Cuentas" },
  { id: "movimientos",  emoji: "📋", label: "Movimientos" },
  { id: "transferencias", emoji: "🔄", label: "Transfers" },
  { id: "presupuestos", emoji: "📊", label: "Presupuesto" },
  { id: "recurrentes",  emoji: "🔁", label: "Recurrentes" },
  { id: "objetivos",    emoji: "🎯", label: "Objetivos" },
  { id: "reglas",       emoji: "⚡", label: "Reglas" },
  { id: "amigos",       emoji: "👥", label: "Amigos" },
  { id: "grupos",       emoji: "🤝", label: "Grupos" },
  { id: "deudas",       emoji: "💸", label: "Deudas" },
  { id: "inversiones",  emoji: "📈", label: "Inversiones" },
  { id: "insights",     emoji: "💡", label: "Insights" },
  { id: "ajustes",      emoji: "⚙️", label: "Ajustes" },
];

interface Props {
  children: React.ReactNode;
  currentSection: string;
  onSectionChange: (id: string) => void;
}

export function MinimizableShell({ children, currentSection, onSectionChange }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState(currentSection);

  // Refs — no re-renders during gesture
  const triggerRef  = useRef<HTMLDivElement>(null);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPos    = useRef({ x: 0, y: 0 });
  const longFired   = useRef(false);
  const capturedPtr = useRef<number | null>(null);

  /** Mapea posición X de pantalla → id de sección */
  function sectionAt(clientX: number): string {
    const idx = Math.max(
      0,
      Math.min(SECTIONS.length - 1, Math.floor((clientX / window.innerWidth) * SECTIONS.length))
    );
    return SECTIONS[idx].id;
  }

  function onDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    startPos.current = { x: e.clientX, y: e.clientY };
    longFired.current = false;
    capturedPtr.current = e.pointerId;

    timerRef.current = setTimeout(() => {
      longFired.current = true;
      navigator.vibrate?.(12);
      setHoveredId(sectionAt(e.clientX));
      setPickerOpen(true);
      triggerRef.current?.setPointerCapture(e.pointerId);
    }, 340);
  }

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!longFired.current) {
      // Cancela el long-press si el dedo se movió antes de los 340ms
      const d = Math.hypot(e.clientX - startPos.current.x, e.clientY - startPos.current.y);
      if (d > 8 && timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    setHoveredId(sectionAt(e.clientX));
  }

  function onUp(_e: React.PointerEvent<HTMLDivElement>) {
    cancelTimer();
    if (longFired.current) {
      onSectionChange(hoveredId);
      setPickerOpen(false);
      longFired.current = false;
    }
  }

  function onCancel() {
    cancelTimer();
    setPickerOpen(false);
    longFired.current = false;
  }

  function cancelTimer() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }

  return (
    <>
      {/* ── Desktop (sidebar lateral, sin cambios) ──────────────── */}
      <div className="hidden lg:flex h-screen overflow-hidden bg-[#F7F7F9]">
        <nav className="w-52 flex-shrink-0 bg-white border-r border-[#EBEBED] flex flex-col py-5 overflow-y-auto">
          <div className="px-4 mb-5">
            <p className="text-ink font-bold text-xl">Finzen</p>
          </div>
          <div className="flex-1 px-2 space-y-0.5">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => onSectionChange(s.id)}
                className={clsx(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all",
                  currentSection === s.id ? "bg-ink text-white" : "text-[#3A3A3C] hover:bg-[#F2F2F4]"
                )}
              >
                <span className="text-base w-5 text-center">{s.emoji}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </nav>
        <main className="flex-1 overflow-y-auto bg-[#F7F7F9]">
          <div className="max-w-2xl mx-auto min-h-full">{children}</div>
        </main>
      </div>

      {/* ── Mobile (full-screen, sin encogimiento) ──────────────── */}
      <div
        className="lg:hidden relative overflow-hidden bg-app"
        style={{ height: "100svh" }}
      >
        {/* Contenido — ocupa toda la pantalla */}
        <div className="h-full overflow-y-auto">{children}</div>

        {/* Backdrop oscuro cuando el picker está abierto */}
        <AnimatePresence>
          {pickerOpen && (
            <motion.div
              key="backdrop"
              className="absolute inset-0 pointer-events-none"
              style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            />
          )}
        </AnimatePresence>

        {/* Picker de secciones */}
        <AnimatePresence>
          {pickerOpen && (
            <motion.div
              key="picker"
              className="absolute left-0 right-0 pointer-events-none select-none"
              style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 18px)" }}
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", damping: 32, stiffness: 420 }}
            >
              {/* Nombre de la sección bajo el dedo */}
              <div className="flex justify-center mb-2.5">
                <span className="bg-white/20 backdrop-blur-md text-white text-sm font-semibold px-5 py-1.5 rounded-full">
                  {SECTIONS.find((s) => s.id === hoveredId)?.label ?? ""}
                </span>
              </div>

              {/* Tira de emojis */}
              <div className="mx-3 rounded-3xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(16px)" }}
              >
                <div className="flex">
                  {SECTIONS.map((s) => {
                    const isHovered = s.id === hoveredId;
                    const isCurrent = s.id === currentSection;
                    return (
                      <div
                        key={s.id}
                        className={clsx(
                          "flex-1 flex items-center justify-center py-3 transition-all",
                          isHovered ? "rounded-2xl m-1" : ""
                        )}
                        style={{
                          background: isHovered ? "rgba(255,255,255,0.95)" : "transparent",
                          transition: "background 60ms, transform 60ms",
                        }}
                      >
                        <span
                          style={{
                            fontSize: isHovered ? 22 : 18,
                            opacity: isHovered ? 1 : isCurrent ? 0.85 : 0.45,
                            transition: "font-size 60ms, opacity 60ms",
                            display: "inline-block",
                          }}
                        >
                          {s.emoji}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trigger — pastilla en la parte inferior central */}
        <div
          ref={triggerRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onCancel}
          className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center touch-none select-none z-50"
          style={{
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 5px)",
            width: 80,
            height: 22,
            cursor: "pointer",
          }}
          aria-label="Mantén pulsado para cambiar de sección"
        >
          <motion.div
            className="rounded-full"
            animate={{
              width: pickerOpen ? 44 : 34,
              height: 5,
              backgroundColor: pickerOpen ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.18)",
            }}
            transition={{ duration: 0.15 }}
          />
        </div>
      </div>
    </>
  );
}
