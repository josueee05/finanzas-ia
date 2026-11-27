import type { NewTransaction } from "@/db/schema";
import { addMonths, currentMonth, todayISO } from "./dates";

/**
 * Datos de ejemplo de los últimos `months` meses de calendario (incluido el actual,
 * hasta hoy). Los usan el seed local y cada cuenta de invitado nueva.
 */
const q = (quetzales: number) => Math.round(quetzales * 100);

/** Variación determinista (sin Math.random) para que cada mes se vea distinto pero sea reproducible. */
const wobble = (i: number, amplitude: number) => Math.round(Math.sin(i * 1.7) * amplitude);

type Template = Pick<NewTransaction, "type" | "category" | "description"> & {
  day: number;
  amount: (i: number) => number;
};

const MONTHLY: Template[] = [
  { type: "ingreso", category: "salario", description: "Salario", day: 1, amount: () => 8500 },
  { type: "gasto", category: "vivienda", description: "Alquiler", day: 2, amount: () => 2800 },
  { type: "gasto", category: "servicios", description: "Luz y agua", day: 5, amount: (i) => 310 + wobble(i, 40) },
  { type: "gasto", category: "servicios", description: "Internet", day: 6, amount: () => 299 },
  { type: "gasto", category: "comida", description: "Supermercado", day: 8, amount: (i) => 950 + wobble(i + 1, 120) },
  { type: "gasto", category: "transporte", description: "Gasolina", day: 10, amount: (i) => 420 + wobble(i + 2, 60) },
  { type: "gasto", category: "entretenimiento", description: "Streaming", day: 12, amount: () => 89 },
  { type: "gasto", category: "comida", description: "Cena con amigos", day: 15, amount: (i) => 240 + wobble(i + 3, 90) },
  { type: "gasto", category: "comida", description: "Supermercado", day: 22, amount: (i) => 610 + wobble(i + 4, 80) },
  { type: "gasto", category: "salud", description: "Farmacia", day: 18, amount: (i) => 135.5 + wobble(i, 30) },
  { type: "gasto", category: "compras", description: "Ropa", day: 21, amount: (i) => 380 + wobble(i + 5, 220) },
];

/** Movimientos que solo pasan algunos meses (índice desde el final: 0 = el mes actual). */
const EXTRAS: Array<Template & { monthsAgo: number }> = [
  { monthsAgo: 4, type: "gasto", category: "salud", description: "Consulta médica", day: 14, amount: () => 450 },
  { monthsAgo: 3, type: "ingreso", category: "freelance", description: "Proyecto web freelance", day: 16, amount: () => 2500 },
  { monthsAgo: 2, type: "gasto", category: "educacion", description: "Curso en línea", day: 9, amount: () => 150 },
  { monthsAgo: 2, type: "gasto", category: "entretenimiento", description: "Concierto", day: 25, amount: () => 600 },
  { monthsAgo: 1, type: "ingreso", category: "freelance", description: "Diseño de logo", day: 11, amount: () => 1200 },
  { monthsAgo: 0, type: "gasto", category: "compras", description: "Audífonos", day: 3, amount: () => 520 },
];

export function sampleTransactions(userId: string, { months = 6, now = new Date() } = {}): NewTransaction[] {
  const today = todayISO(now);
  const thisMonth = currentMonth(now);
  const rows: NewTransaction[] = [];

  for (let ago = months - 1; ago >= 0; ago--) {
    const month = addMonths(thisMonth, -ago);
    const i = months - 1 - ago;
    const templates = [...MONTHLY, ...EXTRAS.filter((e) => e.monthsAgo === ago)];
    for (const { day, amount, type, category, description } of templates) {
      const date = `${month}-${String(day).padStart(2, "0")}`;
      if (date > today) continue; // nada en el futuro
      rows.push({ userId, type, category, description, date, amountCents: q(amount(i)) });
    }
  }
  return rows;
}
