import { and, desc, eq, gte, ilike, lt, sql, type SQL } from "drizzle-orm";
import { connection } from "next/server";
import { addMonths, monthRange } from "@/lib/dates";
import { getDb } from ".";
import { transactions, type NewTransaction, type TransactionType } from "./schema";

/*
 * Todas las funciones reciben el `userId` y filtran por él: ninguna consulta puede
 * leer ni modificar datos de otro usuario.
 *
 * Las lecturas son datos "en vivo" de la petición. PGlite corre dentro del proceso,
 * así que Next.js no puede detectar la consulta como I/O dinámico por sí solo:
 * `connection()` le indica que no la ejecute durante el prerender.
 */

const incomeSum = sql<number>`coalesce(sum(${transactions.amountCents}) filter (where ${transactions.type} = 'ingreso'), 0)::bigint`.mapWith(Number);
const expenseSum = sql<number>`coalesce(sum(${transactions.amountCents}) filter (where ${transactions.type} = 'gasto'), 0)::bigint`.mapWith(Number);

const ofUser = (userId: string) => eq(transactions.userId, userId);

function inMonth(month: string): SQL | undefined {
  const { start, end } = monthRange(month);
  return and(gte(transactions.date, start), lt(transactions.date, end));
}

export async function listTransactions(userId: string, { month, limit = 100 }: { month?: string; limit?: number } = {}) {
  await connection();
  return getDb()
    .select()
    .from(transactions)
    .where(and(ofUser(userId), month ? inMonth(month) : undefined))
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(limit);
}

export type SearchFilters = {
  month?: string;
  type?: TransactionType;
  category?: string;
  /** Texto a buscar en la descripción (sin distinguir mayúsculas) */
  text?: string;
  orderBy?: "fecha" | "monto";
  limit?: number;
};

/** Búsqueda flexible de movimientos (la usa el asistente). */
export async function searchTransactions(
  userId: string,
  { month, type, category, text, orderBy = "fecha", limit = 20 }: SearchFilters,
) {
  await connection();
  return getDb()
    .select()
    .from(transactions)
    .where(
      and(
        ofUser(userId),
        month ? inMonth(month) : undefined,
        type ? eq(transactions.type, type) : undefined,
        category ? eq(transactions.category, category) : undefined,
        // El texto va como parámetro, nunca concatenado en el SQL
        text ? ilike(transactions.description, `%${text.replace(/[%_\\]/g, "\\$&")}%`) : undefined,
      ),
    )
    .orderBy(
      ...(orderBy === "monto"
        ? [desc(transactions.amountCents)]
        : [desc(transactions.date), desc(transactions.createdAt)]),
    )
    .limit(Math.min(Math.max(limit, 1), 50));
}

export async function getTransaction(userId: string, id: string) {
  await connection();
  const [row] = await getDb()
    .select()
    .from(transactions)
    .where(and(ofUser(userId), eq(transactions.id, id)));
  return row ?? null;
}

export type Totals = { incomeCents: number; expenseCents: number; balanceCents: number; count: number };

/** Totales de un mes (o de todo el historial si no se pasa mes). */
export async function getTotals(userId: string, month?: string): Promise<Totals> {
  await connection();
  const [row] = await getDb()
    .select({ incomeCents: incomeSum, expenseCents: expenseSum, count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(and(ofUser(userId), month ? inMonth(month) : undefined));
  return { ...row, balanceCents: row.incomeCents - row.expenseCents };
}

export type CategoryTotal = { category: string; totalCents: number; count: number };

/** Gastos de un mes agrupados por categoría, de mayor a menor. */
export async function getExpensesByCategory(userId: string, month: string): Promise<CategoryTotal[]> {
  await connection();
  const total = sql<number>`sum(${transactions.amountCents})::bigint`.mapWith(Number);
  return getDb()
    .select({ category: transactions.category, totalCents: total, count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(and(ofUser(userId), eq(transactions.type, "gasto"), inMonth(month)))
    .groupBy(transactions.category)
    .orderBy(desc(total));
}

export type MonthTotal = { month: string; incomeCents: number; expenseCents: number };

/** Ingresos y gastos de los `count` meses que terminan en `lastMonth` (incluidos los meses en cero). */
export async function getMonthlyTotals(userId: string, lastMonth: string, count = 6): Promise<MonthTotal[]> {
  await connection();
  const firstMonth = addMonths(lastMonth, -(count - 1));
  const monthKey = sql<string>`to_char(${transactions.date}, 'YYYY-MM')`;

  const rows = await getDb()
    .select({ month: monthKey, incomeCents: incomeSum, expenseCents: expenseSum })
    .from(transactions)
    .where(
      and(
        ofUser(userId),
        gte(transactions.date, monthRange(firstMonth).start),
        lt(transactions.date, monthRange(lastMonth).end),
      ),
    )
    .groupBy(monthKey);

  const byMonth = new Map(rows.map((r) => [r.month, r]));
  return Array.from({ length: count }, (_, i) => {
    const month = addMonths(firstMonth, i);
    return byMonth.get(month) ?? { month, incomeCents: 0, expenseCents: 0 };
  });
}

// ---------------------------------------------------------------------------
// Escrituras: el userId siempre forma parte del WHERE, así un id ajeno no hace nada
// ---------------------------------------------------------------------------

type TransactionData = Omit<NewTransaction, "id" | "userId" | "createdAt" | "updatedAt">;

export async function insertTransaction(userId: string, data: TransactionData) {
  await getDb().insert(transactions).values({ ...data, userId });
}

/** Devuelve false si el movimiento no existe o no es del usuario. */
export async function updateTransactionRow(userId: string, id: string, data: TransactionData): Promise<boolean> {
  const updated = await getDb()
    .update(transactions)
    .set(data)
    .where(and(ofUser(userId), eq(transactions.id, id)))
    .returning({ id: transactions.id });
  return updated.length > 0;
}

export async function deleteTransactionRow(userId: string, id: string) {
  await getDb()
    .delete(transactions)
    .where(and(ofUser(userId), eq(transactions.id, id)));
}
