import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DeudaOut, CuotaOut, PagoAnticipadoOut } from "@/types/api";

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

export function useActualizarDeuda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; nombre?: string; tasa_interes_anual?: string; num_cuotas?: number | null; dia_cuota?: number }) =>
      api.patch(`/deudas/${id}`, body),
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

export function usePagosAnticipados(deudaId: string) {
  return useQuery<PagoAnticipadoOut[]>({
    queryKey: ["deudas", deudaId, "pagos"],
    queryFn: () => api.get(`/deudas/${deudaId}/pagos`),
    enabled: !!deudaId,
  });
}

export function useCrearPagoAnticipado(deudaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { fecha: string; importe: string; notas?: string }) =>
      api.post<PagoAnticipadoOut>(`/deudas/${deudaId}/pagos`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deudas"] });
      qc.invalidateQueries({ queryKey: ["deudas", deudaId, "cuotas"] });
      qc.invalidateQueries({ queryKey: ["deudas", deudaId, "pagos"] });
    },
  });
}
