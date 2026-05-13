import { useState } from "react";
import { Plus, Search, UserCheck, UserX } from "lucide-react";
import {
  useAmigos, useAmigosExternos, usePendientes,
  useAceptarSolicitud, useRechazarSolicitud, useEnviarSolicitud, useCrearExterno,
} from "@/hooks/useAmigos";
import { showFlash } from "@/stores/flash";

export function Amigos() {
  const [showBuscar, setShowBuscar] = useState(false);
  const [showExterno, setShowExterno] = useState(false);
  const [query, setQuery] = useState("");
  const [nombreExterno, setNombreExterno] = useState("");

  const { data: amigos = [] } = useAmigos();
  const { data: pendientes = [] } = usePendientes();
  const { data: externos = [] } = useAmigosExternos();
  const aceptar = useAceptarSolicitud();
  const rechazar = useRechazarSolicitud();
  const enviar = useEnviarSolicitud();
  const crearExterno = useCrearExterno();

  async function handleAceptar(id: string) {
    try { await aceptar.mutateAsync(id); showFlash("Solicitud aceptada"); }
    catch { showFlash("Error al aceptar", "error"); }
  }

  async function handleRechazar(id: string) {
    try { await rechazar.mutateAsync(id); }
    catch { showFlash("Error al rechazar", "error"); }
  }

  async function handleBuscarEnviar() {
    if (!query.trim()) return;
    try {
      await enviar.mutateAsync(query.trim());
      showFlash("Solicitud enviada");
      setQuery("");
      setShowBuscar(false);
    } catch (e: unknown) {
      showFlash(e instanceof Error ? e.message : "Error", "error");
    }
  }

  async function handleCrearExterno() {
    if (!nombreExterno.trim()) return;
    try {
      await crearExterno.mutateAsync({ nombre: nombreExterno.trim() });
      showFlash("Amigo externo añadido");
      setNombreExterno("");
      setShowExterno(false);
    } catch { showFlash("Error al añadir", "error"); }
  }

  return (
    <div className="min-h-full bg-app pb-24">
      <div className="bg-ink px-4 pt-10 pb-5 rounded-b-3xl mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-white font-bold text-2xl">Amigos</h1>
          <button onClick={() => setShowBuscar(true)} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <Search className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Solicitudes pendientes */}
        {pendientes.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">
              Solicitudes pendientes ({pendientes.length})
            </p>
            <div className="bg-surface rounded-2xl divide-y divide-border-ui shadow-[var(--shadow-card)]">
              {pendientes.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center text-xl flex-shrink-0">
                    {a.avatar_emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-fg text-sm">{a.nombre}</p>
                    <p className="text-xs text-fg-muted">@{a.usuario_unico}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleAceptar(a.id)} className="w-8 h-8 rounded-full bg-[#5BAA1F]/10 flex items-center justify-center">
                      <UserCheck className="w-4 h-4 text-[#5BAA1F]" />
                    </button>
                    <button onClick={() => handleRechazar(a.id)} className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                      <UserX className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mis amigos */}
        {amigos.length > 0 ? (
          <div>
            <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">
              Mis amigos ({amigos.length})
            </p>
            <div className="bg-surface rounded-2xl divide-y divide-border-ui shadow-[var(--shadow-card)]">
              {amigos.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center text-xl flex-shrink-0">
                    {a.avatar_emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-fg text-sm">{a.nombre}</p>
                    <p className="text-xs text-fg-muted">@{a.usuario_unico}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : pendientes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface shadow-[var(--shadow-card)] flex items-center justify-center text-3xl mb-4">👥</div>
            <p className="font-bold text-fg mb-1">Sin amigos aún</p>
            <p className="text-fg-muted text-sm mb-5">Busca usuarios por su @usuario_unico</p>
            <button onClick={() => setShowBuscar(true)} className="bg-ink text-white rounded-full px-6 py-2.5 text-sm font-semibold">
              Buscar amigo
            </button>
          </div>
        )}

        {/* Externos */}
        {externos.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">
              Amigos externos ({externos.length})
            </p>
            <div className="bg-surface rounded-2xl divide-y divide-border-ui shadow-[var(--shadow-card)]">
              {externos.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center text-xl flex-shrink-0">👤</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-fg text-sm">{e.nombre}</p>
                    <p className="text-xs text-fg-muted">Sin cuenta en la app</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowBuscar(true)}
        className="fixed bottom-8 right-4 bg-ink text-white rounded-full px-5 py-3.5 flex items-center gap-2 font-semibold shadow-[var(--shadow-floating)] active:scale-95 transition-transform"
      >
        <Plus className="w-5 h-5" />
        Añadir amigo
      </button>

      {/* Modal buscar */}
      {showBuscar && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowBuscar(false)} />
          <div className="relative bg-surface rounded-t-3xl p-5 space-y-4">
            <h2 className="font-bold text-lg text-fg">Buscar usuario</h2>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="@usuario_unico"
              className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={handleBuscarEnviar}
                disabled={enviar.isPending}
                className="flex-1 bg-ink text-white rounded-2xl py-3 font-semibold text-sm disabled:opacity-60"
              >
                {enviar.isPending ? "Enviando…" : "Enviar solicitud"}
              </button>
              <button
                onClick={() => { setShowExterno(true); setShowBuscar(false); }}
                className="flex-1 bg-surface-2 text-fg rounded-2xl py-3 font-semibold text-sm"
              >
                Sin cuenta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal externo */}
      {showExterno && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowExterno(false)} />
          <div className="relative bg-surface rounded-t-3xl p-5 space-y-4">
            <h2 className="font-bold text-lg text-fg">Añadir amigo externo</h2>
            <input
              value={nombreExterno}
              onChange={(e) => setNombreExterno(e.target.value)}
              placeholder="Nombre"
              className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
              autoFocus
            />
            <button
              onClick={handleCrearExterno}
              disabled={crearExterno.isPending}
              className="w-full bg-ink text-white rounded-2xl py-3 font-semibold text-sm disabled:opacity-60"
            >
              {crearExterno.isPending ? "Añadiendo…" : "Añadir"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
