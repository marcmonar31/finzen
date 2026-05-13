import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Cuenta } from "@/types/api";
import { useWorkspaceStore } from "@/stores/workspace";

const KEY = "cuentas";

export function useCuentas() {
  const ws = useWorkspaceStore((s) => s.workspace);
  return useQuery<Cuenta[]>({
    queryKey: [KEY, ws?.id],
    queryFn: () => api.get<Cuenta[]>("/cuentas"),
    enabled: !!ws,
  });
}

export function useCrearCuenta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<Cuenta>("/cuentas", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["dashboard-resumen"] });
    },
  });
}

export function useActualizarCuenta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      api.patch<Cuenta>(`/cuentas/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["dashboard-resumen"] });
    },
  });
}

export function useArchivarCuenta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/cuentas/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["movimientos"] });
      qc.invalidateQueries({ queryKey: ["dashboard-resumen"] });
    },
  });
}
