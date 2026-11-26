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
