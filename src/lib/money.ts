/** Parse a money input like "1200" or "1,200.50" into cents. */
export function parseMoneyToCents(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s/g, "").replace(/,/g, "");
  if (!cleaned) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, fraction = ""] = cleaned.split(".");
  const cents =
    Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  if (!Number.isFinite(cents) || cents < 0) return null;
  return cents;
}

export function formatMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}${whole.toLocaleString("es-HN")}.${frac}`;
}

export function centsToInputValue(cents: number): string {
  const whole = Math.floor(cents / 100);
  const frac = cents % 100;
  return frac === 0 ? String(whole) : `${whole}.${String(frac).padStart(2, "0")}`;
}
