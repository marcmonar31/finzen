import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Usuario } from "@/types/api";

interface UsuarioStore {
  usuario: Usuario | null;
  setUsuario: (u: Usuario | null) => void;
}

export const useUsuarioStore = create<UsuarioStore>()(
  persist(
    (set) => ({
      usuario: null,
      setUsuario: (u) => set({ usuario: u }),
    }),
    { name: "finzen-usuario" }
  )
);
