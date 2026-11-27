import { vi } from "vitest";

// `connection()` de Next.js solo funciona dentro de una petición real; en los tests
// las consultas se llaman directamente, así que lo reemplazamos por un no-op.
vi.mock("next/server", () => ({ connection: async () => {} }));
