import { ArrowDownLeft, ArrowUpRight, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUsuarioStore } from "@/stores/usuario";

interface Props {
  saldo?: string;
  moneda?: string;
  onIngresar?: () => void;
  onGastar?: () => void;
  onTransferir?: () => void;
}

export function BalanceCard({
  saldo = "0,00",
  moneda = "EUR",
  onIngresar,
  onGastar,
  onTransferir,
}: Props) {
  const { t } = useTranslation();
  const discreto = useUsuarioStore((s) => s.usuario?.ocultar_importes ?? false);
  const [entero, decimal] = saldo.split(",");
  const simbolo = new Intl.NumberFormat("es", { style: "currency", currency: moneda, maximumFractionDigits: 0 })
    .format(0).replace(/[\d\s,. ]/g, "").trim();

  const actions = [
    { icon: <ArrowDownLeft className="w-5 h-5" />, label: t("dashboard.ingresar"),   action: onIngresar },
    { icon: <ArrowUpRight  className="w-5 h-5" />, label: t("dashboard.gastar"),     action: onGastar },
    { icon: <RefreshCw     className="w-5 h-5" />, label: t("dashboard.transferir"), action: onTransferir },
  ];

  return (
    /* Contenedor con fondo oscuro + blobs animados */
    <div
      className="relative overflow-hidden rounded-3xl shadow-[var(--shadow-floating)]"
      style={{ background: "#0A0A0A" }}
    >
      {/* Blobs de color — fondo del cristal */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute rounded-full"
          style={{
            width: 320, height: 320,
            background: "#1E4010",
            filter: "blur(72px)",
            top: "-55%", left: "-12%",
            animation: "blob1 13s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 230, height: 230,
            background: "#C7FF6B",
            opacity: 0.18,
            filter: "blur(58px)",
            bottom: "-40%", right: "8%",
            animation: "blob2 16s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 180, height: 180,
            background: "#0F3020",
            filter: "blur(48px)",
            top: "25%", right: "-6%",
            animation: "blob3 10s ease-in-out infinite",
          }}
        />
      </div>

      {/* Capa de cristal — efecto iOS frosted glass */}
      <div
        className="relative z-10 p-6"
        style={{
          background: "rgba(255, 255, 255, 0.07)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          borderRadius: "inherit",
          border: "1px solid rgba(255, 255, 255, 0.12)",
        }}
      >
        {/* Label */}
        <p className="text-center text-[10px] text-white/40 mb-1 uppercase tracking-widest font-semibold">
          {t("dashboard.saldo_total")}
        </p>

        {/* Importe */}
        <h1 className="text-center font-bold mb-7 text-[42px] leading-tight tabular-nums">
          {discreto ? (
            <span className="tracking-widest text-white/60">••••</span>
          ) : (
            <>
              <span className="text-metallic">{simbolo}{entero ?? "0"},</span>
              <span className="text-accent-positive">{decimal ?? "00"}</span>
            </>
          )}
        </h1>

        {/* Acciones rápidas */}
        <div className="flex justify-center gap-10">
          {actions.map(({ icon, label, action }) => (
            <button
              key={label}
              onClick={action}
              disabled={!action}
              className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform disabled:opacity-40 text-white"
            >
              {icon}
              <span className="text-[11px] text-white/60 font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
