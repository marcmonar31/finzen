/**
 * Pantalla de autenticación con Supabase.
 * Solo activa cuando VITE_SUPABASE_URL está configurado.
 */
import { useState, useRef } from "react";
import { Eye, EyeOff, Mail, Lock, User, ChevronRight, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { showFlash } from "@/stores/flash";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Screen = "welcome" | "login" | "register" | "otp" | "forgot";

const SESSION_KEY = "finzen_auth_screen";

function saveSession(screen: Screen, email: string) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ screen, email }));
}
function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
function loadSession(): { screen: Screen; email: string } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function passwordStrength(p: string): { score: number; label: string; color: string } {
  let score = 0;
  if (p.length >= 8)           score++;
  if (p.length >= 12)          score++;
  if (/[A-Z]/.test(p))        score++;
  if (/[0-9]/.test(p))        score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  if (score <= 1) return { score, label: "Muy débil",   color: "#FF5C5C" };
  if (score === 2) return { score, label: "Débil",       color: "#FF9A4D" };
  if (score === 3) return { score, label: "Media",       color: "#FFD84D" };
  if (score === 4) return { score, label: "Fuerte",      color: "#C7FF6B" };
  return               { score, label: "Muy fuerte",  color: "#34D399" };
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function Auth() {
  const saved = loadSession();
  const [screen,   setScreen]  = useState<Screen>(saved?.screen ?? "welcome");
  const [loading,  setLoading] = useState(false);
  const [regEmail, setRegEmail] = useState(saved?.email ?? "");

  function goTo(s: Screen, email = regEmail) {
    setScreen(s);
    if (s === "otp") saveSession(s, email);
    else if (s === "welcome") clearSession();
  }

  // ── Google OAuth ───────────────────────────────────────────────────────────
  async function handleGoogle() {
    if (!supabase) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) { showFlash(error.message, "error"); setLoading(false); }
  }

  // ── Email login ────────────────────────────────────────────────────────────
  async function handleLogin(email: string, password: string) {
    if (!supabase) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      showFlash(
        error.message.includes("Invalid login credentials")
          ? "Email o contraseña incorrectos"
          : error.message,
        "error"
      );
    }
    setLoading(false);
  }

  // ── Register — envía OTP ──────────────────────────────────────────────────
  async function handleRegister(email: string, password: string, nombre: string) {
    if (!supabase) return;
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: nombre } },
    });
    if (error) {
      showFlash(error.message, "error");
      setLoading(false);
    } else {
      setRegEmail(email);
      goTo("otp", email);
      setLoading(false);
    }
  }

  // ── Verificar OTP ──────────────────────────────────────────────────────────
  async function handleOtp(token: string) {
    if (!supabase) return;
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: regEmail,
      token,
      type: "signup",
    });
    if (error) {
      showFlash("Código incorrecto o caducado", "error");
    } else {
      clearSession();
    }
    setLoading(false);
  }

  // ── Reenviar OTP ───────────────────────────────────────────────────────────
  async function handleResend() {
    if (!supabase) return;
    await supabase.auth.resend({ type: "signup", email: regEmail });
    showFlash("Código reenviado", "success");
  }

  // ── Forgot password ────────────────────────────────────────────────────────
  async function handleForgot(email: string) {
    if (!supabase) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}`,
    });
    showFlash(
      error ? error.message : "Si el email existe, recibirás un enlace en breve",
      error ? "error" : "success"
    );
    setLoading(false);
    if (!error) goTo("login");
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {screen === "welcome"  && <Welcome      onLogin={() => goTo("login")} onRegister={() => goTo("register")} onGoogle={handleGoogle} loading={loading} />}
      {screen === "login"    && <LoginForm    onBack={() => goTo("welcome")} onSubmit={handleLogin} onForgot={() => goTo("forgot")} loading={loading} />}
      {screen === "register" && <RegisterForm onBack={() => goTo("welcome")} onSubmit={handleRegister} loading={loading} />}
      {screen === "otp"      && <OtpForm      email={regEmail} onBack={() => goTo("welcome")} onSubmit={handleOtp} onResend={handleResend} loading={loading} />}
      {screen === "forgot"   && <ForgotForm   onBack={() => goTo("login")} onSubmit={handleForgot} loading={loading} />}
    </div>
  );
}

// ── Welcome ───────────────────────────────────────────────────────────────────

function Welcome({ onLogin, onRegister, onGoogle, loading }: {
  onLogin: () => void; onRegister: () => void; onGoogle: () => void; loading: boolean;
}) {
  return (
    <div className="relative flex flex-col min-h-screen bg-black overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[65%] pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% -5%, rgba(199,255,107,0.55) 0%, rgba(120,200,60,0.18) 45%, transparent 75%)" }} />

      <div className="relative flex-1 flex flex-col justify-end px-7 pb-3 pt-32">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-7 h-7 rounded-lg bg-[#C7FF6B] flex items-center justify-center">
            <span className="text-black font-black text-sm leading-none">F</span>
          </div>
          <span className="text-white font-bold text-base tracking-wide">Finzen</span>
        </div>
        <h1 className="text-white font-black text-[2.6rem] leading-[1.1] tracking-tight mb-4">
          Controla tu dinero,{" "}
          <span style={{ color: "#C7FF6B" }}>vive mejor.</span>
        </h1>
        <p className="text-white/50 text-sm leading-relaxed mb-10 max-w-[280px]">
          No es cuánto ganas. Es cuánto controlas.
        </p>
      </div>

      <div className="relative px-7 pb-14 space-y-3">
        <button onClick={onRegister} className="w-full bg-[#C7FF6B] text-black rounded-2xl py-4 text-sm font-bold active:scale-[0.98] transition-transform">
          Registrarse
        </button>
        <button onClick={onLogin} className="w-full bg-white/8 border border-white/10 text-white rounded-2xl py-4 text-sm font-semibold active:scale-[0.98] transition-transform backdrop-blur-sm">
          Iniciar sesión
        </button>
        <button onClick={onGoogle} disabled={loading} className="w-full flex items-center justify-center gap-2 py-3 text-white/40 text-xs font-medium active:opacity-60 transition-opacity disabled:opacity-30">
          <GoogleIcon small />
          Continuar con Google
        </button>
      </div>
    </div>
  );
}

// ── LoginForm ─────────────────────────────────────────────────────────────────

function LoginForm({ onBack, onSubmit, onForgot, loading }: {
  onBack: () => void; onSubmit: (e: string, p: string) => void; onForgot: () => void; loading: boolean;
}) {
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [errors, setErrors]     = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!email.trim())                    e.email    = "Email obligatorio";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email    = "Email no válido";
    if (!password)                        e.password = "Contraseña obligatoria";
    setErrors(e);
    return !Object.keys(e).length;
  }

  return (
    <FormShell title="Iniciar sesión" onBack={onBack}>
      <form onSubmit={(ev) => { ev.preventDefault(); if (validate()) onSubmit(email, password); }} className="space-y-4">
        <Field label="Email" error={errors.email}>
          <InputRow Icon={Mail}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" autoComplete="email" className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30" />
          </InputRow>
        </Field>
        <Field label="Contraseña" error={errors.password}>
          <InputRow Icon={Lock} trail={<EyeToggle show={showPwd} onToggle={() => setShowPwd(v => !v)} />}>
            <input type={showPwd ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30" />
          </InputRow>
        </Field>
        <button type="button" onClick={onForgot} className="text-xs text-white/30 underline w-full text-right -mt-1">
          ¿Olvidaste tu contraseña?
        </button>
        <SubmitBtn loading={loading} label="Entrar" />
      </form>
    </FormShell>
  );
}

// ── RegisterForm ──────────────────────────────────────────────────────────────

function RegisterForm({ onBack, onSubmit, loading }: {
  onBack: () => void; onSubmit: (e: string, p: string, n: string) => void; loading: boolean;
}) {
  const [nombre, setNombre]     = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const strength = passwordStrength(password);

  function validate() {
    const e: Record<string, string> = {};
    if (!nombre.trim() || nombre.trim().length < 2) e.nombre   = "Mínimo 2 caracteres";
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) e.email  = "Email no válido";
    if (!password || password.length < 8)           e.password = "Mínimo 8 caracteres";
    else if (strength.score < 2)                    e.password = "Contraseña demasiado débil";
    if (password !== confirm)                       e.confirm  = "No coinciden";
    setErrors(e);
    return !Object.keys(e).length;
  }

  return (
    <FormShell title="Crear cuenta" onBack={onBack}>
      <form onSubmit={(ev) => { ev.preventDefault(); if (validate()) onSubmit(email, password, nombre.trim()); }} className="space-y-4">
        <Field label="Tu nombre" error={errors.nombre}>
          <InputRow Icon={User}>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Marc Monar" autoComplete="name" className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30" />
          </InputRow>
        </Field>
        <Field label="Email" error={errors.email}>
          <InputRow Icon={Mail}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" autoComplete="email" className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30" />
          </InputRow>
        </Field>
        <Field label="Contraseña" error={errors.password}>
          <InputRow Icon={Lock} trail={<EyeToggle show={showPwd} onToggle={() => setShowPwd(v => !v)} />}>
            <input type={showPwd ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" autoComplete="new-password" className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30" />
          </InputRow>
          {password.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                {[1,2,3,4,5].map(n => (
                  <div key={n} className="flex-1 h-1 rounded-full transition-all" style={{ backgroundColor: n <= strength.score ? strength.color : "rgba(255,255,255,0.1)" }} />
                ))}
              </div>
              <p className="text-xs" style={{ color: strength.color }}>{strength.label}</p>
            </div>
          )}
        </Field>
        <Field label="Confirmar contraseña" error={errors.confirm}>
          <InputRow Icon={Lock} trail={<EyeToggle show={showConf} onToggle={() => setShowConf(v => !v)} />}>
            <input type={showConf ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repite la contraseña" autoComplete="new-password" className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30" />
          </InputRow>
          {confirm.length > 0 && password === confirm && <p className="text-xs mt-1 text-emerald-400">✓ Coinciden</p>}
        </Field>
        <SubmitBtn loading={loading} label="Crear cuenta" />
      </form>
    </FormShell>
  );
}

// ── OtpForm ───────────────────────────────────────────────────────────────────

function OtpForm({ email, onBack, onSubmit, onResend, loading }: {
  email: string; onBack: () => void; onSubmit: (token: string) => void; onResend: () => void; loading: boolean;
}) {
  const [digits, setDigits] = useState(["","","","","",""]);
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  function handleChange(i: number, val: string) {
    const d = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    if (d && i < 5) refs[i + 1].current?.focus();
    if (next.every(x => x) ) onSubmit(next.join(""));
  }

  function handleKey(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs[i - 1].current?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      setDigits(text.split(""));
      refs[5].current?.focus();
      onSubmit(text);
    }
  }

  return (
    <FormShell title="Verifica tu email" subtitle={`Hemos enviado un código de 6 dígitos a ${email}`} onBack={onBack}>
      <div className="space-y-8 pt-2">
        {/* Icono */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-3xl bg-white/8 border border-white/10 flex items-center justify-center">
            <Mail className="w-9 h-9 text-[#C7FF6B]" />
          </div>
        </div>

        {/* Cajas OTP */}
        <div className="flex gap-3 justify-center" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={refs[i]}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKey(i, e)}
              className="w-12 h-14 text-center text-white text-xl font-bold bg-white/6 border border-white/10 rounded-2xl outline-none focus:border-[#C7FF6B]/60 transition-colors caret-[#C7FF6B]"
            />
          ))}
        </div>

        {loading && (
          <div className="flex justify-center">
            <span className="w-5 h-5 border-2 border-white/20 border-t-[#C7FF6B] rounded-full animate-spin" />
          </div>
        )}

        <div className="text-center space-y-2">
          <p className="text-white/30 text-sm">¿No lo recibiste?</p>
          <button onClick={onResend} className="text-[#C7FF6B] text-sm font-semibold underline underline-offset-4">
            Reenviar código
          </button>
        </div>
      </div>
    </FormShell>
  );
}

// ── ForgotForm ────────────────────────────────────────────────────────────────

function ForgotForm({ onBack, onSubmit, loading }: {
  onBack: () => void; onSubmit: (e: string) => void; loading: boolean;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  return (
    <FormShell title="Recuperar contraseña" subtitle="Te enviaremos un enlace para restablecer tu contraseña." onBack={onBack}>
      <form onSubmit={(ev) => { ev.preventDefault(); if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { setError("Introduce un email válido"); return; } setError(""); onSubmit(email); }} className="space-y-4">
        <Field label="Email" error={error}>
          <InputRow Icon={Mail}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" autoComplete="email" className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30" />
          </InputRow>
        </Field>
        <SubmitBtn loading={loading} label="Enviar enlace" />
      </form>
    </FormShell>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FormShell({ title, subtitle, onBack, children }: {
  title: string; subtitle?: string; onBack: () => void; children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col min-h-screen bg-black overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[40%] pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(199,255,107,0.30) 0%, rgba(120,200,60,0.08) 50%, transparent 75%)" }} />
      <div className="relative px-6 pt-14 pb-6">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/8 border border-white/10 mb-7">
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <h2 className="text-white font-black text-2xl">{title}</h2>
        {subtitle && <p className="text-white/40 text-sm mt-1 leading-relaxed">{subtitle}</p>}
      </div>
      <div className="relative flex-1 flex flex-col items-center px-6 pb-14">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5 block">{label}</label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

function InputRow({ Icon, trail, children }: {
  Icon: React.ComponentType<{ className?: string }>; trail?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 bg-white/6 rounded-2xl px-4 py-3.5 border border-white/10 focus-within:border-[#C7FF6B]/50 transition-colors">
      <Icon className="w-4 h-4 text-white/30 flex-shrink-0" />
      {children}
      {trail}
    </div>
  );
}

function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="text-white/30 flex-shrink-0">
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );
}

function SubmitBtn({ loading, label }: { loading: boolean; label: string }) {
  return (
    <div className="flex justify-center mt-6">
      <button type="submit" disabled={loading} className="bg-[#C7FF6B] text-black rounded-2xl px-10 py-3.5 text-sm font-bold flex items-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50">
        {loading
          ? <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          : <><span>{label}</span><ChevronRight className="w-4 h-4" /></>}
      </button>
    </div>
  );
}

function GoogleIcon({ small }: { small?: boolean }) {
  const s = small ? 14 : 18;
  return (
    <svg viewBox="0 0 24 24" width={s} height={s} aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
