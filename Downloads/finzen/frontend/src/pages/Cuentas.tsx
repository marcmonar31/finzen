import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, CreditCard } from "lucide-react";
import { useCuentas, useArchivarCuenta } from "@/hooks/useCuentas";
import { NuevaCuentaSheet } from "@/components/NuevaCuentaSheet";
import { EditarCuentaSheet } from "@/components/EditarCuentaSheet";
import { CuentaItem } from "@/components/CuentaItem";
import { MovimientosCuentaSheet } from "@/components/MovimientosCuentaSheet";
import { showFlash } from "@/stores/flash";
import { useWorkspaceStore } from "@/stores/workspace";
import { formatCurrency } from "@/lib/format";
import type { Cuenta } from "@/types/api";

export function Cuentas() {
  const { t } = useTranslation();
  const { data: cuentas = [], isLoading } = useCuentas();
  const archivar = useArchivarCuenta();
  const moneda = useWorkspaceStore((s) => s.workspace?.moneda_base ?? "EUR");

  const [showNueva, setShowNueva] = useState(false);
  const [editando,  setEditando]  = useState<Cuenta | null>(null);
  const [viendo,    setViendo]    = useState<Cuenta | null>(null);

  const patrimonioTotal = cuentas.length > 0
    ? cuentas
        .filter((c) => c.incluir_en_patrimonio && c.saldo != null)
        .reduce((acc, c) => acc + parseFloat(c.saldo!), 0)
        .toFixed(2)
    : null;

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
        <div className="bg-ink rounded-3xl px-5 py-4 shadow-[var(--shadow-floating)]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-white font-bold text-2xl">{t("cuentas.titulo")}</h1>
              {patrimonioTotal !== null && (
                <p className="text-white/60 text-sm mt-0.5">
                  {t("cuentas.patrimonio_neto")}: <span className="text-white font-semibold">{formatCurrency(patrimonioTotal, moneda)}</span>
                </p>
              )}
            </div>
            <button
              onClick={() => setShowNueva(true)}
              className="w-9 h-9 rounded-full bg-[#C7FF6B] flex items-center justify-center active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4 text-fg" />
            </button>
          </div>
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
            <div className="w-14 h-14 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
              <CreditCard className="w-7 h-7 text-fg-muted" />
            </div>
            <p className="font-bold text-fg mb-1">{t("cuentas.sin_cuentas")}</p>
            <p className="text-fg-muted text-sm mb-5">{t("cuentas.sin_cuentas_desc")}</p>
            <button
              onClick={() => setShowNueva(true)}
              className="bg-ink text-white rounded-full px-6 py-2.5 text-sm font-semibold"
            >
              {t("cuentas.crear_cuenta")}
            </button>
          </div>
        )}

        {cuentas.map((cuenta) => (
          <CuentaItem
            key={cuenta.id}
            cuenta={cuenta}
            onEdit={(c) => setEditando(c)}
            onDelete={(c) => handleEliminar(c)}
            onPress={(c) => setViendo(c)}
          />
        ))}
      </div>

      <NuevaCuentaSheet        open={showNueva}  onClose={() => setShowNueva(false)} />
      <EditarCuentaSheet       cuenta={editando} onClose={() => setEditando(null)}  />
      <MovimientosCuentaSheet  cuenta={viendo}   onClose={() => setViendo(null)}   />
    </div>
  );
}
