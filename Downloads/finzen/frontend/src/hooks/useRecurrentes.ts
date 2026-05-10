import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Recurrente } from "@/types/api";
import { useWorkspaceStore } from "@/stores/workspace";

const KEY = "recurrentes";

export function useRecurrentes() {
  const ws = useWorkspaceStore((s) => s.workspace);
  return useQuery<Recurrente[]>({
    queryKey: [KEY, ws?.id],
    queryFn: () => api.get<Recurrente[]>("/recurrentes"),
    enabled: !!ws,
  });
}

export function useCrearRecurrente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post<Recurrente>("/recurrentes", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useActualizarRecurrente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      api.patch<Recurrente>(`/recurrentes/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useEjecutarRecurrente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Recurrente>(`/recurrentes/${id}/ejecutar`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["movimientos"] });
      qc.invalidateQueries({ queryKey: ["cuentas"] });
      qc.invalidateQueries({ queryKey: ["dashboard-resumen"] });
    },
  });
}

export function useArchivarRecurrente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/recurrentes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
