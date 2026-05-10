import { useState } from "react";
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
import { Toaster } from "@/components/ui/sonner";

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
};

export default function App() {
  const usuario = useUsuarioStore((s) => s.usuario);
  const workspace = useWorkspaceStore((s) => s.workspace);
  const [section, setSection] = useState("dashboard");

  if (!usuario || !workspace) {
    return (
      <>
        <SelectorUsuarioDemo />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <MinimizableShell currentSection={section} onSectionChange={setSection}>
        {SECTION_PAGES[section] ?? <Dashboard />}
      </MinimizableShell>
      <Toaster />
    </>
  );
}
