import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ObjetivoOut, AportacionOut } from "@/types/api";

export function useObjetivos() {
  return useQuery<ObjetivoOut[]>({
    queryKey: ["objetivos"],
    queryFn: () => api.get("/objetivos"),
  });
}

export function useAportaciones(objetivoId: string) {
  return useQuery<AportacionOut[]>({
    queryKey: ["objetivos", objetivoId, "aportaciones"],
    queryFn: () => api.get(`/objetivos/${objetivoId}/aportaciones`),
    enabled: !!objetivoId,
  });
}

export function useCrearObjetivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      nombre: string; emoji?: string; importe_objetivo: string;
      moneda?: string; fecha_objetivo?: string | null; cuenta_id?: string | null;
    }) => api.post("/objetivos", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["objetivos"] }),
  });
}

export function useActualizarObjetivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [k: string]: unknown }) =>
      api.patch(`/objetivos/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["objetivos"] }),
  });
}

export function useArchivarObjetivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/objetivos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["objetivos"] }),
  });
}

export function useAportar(objetivoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { importe: string; moneda?: string; fecha: string; concepto?: string }) =>
      api.post(`/objetivos/${objetivoId}/aportaciones`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["objetivos"] });
      qc.invalidateQueries({ queryKey: ["objetivos", objetivoId, "aportaciones"] });
    },
  });
}
