import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ActivoOut, ResumenCartera } from "@/types/api";

export function useActivos() {
  return useQuery<ActivoOut[]>({
    queryKey: ["activos"],
    queryFn: () => api.get("/inversiones/activos"),
  });
}

export function useCartera() {
  return useQuery<ResumenCartera>({
    queryKey: ["cartera"],
    queryFn: () => api.get("/inversiones/posiciones"),
  });
}

export function useCrearActivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { ticker: string; nombre: string; tipo?: string; moneda?: string }) =>
      api.post<ActivoOut>("/inversiones/activos", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activos"] }),
  });
}

export function useCrearPosicion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      activo_id: string;
      cantidad: string;
      precio_medio: string;
      moneda?: string;
      cuenta_id?: string;
    }) => api.post("/inversiones/posiciones", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cartera"] }),
  });
}

export function useActualizarPrecios() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/inversiones/precios/actualizar", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cartera"] }),
  });
}

export function useCerrarPosicion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (posId: string) => api.delete(`/inversiones/posiciones/${posId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cartera"] }),
  });
}

export function useBuscarTicker(ticker: string, tipo = "accion") {
  return useQuery({
    queryKey: ["buscar-ticker", ticker, tipo],
    queryFn: () => api.get<{ ticker: string; precio: string; moneda: string; variacion_dia: string | null }>(
      `/inversiones/buscar/${ticker}?tipo=${tipo}`
    ),
    enabled: ticker.length >= 2,
    retry: false,
  });
}
