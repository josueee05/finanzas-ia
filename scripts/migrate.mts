import { migrate } from "drizzle-orm/pglite/migrator";
import { getDb } from "../src/db";

await migrate(getDb(), { migrationsFolder: "./drizzle" });
console.log("✅ Migraciones aplicadas");
await getDb().$client.close();
