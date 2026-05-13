import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMovimientos, useArchivarMovimiento } from "@/hooks/useMovimientos";
import { MovimientoItem } from "@/components/MovimientoItem";
import { EditarMovimientoSheet } from "@/components/EditarMovimientoSheet";
import { AppIcon } from "@/components/AppIcon";
import { formatDate, formatCurrency } from "@/lib/format";
import { showFlash } from "@/stores/flash";
import type { Cuenta, Movimiento } from "@/types/api";

function agruparPorFecha(movs: Movimiento[]): Map<string, Movimiento[]> {
  const mapa = new Map<string, Movimiento[]>();
  for (const m of movs) {
    const grupo = mapa.get(m.fecha) ?? [];
    grupo.push(m);
    mapa.set(m.fecha, grupo);
  }
  return mapa;
}

interface Props {
  cuenta: Cuenta | null;
  onClose: () => void;
}

export function MovimientosCuentaSheet({ cuenta, onClose }: Props) {
  const { t } = useTranslation();
  const open = !!cuenta;
  const [editando, setEditando] = useState<Movimiento | null>(null);
  const archivar = useArchivarMovimiento();

  const { data: movimientos = [], isLoading } = useMovimientos({
    cuenta_id: cuenta?.id,
    limit: 100,
  });

  const grupos = agruparPorFecha(movimientos);

  async function handleArchivar(id: string) {
    try {
      await archivar.mutateAsync(id);
      showFlash(t("movimientos.movimiento_eliminado") || "Movimiento eliminado", "delete");
    } catch {
      showFlash(t("common.error"), "error");
    }
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", damping: 28, stiffness: 380 }}
              className="w-full max-w-md bg-surface rounded-3xl max-h-[85vh] flex flex-col shadow-[var(--shadow-floating)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-5 pt-5 pb-4 flex items-center gap-3 border-b border-border-ui flex-shrink-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: cuenta?.color ? `${cuenta.color}22` : "#F2F2F4" }}
                >
                  <AppIcon name={cuenta?.emoji ?? ""} size={20} className="text-fg-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-fg truncate">{cuenta?.nombre}</p>
                  {cuenta?.saldo != null && (
                    <p className="text-xs text-fg-muted tabular-nums">
                      {formatCurrency(cuenta.saldo, cuenta.moneda)}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center flex-shrink-0"
                >
                  <X className="w-4 h-4 text-fg" />
                </button>
              </div>

              {/* Lista */}
              <div className="overflow-y-auto flex-1 px-4 py-4 space-y-5">
                {isLoading && (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 py-2 animate-pulse">
                        <div className="w-9 h-9 rounded-xl bg-gray-100" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 bg-gray-100 rounded w-2/3" />
                          <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                        </div>
                        <div className="w-14 h-3.5 bg-gray-100 rounded" />
                      </div>
                    ))}
                  </div>
                )}

                {!isLoading && movimientos.length === 0 && (
                  <div className="flex flex-col items-center py-10 text-center">
                    <p className="text-fg-muted text-sm">{t("movimientos.sin_movimientos")}</p>
                  </div>
                )}

                {Array.from(grupos.entries()).map(([fecha, movs]) => (
                  <div key={fecha}>
                    <p className="text-xs font-semibold text-fg-muted mb-2 uppercase tracking-wider">
                      {formatDate(fecha)}
                    </p>
                    <div className="bg-surface rounded-2xl overflow-hidden divide-y divide-border-ui shadow-[var(--shadow-card)]">
                      {movs.map((m) => (
                        <MovimientoItem
                          key={m.id}
                          movimiento={m}
                          onEdit={(mov) => setEditando(mov)}
                          onDelete={() => handleArchivar(m.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <EditarMovimientoSheet movimiento={editando} onClose={() => setEditando(null)} />
    </>
  );
}
