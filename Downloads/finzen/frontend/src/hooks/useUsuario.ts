import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useUsuarioStore } from "@/stores/usuario";
import type { Usuario } from "@/types/api";

export function useActualizarUsuario() {
  const setUsuario = useUsuarioStore((s) => s.setUsuario);

  return useMutation({
    mutationFn: (body: Partial<Pick<Usuario, "nombre" | "email" | "avatar_emoji" | "avatar_color" | "foto_data" | "ocultar_importes" | "tema" | "idioma" | "formato_fecha" | "primer_dia_mes" | "primer_dia_semana">>) =>
      api.patch<Usuario>("/usuarios/me", body),
    onSuccess: (updated) => {
      setUsuario(updated);
    },
  });
}
