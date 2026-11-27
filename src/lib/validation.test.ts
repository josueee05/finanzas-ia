import { describe, expect, it } from "vitest";
import { z } from "zod";
import { transactionInput } from "./validation";

const valid = {
  type: "gasto",
  amount: "1,250.5",
  description: "  Supermercado  ",
  category: "comida",
  date: "2026-11-20",
};

describe("transactionInput", () => {
  it("normaliza un movimiento válido (monto en centavos, descripción recortada)", () => {
    expect(transactionInput.parse(valid)).toEqual({
      type: "gasto",
      amount: 125050,
      description: "Supermercado",
      category: "comida",
      date: "2026-11-20",
    });
  });

  it("rechaza una categoría que no corresponde al tipo", () => {
    const result = transactionInput.safeParse({ ...valid, type: "ingreso" });
    expect(result.success).toBe(false);
    expect(z.flattenError(result.error!).fieldErrors.category).toEqual(["Categoría no válida para este tipo"]);
  });

  it("muestra todos los errores a la vez, incluida la categoría", () => {
    const result = transactionInput.safeParse({
      type: "gasto",
      amount: "abc",
      description: "",
      category: "salario",
      date: "x",
    });
    const errors = z.flattenError(result.error!).fieldErrors;
    expect(Object.keys(errors).sort()).toEqual(["amount", "category", "date", "description"]);
  });

  it.each(["0", "0.00", "-10"])("rechaza el monto %j", (amount) => {
    expect(transactionInput.safeParse({ ...valid, amount }).success).toBe(false);
  });

  it("rechaza descripciones de más de 100 caracteres", () => {
    expect(transactionInput.safeParse({ ...valid, description: "a".repeat(101) }).success).toBe(false);
  });

  it("rechaza tipos que no existen", () => {
    expect(transactionInput.safeParse({ ...valid, type: "transferencia" }).success).toBe(false);
  });
});
