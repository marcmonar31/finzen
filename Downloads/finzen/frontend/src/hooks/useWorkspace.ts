import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Workspace } from "@/types/api";
import { useUsuarioStore } from "@/stores/usuario";

export function useMisWorkspaces() {
  const usuario = useUsuarioStore((s) => s.usuario);
  return useQuery<Workspace[]>({
    queryKey: ["workspaces", usuario?.id],
    queryFn: () => api.get<Workspace[]>("/usuarios/me/workspaces"),
    enabled: !!usuario,
  });
}
