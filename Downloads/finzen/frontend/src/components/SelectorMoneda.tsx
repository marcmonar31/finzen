import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";

const MONEDAS_BASE = [
  { code: "EUR", flag: "🇪🇺" },
  { code: "USD", flag: "🇺🇸" },
  { code: "GBP", flag: "🇬🇧" },
  { code: "CHF", flag: "🇨🇭" },
  { code: "JPY", flag: "🇯🇵" },
  { code: "MXN", flag: "🇲🇽" },
  { code: "ARS", flag: "🇦🇷" },
  { code: "BRL", flag: "🇧🇷" },
  { code: "COP", flag: "🇨🇴" },
  { code: "CLP", flag: "🇨🇱" },
  { code: "CAD", flag: "🇨🇦" },
  { code: "AUD", flag: "🇦🇺" },
  { code: "CNY", flag: "🇨🇳" },
  { code: "INR", flag: "🇮🇳" },
  { code: "SEK", flag: "🇸🇪" },
  { code: "NOK", flag: "🇳🇴" },
  { code: "DKK", flag: "🇩🇰" },
  { code: "PLN", flag: "🇵🇱" },
];

interface Props {
  value: string;
  onChange: (code: string) => void;
  className?: string;
}

export function SelectorMoneda({ value, onChange, className }: Props) {
  const { t } = useTranslation();
  const [open,     setOpen]     = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [dropPos,  setDropPos]  = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const MONEDAS = MONEDAS_BASE.map((m) => ({
    ...m,
    name: t(`monedas.${m.code}`, { defaultValue: m.code }),
  }));

  const seleccionada = MONEDAS.find((m) => m.code === value) ?? { code: value, name: value, flag: "💱" };

  const filtradas = busqueda
    ? MONEDAS.filter(
        (m) =>
          m.code.toLowerCase().includes(busqueda.toLowerCase()) ||
          m.name.toLowerCase().includes(busqueda.toLowerCase())
      )
    : MONEDAS;

  function handleOpen() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropPos({
        top:   rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    setBusqueda("");
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        className={clsx(
          "flex items-center gap-1.5 bg-surface-2 rounded-xl px-3 py-2 text-sm text-fg",
          className
        )}
      >
        <span>{seleccionada.flag}</span>
        <span className="font-medium">{seleccionada.code}</span>
        <ChevronDown className="w-3.5 h-3.5 text-fg-subtle" />
      </button>

      {open && createPortal(
        <>
          {/* Dismiss layer */}
          <div className="fixed inset-0 z-[9998]" onClick={handleClose} />

          {/* Dropdown — fixed so it escapes any overflow ancestor */}
          <div
            className="fixed z-[9999] w-56 bg-surface rounded-2xl shadow-[var(--shadow-floating)] overflow-hidden"
            style={{ top: dropPos.top, right: dropPos.right }}
          >
            <div className="p-2 border-b border-[#F2F2F4]">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-subtle" />
                <input
                  autoFocus
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder={t("common.buscar")}
                  className="w-full pl-7 pr-2 py-1.5 text-sm bg-surface-2 rounded-lg focus:outline-none"
                />
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto py-1">
              {filtradas.map((m) => (
                <button
                  key={m.code}
                  type="button"
                  onClick={() => { onChange(m.code); handleClose(); }}
                  className={clsx(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm text-left",
                    m.code === value ? "bg-ink/5 font-semibold" : "active:bg-surface-2"
                  )}
                >
                  <span className="text-base">{m.flag}</span>
                  <span className="font-medium">{m.code}</span>
                  <span className="text-fg-muted text-xs ml-auto truncate">{m.name}</span>
                </button>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
