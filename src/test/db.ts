import { migrate } from "drizzle-orm/pglite/migrator";
import { getDb } from "@/db";
import { transactions, type NewTransaction } from "@/db/schema";

/** Crea las tablas en la base en memoria y deja solo las filas indicadas. */
export async function resetDb(rows: NewTransaction[] = []) {
  const db = getDb();
  await migrate(db, { migrationsFolder: "./drizzle" });
  await db.delete(transactions);
  if (rows.length) await db.insert(transactions).values(rows);
  return db;
}

/** Atajo para crear filas de prueba: tx("gasto", "comida", 125.5, "2026-11-10") */
export function tx(
  type: "ingreso" | "gasto",
  category: string,
  quetzales: number,
  date: string,
  description = category,
): NewTransaction {
  return { type, category, amountCents: Math.round(quetzales * 100), date, description };
}
