import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Categoria } from "@/types/api";
import { useWorkspaceStore } from "@/stores/workspace";

export function useCategorias(tipo?: "ingreso" | "gasto" | "transferencia") {
  const ws = useWorkspaceStore((s) => s.workspace);
  const params = tipo ? `?tipo=${tipo}&flat=true` : "?flat=true";
  return useQuery<Categoria[]>({
    queryKey: ["categorias", ws?.id, tipo],
    queryFn: () => api.get<Categoria[]>(`/categorias${params}`),
    enabled: !!ws,
  });
}

export function useCategoriasArbol() {
  const ws = useWorkspaceStore((s) => s.workspace);
  return useQuery<Categoria[]>({
    queryKey: ["categorias-arbol", ws?.id],
    queryFn: () => api.get<Categoria[]>("/categorias"),
    enabled: !!ws,
  });
}

export function useCrearCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      nombre: string;
      tipo: string;
      parent_id?: string | null;
      emoji?: string | null;
      color?: string | null;
      orden?: number;
    }) => api.post<Categoria>("/categorias", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categorias"] });
      qc.invalidateQueries({ queryKey: ["categorias-arbol"] });
    },
  });
}

export function useActualizarCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; nombre?: string; emoji?: string | null; color?: string | null; orden?: number }) =>
      api.patch<Categoria>(`/categorias/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categorias"] });
      qc.invalidateQueries({ queryKey: ["categorias-arbol"] });
    },
  });
}

export function useArchivarCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/categorias/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categorias"] });
      qc.invalidateQueries({ queryKey: ["categorias-arbol"] });
    },
  });
}
