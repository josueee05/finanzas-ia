import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema";

/**
 * En desarrollo usamos PGlite: PostgreSQL real compilado a WebAssembly que corre
 * dentro del proceso de Node. No necesita Docker ni cuentas externas.
 *
 * Guardamos la instancia en `globalThis` para que el hot reload de Next.js no abra
 * una nueva (y bloquee el directorio de datos) en cada cambio.
 */
type Db = ReturnType<typeof drizzle<typeof schema, PGlite>>;

const globalForDb = globalThis as unknown as { db?: Db };

/**
 * La conexión se abre en la primera consulta, no al importar el módulo. Así el
 * build (que importa las páginas en varios procesos a la vez) nunca abre la base.
 */
export function getDb(): Db {
  if (!globalForDb.db) {
    const dataDir = process.env.PGLITE_DATA_DIR || "./.data/pglite";
    // "memory://" = base en memoria (tests): no hay directorio que crear
    if (!dataDir.startsWith("memory://")) mkdirSync(dataDir, { recursive: true });
    globalForDb.db = drizzle({ client: new PGlite(dataDir), schema });
  }
  return globalForDb.db;
}
