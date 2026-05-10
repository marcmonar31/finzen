import { useState } from "react";
import { Plus } from "lucide-react";
import { useCuentas } from "@/hooks/useCuentas";
import { NuevaCuentaSheet } from "@/components/NuevaCuentaSheet";
import { formatCurrency } from "@/lib/format";
import { clsx } from "clsx";

const TIPO_LABEL: Record<string, string> = {
  efectivo: "Efectivo", corriente: "Corriente", ahorro: "Ahorro",
  tarjeta_credito: "Tarjeta crédito", inversion: "Inversión",
  cripto: "Cripto", prestamo: "Préstamo", hipoteca: "Hipoteca", otro: "Otro",
};

export function Cuentas() {
  const { data: cuentas = [], isLoading } = useCuentas();
  const [showNueva, setShowNueva] = useState(false);

  return (
    <div className="min-h-full bg-app pb-24">
      {/* Header */}
      <div className="bg-ink px-4 pt-10 pb-6 rounded-b-3xl mb-5">
        <div className="flex items-center justify-between">
          <h1 className="text-white font-bold text-2xl">Cuentas</h1>
          <button
            onClick={() => setShowNueva(true)}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
          >
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {isLoading && (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-5 animate-pulse shadow-[var(--shadow-card)]">
                <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
                <div className="h-7 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </>
        )}

        {!isLoading && cuentas.length === 0 && (
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center text-center shadow-[var(--shadow-card)]">
            <div className="w-14 h-14 rounded-2xl bg-[#F2F2F4] flex items-center justify-center text-3xl mb-4">💳</div>
            <p className="font-bold text-ink mb-1">Sin cuentas aún</p>
            <p className="text-[#6B6B6F] text-sm mb-5">Crea tu primera cuenta para empezar</p>
            <button
              onClick={() => setShowNueva(true)}
              className="bg-ink text-white rounded-full px-6 py-2.5 text-sm font-semibold"
            >
              Crear cuenta
            </button>
          </div>
        )}

        {cuentas.map((cuenta) => (
          <div
            key={cuenta.id}
            className="bg-white rounded-2xl p-5 shadow-[var(--shadow-card)] active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ backgroundColor: cuenta.color ? `${cuenta.color}22` : "#F2F2F4" }}
              >
                {cuenta.emoji ?? "🏦"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink truncate">{cuenta.nombre}</p>
                <p className="text-xs text-[#6B6B6F]">{TIPO_LABEL[cuenta.tipo] ?? cuenta.tipo}</p>
              </div>
              <div className="text-right">
                <p className={clsx(
                  "font-bold tabular-nums",
                  cuenta.saldo && parseFloat(cuenta.saldo) >= 0 ? "text-ink" : "text-red-500"
                )}>
                  {cuenta.saldo != null ? formatCurrency(cuenta.saldo, cuenta.moneda) : "—"}
                </p>
                <p className="text-xs text-[#A0A0A4]">{cuenta.moneda}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowNueva(true)}
        className="fixed bottom-6 right-4 w-14 h-14 rounded-full bg-ink shadow-[var(--shadow-floating)] flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus className="w-6 h-6 text-white" />
      </button>

      <NuevaCuentaSheet open={showNueva} onClose={() => setShowNueva(false)} />
    </div>
  );
}
