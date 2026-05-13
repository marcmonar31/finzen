import { ArrowDownLeft, ArrowUpRight, RefreshCw, Plus } from "lucide-react";
import { useUsuarioStore } from "@/stores/usuario";

interface Props {
  saldo?: string;
  moneda?: string;
  cuentaLabel?: string;
  onIngresar?: () => void;
  onGastar?: () => void;
  onTransferir?: () => void;
  onAnadir?: () => void;
}

export function BalanceCard({
  saldo = "0,00",
  moneda = "EUR",
  cuentaLabel = "Total",
  onIngresar,
  onGastar,
  onTransferir,
  onAnadir,
}: Props) {
  const discreto = useUsuarioStore((s) => s.usuario?.ocultar_importes ?? false);
  const [entero, decimal] = saldo.split(",");

  const actions = [
    { icon: <ArrowDownLeft className="w-5 h-5" />, label: "Ingresar",   action: onIngresar },
    { icon: <ArrowUpRight  className="w-5 h-5" />, label: "Gastar",     action: onGastar },
    { icon: <RefreshCw     className="w-5 h-5" />, label: "Transferir", action: onTransferir },
    { icon: <Plus          className="w-5 h-5" />, label: "Añadir",     action: onAnadir },
  ];

  return (
    <div className="bg-ink rounded-3xl p-6 text-white shadow-[var(--shadow-floating)]">
      {/* Account label */}
      <div className="flex items-center justify-center gap-1.5 mb-4">
        <div className="w-2 h-2 rounded-full bg-accent-positive" />
        <span className="text-xs text-white/50 font-medium">{cuentaLabel}</span>
      </div>

      {/* Label */}
      <p className="text-center text-[10px] text-white/40 mb-1 uppercase tracking-widest font-semibold">
        Saldo total
      </p>

      {/* Amount */}
      <h1 className="text-center font-bold mb-7 text-[42px] leading-tight tabular-nums">
        {discreto ? (
          <span className="tracking-widest text-white/60">••••</span>
        ) : (
          <>{moneda === "EUR" ? "€" : "$"}{entero ?? "0"},<span className="text-accent-positive">{decimal ?? "00"}</span></>
        )}
      </h1>

      {/* Quick actions */}
      <div className="flex justify-around">
        {actions.map(({ icon, label, action }) => (
          <button
            key={label}
            onClick={action}
            disabled={!action}
            className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform disabled:opacity-40"
          >
            <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center">
              {icon}
            </div>
            <span className="text-[11px] text-white/60 font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
