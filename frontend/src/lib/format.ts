// Formatting helpers (Member 1). Use these everywhere so money and dates look the same (GEN-17).

/** formatMoney(1234.5, "USD") → "$1,234.50" */
export function formatMoney(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/** formatDate("2026-12-20") → "Dec 20, 2026". Dates without a time are shown as-is (no time-zone shift). */
export function formatDate(value: string | Date, timeZone?: string): string {
  const date = toDate(value);
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: timeZone ?? (isDateOnly(value) ? "UTC" : undefined),
  }).format(date);
}

/**
 * formatDateTime("2027-03-10T06:00:00Z", "Africa/Cairo") → "Mar 10, 2027, 8:00 AM".
 * Flights: pass the airport's time zone so times show in local airport time (FLT-17).
 */
export function formatDateTime(value: string | Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(toDate(value));
}

/** "2h 35m" from minutes. */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

function isDateOnly(value: string | Date): boolean {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}
