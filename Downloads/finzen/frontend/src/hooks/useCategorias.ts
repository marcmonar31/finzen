import { useQuery } from "@tanstack/react-query";
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
