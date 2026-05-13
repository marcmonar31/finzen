import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Trash2, Eye, EyeOff, Check } from "lucide-react";
import { showFlash } from "@/stores/flash";
import { useActualizarUsuario } from "@/hooks/useUsuario";
import type { Usuario } from "@/types/api";

// ── Primitivos sheet ──────────────────────────────────────────────────────────

function Sheet({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[800]" onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[810] bg-surface rounded-t-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-lg text-fg">{title}</h2>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
                  <X className="w-4 h-4 text-fg" />
                </button>
              </div>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function PrimaryBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full bg-ink text-white rounded-2xl py-4 font-semibold text-base active:scale-95 transition-transform disabled:opacity-60"
    >
      {children}
    </button>
  );
}

// ── Editar nombre ─────────────────────────────────────────────────────────────

export function EditarNombreSheet({ open, onClose, usuario }: {
  open: boolean; onClose: () => void; usuario: Usuario;
}) {
  const actualizar = useActualizarUsuario();
  const [nombre, setNombre] = useState(usuario.nombre);
  const [error,  setError]  = useState("");

  const validar = (v: string) => {
    if (v.trim().length < 2) return "Mínimo 2 caracteres";
    if (v.trim().length > 50) return "Máximo 50 caracteres";
    if (/^[\d\s]+$/.test(v.trim())) return "No puede ser solo números";
    return "";
  };

  async function handleGuardar() {
    const err = validar(nombre);
    if (err) { setError(err); return; }
    try {
      await actualizar.mutateAsync({ nombre: nombre.trim() });
      showFlash("Nombre actualizado");
      onClose();
    } catch (e: unknown) {
      showFlash(e instanceof Error ? e.message : "Error al guardar", "error");
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Editar nombre">
      <div className="space-y-4">
        <div>
          <input
            value={nombre}
            onChange={(e) => { setNombre(e.target.value); setError(validar(e.target.value)); }}
            placeholder="Tu nombre"
            maxLength={50}
            className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-ink/20"
          />
          <div className="flex justify-between mt-1">
            {error
              ? <p className="text-xs text-[#FF5C5C]">{error}</p>
              : <span />
            }
            <p className="text-xs text-fg-subtle">{nombre.length}/50</p>
          </div>
        </div>
        <PrimaryBtn onClick={handleGuardar} disabled={actualizar.isPending || !!validar(nombre)}>
          {actualizar.isPending ? "Guardando…" : "Guardar nombre"}
        </PrimaryBtn>
      </div>
    </Sheet>
  );
}

// ── Editar foto / avatar ──────────────────────────────────────────────────────

const EMOJIS_AVATAR = [
  "👤","😀","😎","🤩","🧑","👨","👩","🧔","👶","🧒",
  "🦊","🐱","🐶","🐼","🐨","🦁","🐯","🦅","🐬","🦄",
  "🌟","⚡","🔥","🌈","🍀","🎯","🚀","💎","🎸","🏆",
];

const COLORES_AVATAR = [
  { hex: "#1A1A2E", label: "Ink"      },
  { hex: "#5BAA1F", label: "Verde"    },
  { hex: "#FF5C5C", label: "Coral"    },
  { hex: "#4A90D9", label: "Azul"     },
  { hex: "#9B59B6", label: "Morado"   },
  { hex: "#E67E22", label: "Naranja"  },
  { hex: "#E91E8C", label: "Rosa"     },
  { hex: "#16A085", label: "Teal"     },
  { hex: "#F1C40F", label: "Amarillo" },
  { hex: "#7F8C8D", label: "Gris"     },
];

function comprimirImagen(file: File, maxPx = 512, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function EditarFotoSheet({ open, onClose, usuario }: {
  open: boolean; onClose: () => void; usuario: Usuario;
}) {
  const actualizar = useActualizarUsuario();
  const fileRef    = useRef<HTMLInputElement>(null);
  const [preview,  setPreview]  = useState<string | null>(null);
  const [tab,      setTab]      = useState<"foto" | "emoji">("foto");
  const [emoji,    setEmoji]    = useState(usuario.avatar_emoji);
  const [color,    setColor]    = useState(usuario.avatar_color ?? "#1A1A2E");
  // true cuando el usuario ya eligió un emoji y ahora debe elegir color
  const [eligiendoColor, setEligiendoColor] = useState(false);

  const currentFoto = preview ?? usuario.foto_data ?? null;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await comprimirImagen(file);
      setPreview(base64);
      setTab("foto");
    } catch {
      showFlash("No se pudo cargar la imagen", "error");
    }
    e.target.value = "";
  }

  async function handleGuardarFoto() {
    if (!preview) return;
    try {
      await actualizar.mutateAsync({ foto_data: preview });
      showFlash("Foto actualizada");
      onClose();
    } catch (e: unknown) {
      showFlash(e instanceof Error ? e.message : "Error al guardar", "error");
    }
  }

  async function handleGuardarAvatar() {
    try {
      await actualizar.mutateAsync({ avatar_emoji: emoji, avatar_color: color, foto_data: "" });
      showFlash("Avatar actualizado");
      onClose();
    } catch (e: unknown) {
      showFlash(e instanceof Error ? e.message : "Error al guardar", "error");
    }
  }

  async function handleEliminarFoto() {
    try {
      await actualizar.mutateAsync({ foto_data: "" });
      setPreview(null);
      showFlash("Foto eliminada");
    } catch (e: unknown) {
      showFlash(e instanceof Error ? e.message : "Error al guardar", "error");
    }
  }

  function handleElegirEmoji(e: string) {
    setEmoji(e);
    setEligiendoColor(true); // transición a selector de color
  }

  return (
    <Sheet open={open} onClose={onClose} title="Editar foto">
      {/* Preview avatar */}
      <div className="flex justify-center mb-5">
        <div
          className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center shadow-lg transition-colors duration-300"
          style={{ background: tab === "emoji" || (!currentFoto && tab === "foto") ? color : undefined, backgroundColor: tab === "foto" && currentFoto ? undefined : color }}
        >
          {tab === "foto" && currentFoto
            ? <img src={currentFoto} alt="avatar" className="w-full h-full object-cover" />
            : <span className="text-5xl">{emoji}</span>
          }
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-surface-2 rounded-2xl p-1 gap-1 mb-4">
        {(["foto", "emoji"] as const).map((t) => (
          <button key={t}
            onClick={() => { setTab(t); setEligiendoColor(false); }}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? "bg-ink text-white shadow" : "text-fg-muted"}`}>
            {t === "foto" ? "📷 Foto" : "😀 Avatar"}
          </button>
        ))}
      </div>

      {/* ── Tab Foto ── */}
      {tab === "foto" && (
        <div className="space-y-3">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center gap-3 bg-surface-2 rounded-xl px-4 py-3 text-sm font-medium text-fg active:bg-surface-3"
          >
            <Upload className="w-4 h-4" />
            Elegir de galería / cámara
          </button>
          {currentFoto && !preview && (
            <button onClick={handleEliminarFoto} disabled={actualizar.isPending}
              className="w-full flex items-center gap-3 bg-[#FFF0F0] rounded-xl px-4 py-3 text-sm font-medium text-[#FF5C5C] active:bg-[#FFE0E0]">
              <Trash2 className="w-4 h-4" />
              Eliminar foto actual
            </button>
          )}
          {preview && (
            <PrimaryBtn onClick={handleGuardarFoto} disabled={actualizar.isPending}>
              {actualizar.isPending ? "Subiendo…" : "Guardar foto"}
            </PrimaryBtn>
          )}
          <p className="text-xs text-fg-subtle text-center">
            Se comprime automáticamente a 512×512 px, máx. 1 MB
          </p>
        </div>
      )}

      {/* ── Tab Emoji ── */}
      {tab === "emoji" && (
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {!eligiendoColor ? (
              /* Paso 1 — elegir emoji */
              <motion.div key="emojis"
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
              >
                <p className="text-xs text-fg-muted mb-2 font-medium">Elige un avatar</p>
                <div className="grid grid-cols-6 gap-2">
                  {EMOJIS_AVATAR.map((e) => (
                    <button key={e} onClick={() => handleElegirEmoji(e)}
                      className={`aspect-square rounded-xl text-2xl flex items-center justify-center transition-all active:scale-90 ${
                        emoji === e ? "ring-2 ring-ink ring-offset-1" : "bg-surface-2"
                      }`}
                      style={emoji === e ? { backgroundColor: color } : {}}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              /* Paso 2 — elegir color de fondo */
              <motion.div key="colores"
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.18 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <button onClick={() => setEligiendoColor(false)}
                    className="text-xs text-fg-muted flex items-center gap-1 active:opacity-60">
                    ← Cambiar emoji
                  </button>
                </div>
                <p className="text-xs text-fg-muted mb-2 font-medium">Color de fondo</p>
                <div className="grid grid-cols-5 gap-3">
                  {COLORES_AVATAR.map((c) => (
                    <button key={c.hex} onClick={() => setColor(c.hex)}
                      className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform"
                    >
                      <div
                        className="w-12 h-12 rounded-full transition-transform"
                        style={{
                          backgroundColor: c.hex,
                          boxShadow: color === c.hex ? `0 0 0 3px white, 0 0 0 5px ${c.hex}` : "none",
                          transform: color === c.hex ? "scale(1.1)" : "scale(1)",
                        }}
                      />
                      <span className="text-[10px] text-fg-muted">{c.label}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-4">
                  <PrimaryBtn onClick={handleGuardarAvatar} disabled={actualizar.isPending}>
                    {actualizar.isPending ? "Guardando…" : "Usar este avatar"}
                  </PrimaryBtn>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </Sheet>
  );
}

// ── Editar email ──────────────────────────────────────────────────────────────

export function EditarEmailSheet({ open, onClose, usuario }: {
  open: boolean; onClose: () => void; usuario: Usuario;
}) {
  const actualizar = useActualizarUsuario();
  const [email, setEmail] = useState(usuario.email ?? "");
  const [error, setError] = useState("");

  const validarEmail = (v: string) => {
    if (!v.trim()) return "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return "Formato de email no válido";
    return "";
  };

  async function handleGuardar() {
    const err = validarEmail(email);
    if (err) { setError(err); return; }
    try {
      await actualizar.mutateAsync({ email: email.trim().toLowerCase() || undefined });
      showFlash("Email actualizado");
      onClose();
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes("ya está en uso")) {
        setError("Este email ya pertenece a otra cuenta");
      } else {
        showFlash(e instanceof Error ? e.message : "Error al guardar", "error");
      }
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Editar email">
      <div className="space-y-4">
        <div className="bg-[#FFF8E8] rounded-xl px-4 py-3 text-xs text-[#8B6A00]">
          Email actual: <strong>{usuario.email ?? "Sin email"}</strong>
        </div>

        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(validarEmail(e.target.value)); }}
            placeholder="nuevo@email.com"
            inputMode="email"
            autoCapitalize="none"
            className="w-full bg-surface-2 rounded-xl px-4 py-3 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-ink/20"
          />
          {error && <p className="text-xs text-[#FF5C5C] mt-1">{error}</p>}
        </div>

        <div className="bg-surface-2 rounded-xl px-4 py-3 text-xs text-fg-muted space-y-1">
          <p className="font-semibold text-fg">¿Para qué sirve el email?</p>
          <p>· Recuperación de contraseña</p>
          <p>· Notificaciones y exportaciones</p>
          <p>· Inicio de sesión cuando actives la autenticación real</p>
        </div>

        <PrimaryBtn onClick={handleGuardar} disabled={actualizar.isPending || !!validarEmail(email)}>
          {actualizar.isPending ? "Guardando…" : "Guardar email"}
        </PrimaryBtn>
      </div>
    </Sheet>
  );
}

// ── Cambiar contraseña ────────────────────────────────────────────────────────

function InputPwd({
  value, onChange, show, onToggle, placeholder,
}: {
  value: string; onChange: (v: string) => void;
  show: boolean; onToggle: () => void; placeholder: string;
}) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-surface-2 rounded-xl px-4 py-3 pr-11 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-ink/20"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function calcularFortaleza(pwd: string): { nivel: number; label: string; color: string } {
  let score = 0;
  if (pwd.length >= 8)  score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 1) return { nivel: 1, label: "Débil",  color: "bg-[#FF5C5C]" };
  if (score <= 3) return { nivel: 2, label: "Media",  color: "bg-amber-400" };
  return               { nivel: 3, label: "Fuerte", color: "bg-[#5BAA1F]" };
}

export function CambiarContrasenaSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [actual,   setActual]   = useState("");
  const [nueva,    setNueva]    = useState("");
  const [repetir,  setRepetir]  = useState("");
  const [showActual,  setShowActual]  = useState(false);
  const [showNueva,   setShowNueva]   = useState(false);
  const [showRepetir, setShowRepetir] = useState(false);

  const fortaleza = calcularFortaleza(nueva);
  const coinciden = nueva === repetir;
  const puedeGuardar = actual && nueva.length >= 8 && coinciden && fortaleza.nivel >= 2;

  function handleGuardar() {
    // En modo simulado no hay sistema de contraseñas.
    // Cuando se active Supabase auth, aquí irá supabase.auth.updateUser({ password: nueva })
    showFlash("La contraseña se podrá cambiar cuando actives la autenticación real", "error");
  }

  return (
    <Sheet open={open} onClose={onClose} title="Cambiar contraseña">
      <div className="space-y-4">
        <div className="bg-[#FFF8E8] rounded-xl px-4 py-3 text-xs text-[#8B6A00]">
          En la versión actual (auth simulada) las contraseñas no están activadas. Este formulario funcionará completamente cuando se active el inicio de sesión real.
        </div>

        <InputPwd value={actual} onChange={setActual} show={showActual} onToggle={() => setShowActual(s => !s)} placeholder="Contraseña actual" />

        <div className="space-y-1">
          <InputPwd value={nueva} onChange={setNueva} show={showNueva} onToggle={() => setShowNueva(s => !s)} placeholder="Nueva contraseña" />
          {nueva.length > 0 && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3].map((n) => (
                  <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${n <= fortaleza.nivel ? fortaleza.color : "bg-surface-3"}`} />
                ))}
              </div>
              <p className="text-xs text-fg-muted">
                Fortaleza: <span className="font-medium text-fg">{fortaleza.label}</span>
                {fortaleza.nivel < 2 && " · Añade mayúsculas, números o símbolos"}
              </p>
            </div>
          )}
        </div>

        <div>
          <InputPwd value={repetir} onChange={setRepetir} show={showRepetir} onToggle={() => setShowRepetir(s => !s)} placeholder="Repetir nueva contraseña" />
          {repetir.length > 0 && !coinciden && (
            <p className="text-xs text-[#FF5C5C] mt-1">Las contraseñas no coinciden</p>
          )}
          {repetir.length > 0 && coinciden && nueva.length > 0 && (
            <p className="text-xs text-[#5BAA1F] mt-1 flex items-center gap-1"><Check className="w-3 h-3" /> Coinciden</p>
          )}
        </div>

        <div className="bg-surface-2 rounded-xl px-4 py-3 text-xs text-fg-muted space-y-1">
          <p>· Mínimo 8 caracteres</p>
          <p>· Al menos una mayúscula y un número</p>
          <p>· Al cambiar, se cerrará la sesión en otros dispositivos</p>
        </div>

        <PrimaryBtn onClick={handleGuardar} disabled={!puedeGuardar}>
          Cambiar contraseña
        </PrimaryBtn>
      </div>
    </Sheet>
  );
}
