import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Movimiento, ResumenDashboard } from "@/types/api";
import { useWorkspaceStore } from "@/stores/workspace";

const KEY = "movimientos";

interface FiltrosMovimientos {
  cuenta_id?: string;
  categoria_id?: string;
  busqueda?: string;
  limit?: number;
  offset?: number;
}

export function useMovimientos(filtros: FiltrosMovimientos = {}) {
  const ws = useWorkspaceStore((s) => s.workspace);
  const params = new URLSearchParams();
  if (filtros.cuenta_id) params.set("cuenta_id", filtros.cuenta_id);
  if (filtros.categoria_id) params.set("categoria_id", filtros.categoria_id);
  if (filtros.busqueda) params.set("busqueda", filtros.busqueda);
  if (filtros.limit) params.set("limit", String(filtros.limit));
  if (filtros.offset) params.set("offset", String(filtros.offset));

  return useQuery<Movimiento[]>({
    queryKey: [KEY, ws?.id, filtros],
    queryFn: () => api.get<Movimiento[]>(`/movimientos?${params.toString()}`),
    enabled: !!ws,
  });
}

export function useResumenDashboard() {
  const ws = useWorkspaceStore((s) => s.workspace);
  return useQuery<ResumenDashboard>({
    queryKey: ["dashboard-resumen", ws?.id],
    queryFn: () => api.get<ResumenDashboard>("/movimientos/dashboard/resumen"),
    enabled: !!ws,
  });
}

export function useCrearMovimiento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<Movimiento>("/movimientos", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["cuentas"] });
      qc.invalidateQueries({ queryKey: ["dashboard-resumen"] });
    },
  });
}

export function useArchivarMovimiento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/movimientos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["cuentas"] });
      qc.invalidateQueries({ queryKey: ["dashboard-resumen"] });
    },
  });
}
