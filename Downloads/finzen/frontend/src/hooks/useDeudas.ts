import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DeudaOut, CuotaOut } from "@/types/api";

export function useDeudas() {
  return useQuery<DeudaOut[]>({
    queryKey: ["deudas"],
    queryFn: () => api.get("/deudas"),
  });
}

export function useCuotas(deudaId: string) {
  return useQuery<CuotaOut[]>({
    queryKey: ["deudas", deudaId, "cuotas"],
    queryFn: () => api.get(`/deudas/${deudaId}/cuotas`),
    enabled: !!deudaId,
  });
}

export function useCrearDeuda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      nombre: string; tipo?: string; importe_total: string; moneda?: string;
      tasa_interes_anual?: string; num_cuotas?: number | null;
      fecha_inicio: string; dia_cuota?: number;
    }) => api.post("/deudas", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deudas"] }),
  });
}

export function useArchivarDeuda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/deudas/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deudas"] }),
  });
}
