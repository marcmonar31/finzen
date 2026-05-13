import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Search, X, SlidersHorizontal, ArrowLeft, ClipboardList, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useMovimientos, useArchivarMovimiento } from "@/hooks/useMovimientos";
import { MovimientoItem } from "@/components/MovimientoItem";
import { NuevoMovimientoSheet } from "@/components/NuevoMovimientoSheet";
import { EditarMovimientoSheet } from "@/components/EditarMovimientoSheet";
import { FiltroMovimientosSheet, type FiltrosAplicados } from "@/components/FiltroMovimientosSheet";
import { formatDate, formatCurrency } from "@/lib/format";
import type { Movimiento } from "@/types/api";
import { showFlash } from "@/stores/flash";
import { useWorkspaceStore } from "@/stores/workspace";

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
  const { t } = useTranslation();
  const moneda = useWorkspaceStore((s) => s.workspace?.moneda_base ?? "EUR");
  const [busqueda,      setBusqueda]      = useState("");
  const [showNuevo,     setShowNuevo]     = useState(false);
  const [editando,      setEditando]      = useState<Movimiento | null>(null);
  const [showFiltros,   setShowFiltros]   = useState(false);
  const [filtrosActivos, setFiltrosActivos] = useState<FiltrosAplicados>({ limit: 100 });
  const archivar = useArchivarMovimiento();

  const hayFiltros = !!(
    filtrosActivos.tipo ||
    filtrosActivos.fecha_desde ||
    filtrosActivos.fecha_hasta ||
    filtrosActivos.categoria_id ||
    filtrosActivos.cuenta_id
  );

  const { data: movimientos = [], isLoading } = useMovimientos({
    ...filtrosActivos,
    busqueda: busqueda || undefined,
  });

  const grupos = agruparPorFecha(movimientos);

  const resumenFiltrado = useMemo(() => {
    if (!hayFiltros && !busqueda) return null;
    let ingresos = 0, gastos = 0;
    for (const m of movimientos) {
      if (m.tipo === "ingreso") ingresos += parseFloat(m.importe_base);
      else if (m.tipo === "gasto") gastos += parseFloat(m.importe_base);
    }
    return { ingresos, gastos };
  }, [movimientos, hayFiltros, busqueda]);

  async function handleArchivar(id: string) {
    try {
      await archivar.mutateAsync(id);
      showFlash(t("movimientos.movimiento_eliminado"), "delete");
    } catch {
      showFlash(t("common.error"), "error");
    }
  }

  return (
    <div className="min-h-full bg-app pb-24">
      {/* Header — píldora flotante */}
      <div className="pt-10 px-4 pb-4">
        <div className="bg-ink rounded-3xl px-5 py-4 flex items-center justify-between shadow-[var(--shadow-floating)]">
          <h1 className="text-white font-bold text-2xl">{t("movimientos.titulo")}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFiltros(true)}
              className="relative w-9 h-9 rounded-full bg-white/15 flex items-center justify-center active:scale-95 transition-transform"
            >
              <SlidersHorizontal className="w-4 h-4 text-white" />
              {hayFiltros && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#C7FF6B]" />
              )}
            </button>
            <button
              onClick={() => setShowNuevo(true)}
              className="w-9 h-9 rounded-full bg-[#C7FF6B] flex items-center justify-center active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4 text-fg" />
            </button>
          </div>
        </div>
        {/* Buscador — solo cuando no hay filtros activos */}
        {!hayFiltros && (
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={t("movimientos.buscar")}
              className="w-full bg-surface text-fg placeholder:text-[#B0B0B4] rounded-2xl pl-9 pr-9 py-2.5 text-sm focus:outline-none shadow-[var(--shadow-card)]"
            />
            {busqueda && (
              <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-fg-muted" />
              </button>
            )}
          </div>
        )}

        {/* Banner de filtros activos */}
        {hayFiltros && (
          <button
            onClick={() => { setFiltrosActivos({ limit: 100 }); setBusqueda(""); }}
            className="mt-3 w-full flex items-center gap-2 bg-ink/90 text-white rounded-2xl px-4 py-2.5 text-sm font-semibold active:scale-95 transition-transform shadow-[var(--shadow-card)]"
          >
            <ArrowLeft className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">
              {filtrosActivos._periodoLabel ?? t("movimientos.filtros_activos")} — {t("movimientos.toca_limpiar")}
            </span>
          </button>
        )}

        {/* Resumen del período filtrado */}
        {resumenFiltrado && !isLoading && movimientos.length > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="bg-surface rounded-2xl px-4 py-3 flex items-center gap-2 shadow-[var(--shadow-card)]">
              <ArrowDownLeft className="w-4 h-4 text-[#5BAA1F] flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-fg-muted uppercase tracking-wide font-semibold">{t("dashboard.ingresos_mes")}</p>
                <p className="text-sm font-bold text-[#5BAA1F] tabular-nums truncate">
                  +{formatCurrency(resumenFiltrado.ingresos.toFixed(2), moneda)}
                </p>
              </div>
            </div>
            <div className="bg-surface rounded-2xl px-4 py-3 flex items-center gap-2 shadow-[var(--shadow-card)]">
              <ArrowUpRight className="w-4 h-4 text-[#FF5C5C] flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-fg-muted uppercase tracking-wide font-semibold">{t("dashboard.gastos_mes")}</p>
                <p className="text-sm font-bold text-[#FF5C5C] tabular-nums truncate">
                  -{formatCurrency(resumenFiltrado.gastos.toFixed(2), moneda)}
                </p>
              </div>
            </div>
          </div>
        )}
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
            <div className="w-16 h-16 rounded-2xl bg-surface shadow-[var(--shadow-card)] flex items-center justify-center mb-4">
              <ClipboardList className="w-8 h-8 text-fg-muted" />
            </div>
            <p className="font-bold text-fg mb-1">{t("movimientos.sin_movimientos")}</p>
            <p className="text-fg-muted text-sm mb-5">
              {busqueda || hayFiltros ? t("movimientos.no_resultados") : t("movimientos.registra_primero")}
            </p>
            {!busqueda && !hayFiltros && (
              <button onClick={() => setShowNuevo(true)} className="bg-ink text-white rounded-full px-6 py-2.5 text-sm font-semibold">
                {t("movimientos.anadir")}
              </button>
            )}
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

      <NuevoMovimientoSheet open={showNuevo} onClose={() => setShowNuevo(false)} />
      <EditarMovimientoSheet movimiento={editando} onClose={() => setEditando(null)} />
      <FiltroMovimientosSheet
        open={showFiltros}
        onClose={() => setShowFiltros(false)}
        onAplicar={(f) => { setFiltrosActivos(f); setBusqueda(""); }}
        filtrosActuales={filtrosActivos}
      />
    </div>
  );
}
