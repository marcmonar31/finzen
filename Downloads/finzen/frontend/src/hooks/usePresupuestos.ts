import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Presupuesto } from "@/types/api";
import { useWorkspaceStore } from "@/stores/workspace";

const KEY = "presupuestos";

export function usePresupuestos() {
  const ws = useWorkspaceStore((s) => s.workspace);
  return useQuery<Presupuesto[]>({
    queryKey: [KEY, ws?.id],
    queryFn: () => api.get<Presupuesto[]>("/presupuestos"),
    enabled: !!ws,
  });
}

export function useCrearPresupuesto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post<Presupuesto>("/presupuestos", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useActualizarPresupuesto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      api.patch<Presupuesto>(`/presupuestos/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useArchivarPresupuesto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/presupuestos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
