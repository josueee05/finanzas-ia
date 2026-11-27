import { beforeEach, describe, expect, it } from "vitest";
import { resetDb, tx, USER_A, USER_B } from "@/test/db";
import {
  deleteTransactionRow,
  getExpensesByCategory,
  getMonthlyTotals,
  getTotals,
  getTransaction,
  listTransactions,
  searchTransactions,
  updateTransactionRow,
} from "./queries";

beforeEach(async () => {
  await resetDb([
    tx("ingreso", "salario", 8500, "2026-10-01", "Salario"),
    tx("gasto", "vivienda", 2800, "2026-10-02", "Alquiler"),
    tx("gasto", "comida", 0.1, "2026-10-03", "Chicle"),
    tx("gasto", "comida", 0.2, "2026-10-04", "Otro chicle"),
    tx("gasto", "comida", 950, "2026-10-31", "Supermercado 100%_real"),
    tx("ingreso", "salario", 8500, "2026-11-01", "Salario"),
    tx("gasto", "transporte", 400, "2026-11-10", "Gasolina"),
    tx("gasto", "comida", 300, "2026-12-01", "Fuera del rango"),
    // Datos de otro usuario: nunca deben aparecer en las consultas de A
    tx("ingreso", "salario", 99999, "2026-10-01", "Salario de B", USER_B),
    tx("gasto", "comida", 5000, "2026-10-15", "Chicle de B", USER_B),
  ]);
});

describe("getTotals", () => {
  it("suma solo el mes pedido y sin errores de punto flotante", async () => {
    expect(await getTotals(USER_A, "2026-10")).toEqual({
      incomeCents: 850000,
      expenseCents: 280000 + 10 + 20 + 95000,
      balanceCents: 850000 - 375030,
      count: 5,
    });
  });

  it("devuelve ceros para un mes sin movimientos", async () => {
    expect(await getTotals(USER_A, "2020-01")).toEqual({ incomeCents: 0, expenseCents: 0, balanceCents: 0, count: 0 });
  });
});

describe("getExpensesByCategory", () => {
  it("agrupa y ordena de mayor a menor (solo gastos)", async () => {
    const rows = await getExpensesByCategory(USER_A, "2026-10");
    expect(rows.map((r) => [r.category, r.totalCents, r.count])).toEqual([
      ["vivienda", 280000, 1],
      ["comida", 95030, 3],
    ]);
  });
});

describe("getMonthlyTotals", () => {
  it("incluye los meses sin datos en cero y en orden", async () => {
    expect(await getMonthlyTotals(USER_A, "2026-11", 3)).toEqual([
      { month: "2026-09", incomeCents: 0, expenseCents: 0 },
      { month: "2026-10", incomeCents: 850000, expenseCents: 375030 },
      { month: "2026-11", incomeCents: 850000, expenseCents: 40000 },
    ]);
  });
});

describe("listTransactions / searchTransactions", () => {
  it("lista un mes de más reciente a más antiguo", async () => {
    const rows = await listTransactions(USER_A, { month: "2026-10" });
    expect(rows.map((r) => r.date)).toEqual(["2026-10-31", "2026-10-04", "2026-10-03", "2026-10-02", "2026-10-01"]);
  });

  it("filtra por tipo y ordena por monto", async () => {
    const rows = await searchTransactions(USER_A, { type: "gasto", orderBy: "monto", limit: 2 });
    expect(rows.map((r) => r.description)).toEqual(["Alquiler", "Supermercado 100%_real"]);
  });

  it("busca texto sin distinguir mayúsculas", async () => {
    expect(await searchTransactions(USER_A, { text: "CHICLE" })).toHaveLength(2);
  });

  it("trata % y _ como texto literal, no como comodines de SQL", async () => {
    expect(await searchTransactions(USER_A, { text: "100%_" })).toHaveLength(1);
    expect(await searchTransactions(USER_A, { text: "%" })).toHaveLength(1);
    expect(await searchTransactions(USER_A, { text: "_" })).toHaveLength(1);
  });

  it("limita la cantidad de resultados entre 1 y 50", async () => {
    expect(await searchTransactions(USER_A, { limit: 0 })).toHaveLength(1);
    expect((await searchTransactions(USER_A, { limit: 1000 })).length).toBeLessThanOrEqual(50);
  });
});

describe("aislamiento entre usuarios", () => {
  it("las lecturas solo devuelven datos del usuario indicado", async () => {
    const all = await listTransactions(USER_A);
    expect(all).toHaveLength(8);
    expect(all.every((r) => r.userId === USER_A)).toBe(true);
    expect(await searchTransactions(USER_A, { text: "de B" })).toHaveLength(0);
    expect((await getTotals(USER_B, "2026-10")).count).toBe(2);
  });

  it("un usuario no puede leer, editar ni borrar un movimiento ajeno", async () => {
    const [ofB] = await listTransactions(USER_B, { month: "2026-10" });

    expect(await getTransaction(USER_A, ofB.id)).toBeNull();

    const changed = await updateTransactionRow(USER_A, ofB.id, {
      type: "gasto",
      category: "comida",
      amountCents: 1,
      description: "hackeado",
      date: "2026-10-15",
    });
    expect(changed).toBe(false);

    await deleteTransactionRow(USER_A, ofB.id);
    expect(await getTransaction(USER_B, ofB.id)).toMatchObject({ id: ofB.id, description: ofB.description });
  });

  it("el dueño sí puede editar y borrar", async () => {
    const [own] = await listTransactions(USER_A, { month: "2026-11" });
    const data = { type: "gasto" as const, category: "comida", amountCents: 123, description: "Editado", date: own.date };
    expect(await updateTransactionRow(USER_A, own.id, data)).toBe(true);
    expect((await getTransaction(USER_A, own.id))?.description).toBe("Editado");

    await deleteTransactionRow(USER_A, own.id);
    expect(await getTransaction(USER_A, own.id)).toBeNull();
  });
});
