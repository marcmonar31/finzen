import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AmigoExternoOut, AmigoOut } from "@/types/api";

export function useAmigos() {
  return useQuery<AmigoOut[]>({
    queryKey: ["amigos"],
    queryFn: () => api.get("/amigos"),
  });
}

export function usePendientes() {
  return useQuery<AmigoOut[]>({
    queryKey: ["amigos", "pendientes"],
    queryFn: () => api.get("/amigos/pendientes"),
  });
}

export function useBuscarUsuario(q: string) {
  return useQuery<Array<{ id: string; usuario_unico: string; nombre: string; avatar_emoji: string }>>({
    queryKey: ["usuarios", "buscar", q],
    queryFn: () => api.get(`/amigos/buscar?q=${encodeURIComponent(q)}`),
    enabled: q.length >= 2,
  });
}

export function useEnviarSolicitud() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (receptor_usuario_unico: string) =>
      api.post("/amigos/solicitud", { receptor_usuario_unico }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["amigos"] }),
  });
}

export function useAceptarSolicitud() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amigo_id: string) => api.post(`/amigos/${amigo_id}/aceptar`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["amigos"] });
      qc.invalidateQueries({ queryKey: ["amigos", "pendientes"] });
    },
  });
}

export function useRechazarSolicitud() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amigo_id: string) => api.post(`/amigos/${amigo_id}/rechazar`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["amigos", "pendientes"] }),
  });
}

export function useAmigosExternos() {
  return useQuery<AmigoExternoOut[]>({
    queryKey: ["amigos", "externos"],
    queryFn: () => api.get("/amigos/externos"),
  });
}

export function useCrearExterno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { nombre: string; email?: string; telefono?: string }) =>
      api.post("/amigos/externos", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["amigos", "externos"] }),
  });
}
