/**
 * Pantalla de autenticación real con Supabase.
 * Solo se muestra cuando IS_SUPABASE_ENABLED = true (VITE_SUPABASE_URL configurado).
 */
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { showFlash } from "@/stores/flash";

export default function Auth() {
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    if (!supabase) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      showFlash(error.message, "error");
      setLoading(false);
    }
    // Si ok, Supabase redirige automáticamente
  }

  async function handleEmailLogin(email: string, password: string) {
    if (!supabase) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      showFlash(error.message, "error");
      setLoading(false);
    }
  }

  async function handleEmailSignup(email: string, password: string) {
    if (!supabase) return;
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      showFlash(error.message, "error");
    } else {
      showFlash("Revisa tu email para confirmar el registro");
    }
    setLoading(false);
  }

  return (
    <AuthScreen
      loading={loading}
      onGoogleLogin={handleGoogleLogin}
      onEmailLogin={handleEmailLogin}
      onEmailSignup={handleEmailSignup}
    />
  );
}

// ── UI ────────────────────────────────────────────────────────────────────────

function AuthScreen({
  loading,
  onGoogleLogin,
  onEmailLogin,
  onEmailSignup,
}: {
  loading: boolean;
  onGoogleLogin: () => void;
  onEmailLogin: (email: string, password: string) => void;
  onEmailSignup: (email: string, password: string) => void;
}) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-3xl font-bold">F</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Finzen</h1>
          <p className="text-gray-500 text-sm mt-1">Tus finanzas, bajo control</p>
        </div>

        {/* Tab selector */}
        <div className="flex bg-surface rounded-2xl p-1 shadow-sm mb-6">
          {(["login", "register"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === t ? "bg-indigo-600 text-white" : "text-gray-500"
              }`}
            >
              {t === "login" ? "Entrar" : "Crear cuenta"}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {/* Google */}
          <button
            onClick={onGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-surface border border-gray-200 rounded-2xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 shadow-sm"
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </button>

          <div className="flex items-center gap-3 text-xs text-gray-400">
            <div className="flex-1 h-px bg-gray-200" />
            o con email
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Email */}
          <input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm bg-surface"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm bg-surface"
          />

          <button
            onClick={() =>
              tab === "login"
                ? onEmailLogin(email, password)
                : onEmailSignup(email, password)
            }
            disabled={loading || !email || !password}
            className="w-full bg-indigo-600 text-white py-3 rounded-2xl text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Cargando..." : tab === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        </div>
      </div>
    </div>
  );
}
