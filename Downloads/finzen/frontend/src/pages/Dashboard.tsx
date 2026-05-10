import { useUsuarioStore } from "@/stores/usuario";
import { useWorkspaceStore } from "@/stores/workspace";
import { BalanceCard } from "@/components/BalanceCard";
import { SelectorWorkspace } from "@/components/SelectorWorkspace";
import { Bell } from "lucide-react";

export function Dashboard() {
  const usuario = useUsuarioStore((s) => s.usuario);
  const workspace = useWorkspaceStore((s) => s.workspace);

  const saludo = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 19) return "Buenas tardes";
    return "Buenas noches";
  })();

  return (
    <div className="min-h-full bg-app">
      {/* Header */}
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

      {/* Content — float over header */}
      <div className="-mt-16 px-0 space-y-5 pb-10">
        <BalanceCard
          saldo="0,00"
          moneda={workspace?.moneda_base ?? "EUR"}
          cuentaLabel={workspace?.nombre ?? ""}
        />

        {/* Objetivos placeholder */}
        <div className="px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-ink text-base">Tus objetivos</h2>
            <button className="text-xs text-[#6B6B6F]">Ver todos</button>
          </div>
          <div className="bg-white rounded-2xl p-5 flex flex-col items-center justify-center py-8 shadow-[var(--shadow-card)]">
            <div className="w-12 h-12 rounded-full bg-[#F2F2F4] flex items-center justify-center text-2xl mb-3">
              🎯
            </div>
            <p className="font-semibold text-ink text-sm mb-1">Sin objetivos aún</p>
            <p className="text-[#6B6B6F] text-xs text-center">
              Crea un objetivo para empezar a ahorrar
            </p>
          </div>
        </div>

        {/* Movimientos recientes placeholder */}
        <div className="px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-ink text-base">Últimos movimientos</h2>
            <button className="text-xs text-[#6B6B6F]">Ver todos</button>
          </div>
          <div className="bg-white rounded-2xl p-5 flex flex-col items-center justify-center py-8 shadow-[var(--shadow-card)]">
            <div className="w-12 h-12 rounded-full bg-[#F2F2F4] flex items-center justify-center text-2xl mb-3">
              📋
            </div>
            <p className="font-semibold text-ink text-sm mb-1">Sin movimientos aún</p>
            <p className="text-[#6B6B6F] text-xs text-center">
              Registra tu primer gasto o ingreso
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
