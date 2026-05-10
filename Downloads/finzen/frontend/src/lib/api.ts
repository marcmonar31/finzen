import { useUsuarioStore } from "@/stores/usuario";
import { useWorkspaceStore } from "@/stores/workspace";

const API_BASE = "/api";

function getHeaders(): HeadersInit {
  const usuario = useUsuarioStore.getState().usuario;
  const workspace = useWorkspaceStore.getState().workspace;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (usuario) headers["X-User-Id"] = usuario.id;
  if (workspace) headers["X-Workspace-Id"] = workspace.id;

  return headers;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { ...getHeaders(), ...init?.headers },
    });
  } catch {
    throw new Error("No se puede conectar con el servidor. ¿Está el backend activo?");
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail ?? "Error desconocido");
  }

  // 204 No Content — nothing to parse
  if (res.status === 204) return undefined as unknown as T;

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
