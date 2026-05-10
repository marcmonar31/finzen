import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { BalanceGrupoOut, GastoCompartidoOut, GrupoOut, LiquidacionOut } from "@/types/api";

export function useGrupos() {
  return useQuery<GrupoOut[]>({
    queryKey: ["grupos"],
    queryFn: () => api.get("/grupos"),
  });
}

export function useGrupo(grupo_id: string) {
  return useQuery<GrupoOut>({
    queryKey: ["grupos", grupo_id],
    queryFn: () => api.get(`/grupos/${grupo_id}`),
    enabled: !!grupo_id,
  });
}

export function useCrearGrupo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      nombre: string;
      emoji?: string;
      descripcion?: string;
      moneda_principal?: string;
      es_cuenta_real?: boolean;
      modo_reparto_default?: string;
      miembro_usuario_ids?: string[];
      miembro_externo_ids?: string[];
      workspace_id?: string;
    }) => api.post("/grupos", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grupos"] }),
  });
}

export function useGastosGrupo(grupo_id: string) {
  return useQuery<GastoCompartidoOut[]>({
    queryKey: ["grupos", grupo_id, "gastos"],
    queryFn: () => api.get(`/grupos/${grupo_id}/gastos`),
    enabled: !!grupo_id,
  });
}

export function useCrearGasto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      grupo_id: string;
      concepto: string;
      importe: string;
      moneda: string;
      fecha: string;
      pagador_id: string;
      modo_reparto?: string;
      miembro_ids?: string[];
      repartos?: Array<{ miembro_id: string; importe_manual?: string; porcentaje?: string; partes?: number }>;
      afecta_cuenta_personal?: boolean;
      cuenta_personal_id?: string;
      categoria_id?: string;
    }) => api.post(`/grupos/${data.grupo_id}/gastos`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["grupos", vars.grupo_id, "gastos"] });
      qc.invalidateQueries({ queryKey: ["grupos", vars.grupo_id, "balance"] });
    },
  });
}

export function useBalanceGrupo(grupo_id: string) {
  return useQuery<BalanceGrupoOut>({
    queryKey: ["grupos", grupo_id, "balance"],
    queryFn: () => api.get(`/grupos/${grupo_id}/balance`),
    enabled: !!grupo_id,
  });
}

export function useLiquidacionesGrupo(grupo_id: string) {
  return useQuery<LiquidacionOut[]>({
    queryKey: ["grupos", grupo_id, "liquidaciones"],
    queryFn: () => api.get(`/grupos/${grupo_id}/liquidaciones`),
    enabled: !!grupo_id,
  });
}

export function useRegistrarLiquidacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      grupo_id: string;
      de_miembro_id: string;
      a_miembro_id: string;
      importe: string;
      moneda: string;
    }) => api.post(`/grupos/${data.grupo_id}/liquidaciones`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["grupos", vars.grupo_id, "balance"] });
      qc.invalidateQueries({ queryKey: ["grupos", vars.grupo_id, "liquidaciones"] });
    },
  });
}

export function useConfirmarLiquidacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ grupo_id, liq_id }: { grupo_id: string; liq_id: string }) =>
      api.post(`/grupos/${grupo_id}/liquidaciones/${liq_id}/confirmar`, {}),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["grupos", vars.grupo_id, "balance"] });
      qc.invalidateQueries({ queryKey: ["grupos", vars.grupo_id, "liquidaciones"] });
    },
  });
}

export function useSalirGrupo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (grupo_id: string) => api.delete(`/grupos/${grupo_id}/salir`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grupos"] }),
  });
}
