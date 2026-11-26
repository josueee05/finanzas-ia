import { desc, eq, sql } from "drizzle-orm";
import { connection } from "next/server";
import { getDb } from ".";
import { transactions } from "./schema";

/*
 * Todas las lecturas son datos "en vivo" de la petición. PGlite corre dentro del
 * proceso, así que Next.js no puede detectar la consulta como I/O dinámico por sí
 * solo: `connection()` le indica que no la ejecute durante el prerender.
 */

export async function listTransactions(limit = 50) {
  await connection();
  return getDb()
    .select()
    .from(transactions)
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(limit);
}

export async function getTransaction(id: string) {
  await connection();
  const [row] = await getDb().select().from(transactions).where(eq(transactions.id, id));
  return row ?? null;
}

export async function getTotals() {
  await connection();
  const [row] = await getDb()
    .select({
      incomeCents: sql<number>`coalesce(sum(${transactions.amountCents}) filter (where ${transactions.type} = 'ingreso'), 0)::bigint`.mapWith(Number),
      expenseCents: sql<number>`coalesce(sum(${transactions.amountCents}) filter (where ${transactions.type} = 'gasto'), 0)::bigint`.mapWith(Number),
      count: sql<number>`count(*)::int`,
    })
    .from(transactions);
  return { ...row, balanceCents: row.incomeCents - row.expenseCents };
}
