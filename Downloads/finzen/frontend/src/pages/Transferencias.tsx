import { useState } from "react";
import { Plus } from "lucide-react";
import { useTransferencias, useArchivarTransferencia } from "@/hooks/useTransferencias";
import { NuevaTransferenciaSheet } from "@/components/NuevaTransferenciaSheet";
import { formatCurrency, formatDate } from "@/lib/format";
import { ArrowLeftRight } from "lucide-react";
import Decimal from "decimal.js";
import { toast } from "sonner";
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
      toast.success("Transferencia eliminada");
    } catch {
      toast.error("Error al eliminar");
    }
  }

  return (
    <div className="min-h-full bg-app pb-24">
      {/* Header */}
      <div className="bg-ink px-4 pt-10 pb-5 rounded-b-3xl mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-white font-bold text-2xl">Transferencias</h1>
          <button onClick={() => setShowNueva(true)} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse shadow-[var(--shadow-card)]">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && transferencias.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-[var(--shadow-card)] flex items-center justify-center text-3xl mb-4">
              🔄
            </div>
            <p className="font-bold text-ink mb-1">Sin transferencias</p>
            <p className="text-[#6B6B6F] text-sm mb-5">Mueve dinero entre tus cuentas</p>
            <button onClick={() => setShowNueva(true)} className="bg-ink text-white rounded-full px-6 py-2.5 text-sm font-semibold">
              Nueva transferencia
            </button>
          </div>
        )}

        {Array.from(grupos.entries()).map(([fecha, items]) => (
          <div key={fecha}>
            <p className="text-xs font-semibold text-[#6B6B6F] mb-2 uppercase tracking-wider">
              {formatDate(fecha)}
            </p>
            <div className="bg-white rounded-2xl px-4 divide-y divide-[#F2F2F4] shadow-[var(--shadow-card)]">
              {items.map((t) => {
                const orig = t.movimiento_origen;
                const dest = t.movimiento_destino;
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 py-3 cursor-default active:bg-gray-50"
                    onContextMenu={(e) => { e.preventDefault(); handleArchivar(t.id); }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#F2F2F4] flex items-center justify-center flex-shrink-0">
                      <ArrowLeftRight className="w-5 h-5 text-[#6B6B6F]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ink text-sm truncate">
                        {orig?.concepto ?? "Transferencia"}
                      </p>
                      <p className="text-xs text-[#6B6B6F] truncate">
                        {orig?.moneda ?? "?"} → {dest?.moneda ?? "?"}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {orig && (
                        <p className="font-bold text-sm tabular-nums text-[#6B6B6F]">
                          -{formatCurrency(new Decimal(orig.importe).toString(), orig.moneda)}
                        </p>
                      )}
                      {dest && orig && orig.moneda !== dest.moneda && (
                        <p className="text-xs text-[#5BAA1F] tabular-nums">
                          +{formatCurrency(new Decimal(dest.importe).toString(), dest.moneda)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowNueva(true)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink text-white rounded-full px-6 py-4 flex items-center gap-2 font-semibold shadow-[var(--shadow-floating)] active:scale-95 transition-transform"
      >
        <Plus className="w-5 h-5" />
        Nueva transferencia
      </button>

      <NuevaTransferenciaSheet open={showNueva} onClose={() => setShowNueva(false)} />
    </div>
  );
}
