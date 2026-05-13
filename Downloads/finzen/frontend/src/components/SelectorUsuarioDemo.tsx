import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Usuario, Workspace } from "@/types/api";
import { useUsuarioStore } from "@/stores/usuario";
import { useWorkspaceStore } from "@/stores/workspace";

export function SelectorUsuarioDemo() {
  const setUsuario = useUsuarioStore((s) => s.setUsuario);
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);

  const { data: usuarios = [], isLoading } = useQuery<Usuario[]>({
    queryKey: ["usuarios-demo"],
    queryFn: () => api.get<Usuario[]>("/usuarios/demo"),
  });

  async function seleccionarUsuario(u: Usuario) {
    setUsuario(u);
    try {
      const workspaces = await api.get<Workspace[]>("/usuarios/me/workspaces");
      if (workspaces.length > 0) setWorkspace(workspaces[0]);
    } catch {
      // si falla, continúa sin workspace
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-ink/10 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">💚</div>
          <h1 className="text-3xl font-bold text-fg mb-2">Finzen</h1>
          <p className="text-fg-muted text-sm">Elige con quién quieres entrar</p>
        </div>

        <div className="flex flex-col gap-3">
          {usuarios.map((u) => (
            <button
              key={u.id}
              onClick={() => seleccionarUsuario(u)}
              className="bg-surface rounded-2xl p-4 flex items-center gap-4 shadow-[var(--shadow-card)] active:scale-[0.98] transition-transform"
            >
              <div className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center text-2xl flex-shrink-0">
                {u.avatar_emoji}
              </div>
              <div className="text-left">
                <p className="font-semibold text-fg">{u.nombre}</p>
                <p className="text-sm text-fg-muted">@{u.usuario_unico}</p>
              </div>
              <div className="ml-auto text-fg-subtle text-lg">›</div>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-fg-subtle mt-8">
          Modo demo — auth simulada
        </p>
      </div>
    </div>
  );
}
