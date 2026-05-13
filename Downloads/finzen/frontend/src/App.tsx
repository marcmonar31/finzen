import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useUsuarioStore } from "@/stores/usuario";
import { useWorkspaceStore } from "@/stores/workspace";
import { useNavigationStore } from "@/stores/navigation";
import { usePinStore } from "@/stores/pin";
import { api } from "@/lib/api";
import type { Usuario } from "@/types/api";
import { SelectorUsuarioDemo } from "@/components/SelectorUsuarioDemo";
import { LockScreen } from "@/components/LockScreen";
import { MinimizableShell } from "@/components/MinimizableShell";
import { Dashboard } from "@/pages/Dashboard";
import { Cuentas } from "@/pages/Cuentas";
import { Movimientos } from "@/pages/Movimientos";
import { Transferencias } from "@/pages/Transferencias";
import { Presupuestos } from "@/pages/Presupuestos";
import { Categorias } from "@/pages/Categorias";
import { Recurrentes } from "@/pages/Recurrentes";
import { Amigos } from "@/pages/Amigos";
import { Grupos } from "@/pages/Grupos";
import { Reglas } from "@/pages/Reglas";
import { Objetivos } from "@/pages/Objetivos";
import { Deudas } from "@/pages/Deudas";
import { Insights } from "@/pages/Insights";
import Inversiones from "@/pages/Inversiones";
import Ajustes from "@/pages/Ajustes";
import Auth from "@/pages/Auth";
import Legal from "@/pages/Legal";
import { LandscapeBlocker } from "@/components/LandscapeBlocker";
import { FlashOverlay } from "@/components/FlashOverlay";
import { IS_SUPABASE_ENABLED, supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

const SECTION_PAGES: Record<string, React.ReactNode> = {
  dashboard:      <Dashboard />,
  cuentas:        <Cuentas />,
  movimientos:    <Movimientos />,
  transferencias: <Transferencias />,
  presupuestos:   <Presupuestos />,
  categorias:     <Categorias />,
  recurrentes:    <Recurrentes />,
  objetivos:      <Objetivos />,
  reglas:         <Reglas />,
  amigos:         <Amigos />,
  grupos:         <Grupos />,
  deudas:         <Deudas />,
  inversiones:    <Inversiones />,
  insights:       <Insights />,
  ajustes:        <Ajustes />,
  legal:          <Legal />,
};

function AppShell() {
  const [section, setSection] = useState("dashboard");
  const setUsuario = useUsuarioStore((s) => s.setUsuario);
  const usuario    = useUsuarioStore((s) => s.usuario);
  const { pinHash, locked, lock, unlock } = usePinStore();
  const registerNavigate = useNavigationStore((s) => s.register);
  useEffect(() => { registerNavigate(setSection); }, [registerNavigate]);
  const { i18n } = useTranslation();

  // Sincronizar perfil desde backend al arrancar
  useEffect(() => {
    api.get<Usuario>("/usuarios/me")
      .then(setUsuario)
      .catch(() => {});
  }, [setUsuario]);

  // Aplicar tema
  useEffect(() => {
    document.documentElement.classList.toggle("dark", usuario?.tema === "oscuro");
  }, [usuario?.tema]);

  // Aplicar idioma
  useEffect(() => {
    const lng = usuario?.idioma ?? "es";
    if (i18n.language !== lng) i18n.changeLanguage(lng);
  }, [usuario?.idioma, i18n]);

  // Bloquear al arrancar si hay PIN configurado
  useEffect(() => {
    if (pinHash) lock();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (pinHash && locked) return <LockScreen onUnlock={unlock} />;

  return (
    <MinimizableShell currentSection={section} onSectionChange={setSection}>
      {SECTION_PAGES[section] ?? <Dashboard />}
    </MinimizableShell>
  );
}

// ── Modo local (sin Supabase) ─────────────────────────────────────────────────

function LocalApp() {
  const usuario   = useUsuarioStore((s) => s.usuario);
  const workspace = useWorkspaceStore((s) => s.workspace);
  if (!usuario || !workspace) return <SelectorUsuarioDemo />;
  return <AppShell />;
}

// ── Modo producción (con Supabase) ────────────────────────────────────────────

function SupabaseApp() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;
  if (!session) return <Auth />;
  return <AppShell />;
}

// ── Entry point ───────────────────────────────────────────────────────────────

export default function App() {
  return (
    <div className="contents" onContextMenu={(e) => e.preventDefault()}>
      <LandscapeBlocker />
      <FlashOverlay />
      {IS_SUPABASE_ENABLED ? <SupabaseApp /> : <LocalApp />}
    </div>
  );
}
