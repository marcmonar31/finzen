import { useState } from "react";
import { Bell, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUsuarioStore } from "@/stores/usuario";
import { useWorkspaceStore } from "@/stores/workspace";
import { useResumenDashboard } from "@/hooks/useMovimientos";
import { usePresupuestos } from "@/hooks/usePresupuestos";
import { useCuentas } from "@/hooks/useCuentas";
import { BalanceCard } from "@/components/BalanceCard";
import { MovimientoItem } from "@/components/MovimientoItem";
import { PresupuestoBar } from "@/components/PresupuestoBar";
import { NuevoMovimientoSheet } from "@/components/NuevoMovimientoSheet";
import { NuevaTransferenciaSheet } from "@/components/NuevaTransferenciaSheet";
import { EditarMovimientoSheet } from "@/components/EditarMovimientoSheet";
import { useArchivarMovimiento } from "@/hooks/useMovimientos";
import { formatCurrency } from "@/lib/format";
import Decimal from "decimal.js";
import type { Movimiento } from "@/types/api";
import { showFlash } from "@/stores/flash";

export function Dashboard() {
  const usuario  = useUsuarioStore((s) => s.usuario);
  const workspace = useWorkspaceStore((s) => s.workspace);
  const { data: resumen, isLoading } = useResumenDashboard();
  const { data: presupuestos = [] }  = usePresupuestos();
  const { data: cuentas = [] }       = useCuentas();

  const [showNuevo,       setShowNuevo]       = useState(false);
  const [showTransfer,    setShowTransfer]    = useState(false);
  const [defaultTipo,     setDefaultTipo]     = useState<"ingreso" | "gasto" | undefined>();
  const [showCuentas,     setShowCuentas]     = useState(false);
  const [editando,        setEditando]        = useState<Movimiento | null>(null);
  const archivar = useArchivarMovimiento();

  const top3Presupuestos = [...presupuestos]
    .sort((a, b) => b.estado.porcentaje - a.estado.porcentaje)
    .slice(0, 3);

  const saludo = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 19) return "Buenas tardes";
    return "Buenas noches";
  })();

  const saldoStr    = resumen?.saldo_total ?? "0";
  const saldoDecimal = new Decimal(saldoStr);
  const moneda      = workspace?.moneda_base ?? "EUR";
  const formatted   = formatCurrency(saldoDecimal.abs().toString(), moneda);
  const [entero, decimal] = formatted.replace(/[€$£]/g, "").trim().split(",");

  function abrirNuevo(tipo?: "ingreso" | "gasto") {
    setDefaultTipo(tipo);
    setShowNuevo(true);
  }

  function abrirTransferir() {
    if (cuentas.length < 2) {
      // No hay suficientes cuentas — abrir nuevo movimiento en su lugar
      abrirNuevo();
      return;
    }
    setShowTransfer(true);
  }

  return (
    <div className="min-h-full bg-app">
      {/* Header — texto sobre el fondo gris de la app, sin tarjeta ni fondo propio */}
      <div className="px-4 pt-10 pb-5 flex items-center justify-between">
        <div>
          <p className="text-fg-subtle text-xs font-medium">{saludo}</p>
          <p className="text-fg font-bold text-xl leading-tight">
            {usuario?.nombre?.split(" ")[0] ?? ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCuentas(true)}
            className="w-9 h-9 rounded-full bg-surface flex items-center justify-center shadow-[var(--shadow-card)] active:scale-95 transition-transform"
          >
            <User className="w-4 h-4 text-fg" />
          </button>
          <button className="w-9 h-9 rounded-full bg-surface flex items-center justify-center shadow-[var(--shadow-card)]">
            <Bell className="w-4 h-4 text-fg" />
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="space-y-5 pb-24">
        {/* Tarjeta de saldo — negra, con márgenes laterales, sobre el fondo gris */}
        {isLoading ? (
          <div className="mx-4 bg-ink rounded-3xl p-6 h-52 animate-pulse" />
        ) : (
          <div className="mx-4">
            <BalanceCard
              saldo={`${entero ?? "0"},${decimal ?? "00"}`}
              moneda={moneda}
              cuentaLabel={workspace?.nombre ?? "Personal"}
              onIngresar={() => abrirNuevo("ingreso")}
              onGastar={()   => abrirNuevo("gasto")}
              onTransferir={abrirTransferir}
              onAnadir={()   => abrirNuevo()}
            />
          </div>
        )}

        {/* Últimos movimientos */}
        <div className="px-4">
          <h2 className="font-bold text-fg text-base mb-3">Últimos movimientos</h2>

          {isLoading ? (
            <div className="bg-surface rounded-2xl p-4 space-y-3 shadow-[var(--shadow-card)]">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-gray-100" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-gray-100 rounded w-2/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                  <div className="w-16 h-4 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : resumen?.ultimos_movimientos.length === 0 ? (
            <div className="bg-surface rounded-2xl p-6 flex flex-col items-center text-center shadow-[var(--shadow-card)]">
              <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center text-2xl mb-3">📋</div>
              <p className="font-semibold text-fg text-sm mb-1">Sin movimientos aún</p>
              <p className="text-fg-muted text-xs">Usa los botones de la tarjeta para registrar</p>
            </div>
          ) : (
            <div className="bg-surface rounded-2xl overflow-hidden divide-y divide-border-ui shadow-[var(--shadow-card)]">
              {resumen?.ultimos_movimientos.map((m) => (
                <MovimientoItem
                  key={m.id}
                  movimiento={m}
                  onEdit={(mov) => setEditando(mov)}
                  onDelete={(mov) => { archivar.mutate(mov.id); showFlash("Movimiento eliminado", "delete"); }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Presupuestos */}
        {top3Presupuestos.length > 0 && (
          <div className="px-4">
            <h2 className="font-bold text-fg text-base mb-3">Presupuestos</h2>
            <div className="space-y-3">
              {top3Presupuestos.map((p) => (
                <PresupuestoBar key={p.id} presupuesto={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sheet: módulo de cambio de perfil (próximamente) */}
      <AnimatePresence>
        {showCuentas && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setShowCuentas(false)}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-3xl"
            >
              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-10 h-1 bg-border-ui rounded-full mx-auto mb-8" />
                <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center mb-4">
                  <User className="w-7 h-7 text-fg-subtle" />
                </div>
                <h2 className="font-bold text-fg text-lg mb-2">Módulo no disponible</h2>
                <p className="text-fg-muted text-sm leading-relaxed max-w-xs">
                  La gestión de perfiles personales y de empresa estará disponible próximamente.
                </p>
                <button
                  onClick={() => setShowCuentas(false)}
                  className="mt-8 w-full bg-ink text-white rounded-2xl py-3.5 font-semibold text-sm active:scale-95 transition-transform"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sheets de acción */}
      <NuevoMovimientoSheet
        open={showNuevo}
        onClose={() => setShowNuevo(false)}
        defaultTipo={defaultTipo}
      />
      <NuevaTransferenciaSheet
        open={showTransfer}
        onClose={() => setShowTransfer(false)}
      />
      <EditarMovimientoSheet
        movimiento={editando}
        onClose={() => setEditando(null)}
      />
    </div>
  );
}
