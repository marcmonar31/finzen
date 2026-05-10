import { ArrowDownLeft, ArrowUpRight, RefreshCw, Plus } from "lucide-react";

interface Props {
  saldo?: string;
  moneda?: string;
  cuentaLabel?: string;
  onNuevoMovimiento?: () => void;
}

export function BalanceCard({
  saldo = "0,00",
  moneda = "EUR",
  cuentaLabel = "Total",
  onNuevoMovimiento,
}: Props) {
  const [entero, decimal] = saldo.split(",");

  return (
    <div className="bg-ink rounded-3xl p-6 mx-4 text-white">
      {/* Indicador cuenta */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <div className="bg-accent-positive w-5 h-2.5 rounded-full" />
        <span className="text-xs text-white/60">{cuentaLabel}</span>
      </div>

      {/* Label */}
      <p className="text-center text-xs text-white/50 mb-1 uppercase tracking-widest">
        Saldo total
      </p>

      {/* Importe */}
      <h1 className="text-center font-bold mb-6 text-[40px] leading-tight tabular-nums">
        {moneda === "EUR" ? "€" : "$"}
        {entero},<span className="text-accent-positive">{decimal ?? "00"}</span>
      </h1>

      {/* Quick actions */}
      <div className="flex justify-around">
        {[
          { icon: <ArrowDownLeft className="w-5 h-5" />, label: "Ingresar" },
          { icon: <ArrowUpRight className="w-5 h-5" />, label: "Gastar" },
          { icon: <RefreshCw className="w-5 h-5" />, label: "Transferir" },
          { icon: <Plus className="w-5 h-5" />, label: "Añadir", action: onNuevoMovimiento },
        ].map(({ icon, label, action }) => (
          <button
            key={label}
            onClick={action}
            className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
          >
            <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center">
              {icon}
            </div>
            <span className="text-[11px] text-white/60">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
