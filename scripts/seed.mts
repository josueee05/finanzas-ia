/**
 * Carga datos de ejemplo de los últimos 3 meses (útil para la demo y para las
 * gráficas de la Fase 2). Borra las transacciones existentes antes de insertar.
 */
import { getDb } from "../src/db";
import { transactions, type NewTransaction } from "../src/db/schema";
import { todayISO } from "../src/lib/dates";

function daysAgo(n: number): string {
  const [y, m, d] = todayISO().split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10);
}

const q = (quetzales: number) => Math.round(quetzales * 100);

const rows: NewTransaction[] = [];

for (const month of [0, 1, 2]) {
  const base = month * 30;
  rows.push(
    { type: "ingreso", category: "salario", description: "Salario", amountCents: q(8500), date: daysAgo(base + 1) },
    { type: "gasto", category: "vivienda", description: "Alquiler", amountCents: q(2800), date: daysAgo(base + 2) },
    { type: "gasto", category: "servicios", description: "Luz y agua", amountCents: q(310 + month * 15), date: daysAgo(base + 5) },
    { type: "gasto", category: "servicios", description: "Internet", amountCents: q(299), date: daysAgo(base + 6) },
    { type: "gasto", category: "comida", description: "Supermercado", amountCents: q(950 - month * 40), date: daysAgo(base + 8) },
    { type: "gasto", category: "transporte", description: "Gasolina", amountCents: q(400 + month * 25), date: daysAgo(base + 10) },
    { type: "gasto", category: "entretenimiento", description: "Streaming", amountCents: q(89), date: daysAgo(base + 12) },
    { type: "gasto", category: "comida", description: "Cena con amigos", amountCents: q(240), date: daysAgo(base + 15) },
    { type: "gasto", category: "salud", description: "Farmacia", amountCents: q(135.5), date: daysAgo(base + 18) },
    { type: "gasto", category: "compras", description: "Ropa", amountCents: q(380 + month * 60), date: daysAgo(base + 21) },
  );
}
rows.push(
  { type: "ingreso", category: "freelance", description: "Proyecto web freelance", amountCents: q(2500), date: daysAgo(14) },
  { type: "gasto", category: "educacion", description: "Curso en línea", amountCents: q(150), date: daysAgo(20) },
);

await getDb().delete(transactions);
await getDb().insert(transactions).values(rows);
console.log(`🌱 ${rows.length} transacciones de ejemplo insertadas`);
await getDb().$client.close();
