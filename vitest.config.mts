import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    env: {
      // Cada archivo de tests tiene su propia base PostgreSQL en memoria (PGlite)
      PGLITE_DATA_DIR: "memory://",
      APP_TIME_ZONE: "America/Guatemala",
      // Los tests nunca llaman a la API real
      ANTHROPIC_API_KEY: "",
    },
  },
});
