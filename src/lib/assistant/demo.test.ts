import { beforeAll, describe, expect, it } from "vitest";
import { normalize } from "@/lib/ai/rules";
import { addMonths, currentMonth } from "@/lib/dates";
import { resetDb, tx } from "@/test/db";
import { answerDemo, detectCategory, detectIntent, detectMonth } from "./demo";

const n = normalize;

describe("detectMonth", () => {
  const now = "2026-11";
  it.each([
    ["cuanto gaste este mes", "2026-11"],
    ["y el mes pasado", "2026-10"],
    ["el mes anterior", "2026-10"],
    ["en octubre", "2026-10"],
    ["en noviembre", "2026-11"],
    ["en diciembre", "2025-12"], // el diciembre más reciente que no está en el futuro
    ["setiembre", "2026-09"],
    ["marzo de 2025", "2025-03"],
  ])("%j -> %s", (text, expected) => {
    expect(detectMonth(n(text), now)).toBe(expected);
  });
});

describe("detectIntent", () => {
  it.each([
    ["¿En qué gasté más este mes?", "top_categorias"],
    ["¿Cuánto gasté en comida en octubre?", "gasto_categoria"],
    ["¿Cómo voy comparado con el mes pasado?", "comparar"],
    ["¿Cuál fue mi gasto más grande?", "mas_grande"],
    ["Dame consejos para ahorrar", "consejos"],
    ["¿Cómo puedo ahorrar más?", "consejos"],
    ["¿Cuánto ahorré?", "ahorro"],
    ["¿Cuánto gané en septiembre?", "ingresos"],
    ["¿Cuánto llevo gastado?", "gastos"],
    ["¿Quién ganó el mundial?", "ayuda"],
  ])("%j -> %s", (question, intent) => {
    expect(detectIntent(n(question))).toBe(intent);
  });

  it("detecta categorías por sinónimos", () => {
    expect(detectCategory(n("cuánto se fue en gasolina"))).toBe("transporte");
    expect(detectCategory(n("lo del súper"))).toBe("comida");
    expect(detectCategory(n("hola"))).toBeNull();
  });
});

describe("answerDemo (con base de datos real en memoria)", () => {
  const month = currentMonth();
  const prev = addMonths(month, -1);

  beforeAll(async () => {
    await resetDb([
      tx("ingreso", "salario", 8000, `${month}-01`, "Salario"),
      tx("gasto", "vivienda", 3000, `${month}-02`, "Alquiler"),
      tx("gasto", "comida", 1500, `${month}-03`, "Supermercado"),
      tx("gasto", "transporte", 500, `${month}-04`, "Gasolina"),
      tx("ingreso", "salario", 8000, `${prev}-01`, "Salario"),
      tx("gasto", "comida", 1000, `${prev}-05`, "Supermercado"),
    ]);
  });

  it("lista las categorías con más gasto y su porcentaje", async () => {
    const answer = await answerDemo("¿En qué gasté más este mes?");
    expect(answer).toMatch(/Q\s?5,000\.00/); // total del mes
    expect(answer).toMatch(/\*\*Vivienda\*\*: Q\s?3,000\.00 \(60%\)/);
    expect(answer.indexOf("Vivienda")).toBeLessThan(answer.indexOf("Comida"));
  });

  it("compara el mes actual contra el anterior", async () => {
    const answer = await answerDemo("¿Cómo voy comparado con el mes pasado?");
    expect(answer).toMatch(/Gastos: Q\s?5,000\.00 \(\+400%\)/);
    expect(answer).toMatch(/subieron/);
  });

  it("responde el gasto de una categoría con la variación", async () => {
    const answer = await answerDemo("¿Cuánto gasté en comida?");
    expect(answer).toMatch(/Q\s?1,500\.00\*\* en Comida/);
    expect(answer).toMatch(/50% más que el mes anterior/);
  });

  it("calcula la tasa de ahorro", async () => {
    expect(await answerDemo("¿Cuánto ahorré?")).toMatch(/\*\*38%\*\*/);
  });

  it("los consejos usan el mayor gasto variable (no la vivienda)", async () => {
    const answer = await answerDemo("Dame consejos para ahorrar");
    expect(answer).toMatch(/\*\*Comida\*\* es tu mayor gasto variable/);
    expect(answer).toMatch(/Q\s?225\.00/); // 15% de Q1,500
  });

  it("explica qué puede responder si no entiende la pregunta", async () => {
    expect(await answerDemo("¿Quién ganó el mundial?")).toMatch(/modo demo/);
  });

  it("no inventa datos de meses vacíos", async () => {
    expect(await answerDemo("¿En qué gasté más en enero de 2020?")).toMatch(/No registraste gastos/);
  });
});
