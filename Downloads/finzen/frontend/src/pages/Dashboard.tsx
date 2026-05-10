import { useState } from "react";
import { Plus, Bell } from "lucide-react";
import { useUsuarioStore } from "@/stores/usuario";
import { useWorkspaceStore } from "@/stores/workspace";
import { useResumenDashboard } from "@/hooks/useMovimientos";
import { usePresupuestos } from "@/hooks/usePresupuestos";
import { BalanceCard } from "@/components/BalanceCard";
import { MovimientoItem } from "@/components/MovimientoItem";
import { PresupuestoBar } from "@/components/PresupuestoBar";
import { SelectorWorkspace } from "@/components/SelectorWorkspace";
import { NuevoMovimientoSheet } from "@/components/NuevoMovimientoSheet";
import { formatCurrency } from "@/lib/format";
import Decimal from "decimal.js";

export function Dashboard() {
  const usuario = useUsuarioStore((s) => s.usuario);
  const workspace = useWorkspaceStore((s) => s.workspace);
  const { data: resumen, isLoading } = useResumenDashboard();
  const { data: presupuestos = [] } = usePresupuestos();
  const [showNuevo, setShowNuevo] = useState(false);

  const top3Presupuestos = [...presupuestos]
    .sort((a, b) => b.estado.porcentaje - a.estado.porcentaje)
    .slice(0, 3);

  const saludo = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 19) return "Buenas tardes";
    return "Buenas noches";
  })();

  const saldoStr = resumen?.saldo_total ?? "0";
  const saldoDecimal = new Decimal(saldoStr);
  const moneda = workspace?.moneda_base ?? "EUR";

  const formatted = formatCurrency(saldoDecimal.abs().toString(), moneda);
  const [entero, decimal] = formatted.replace(/[€$£]/g, "").trim().split(",");

  return (
    <div className="min-h-full bg-app">
      {/* Header oscuro */}
      <div className="bg-ink px-4 pt-10 pb-24 rounded-b-[32px]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-white/50 text-xs">{saludo}</p>
            <p className="text-white font-semibold text-lg leading-tight">
              {usuario?.nombre?.split(" ")[0] ?? ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SelectorWorkspace />
            <button className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
              <Bell className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>
      </div>

      {/* Contenido flotando sobre header */}
      <div className="-mt-16 space-y-5 pb-24">
        {isLoading ? (
          <div className="mx-4 bg-ink/80 rounded-3xl p-6 h-48 animate-pulse" />
        ) : (
          <BalanceCard
            saldo={`${entero ?? "0"},${decimal ?? "00"}`}
            moneda={moneda}
            cuentaLabel={workspace?.nombre ?? ""}
            onNuevoMovimiento={() => setShowNuevo(true)}
          />
        )}

        {/* Últimos movimientos */}
        <div className="px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-ink text-base">Últimos movimientos</h2>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-2xl p-4 space-y-3 shadow-[var(--shadow-card)]">
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
            <div className="bg-white rounded-2xl p-6 flex flex-col items-center text-center shadow-[var(--shadow-card)]">
              <div className="w-12 h-12 rounded-full bg-[#F2F2F4] flex items-center justify-center text-2xl mb-3">📋</div>
              <p className="font-semibold text-ink text-sm mb-1">Sin movimientos aún</p>
              <p className="text-[#6B6B6F] text-xs">Registra tu primer gasto o ingreso</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl px-4 divide-y divide-[#F2F2F4] shadow-[var(--shadow-card)]">
              {resumen?.ultimos_movimientos.map((m) => (
                <MovimientoItem key={m.id} movimiento={m} />
              ))}
            </div>
          )}
        </div>

        {/* Presupuestos */}
        {top3Presupuestos.length > 0 && (
          <div className="px-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-ink text-base">Presupuestos</h2>
            </div>
            <div className="space-y-3">
              {top3Presupuestos.map((p) => (
                <PresupuestoBar key={p.id} presupuesto={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowNuevo(true)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink text-white rounded-full px-6 py-4 flex items-center gap-2 font-semibold shadow-[var(--shadow-floating)] active:scale-95 transition-transform z-30"
      >
        <Plus className="w-5 h-5" />
        Movimiento
      </button>

      <NuevoMovimientoSheet open={showNuevo} onClose={() => setShowNuevo(false)} />
    </div>
  );
}
