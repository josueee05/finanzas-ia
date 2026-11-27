import type { PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { transactions, users, type NewTransaction } from "@/db/schema";

/** Dos usuarios de prueba para verificar que nadie ve los datos del otro. */
export const USER_A = "00000000-0000-4000-8000-00000000000a";
export const USER_B = "00000000-0000-4000-8000-00000000000b";

/** Crea las tablas en la base en memoria y deja solo los usuarios A y B y las filas indicadas. */
export async function resetDb(rows: NewTransaction[] = []) {
  const db = getDb();
  // En los tests la base siempre es PGlite (PGLITE_DATA_DIR=memory://)
  await migrate(db as unknown as PgliteDatabase<typeof schema>, { migrationsFolder: "./drizzle" });
  await db.delete(transactions);
  await db.delete(users);
  await db.insert(users).values([
    { id: USER_A, name: "Usuaria A" },
    { id: USER_B, name: "Usuario B" },
  ]);
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
  userId = USER_A,
): NewTransaction {
  return { userId, type, category, amountCents: Math.round(quetzales * 100), date, description };
}
