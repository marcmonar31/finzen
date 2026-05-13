import { useState } from "react";
import { Plus } from "lucide-react";
import { useGrupos, useCrearGrupo } from "@/hooks/useGrupos";
import { useAmigos } from "@/hooks/useAmigos";
import { useWorkspaceStore } from "@/stores/workspace";
import { clsx } from "clsx";
import { showFlash } from "@/stores/flash";
import { GrupoDetalle } from "./GrupoDetalle";

export function Grupos() {
  const [showNuevo, setShowNuevo] = useState(false);
  const [grupoDetalleId, setGrupoDetalleId] = useState<string | null>(null);
  const { data: grupos = [], isLoading } = useGrupos();
  const { data: amigos = [] } = useAmigos();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const crear = useCrearGrupo();

  const [nombre, setNombre] = useState("");
  const [emoji, setEmoji] = useState("🤝");
  const [moneda, setMoneda] = useState(workspace?.moneda_base ?? "EUR");
  const [esCuentaReal, setEsCuentaReal] = useState(false);
  const [miembrosIds, setMiembrosIds] = useState<string[]>([]);

  function toggleMiembro(id: string) {
    setMiembrosIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function handleCrear() {
    if (!nombre.trim()) return;
    try {
      await crear.mutateAsync({
        nombre: nombre.trim(),
        emoji,
        moneda_principal: moneda,
        es_cuenta_real: esCuentaReal,
        workspace_id: workspace?.id,
        miembro_usuario_ids: miembrosIds,
      });
      showFlash("Grupo creado");
      setNombre("");
      setMiembrosIds([]);
      setShowNuevo(false);
    } catch (e: unknown) {
      showFlash(e instanceof Error ? e.message : "Error al crear grupo", "error");
    }
  }

  if (grupoDetalleId) {
    return <GrupoDetalle grupoId={grupoDetalleId} onBack={() => setGrupoDetalleId(null)} />;
  }

  return (
    <div className="min-h-full bg-app pb-24">
      <div className="bg-ink px-4 pt-10 pb-5 rounded-b-3xl mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-white font-bold text-2xl">Grupos</h1>
          <button onClick={() => setShowNuevo(true)} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-surface rounded-2xl p-4 h-20 animate-pulse shadow-[var(--shadow-card)]" />
            ))}
          </div>
        )}

        {!isLoading && grupos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface shadow-[var(--shadow-card)] flex items-center justify-center text-3xl mb-4">🤝</div>
            <p className="font-bold text-fg mb-1">Sin grupos</p>
            <p className="text-fg-muted text-sm mb-5">Crea un grupo para dividir gastos</p>
            <button onClick={() => setShowNuevo(true)} className="bg-ink text-white rounded-full px-6 py-2.5 text-sm font-semibold">
              Crear grupo
            </button>
          </div>
        )}

        {grupos.map((g) => (
          <button
            key={g.id}
            onClick={() => setGrupoDetalleId(g.id)}
            className="w-full bg-surface rounded-2xl p-4 flex items-center gap-3 shadow-[var(--shadow-card)] text-left active:scale-[0.98] transition-transform"
          >
            <div className="w-12 h-12 rounded-2xl bg-surface-2 flex items-center justify-center text-2xl flex-shrink-0">
              {g.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-fg">{g.nombre}</p>
              <p className="text-xs text-fg-muted">
                {g.miembros.filter((m) => m.activo).length} miembros · {g.moneda_principal}
              </p>
            </div>
            {g.cerrado_en && (
              <span className="text-xs text-fg-muted bg-surface-2 px-2 py-1 rounded-full">Cerrado</span>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={() => setShowNuevo(true)}
        className="fixed bottom-8 right-4 bg-ink text-white rounded-full px-5 py-3.5 flex items-center gap-2 font-semibold shadow-[var(--shadow-floating)] active:scale-95 transition-transform"
      >
        <Plus className="w-5 h-5" />
        Nuevo grupo
      </button>

      {showNuevo && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowNuevo(false)} />
          <div className="relative bg-surface rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <h2 className="font-bold text-lg text-fg">Nuevo grupo</h2>

            {/* Nombre */}
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del grupo"
              className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
            />

            {/* Emoji */}
            <div>
              <p className="text-xs text-fg-muted mb-2 font-medium">Icono</p>
              <div className="flex gap-2 flex-wrap">
                {["🤝", "🏠", "✈️", "🎉", "🍕", "⚽", "🎮", "💼"].map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={clsx(
                      "w-10 h-10 rounded-xl text-xl transition-all",
                      emoji === e ? "bg-ink" : "bg-surface-2"
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Moneda */}
            <div>
              <p className="text-xs text-fg-muted mb-2 font-medium">Moneda principal</p>
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value)}
                className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
              >
                {["EUR", "USD", "GBP", "CHF", "JPY", "MXN"].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Cuenta real */}
            <button
              onClick={() => setEsCuentaReal(!esCuentaReal)}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                esCuentaReal ? "bg-ink text-white" : "bg-surface-2 text-fg"
              )}
            >
              <span className="text-xl">💳</span>
              <div className="flex-1 text-left">
                <p className="font-semibold text-sm">Cuenta real</p>
                <p className={clsx("text-xs", esCuentaReal ? "text-white/70" : "text-fg-muted")}>
                  Aparece en tus cuentas con saldo
                </p>
              </div>
              <div className={clsx("w-5 h-5 rounded-full border-2 flex items-center justify-center", esCuentaReal ? "border-white" : "border-[#A0A0A4]")}>
                {esCuentaReal && <div className="w-2.5 h-2.5 rounded-full bg-surface" />}
              </div>
            </button>

            {/* Miembros */}
            {amigos.length > 0 && (
              <div>
                <p className="text-xs text-fg-muted mb-2 font-medium">Añadir amigos</p>
                <div className="space-y-2">
                  {amigos.map((a) => (
                    <button
                      key={a.usuario_id}
                      onClick={() => toggleMiembro(a.usuario_id)}
                      className={clsx(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                        miembrosIds.includes(a.usuario_id) ? "bg-ink text-white" : "bg-surface-2 text-fg"
                      )}
                    >
                      <span className="text-lg">{a.avatar_emoji}</span>
                      <span className="font-semibold text-sm">{a.nombre}</span>
                      <span className={clsx("text-xs ml-auto", miembrosIds.includes(a.usuario_id) ? "text-white/70" : "text-fg-muted")}>
                        @{a.usuario_unico}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleCrear}
              disabled={!nombre.trim() || crear.isPending}
              className="w-full bg-ink text-white rounded-2xl py-4 font-semibold disabled:opacity-60"
            >
              {crear.isPending ? "Creando…" : "Crear grupo"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
