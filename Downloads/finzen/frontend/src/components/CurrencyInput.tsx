import { useState, useEffect } from "react";

interface Props {
  value: string;
  onChange: (raw: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
}

// "1365.50" → "1.365,50"  |  "1365" → "1.365"  |  "1365." → "1.365,"
function toDisplay(raw: string): string {
  if (!raw) return "";
  const hasDot = raw.includes(".");
  const [intPart = "", decPart = ""] = raw.split(".");
  const thousands = intPart ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "";
  return hasDot ? `${thousands},${decPart}` : thousands;
}

export function CurrencyInput({ value, onChange, onBlur, placeholder, className }: Props) {
  const [display, setDisplay] = useState(() => toDisplay(value));

  useEffect(() => {
    setDisplay(toDisplay(value));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;

    // ── Detectar separador decimal ────────────────────────────────────────────
    // Regla 1: si hay una coma → es el separador decimal (posición exacta)
    // Regla 2: si el último carácter es "." → el usuario pulsó la tecla iOS decimal
    // Regla 3: todos los demás "." son nuestros separadores de miles → eliminar
    const commaPos = val.indexOf(",");
    const lastDotPos = val.lastIndexOf(".");
    const trailingDot = lastDotPos >= 0 && lastDotPos === val.length - 1;

    let intStr: string;
    let decStr: string | undefined;
    let hasDecimal = false;

    if (commaPos >= 0) {
      hasDecimal = true;
      intStr = val.slice(0, commaPos).replace(/[^\d]/g, "");
      decStr = val.slice(commaPos + 1).replace(/[^\d]/g, "").slice(0, 2);
    } else if (trailingDot) {
      // iOS: el usuario pulsó el punto como decimal
      hasDecimal = true;
      intStr = val.slice(0, lastDotPos).replace(/[^\d]/g, "");
      decStr = "";
    } else {
      // Sin decimal: todos los puntos son separadores de miles nuestros
      intStr = val.replace(/[^\d]/g, "");
    }

    const intFormatted = intStr ? intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "";
    const newDisplay = hasDecimal ? `${intFormatted},${decStr ?? ""}` : intFormatted;
    setDisplay(newDisplay);

    const rawOut = hasDecimal ? `${intStr}.${decStr ?? ""}` : intStr;
    onChange(rawOut);
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      onChange={handleChange}
      onBlur={onBlur}
      placeholder={placeholder}
      className={className}
    />
  );
}
