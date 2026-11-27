/**
 * Reemplaza los movimientos del "usuario local" (el de desarrollo) con datos de
 * ejemplo de 6 meses. No toca los datos de otros usuarios.
 */
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { LOCAL_USER_ID, transactions, users } from "../src/db/schema";
import { sampleTransactions } from "../src/lib/sample-data";

const db = getDb();
await db.insert(users).values({ id: LOCAL_USER_ID, name: "Usuario local" }).onConflictDoNothing();
await db.delete(transactions).where(eq(transactions.userId, LOCAL_USER_ID));

const rows = sampleTransactions(LOCAL_USER_ID);
await db.insert(transactions).values(rows);
console.log(`🌱 ${rows.length} transacciones de ejemplo insertadas para el usuario local`);
await closeDb();
