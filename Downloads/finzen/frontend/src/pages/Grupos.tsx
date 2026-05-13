import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Handshake, X, CreditCard, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useGrupos, useCrearGrupo } from "@/hooks/useGrupos";
import { useAmigos } from "@/hooks/useAmigos";
import { useWorkspaceStore } from "@/stores/workspace";
import { showFlash } from "@/stores/flash";
import { AppIcon, ICON_LIST, ICON_MAP } from "@/components/AppIcon";
import { GrupoDetalle } from "./GrupoDetalle";

const MONEDAS = ["EUR", "USD", "GBP", "CHF", "JPY", "MXN", "ARS", "BRL"];

function GrupoIcon({ value, size = 22 }: { value?: string | null; size?: number }) {
  if (!value) return <Handshake size={size} className="text-fg-muted" />;
  if (ICON_MAP[value]) return <AppIcon name={value} size={size} className="text-fg-muted" />;
  return <span className="text-2xl leading-none">{value}</span>;
}

// ── NuevoGrupoModal ────────────────────────────────────────────────────────────

function NuevoGrupoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { data: amigos = [] } = useAmigos();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const crear = useCrearGrupo();

  const [nombre,       setNombre]       = useState("");
  const [icon,         setIcon]         = useState("handshake");
  const [moneda,       setMoneda]       = useState(workspace?.moneda_base ?? "EUR");
  const [esCuentaReal, setEsCuentaReal] = useState(false);
  const [miembrosIds,  setMiembrosIds]  = useState<string[]>([]);

  function toggle(id: string) {
    setMiembrosIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }

  function reset() {
    setNombre(""); setIcon("handshake");
    setMoneda(workspace?.moneda_base ?? "EUR");
    setEsCuentaReal(false); setMiembrosIds([]);
  }

  function handleClose() { reset(); onClose(); }

  async function handleCrear() {
    if (!nombre.trim()) return;
    try {
      await crear.mutateAsync({
        nombre: nombre.trim(),
        emoji: icon,
        moneda_principal: moneda,
        es_cuenta_real: esCuentaReal,
        workspace_id: workspace?.id,
        miembro_usuario_ids: miembrosIds,
      });
      showFlash(t("grupos.creado"));
      handleClose();
    } catch (e: unknown) {
      showFlash(e instanceof Error ? e.message : t("common.error"), "error");
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/20 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", damping: 28, stiffness: 380 }}
            className="w-full max-w-md bg-surface rounded-3xl max-h-[90vh] overflow-y-auto shadow-[var(--shadow-floating)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 space-y-5">

              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg text-fg">{t("grupos.nuevo")}</h2>
                <button type="button" onClick={handleClose} className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
                  <X className="w-4 h-4 text-fg" />
                </button>
              </div>

              {/* Nombre */}
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder={t("grupos.nombre_placeholder")}
                className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
                autoFocus
              />

              {/* Icon picker */}
              <div>
                <p className="text-xs text-fg-muted mb-2 font-semibold uppercase tracking-wide">{t("common.icono")}</p>
                <div className="grid grid-cols-6 gap-2 max-h-[168px] overflow-y-auto">
                  {ICON_LIST.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setIcon(key)}
                      className={`h-10 rounded-xl flex items-center justify-center transition-all ${icon === key ? "bg-ink ring-2 ring-ink ring-offset-1" : "bg-surface-2"}`}
                    >
                      <AppIcon name={key} size={18} className={icon === key ? "text-white" : "text-fg-muted"} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Moneda */}
              <div>
                <p className="text-xs text-fg-muted mb-2 font-semibold uppercase tracking-wide">{t("common.moneda")}</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {MONEDAS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMoneda(m)}
                      className={`py-2 rounded-xl text-xs font-semibold transition-all ${moneda === m ? "bg-ink text-white" : "bg-surface-2 text-fg-muted"}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cuenta real toggle */}
              <button
                type="button"
                onClick={() => setEsCuentaReal(!esCuentaReal)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${esCuentaReal ? "bg-ink text-white" : "bg-surface-2 text-fg"}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${esCuentaReal ? "bg-white/10" : "bg-surface"}`}>
                  <CreditCard size={16} className={esCuentaReal ? "text-white" : "text-fg-muted"} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm">{t("grupos.cuenta_real")}</p>
                  <p className={`text-xs ${esCuentaReal ? "text-white/60" : "text-fg-muted"}`}>{t("grupos.cuenta_real_desc")}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${esCuentaReal ? "border-white bg-white" : "border-[#A0A0A4]"}`}>
                  {esCuentaReal && <Check size={11} className="text-ink" />}
                </div>
              </button>

              {/* Miembros */}
              {amigos.length > 0 && (
                <div>
                  <p className="text-xs text-fg-muted mb-2 font-semibold uppercase tracking-wide">{t("grupos.anadir_amigos")}</p>
                  <div className="space-y-1.5">
                    {amigos.map((a) => {
                      const sel = miembrosIds.includes(a.usuario_id);
                      return (
                        <button
                          key={a.usuario_id}
                          type="button"
                          onClick={() => toggle(a.usuario_id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${sel ? "bg-ink text-white" : "bg-surface-2 text-fg"}`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${sel ? "bg-white/10" : "bg-surface"}`}>
                            {a.avatar_emoji || a.nombre.slice(0, 1).toUpperCase()}
                          </div>
                          <span className="font-semibold text-sm flex-1 text-left truncate">{a.nombre}</span>
                          <span className={`text-xs ${sel ? "text-white/60" : "text-fg-muted"}`}>@{a.usuario_unico}</span>
                          {sel && <Check size={14} className="text-white flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-3.5 rounded-2xl bg-surface-2 text-fg font-semibold text-sm"
                >
                  {t("common.cancelar")}
                </button>
                <button
                  type="button"
                  onClick={handleCrear}
                  disabled={!nombre.trim() || crear.isPending}
                  className="flex-1 py-3.5 rounded-2xl bg-ink text-white font-semibold text-sm disabled:opacity-60 active:scale-95 transition-transform"
                >
                  {crear.isPending ? t("grupos.creando") : t("grupos.crear")}
                </button>
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Grupos (main) ──────────────────────────────────────────────────────────────

export function Grupos() {
  const { t } = useTranslation();
  const [showNuevo, setShowNuevo] = useState(false);
  const [grupoDetalleId, setGrupoDetalleId] = useState<string | null>(null);
  const { data: grupos = [], isLoading } = useGrupos();

  if (grupoDetalleId) {
    return <GrupoDetalle grupoId={grupoDetalleId} onBack={() => setGrupoDetalleId(null)} />;
  }

  return (
    <div className="min-h-full bg-app pb-24">

      {/* ── Header ── */}
      <div className="pt-10 px-4 pb-4">
        <div className="bg-ink rounded-3xl px-5 py-4 flex items-center justify-between shadow-[var(--shadow-floating)]">
          <div>
            <h1 className="text-white font-bold text-2xl">{t("nav.grupos")}</h1>
            {grupos.length > 0 && (
              <p className="text-white/50 text-xs mt-0.5">
                {grupos.length} {grupos.length === 1 ? t("grupos.grupo_sg") : t("grupos.grupo_pl")}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowNuevo(true)}
            className="w-9 h-9 rounded-full bg-[#C7FF6B] flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4 text-fg" />
          </button>
        </div>
      </div>

      <div className="px-4 max-w-2xl mx-auto space-y-3">

        {/* Skeleton */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-surface rounded-2xl p-4 animate-pulse shadow-[var(--shadow-card)] flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && grupos.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface shadow-[var(--shadow-card)] flex items-center justify-center mb-4">
              <Handshake className="w-8 h-8 text-fg-muted" />
            </div>
            <p className="font-bold text-fg mb-1">{t("grupos.sin_grupos")}</p>
            <p className="text-fg-muted text-sm mb-6">{t("grupos.sin_grupos_desc")}</p>
            <button
              onClick={() => setShowNuevo(true)}
              className="bg-ink text-white rounded-2xl px-6 py-3 text-sm font-semibold active:scale-95 transition-transform"
            >
              {t("grupos.crear")}
            </button>
          </div>
        )}

        {/* Lista */}
        {grupos.map((g) => {
          const miembrosActivos = g.miembros.filter((m) => m.activo).length;
          return (
            <button
              key={g.id}
              onClick={() => setGrupoDetalleId(g.id)}
              className="w-full bg-surface rounded-2xl p-4 flex items-center gap-3 shadow-[var(--shadow-card)] text-left active:scale-[0.98] transition-transform"
            >
              <div className="w-12 h-12 rounded-2xl bg-surface-2 flex items-center justify-center flex-shrink-0">
                <GrupoIcon value={g.emoji} size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-fg">{g.nombre}</p>
                <p className="text-xs text-fg-muted mt-0.5">
                  {miembrosActivos} {miembrosActivos === 1 ? t("grupos.miembro_sg") : t("grupos.miembros")} · {g.moneda_principal}
                </p>
              </div>
              {g.cerrado_en ? (
                <span className="text-xs text-fg-muted bg-surface-2 px-2 py-1 rounded-full flex-shrink-0">{t("grupos.cerrado")}</span>
              ) : (
                <span className="text-fg-muted text-lg flex-shrink-0">›</span>
              )}
            </button>
          );
        })}
      </div>

      <NuevoGrupoModal open={showNuevo} onClose={() => setShowNuevo(false)} />
    </div>
  );
}
