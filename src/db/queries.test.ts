import { beforeAll, describe, expect, it } from "vitest";
import { resetDb, tx } from "@/test/db";
import {
  getExpensesByCategory,
  getMonthlyTotals,
  getTotals,
  listTransactions,
  searchTransactions,
} from "./queries";

beforeAll(async () => {
  await resetDb([
    tx("ingreso", "salario", 8500, "2026-10-01", "Salario"),
    tx("gasto", "vivienda", 2800, "2026-10-02", "Alquiler"),
    tx("gasto", "comida", 0.1, "2026-10-03", "Chicle"),
    tx("gasto", "comida", 0.2, "2026-10-04", "Otro chicle"),
    tx("gasto", "comida", 950, "2026-10-31", "Supermercado 100%_real"),
    tx("ingreso", "salario", 8500, "2026-11-01", "Salario"),
    tx("gasto", "transporte", 400, "2026-11-10", "Gasolina"),
    tx("gasto", "comida", 300, "2026-12-01", "Fuera del rango"),
  ]);
});

describe("getTotals", () => {
  it("suma solo el mes pedido y sin errores de punto flotante", async () => {
    const t = await getTotals("2026-10");
    expect(t).toEqual({
      incomeCents: 850000,
      expenseCents: 280000 + 10 + 20 + 95000,
      balanceCents: 850000 - 375030,
      count: 5,
    });
  });

  it("devuelve ceros para un mes sin movimientos", async () => {
    expect(await getTotals("2020-01")).toEqual({ incomeCents: 0, expenseCents: 0, balanceCents: 0, count: 0 });
  });
});

describe("getExpensesByCategory", () => {
  it("agrupa y ordena de mayor a menor (solo gastos)", async () => {
    const rows = await getExpensesByCategory("2026-10");
    expect(rows.map((r) => [r.category, r.totalCents, r.count])).toEqual([
      ["vivienda", 280000, 1],
      ["comida", 95030, 3],
    ]);
  });
});

describe("getMonthlyTotals", () => {
  it("incluye los meses sin datos en cero y en orden", async () => {
    const rows = await getMonthlyTotals("2026-11", 3);
    expect(rows).toEqual([
      { month: "2026-09", incomeCents: 0, expenseCents: 0 },
      { month: "2026-10", incomeCents: 850000, expenseCents: 375030 },
      { month: "2026-11", incomeCents: 850000, expenseCents: 40000 },
    ]);
  });
});

describe("listTransactions / searchTransactions", () => {
  it("lista un mes de más reciente a más antiguo", async () => {
    const rows = await listTransactions({ month: "2026-10" });
    expect(rows.map((r) => r.date)).toEqual(["2026-10-31", "2026-10-04", "2026-10-03", "2026-10-02", "2026-10-01"]);
  });

  it("filtra por tipo y ordena por monto", async () => {
    const rows = await searchTransactions({ type: "gasto", orderBy: "monto", limit: 2 });
    expect(rows.map((r) => r.description)).toEqual(["Alquiler", "Supermercado 100%_real"]);
  });

  it("busca texto sin distinguir mayúsculas", async () => {
    const rows = await searchTransactions({ text: "CHICLE" });
    expect(rows).toHaveLength(2);
  });

  it("trata % y _ como texto literal, no como comodines de SQL", async () => {
    expect(await searchTransactions({ text: "100%_" })).toHaveLength(1);
    expect(await searchTransactions({ text: "%" })).toHaveLength(1);
    expect(await searchTransactions({ text: "_" })).toHaveLength(1);
  });

  it("limita la cantidad de resultados entre 1 y 50", async () => {
    expect(await searchTransactions({ limit: 0 })).toHaveLength(1);
    expect((await searchTransactions({ limit: 1000 })).length).toBeLessThanOrEqual(50);
  });
});
