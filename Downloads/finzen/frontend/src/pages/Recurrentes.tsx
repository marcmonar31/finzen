import { useState } from "react";
import { Plus, Play, Pause } from "lucide-react";
import { useRecurrentes, useActualizarRecurrente, useArchivarRecurrente } from "@/hooks/useRecurrentes";
import { NuevoRecurrenteSheet } from "@/components/NuevoRecurrenteSheet";
import { formatCurrency, formatDate } from "@/lib/format";
import { clsx } from "clsx";
import { toast } from "sonner";
import type { Recurrente } from "@/types/api";

const FRECUENCIA_LABEL: Record<string, string> = {
  diario: "diario",
  semanal: "semanal",
  mensual: "mensual",
  anual: "anual",
};

const TIPO_ICON: Record<string, string> = {
  ingreso: "💰",
  gasto: "💸",
};

export function Recurrentes() {
  const [showNuevo, setShowNuevo] = useState(false);
  const { data: recurrentes = [], isLoading } = useRecurrentes();
  const actualizar = useActualizarRecurrente();
  const archivar = useArchivarRecurrente();

  const activos = recurrentes.filter((r) => r.activo);
  const pausados = recurrentes.filter((r) => !r.activo);

  async function handleToggle(r: Recurrente) {
    try {
      await actualizar.mutateAsync({ id: r.id, activo: !r.activo });
    } catch {
      toast.error("Error al actualizar");
    }
  }

  async function handleArchivar(id: string) {
    try {
      await archivar.mutateAsync(id);
      toast.success("Recurrente eliminado");
    } catch {
      toast.error("Error al eliminar");
    }
  }

  return (
    <div className="min-h-full bg-app pb-24">
      <div className="bg-ink px-4 pt-10 pb-5 rounded-b-3xl mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-white font-bold text-2xl">Recurrentes</h1>
          <button onClick={() => setShowNuevo(true)} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse shadow-[var(--shadow-card)]">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && recurrentes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-[var(--shadow-card)] flex items-center justify-center text-3xl mb-4">
              🔁
            </div>
            <p className="font-bold text-ink mb-1">Sin recurrentes</p>
            <p className="text-[#6B6B6F] text-sm mb-5">Automatiza pagos y cobros periódicos</p>
            <button onClick={() => setShowNuevo(true)} className="bg-ink text-white rounded-full px-6 py-2.5 text-sm font-semibold">
              Crear recurrente
            </button>
          </div>
        )}

        {activos.length > 0 && (
          <div className="bg-white rounded-2xl divide-y divide-[#F2F2F4] shadow-[var(--shadow-card)]">
            {activos.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 px-4 py-3"
                onContextMenu={(e) => { e.preventDefault(); handleArchivar(r.id); }}
              >
                <div className="w-10 h-10 rounded-xl bg-[#F2F2F4] flex items-center justify-center text-xl flex-shrink-0">
                  {TIPO_ICON[r.tipo] ?? "🔁"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink text-sm truncate">{r.nombre}</p>
                  <p className="text-xs text-[#6B6B6F]">
                    {FRECUENCIA_LABEL[r.frecuencia]} · próximo: {formatDate(r.proxima_ejecucion)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <p className={clsx(
                    "font-bold text-sm tabular-nums",
                    r.tipo === "ingreso" ? "text-[#5BAA1F]" : "text-ink"
                  )}>
                    {r.tipo === "ingreso" ? "+" : "-"}{formatCurrency(r.importe, r.moneda)}
                  </p>
                  <button
                    onClick={() => handleToggle(r)}
                    className="w-7 h-7 rounded-full bg-[#F2F2F4] flex items-center justify-center"
                  >
                    <Pause className="w-3.5 h-3.5 text-[#6B6B6F]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {pausados.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[#6B6B6F] uppercase tracking-wider mb-2">Pausados</p>
            <div className="bg-white rounded-2xl divide-y divide-[#F2F2F4] shadow-[var(--shadow-card)] opacity-50">
              {pausados.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink text-sm truncate">{r.nombre}</p>
                    <p className="text-xs text-[#6B6B6F]">{formatCurrency(r.importe, r.moneda)} / {r.frecuencia}</p>
                  </div>
                  <button
                    onClick={() => handleToggle(r)}
                    className="w-7 h-7 rounded-full bg-[#F2F2F4] flex items-center justify-center"
                  >
                    <Play className="w-3.5 h-3.5 text-[#6B6B6F]" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => setShowNuevo(true)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink text-white rounded-full px-6 py-4 flex items-center gap-2 font-semibold shadow-[var(--shadow-floating)] active:scale-95 transition-transform"
      >
        <Plus className="w-5 h-5" />
        Nuevo recurrente
      </button>

      <NuevoRecurrenteSheet open={showNuevo} onClose={() => setShowNuevo(false)} />
    </div>
  );
}
