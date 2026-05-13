import { useState } from "react";
import { Plus } from "lucide-react";
import { useRecurrentes, useActualizarRecurrente, useArchivarRecurrente } from "@/hooks/useRecurrentes";
import { NuevoRecurrenteSheet } from "@/components/NuevoRecurrenteSheet";
import { RecurrenteItem } from "@/components/RecurrenteItem";
import { showFlash } from "@/stores/flash";
import type { Recurrente } from "@/types/api";

export function Recurrentes() {
  const [showNuevo, setShowNuevo] = useState(false);
  const [editando,  setEditando]  = useState<Recurrente | null>(null);
  const { data: recurrentes = [], isLoading } = useRecurrentes();
  const actualizar = useActualizarRecurrente();
  const archivar   = useArchivarRecurrente();

  const activos  = recurrentes.filter((r) => r.activo);
  const pausados = recurrentes.filter((r) => !r.activo);

  async function handleToggle(r: Recurrente) {
    try {
      await actualizar.mutateAsync({ id: r.id, activo: !r.activo });
    } catch {
      showFlash("Error al actualizar", "error");
    }
  }

  async function handleArchivar(r: Recurrente) {
    try {
      await archivar.mutateAsync(r.id);
      showFlash("Recurrente eliminado", "delete");
    } catch {
      showFlash("Error al eliminar", "error");
    }
  }

  return (
    <div className="min-h-full bg-app pb-24">
      {/* Header — píldora flotante */}
      <div className="pt-10 px-4 pb-4">
        <div className="bg-ink rounded-3xl px-5 py-4 flex items-center justify-between shadow-[var(--shadow-floating)]">
          <h1 className="text-white font-bold text-2xl">Recurrentes</h1>
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
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && recurrentes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface shadow-[var(--shadow-card)] flex items-center justify-center text-3xl mb-4">
              🔁
            </div>
            <p className="font-bold text-fg mb-1">Sin recurrentes</p>
            <p className="text-fg-muted text-sm mb-5">Automatiza pagos y cobros periódicos</p>
            <button
              onClick={() => setShowNuevo(true)}
              className="bg-ink text-white rounded-full px-6 py-2.5 text-sm font-semibold"
            >
              Crear recurrente
            </button>
          </div>
        )}

        {activos.length > 0 && (
          <div className="space-y-2">
            {activos.map((r) => (
              <RecurrenteItem
                key={r.id}
                recurrente={r}
                onEdit={(rec) => setEditando(rec)}
                onToggle={handleToggle}
                onDelete={handleArchivar}
              />
            ))}
          </div>
        )}

        {pausados.length > 0 && (
          <div className="pt-2">
            <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">Pausados</p>
            <div className="space-y-2 opacity-50">
              {pausados.map((r) => (
                <RecurrenteItem
                  key={r.id}
                  recurrente={r}
                  onEdit={(rec) => setEditando(rec)}
                  onToggle={handleToggle}
                  onDelete={handleArchivar}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <NuevoRecurrenteSheet
        open={showNuevo || !!editando}
        onClose={() => { setShowNuevo(false); setEditando(null); }}
        recurrente={editando}
      />
    </div>
  );
}
