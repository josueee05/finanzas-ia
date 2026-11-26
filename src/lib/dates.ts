export const TIME_ZONE = process.env.APP_TIME_ZONE ?? "America/Guatemala";

/** Fecha de hoy (YYYY-MM-DD) en la zona horaria de la app, no la del servidor. */
export function todayISO(now: Date = new Date()): string {
  // en-CA formatea como YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now);
}

/** "2026-11-05" -> "5 nov 2026" */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-GT", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

// ---------------------------------------------------------------------------
// Meses: se representan como "YYYY-MM"
// ---------------------------------------------------------------------------

/** Mes actual ("YYYY-MM") en la zona horaria de la app. */
export function currentMonth(now: Date = new Date()): string {
  return todayISO(now).slice(0, 7);
}

/** Devuelve el mes si el texto es un "YYYY-MM" válido, o null. */
export function parseMonth(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : null;
}

/** addMonths("2026-01", -1) -> "2025-12" */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** Rango [inicio, inicioDelSiguiente) de un mes, como fechas YYYY-MM-DD. */
export function monthRange(month: string): { start: string; end: string } {
  return { start: `${month}-01`, end: `${addMonths(month, 1)}-01` };
}

/** "2026-11" -> "noviembre 2026" (o "nov" con { short: true }) */
export function formatMonth(month: string, { short = false } = {}): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("es-GT", {
    month: short ? "short" : "long",
    ...(short ? {} : { year: "numeric" }),
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}
