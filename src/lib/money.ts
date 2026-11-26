export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "GTQ";
export const LOCALE = "es-GT";

const formatter = new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY });

/** Formatea centavos como moneda: 12550 -> "Q125.50" */
export function formatCents(cents: number): string {
  return formatter.format(cents / 100);
}

/**
 * Convierte un monto escrito por el usuario ("125", "125.5", "1,250.75") a centavos
 * sin pasar por aritmética de punto flotante. Devuelve null si no es válido.
 *
 * Máximo 7 dígitos enteros (9,999,999.99) para caber en la columna `integer` de Postgres.
 */
export function parseAmountToCents(input: string): number | null {
  const clean = input.trim().replace(/,/g, "");
  const match = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(clean);
  if (!match) return null;
  const [, whole, fraction = ""] = match;
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

/** Centavos -> string para un <input>: 12550 -> "125.50" */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}
