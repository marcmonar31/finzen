import { useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { useMovimientos, useArchivarMovimiento } from "@/hooks/useMovimientos";
import { MovimientoItem } from "@/components/MovimientoItem";
import { NuevoMovimientoSheet } from "@/components/NuevoMovimientoSheet";
import { formatDate } from "@/lib/format";
import type { Movimiento } from "@/types/api";
import { toast } from "sonner";

function agruparPorFecha(movs: Movimiento[]): Map<string, Movimiento[]> {
  const mapa = new Map<string, Movimiento[]>();
  for (const m of movs) {
    const grupo = mapa.get(m.fecha) ?? [];
    grupo.push(m);
    mapa.set(m.fecha, grupo);
  }
  return mapa;
}

export function Movimientos() {
  const [busqueda, setBusqueda] = useState("");
  const [showNuevo, setShowNuevo] = useState(false);
  const archivar = useArchivarMovimiento();

  const { data: movimientos = [], isLoading } = useMovimientos({
    busqueda: busqueda || undefined,
    limit: 100,
  });

  const grupos = agruparPorFecha(movimientos);

  async function handleArchivar(id: string) {
    try {
      await archivar.mutateAsync(id);
      toast.success("Movimiento eliminado");
    } catch {
      toast.error("Error al eliminar");
    }
  }

  return (
    <div className="min-h-full bg-app pb-24">
      {/* Header */}
      <div className="bg-ink px-4 pt-10 pb-5 rounded-b-3xl mb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-white font-bold text-2xl">Movimientos</h1>
          <button onClick={() => setShowNuevo(true)} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>
        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar movimientos…"
            className="w-full bg-white/10 text-white placeholder:text-white/40 rounded-2xl pl-9 pr-9 py-2.5 text-sm focus:outline-none"
          />
          {busqueda && (
            <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-white/60" />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 space-y-6">
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 py-3 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-gray-200" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
                <div className="w-16 h-4 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && movimientos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-[var(--shadow-card)] flex items-center justify-center text-3xl mb-4">📋</div>
            <p className="font-bold text-ink mb-1">Sin movimientos</p>
            <p className="text-[#6B6B6F] text-sm mb-5">
              {busqueda ? "No se encontraron resultados" : "Registra tu primer movimiento"}
            </p>
            {!busqueda && (
              <button onClick={() => setShowNuevo(true)} className="bg-ink text-white rounded-full px-6 py-2.5 text-sm font-semibold">
                Añadir movimiento
              </button>
            )}
          </div>
        )}

        {Array.from(grupos.entries()).map(([fecha, movs]) => (
          <div key={fecha}>
            <p className="text-xs font-semibold text-[#6B6B6F] mb-2 uppercase tracking-wider">
              {formatDate(fecha)}
            </p>
            <div className="bg-white rounded-2xl px-4 divide-y divide-[#F2F2F4] shadow-[var(--shadow-card)]">
              {movs.map((m) => (
                <MovimientoItem
                  key={m.id}
                  movimiento={m}
                  onLongPress={() => handleArchivar(m.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowNuevo(true)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink text-white rounded-full px-6 py-4 flex items-center gap-2 font-semibold shadow-[var(--shadow-floating)] active:scale-95 transition-transform"
      >
        <Plus className="w-5 h-5" />
        Añadir
      </button>

      <NuevoMovimientoSheet open={showNuevo} onClose={() => setShowNuevo(false)} />
    </div>
  );
}
