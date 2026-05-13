import { useState } from "react";
import { Plus } from "lucide-react";
import { useTransferencias, useArchivarTransferencia } from "@/hooks/useTransferencias";
import { TransferenciaItem } from "@/components/TransferenciaItem";
import { NuevaTransferenciaSheet } from "@/components/NuevaTransferenciaSheet";
import { formatDate } from "@/lib/format";
import { showFlash } from "@/stores/flash";
import type { Transferencia } from "@/types/api";

function agruparPorFecha(transfers: Transferencia[]): Map<string, Transferencia[]> {
  const mapa = new Map<string, Transferencia[]>();
  for (const t of transfers) {
    const fecha = t.creado_en.slice(0, 10);
    const grupo = mapa.get(fecha) ?? [];
    grupo.push(t);
    mapa.set(fecha, grupo);
  }
  return mapa;
}

export function Transferencias() {
  const [showNueva, setShowNueva] = useState(false);
  const { data: transferencias = [], isLoading } = useTransferencias();
  const archivar = useArchivarTransferencia();

  const grupos = agruparPorFecha(transferencias);

  async function handleArchivar(id: string) {
    try {
      await archivar.mutateAsync(id);
      showFlash("Transferencia eliminada", "delete");
    } catch {
      showFlash("Error al eliminar", "error");
    }
  }

  return (
    <div className="min-h-full bg-app pb-24">
      {/* Header — píldora flotante */}
      <div className="pt-10 px-4 pb-4">
        <div className="bg-ink rounded-3xl px-5 py-4 flex items-center justify-between shadow-[var(--shadow-floating)]">
          <h1 className="text-white font-bold text-2xl">Transferencias</h1>
          <button
            onClick={() => setShowNueva(true)}
            className="w-9 h-9 rounded-full bg-[#C7FF6B] flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4 text-fg" />
          </button>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
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

        {!isLoading && transferencias.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface shadow-[var(--shadow-card)] flex items-center justify-center text-3xl mb-4">
              🔄
            </div>
            <p className="font-bold text-fg mb-1">Sin transferencias</p>
            <p className="text-fg-muted text-sm mb-5">Mueve dinero entre tus cuentas</p>
            <button
              onClick={() => setShowNueva(true)}
              className="bg-ink text-white rounded-full px-6 py-2.5 text-sm font-semibold"
            >
              Nueva transferencia
            </button>
          </div>
        )}

        {Array.from(grupos.entries()).map(([fecha, items]) => (
          <div key={fecha}>
            <p className="text-xs font-semibold text-fg-muted mb-2 uppercase tracking-wider">
              {formatDate(fecha)}
            </p>
            <div className="bg-surface rounded-2xl overflow-hidden divide-y divide-border-ui shadow-[var(--shadow-card)]">
              {items.map((t) => (
                <TransferenciaItem
                  key={t.id}
                  transferencia={t}
                  onDelete={() => handleArchivar(t.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <NuevaTransferenciaSheet open={showNueva} onClose={() => setShowNueva(false)} />
    </div>
  );
}
