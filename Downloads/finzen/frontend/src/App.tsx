import { useState } from "react";
import { useUsuarioStore } from "@/stores/usuario";
import { useWorkspaceStore } from "@/stores/workspace";
import { SelectorUsuarioDemo } from "@/components/SelectorUsuarioDemo";
import { MinimizableShell } from "@/components/MinimizableShell";
import { Dashboard } from "@/pages/Dashboard";
import { Cuentas } from "@/pages/Cuentas";
import { Movimientos } from "@/pages/Movimientos";
import { Placeholder } from "@/pages/Placeholder";
import { Toaster } from "@/components/ui/sonner";

const SECTION_PAGES: Record<string, React.ReactNode> = {
  dashboard: <Dashboard />,
  cuentas: <Cuentas />,
  movimientos: <Movimientos />,
  presupuestos: <Placeholder emoji="📊" titulo="Presupuestos" />,
  objetivos: <Placeholder emoji="🎯" titulo="Objetivos" />,
  reglas: <Placeholder emoji="⚡" titulo="Reglas" />,
  amigos: <Placeholder emoji="👥" titulo="Amigos" />,
  grupos: <Placeholder emoji="🤝" titulo="Grupos" />,
  deudas: <Placeholder emoji="💸" titulo="Deudas" />,
  inversiones: <Placeholder emoji="📈" titulo="Inversiones" />,
  insights: <Placeholder emoji="💡" titulo="Insights" />,
  ajustes: <Placeholder emoji="⚙️" titulo="Ajustes" />,
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
