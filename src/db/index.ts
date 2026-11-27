import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Dos motores, un mismo esquema:
 * - Con `DATABASE_URL` (producción, p. ej. Neon): PostgreSQL de verdad vía node-postgres.
 * - Sin ella (desarrollo y tests): PGlite, PostgreSQL compilado a WebAssembly que corre
 *   dentro del proceso de Node. No necesita Docker ni cuentas externas.
 *
 * Guardamos la instancia en `globalThis` para que el hot reload de Next.js no abra
 * una nueva (y bloquee el directorio de datos) en cada cambio.
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const globalForDb = globalThis as unknown as { db?: Db; close?: () => Promise<void> };

export const usingPglite = () => !process.env.DATABASE_URL;

function createDb(): { db: Db; close: () => Promise<void> } {
  const url = process.env.DATABASE_URL;
  if (url) {
    // Pool pequeño: en serverless cada instancia atiende pocas peticiones a la vez
    const pool = new Pool({ connectionString: url, max: Number(process.env.DB_POOL_MAX) || 5 });
    return { db: drizzlePg({ client: pool, schema }), close: () => pool.end() };
  }

  const dataDir = process.env.PGLITE_DATA_DIR || "./.data/pglite";
  // "memory://" = base en memoria (tests): no hay directorio que crear
  if (!dataDir.startsWith("memory://")) mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  return { db: drizzlePglite({ client, schema }), close: () => client.close() };
}

/**
 * La conexión se abre en la primera consulta, no al importar el módulo. Así el
 * build (que importa las páginas en varios procesos a la vez) nunca abre la base.
 */
export function getDb(): Db {
  if (!globalForDb.db) Object.assign(globalForDb, createDb());
  return globalForDb.db!;
}

/** Cierra la conexión (para scripts de terminal). */
export async function closeDb() {
  await globalForDb.close?.();
  globalForDb.db = undefined;
  globalForDb.close = undefined;
}
