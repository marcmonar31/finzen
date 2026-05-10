import Decimal from "decimal.js";

const SYMBOLS: Record<string, string> = {
  EUR: "€", USD: "$", GBP: "£", JPY: "¥", CHF: "CHF",
};

export function formatCurrency(amount: string | number, currency = "EUR"): string {
  const d = new Decimal(amount);
  const symbol = SYMBOLS[currency] ?? currency;
  const abs = d.abs().toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const sign = d.isNegative() ? "-" : "";
  return currency === "EUR" ? `${sign}${abs} ${symbol}` : `${sign}${symbol}${abs}`;
}

export function formatDate(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00");
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);

  if (d.getTime() === hoy.getTime()) return "Hoy";
  if (d.getTime() === ayer.getTime()) return "Ayer";

  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
}

export function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}
