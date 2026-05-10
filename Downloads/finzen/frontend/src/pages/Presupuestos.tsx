import { useState } from "react";
import { Plus } from "lucide-react";
import { usePresupuestos, useArchivarPresupuesto, useActualizarPresupuesto } from "@/hooks/usePresupuestos";
import { PresupuestoBar } from "@/components/PresupuestoBar";
import { NuevoPresupuestoSheet } from "@/components/NuevoPresupuestoSheet";
import { toast } from "sonner";

export function Presupuestos() {
  const [showNuevo, setShowNuevo] = useState(false);
  const { data: presupuestos = [], isLoading } = usePresupuestos();
  const archivar = useArchivarPresupuesto();
  const actualizar = useActualizarPresupuesto();

  const activos = presupuestos.filter((p) => p.activo);
  const inactivos = presupuestos.filter((p) => !p.activo);

  async function handleArchivar(id: string) {
    try {
      await archivar.mutateAsync(id);
      toast.success("Presupuesto eliminado");
    } catch {
      toast.error("Error al eliminar");
    }
  }

  async function handleToggle(id: string, activo: boolean) {
    try {
      await actualizar.mutateAsync({ id, activo: !activo });
    } catch {
      toast.error("Error al actualizar");
    }
  }

  return (
    <div className="min-h-full bg-app pb-24">
      {/* Header */}
      <div className="bg-ink px-4 pt-10 pb-5 rounded-b-3xl mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-white font-bold text-2xl">Presupuestos</h1>
          <button onClick={() => setShowNuevo(true)} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse shadow-[var(--shadow-card)]">
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
            <div className="w-16 h-16 rounded-2xl bg-white shadow-[var(--shadow-card)] flex items-center justify-center text-3xl mb-4">
              📊
            </div>
            <p className="font-bold text-ink mb-1">Sin presupuestos</p>
            <p className="text-[#6B6B6F] text-sm mb-5">Controla cuánto gastas en cada categoría</p>
            <button onClick={() => setShowNuevo(true)} className="bg-ink text-white rounded-full px-6 py-2.5 text-sm font-semibold">
              Crear presupuesto
            </button>
          </div>
        )}

        {activos.map((p) => (
          <div key={p.id} className="relative group">
            <PresupuestoBar
              presupuesto={p}
              onLongPress={() => handleArchivar(p.id)}
            />
            <button
              onClick={() => handleToggle(p.id, p.activo)}
              className="absolute top-4 right-14 text-xs text-[#6B6B6F] opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Pausar
            </button>
          </div>
        ))}

        {inactivos.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[#6B6B6F] uppercase tracking-wider mb-2">Pausados</p>
            <div className="space-y-3 opacity-50">
              {inactivos.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl p-4 shadow-[var(--shadow-card)] flex items-center justify-between cursor-pointer"
                  onClick={() => handleToggle(p.id, p.activo)}
                >
                  <p className="font-medium text-ink text-sm">{p.nombre}</p>
                  <p className="text-xs text-[#6B6B6F]">Reanudar →</p>
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
        Nuevo presupuesto
      </button>

      <NuevoPresupuestoSheet open={showNuevo} onClose={() => setShowNuevo(false)} />
    </div>
  );
}
