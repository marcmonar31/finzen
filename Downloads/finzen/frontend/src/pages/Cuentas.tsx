import { useState } from "react";
import { Plus } from "lucide-react";
import { useCuentas, useArchivarCuenta } from "@/hooks/useCuentas";
import { NuevaCuentaSheet } from "@/components/NuevaCuentaSheet";
import { EditarCuentaSheet } from "@/components/EditarCuentaSheet";
import { CuentaItem } from "@/components/CuentaItem";
import { showFlash } from "@/stores/flash";
import type { Cuenta } from "@/types/api";

export function Cuentas() {
  const { data: cuentas = [], isLoading } = useCuentas();
  const archivar = useArchivarCuenta();

  const [showNueva, setShowNueva] = useState(false);
  const [editando,  setEditando]  = useState<Cuenta | null>(null);

  async function handleEliminar(cuenta: Cuenta) {
    try {
      await archivar.mutateAsync(cuenta.id);
      showFlash(`${cuenta.nombre} eliminada`, "delete");
    } catch {
      showFlash("Error al eliminar la cuenta", "error");
    }
  }

  return (
    <div className="min-h-full bg-app pb-24">
      {/* Header — píldora flotante */}
      <div className="pt-10 px-4 pb-5">
        <div className="bg-ink rounded-3xl px-5 py-4 flex items-center justify-between shadow-[var(--shadow-floating)]">
          <h1 className="text-white font-bold text-2xl">Cuentas</h1>
          <button
            onClick={() => setShowNueva(true)}
            className="w-9 h-9 rounded-full bg-[#C7FF6B] flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4 text-fg" />
          </button>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {isLoading && (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface rounded-2xl p-5 animate-pulse shadow-[var(--shadow-card)]">
                <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
                <div className="h-7 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </>
        )}

        {!isLoading && cuentas.length === 0 && (
          <div className="bg-surface rounded-2xl p-8 flex flex-col items-center text-center shadow-[var(--shadow-card)]">
            <div className="w-14 h-14 rounded-2xl bg-surface-2 flex items-center justify-center text-3xl mb-4">💳</div>
            <p className="font-bold text-fg mb-1">Sin cuentas aún</p>
            <p className="text-fg-muted text-sm mb-5">Crea tu primera cuenta para empezar</p>
            <button
              onClick={() => setShowNueva(true)}
              className="bg-ink text-white rounded-full px-6 py-2.5 text-sm font-semibold"
            >
              Crear cuenta
            </button>
          </div>
        )}

        {cuentas.map((cuenta) => (
          <CuentaItem
            key={cuenta.id}
            cuenta={cuenta}
            onEdit={(c) => setEditando(c)}
            onDelete={(c) => handleEliminar(c)}
          />
        ))}
      </div>

      <NuevaCuentaSheet   open={showNueva}    onClose={() => setShowNueva(false)} />
      <EditarCuentaSheet  cuenta={editando}   onClose={() => setEditando(null)}  />
    </div>
  );
}
