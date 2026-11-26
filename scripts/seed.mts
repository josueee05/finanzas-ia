/**
 * Carga datos de ejemplo de los últimos 6 meses de calendario (incluido el actual,
 * hasta hoy). Borra las transacciones existentes antes de insertar.
 */
import { getDb } from "../src/db";
import { transactions, type NewTransaction } from "../src/db/schema";
import { addMonths, currentMonth, todayISO } from "../src/lib/dates";

const MONTHS = 6;
const today = todayISO();
const q = (quetzales: number) => Math.round(quetzales * 100);

/** Variación determinista (sin Math.random) para que cada mes se vea distinto pero el seed sea reproducible. */
const wobble = (i: number, amplitude: number) => Math.round(Math.sin(i * 1.7) * amplitude);

type Template = Omit<NewTransaction, "date" | "amountCents"> & { day: number; amount: (i: number) => number };

const monthly: Template[] = [
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

/** Movimientos que solo pasan algunos meses (índice 0 = el mes más antiguo). */
const extras: Array<Template & { month: number }> = [
  { month: 1, type: "gasto", category: "salud", description: "Consulta médica", day: 14, amount: () => 450 },
  { month: 2, type: "ingreso", category: "freelance", description: "Proyecto web freelance", day: 16, amount: () => 2500 },
  { month: 3, type: "gasto", category: "educacion", description: "Curso en línea", day: 9, amount: () => 150 },
  { month: 3, type: "gasto", category: "entretenimiento", description: "Concierto", day: 25, amount: () => 600 },
  { month: 4, type: "ingreso", category: "freelance", description: "Diseño de logo", day: 11, amount: () => 1200 },
  { month: 5, type: "gasto", category: "compras", description: "Audífonos", day: 3, amount: () => 520 },
];

const firstMonth = addMonths(currentMonth(), -(MONTHS - 1));
const rows: NewTransaction[] = [];

for (let i = 0; i < MONTHS; i++) {
  const month = addMonths(firstMonth, i);
  const templates = [...monthly, ...extras.filter((e) => e.month === i)];
  for (const { day, amount, type, category, description } of templates) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    if (date > today) continue; // nada en el futuro
    rows.push({ type, category, description, date, amountCents: q(amount(i)) });
  }
}

await getDb().delete(transactions);
await getDb().insert(transactions).values(rows);
console.log(`🌱 ${rows.length} transacciones de ejemplo insertadas (${MONTHS} meses)`);
await getDb().$client.close();
