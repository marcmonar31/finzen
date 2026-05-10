import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ReglaOut, ReglaEjecucionOut } from "@/types/api";

// ── Queries ──────────────────────────────────────────────────────────────────

export function useReglas() {
  return useQuery<ReglaOut[]>({
    queryKey: ["reglas"],
    queryFn: () => api.get("/reglas"),
  });
}

export function useEjecucionesRegla(reglaId: string) {
  return useQuery<ReglaEjecucionOut[]>({
    queryKey: ["reglas", reglaId, "ejecuciones"],
    queryFn: () => api.get(`/reglas/${reglaId}/ejecuciones`),
    enabled: !!reglaId,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

interface ReglaCreatePayload {
  nombre: string;
  descripcion?: string;
  trigger_tipo: string;
  trigger_config?: Record<string, unknown>;
  condiciones?: Array<Record<string, unknown>>;
  modo_condiciones?: "AND" | "OR";
  acciones?: Array<Record<string, unknown>>;
  max_ejecuciones_mes?: number | null;
  orden?: number;
}

export function useCrearRegla() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ReglaCreatePayload) => api.post("/reglas", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reglas"] }),
  });
}

export function useActualizarRegla() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<ReglaCreatePayload> & { activa?: boolean }) =>
      api.patch(`/reglas/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reglas"] }),
  });
}

export function useArchivarRegla() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/reglas/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reglas"] }),
  });
}

export function useSimularRegla() {
  return useMutation({
    mutationFn: ({ id, dias_atras = 30 }: { id: string; dias_atras?: number }) =>
      api.post(`/reglas/${id}/simular?dias_atras=${dias_atras}`, {}),
  });
}
