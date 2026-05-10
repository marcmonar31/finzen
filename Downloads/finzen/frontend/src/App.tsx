import { useState, useEffect } from "react";
import { useUsuarioStore } from "@/stores/usuario";
import { useWorkspaceStore } from "@/stores/workspace";
import { SelectorUsuarioDemo } from "@/components/SelectorUsuarioDemo";
import { MinimizableShell } from "@/components/MinimizableShell";
import { Dashboard } from "@/pages/Dashboard";
import { Cuentas } from "@/pages/Cuentas";
import { Movimientos } from "@/pages/Movimientos";
import { Transferencias } from "@/pages/Transferencias";
import { Presupuestos } from "@/pages/Presupuestos";
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
import { Toaster } from "@/components/ui/sonner";
import { IS_SUPABASE_ENABLED, supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

const SECTION_PAGES: Record<string, React.ReactNode> = {
  dashboard: <Dashboard />,
  cuentas: <Cuentas />,
  movimientos: <Movimientos />,
  transferencias: <Transferencias />,
  presupuestos: <Presupuestos />,
  recurrentes: <Recurrentes />,
  objetivos: <Objetivos />,
  reglas: <Reglas />,
  amigos: <Amigos />,
  grupos: <Grupos />,
  deudas: <Deudas />,
  inversiones: <Inversiones />,
  insights: <Insights />,
  ajustes: <Ajustes />,
  legal: <Legal />,
};

function AppShell() {
  const [section, setSection] = useState("dashboard");
  return (
    <>
      <MinimizableShell currentSection={section} onSectionChange={setSection}>
        {SECTION_PAGES[section] ?? <Dashboard />}
      </MinimizableShell>
      <Toaster />
    </>
  );
}

// ── Modo local (sin Supabase) ─────────────────────────────────────────────────

function LocalApp() {
  const usuario = useUsuarioStore((s) => s.usuario);
  const workspace = useWorkspaceStore((s) => s.workspace);

  if (!usuario || !workspace) {
    return (
      <>
        <SelectorUsuarioDemo />
        <Toaster />
      </>
    );
  }
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

  // Mientras cargamos la sesión, no mostramos nada (evita flash)
  if (session === undefined) return null;

  if (!session) {
    return (
      <>
        <Auth />
        <Toaster />
      </>
    );
  }

  return <AppShell />;
}

// ── Entry point ───────────────────────────────────────────────────────────────

export default function App() {
  return IS_SUPABASE_ENABLED ? <SupabaseApp /> : <LocalApp />;
}
