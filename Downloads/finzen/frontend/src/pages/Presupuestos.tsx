import { useState } from "react";
import { Plus } from "lucide-react";
import { usePresupuestos, useArchivarPresupuesto } from "@/hooks/usePresupuestos";
import { PresupuestoItem } from "@/components/PresupuestoItem";
import { NuevoPresupuestoSheet } from "@/components/NuevoPresupuestoSheet";
import { showFlash } from "@/stores/flash";
import type { Presupuesto } from "@/types/api";

export function Presupuestos() {
  const [showNuevo,  setShowNuevo]  = useState(false);
  const [editando,   setEditando]   = useState<Presupuesto | null>(null);
  const { data: presupuestos = [], isLoading } = usePresupuestos();
  const archivar = useArchivarPresupuesto();

  const activos   = presupuestos.filter((p) => p.activo);
  const inactivos = presupuestos.filter((p) => !p.activo);

  async function handleArchivar(id: string) {
    try {
      await archivar.mutateAsync(id);
      showFlash("Presupuesto eliminado", "delete");
    } catch {
      showFlash("Error al eliminar", "error");
    }
  }

  return (
    <div className="min-h-full bg-app pb-24">
      {/* Header — píldora flotante */}
      <div className="pt-10 px-4 pb-4">
        <div className="bg-ink rounded-3xl px-5 py-4 flex items-center justify-between shadow-[var(--shadow-floating)]">
          <h1 className="text-white font-bold text-2xl">Presupuestos</h1>
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
            {[1, 2, 3].map((i) => (
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

        {!isLoading && activos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface shadow-[var(--shadow-card)] flex items-center justify-center text-3xl mb-4">
              📊
            </div>
            <p className="font-bold text-fg mb-1">Sin presupuestos</p>
            <p className="text-fg-muted text-sm mb-5">Controla cuánto gastas en cada categoría</p>
            <button
              onClick={() => setShowNuevo(true)}
              className="bg-ink text-white rounded-full px-6 py-2.5 text-sm font-semibold"
            >
              Crear presupuesto
            </button>
          </div>
        )}

        {activos.map((p) => (
          <PresupuestoItem
            key={p.id}
            presupuesto={p}
            onEdit={(pres) => setEditando(pres)}
            onDelete={(pres) => handleArchivar(pres.id)}
          />
        ))}

        {inactivos.length > 0 && (
          <div className="pt-2">
            <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">Pausados</p>
            <div className="space-y-2 opacity-50">
              {inactivos.map((p) => (
                <PresupuestoItem
                  key={p.id}
                  presupuesto={p}
                  onEdit={(pres) => setEditando(pres)}
                  onDelete={(pres) => handleArchivar(pres.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <NuevoPresupuestoSheet
        open={showNuevo || !!editando}
        onClose={() => { setShowNuevo(false); setEditando(null); }}
        presupuesto={editando}
      />
    </div>
  );
}
