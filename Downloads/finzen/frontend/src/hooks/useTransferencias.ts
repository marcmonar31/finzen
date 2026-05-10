import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Transferencia } from "@/types/api";
import { useWorkspaceStore } from "@/stores/workspace";

const KEY = "transferencias";

export function useTransferencias() {
  const ws = useWorkspaceStore((s) => s.workspace);
  return useQuery<Transferencia[]>({
    queryKey: [KEY, ws?.id],
    queryFn: () => api.get<Transferencia[]>("/transferencias"),
    enabled: !!ws,
  });
}

export function useCrearTransferencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post<Transferencia>("/transferencias", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["movimientos"] });
      qc.invalidateQueries({ queryKey: ["cuentas"] });
      qc.invalidateQueries({ queryKey: ["dashboard-resumen"] });
    },
  });
}

export function useArchivarTransferencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/transferencias/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["movimientos"] });
      qc.invalidateQueries({ queryKey: ["cuentas"] });
      qc.invalidateQueries({ queryKey: ["dashboard-resumen"] });
    },
  });
}
