import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Users, User, UserCheck, UserX, Search, X, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useAmigos, useAmigosExternos, usePendientes,
  useAceptarSolicitud, useRechazarSolicitud, useEnviarSolicitud, useCrearExterno, useBuscarUsuario,
} from "@/hooks/useAmigos";
import { showFlash } from "@/stores/flash";

// ── Avatar ─────────────────────────────────────────────────────────────────────

function Avatar({ nombre, emoji }: { nombre: string; emoji?: string }) {
  if (emoji) {
    return (
      <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center text-xl flex-shrink-0">
        {emoji}
      </div>
    );
  }
  const initials = nombre.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="w-10 h-10 rounded-full bg-ink flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
      {initials || <User size={16} />}
    </div>
  );
}

// ── BuscarModal ────────────────────────────────────────────────────────────────

function BuscarModal({ open, onClose, onSinCuenta }: { open: boolean; onClose: () => void; onSinCuenta: () => void }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const { data: resultados = [], isFetching } = useBuscarUsuario(query);
  const enviar = useEnviarSolicitud();

  async function handleEnviar(usuario_unico: string) {
    try {
      await enviar.mutateAsync(usuario_unico);
      showFlash(t("amigos.solicitud_enviada"));
      setQuery("");
      onClose();
    } catch (e: unknown) {
      showFlash(e instanceof Error ? e.message : t("common.error"), "error");
    }
  }

  function handleClose() {
    setQuery("");
    onClose();
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
            className="w-full max-w-sm bg-surface rounded-3xl shadow-[var(--shadow-floating)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg text-fg">{t("amigos.buscar_usuario")}</h2>
                <button type="button" onClick={handleClose} className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
                  <X className="w-4 h-4 text-fg" />
                </button>
              </div>

              {/* Input con live search */}
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("amigos.buscar_placeholder")}
                  className="w-full bg-surface-2 rounded-xl pl-9 pr-4 py-3 text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
                  autoFocus
                />
                {isFetching && (
                  <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted animate-spin" />
                )}
              </div>

              {/* Resultados */}
              {query.length >= 2 && (
                <div className="space-y-1 max-h-52 overflow-y-auto">
                  {resultados.length > 0 ? resultados.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleEnviar(u.usuario_unico)}
                      disabled={enviar.isPending}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-2 transition-colors text-left disabled:opacity-60"
                    >
                      <Avatar nombre={u.nombre} emoji={u.avatar_emoji} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-fg text-sm truncate">{u.nombre}</p>
                        <p className="text-xs text-fg-muted">@{u.usuario_unico}</p>
                      </div>
                      <span className="text-xs text-fg-muted bg-surface-2 rounded-lg px-2 py-1 flex-shrink-0">
                        {t("amigos.enviar_solicitud")}
                      </span>
                    </button>
                  )) : !isFetching && (
                    <p className="text-xs text-fg-subtle text-center py-4">{t("amigos.sin_resultados")}</p>
                  )}
                </div>
              )}

              {/* Sin cuenta en la app */}
              <button
                type="button"
                onClick={() => { handleClose(); onSinCuenta(); }}
                className="w-full py-2.5 rounded-2xl bg-surface-2 text-fg-muted font-medium text-sm"
              >
                {t("amigos.sin_cuenta_accion")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── ExternoModal ───────────────────────────────────────────────────────────────

function ExternoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const crearExterno = useCrearExterno();

  async function handleCrear() {
    if (!nombre.trim()) return;
    try {
      await crearExterno.mutateAsync({ nombre: nombre.trim(), email: email.trim() || undefined });
      showFlash(t("amigos.externo_anadido"));
      setNombre(""); setEmail("");
      onClose();
    } catch { showFlash(t("common.error"), "error"); }
  }

  function handleClose() {
    setNombre(""); setEmail("");
    onClose();
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
            className="w-full max-w-sm bg-surface rounded-3xl shadow-[var(--shadow-floating)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg text-fg">{t("amigos.anadir_externo")}</h2>
                <button type="button" onClick={handleClose} className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
                  <X className="w-4 h-4 text-fg" />
                </button>
              </div>
              <p className="text-xs text-fg-muted">{t("amigos.externos_desc_largo")}</p>
              <div className="space-y-2">
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder={t("common.nombre")}
                  className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
                  autoFocus
                />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`Email (${t("common.opcional")})`}
                  type="email"
                  className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg focus:outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-3 rounded-2xl bg-surface-2 text-fg font-semibold text-sm"
                >
                  {t("common.cancelar")}
                </button>
                <button
                  type="button"
                  onClick={handleCrear}
                  disabled={crearExterno.isPending || !nombre.trim()}
                  className="flex-1 py-3 rounded-2xl bg-ink text-white font-semibold text-sm disabled:opacity-60"
                >
                  {crearExterno.isPending ? t("amigos.anadiendo") : t("amigos.anadir")}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Amigos (main) ──────────────────────────────────────────────────────────────

export function Amigos() {
  const { t } = useTranslation();
  const [showBuscar, setShowBuscar] = useState(false);
  const [showExterno, setShowExterno] = useState(false);

  const { data: amigos = [], isLoading } = useAmigos();
  const { data: pendientes = [] } = usePendientes();
  const { data: externos = [] } = useAmigosExternos();
  const aceptar = useAceptarSolicitud();
  const rechazar = useRechazarSolicitud();

  async function handleAceptar(id: string) {
    try { await aceptar.mutateAsync(id); showFlash(t("amigos.solicitud_aceptada")); }
    catch { showFlash(t("common.error"), "error"); }
  }

  async function handleRechazar(id: string) {
    try { await rechazar.mutateAsync(id); }
    catch { showFlash(t("common.error"), "error"); }
  }

  const totalAmigos = amigos.length + externos.length;

  return (
    <div className="min-h-full bg-app pb-24">

      {/* ── Header ── */}
      <div className="pt-10 px-4 pb-4">
        <div className="bg-ink rounded-3xl px-5 py-4 flex items-center justify-between shadow-[var(--shadow-floating)]">
          <div>
            <h1 className="text-white font-bold text-2xl">{t("nav.amigos")}</h1>
            {totalAmigos > 0 && (
              <p className="text-white/50 text-xs mt-0.5">
                {totalAmigos} {totalAmigos === 1 ? t("amigos.amigo_sg") : t("amigos.amigo_pl")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBuscar(true)}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center active:scale-95 transition-transform"
            >
              <Search className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={() => setShowBuscar(true)}
              className="w-9 h-9 rounded-full bg-[#C7FF6B] flex items-center justify-center active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4 text-fg" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 max-w-2xl mx-auto space-y-4">

        {/* ── Skeleton ── */}
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface rounded-2xl p-4 animate-pulse shadow-[var(--shadow-card)] flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && (
          <>
            {/* ── Solicitudes pendientes ── */}
            {pendientes.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">
                  {t("amigos.solicitudes")} ({pendientes.length})
                </p>
                <div className="bg-surface rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
                  {pendientes.map((a, i) => (
                    <div
                      key={a.id}
                      className={`flex items-center gap-3 px-4 py-3 ${i < pendientes.length - 1 ? "border-b border-[var(--color-border-ui,#E8E8EA)]" : ""}`}
                    >
                      <Avatar nombre={a.nombre} emoji={a.avatar_emoji} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-fg text-sm truncate">{a.nombre}</p>
                        <p className="text-xs text-fg-muted">@{a.usuario_unico}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleAceptar(a.id)}
                          disabled={aceptar.isPending}
                          className="w-8 h-8 rounded-full bg-[#5BAA1F]/10 flex items-center justify-center hover:bg-[#5BAA1F] hover:text-white transition-colors disabled:opacity-60"
                          title={t("common.aceptar")}
                        >
                          <UserCheck className="w-4 h-4 text-[#5BAA1F]" />
                        </button>
                        <button
                          onClick={() => handleRechazar(a.id)}
                          disabled={rechazar.isPending}
                          className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center hover:bg-[#FF5C5C] hover:text-white transition-colors disabled:opacity-60"
                          title={t("common.rechazar")}
                        >
                          <UserX className="w-4 h-4 text-fg-muted" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Mis amigos ── */}
            {amigos.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">
                  {t("amigos.mis_amigos")} ({amigos.length})
                </p>
                <div className="bg-surface rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
                  {amigos.map((a, i) => (
                    <div
                      key={a.id}
                      className={`flex items-center gap-3 px-4 py-3 ${i < amigos.length - 1 ? "border-b border-[var(--color-border-ui,#E8E8EA)]" : ""}`}
                    >
                      <Avatar nombre={a.nombre} emoji={a.avatar_emoji} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-fg text-sm truncate">{a.nombre}</p>
                        <p className="text-xs text-fg-muted">@{a.usuario_unico}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Amigos externos ── */}
            {externos.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">
                  {t("amigos.externos")} ({externos.length})
                </p>
                <div className="bg-surface rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
                  {externos.map((e, i) => (
                    <div
                      key={e.id}
                      className={`flex items-center gap-3 px-4 py-3 ${i < externos.length - 1 ? "border-b border-[var(--color-border-ui,#E8E8EA)]" : ""}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center flex-shrink-0">
                        <User size={18} className="text-fg-muted" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-fg text-sm truncate">{e.nombre}</p>
                        <p className="text-xs text-fg-muted">{e.email ?? t("amigos.externos_desc")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Empty state ── */}
            {amigos.length === 0 && externos.length === 0 && pendientes.length === 0 && (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-surface shadow-[var(--shadow-card)] flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-fg-muted" />
                </div>
                <p className="font-bold text-fg mb-1">{t("amigos.sin_amigos")}</p>
                <p className="text-fg-muted text-sm mb-6">{t("amigos.buscar_hint")}</p>
                <button
                  onClick={() => setShowBuscar(true)}
                  className="bg-ink text-white rounded-2xl px-6 py-3 text-sm font-semibold active:scale-95 transition-transform"
                >
                  {t("amigos.nuevo")}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modales ── */}
      <BuscarModal
        open={showBuscar}
        onClose={() => setShowBuscar(false)}
        onSinCuenta={() => { setShowBuscar(false); setShowExterno(true); }}
      />
      <ExternoModal
        open={showExterno}
        onClose={() => setShowExterno(false)}
      />
    </div>
  );
}
