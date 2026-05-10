import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

const SECTIONS = [
  { id: "dashboard", emoji: "🏠", label: "Inicio" },
  { id: "cuentas", emoji: "💳", label: "Cuentas" },
  { id: "movimientos", emoji: "📋", label: "Movimientos" },
  { id: "transferencias", emoji: "🔄", label: "Transfers" },
  { id: "presupuestos", emoji: "📊", label: "Presupuestos" },
  { id: "recurrentes", emoji: "🔁", label: "Recurrentes" },
  { id: "objetivos", emoji: "🎯", label: "Objetivos" },
  { id: "reglas", emoji: "⚡", label: "Reglas" },
  { id: "amigos", emoji: "👥", label: "Amigos" },
  { id: "grupos", emoji: "🤝", label: "Grupos" },
  { id: "deudas", emoji: "💸", label: "Deudas" },
  { id: "inversiones", emoji: "📈", label: "Inversiones" },
  { id: "insights", emoji: "💡", label: "Insights" },
  { id: "ajustes", emoji: "⚙️", label: "Ajustes" },
];

interface Props {
  children: React.ReactNode;
  currentSection: string;
  onSectionChange: (id: string) => void;
}

export function MinimizableShell({ children, currentSection, onSectionChange }: Props) {
  const [minimized, setMinimized] = useState(false);

  return (
    <>
      {/* ── Desktop layout (lg+) ─────────────────────────────────── */}
      <div className="hidden lg:flex h-screen overflow-hidden bg-[#F7F7F9]">
        {/* Sidebar */}
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
                  currentSection === s.id
                    ? "bg-ink text-white"
                    : "text-[#3A3A3C] hover:bg-[#F2F2F4]"
                )}
              >
                <span className="text-base w-5 text-center">{s.emoji}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto bg-[#F7F7F9]">
          <div className="max-w-2xl mx-auto min-h-full">
            {children}
          </div>
        </main>
      </div>

      {/* ── Mobile layout (< lg) ─────────────────────────────────── */}
      <div className="lg:hidden h-screen relative bg-app overflow-hidden select-none">
        <motion.div
          animate={{
            scale: minimized ? 0.94 : 1,
            height: minimized ? "42%" : "100%",
            borderRadius: minimized ? "0 0 24px 24px" : "0px",
          }}
          transition={{ type: "spring", damping: 28, stiffness: 220 }}
          drag={!minimized ? "y" : false}
          dragConstraints={{ top: 0, bottom: 100 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 70) setMinimized(true);
          }}
          className="bg-app overflow-hidden relative"
          style={{ transformOrigin: "top center" }}
        >
          {/* Handle */}
          <div className="absolute top-0 left-0 right-0 z-10 flex justify-center pt-2 pb-1">
            <button
              onClick={() => setMinimized(!minimized)}
              className="w-10 h-1 rounded-full bg-black/15 hover:bg-black/25 transition-colors"
              aria-label={minimized ? "Expandir" : "Minimizar"}
            />
          </div>

          {minimized && (
            <div
              className="absolute inset-0 z-20 cursor-pointer"
              onClick={() => setMinimized(false)}
            />
          )}

          <div className="h-full overflow-y-auto pt-4">{children}</div>
        </motion.div>

        {/* Selector de secciones (móvil) */}
        <AnimatePresence>
          {minimized && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 28, stiffness: 220, delay: 0.05 }}
              className="absolute bottom-0 left-0 right-0 h-[58%] bg-white rounded-t-3xl shadow-[var(--shadow-floating)] overflow-hidden"
            >
              <div className="p-5 pb-2 flex items-center justify-between">
                <h3 className="text-base font-bold text-ink">Ir a...</h3>
                <button
                  onClick={() => setMinimized(false)}
                  className="w-8 h-8 rounded-full bg-[#F2F2F4] flex items-center justify-center text-[#6B6B6F] text-lg"
                >
                  ×
                </button>
              </div>
              <div className="overflow-y-auto h-[calc(100%-60px)] px-4 pb-6">
                <div className="grid grid-cols-2 gap-3">
                  {SECTIONS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        onSectionChange(s.id);
                        setMinimized(false);
                      }}
                      className={clsx(
                        "rounded-2xl p-4 flex flex-col items-start gap-2 transition-all active:scale-95",
                        currentSection === s.id
                          ? "bg-ink text-white"
                          : "bg-[#F2F2F4] text-ink hover:bg-[#E8E8EA]"
                      )}
                    >
                      <div className="text-2xl">{s.emoji}</div>
                      <span className="font-semibold text-sm">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
