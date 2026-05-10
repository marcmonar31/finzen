import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { clsx } from "clsx";

const MONEDAS = [
  { code: "EUR", name: "Euro", flag: "🇪🇺" },
  { code: "USD", name: "Dólar", flag: "🇺🇸" },
  { code: "GBP", name: "Libra", flag: "🇬🇧" },
  { code: "CHF", name: "Franco suizo", flag: "🇨🇭" },
  { code: "JPY", name: "Yen", flag: "🇯🇵" },
  { code: "MXN", name: "Peso mexicano", flag: "🇲🇽" },
  { code: "ARS", name: "Peso argentino", flag: "🇦🇷" },
  { code: "BRL", name: "Real", flag: "🇧🇷" },
  { code: "COP", name: "Peso colombiano", flag: "🇨🇴" },
  { code: "CLP", name: "Peso chileno", flag: "🇨🇱" },
  { code: "CAD", name: "Dólar canadiense", flag: "🇨🇦" },
  { code: "AUD", name: "Dólar australiano", flag: "🇦🇺" },
  { code: "CNY", name: "Yuan", flag: "🇨🇳" },
  { code: "INR", name: "Rupia india", flag: "🇮🇳" },
  { code: "SEK", name: "Corona sueca", flag: "🇸🇪" },
  { code: "NOK", name: "Corona noruega", flag: "🇳🇴" },
  { code: "DKK", name: "Corona danesa", flag: "🇩🇰" },
  { code: "PLN", name: "Esloti polaco", flag: "🇵🇱" },
];

interface Props {
  value: string;
  onChange: (code: string) => void;
  className?: string;
}

export function SelectorMoneda({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const seleccionada = MONEDAS.find((m) => m.code === value) ?? { code: value, name: value, flag: "💱" };

  const filtradas = busqueda
    ? MONEDAS.filter(
        (m) =>
          m.code.toLowerCase().includes(busqueda.toLowerCase()) ||
          m.name.toLowerCase().includes(busqueda.toLowerCase())
      )
    : MONEDAS;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={clsx(
          "flex items-center gap-1.5 bg-[#F2F2F4] rounded-xl px-3 py-2 text-sm text-ink",
          className
        )}
      >
        <span>{seleccionada.flag}</span>
        <span className="font-medium">{seleccionada.code}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[#A0A0A4]" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setBusqueda(""); }} />
          <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-2xl shadow-[var(--shadow-floating)] z-50 overflow-hidden">
            <div className="p-2 border-b border-[#F2F2F4]">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A0A0A4]" />
                <input
                  autoFocus
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar…"
                  className="w-full pl-7 pr-2 py-1.5 text-sm bg-[#F2F2F4] rounded-lg focus:outline-none"
                />
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto py-1">
              {filtradas.map((m) => (
                <button
                  key={m.code}
                  type="button"
                  onClick={() => { onChange(m.code); setOpen(false); setBusqueda(""); }}
                  className={clsx(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-[#F2F2F4] transition-colors",
                    m.code === value && "bg-ink/5 font-semibold"
                  )}
                >
                  <span className="text-base">{m.flag}</span>
                  <span className="font-medium">{m.code}</span>
                  <span className="text-[#6B6B6F] text-xs ml-auto truncate">{m.name}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
