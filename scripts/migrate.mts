import { closeDb, getDb, usingPglite } from "../src/db";

const migrationsFolder = "./drizzle";

if (usingPglite()) {
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  // @ts-expect-error -- getDb() devuelve el tipo común; aquí sabemos que es PGlite
  await migrate(getDb(), { migrationsFolder });
} else {
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  // @ts-expect-error -- getDb() devuelve el tipo común; aquí sabemos que es node-postgres
  await migrate(getDb(), { migrationsFolder });
}

console.log(`✅ Migraciones aplicadas (${usingPglite() ? "PGlite local" : "DATABASE_URL"})`);
await closeDb();
