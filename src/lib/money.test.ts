import { describe, expect, it } from "vitest";
import { centsToInput, formatCents, formatCentsAxis, parseAmountToCents } from "./money";

describe("parseAmountToCents", () => {
  it.each([
    ["125", 12500],
    ["125.5", 12550],
    ["125.50", 12550],
    ["0.1", 10],
    ["1,250.75", 125075],
    ["  42 ", 4200],
    ["9999999.99", 999999999],
  ])("convierte %j a %i centavos", (input, cents) => {
    expect(parseAmountToCents(input)).toBe(cents);
  });

  it("no pierde precisión como haría la aritmética de punto flotante", () => {
    // 0.29 * 100 = 28.999999999999996 en JavaScript
    expect(parseAmountToCents("0.29")).toBe(29);
    expect(parseAmountToCents("19.99")).toBe(1999);
  });

  it.each(["", "abc", "-5", "1e3", "10.999", "12.", ".5", "10000000", "1.2.3"])(
    "rechaza %j",
    (input) => {
      expect(parseAmountToCents(input)).toBeNull();
    },
  );

  it("el máximo cabe en una columna integer de Postgres", () => {
    expect(parseAmountToCents("9999999.99")!).toBeLessThan(2 ** 31);
  });
});

describe("formato", () => {
  it("formatea centavos como quetzales", () => {
    expect(formatCents(1234550)).toMatch(/^Q\s?12,345\.50$/);
  });

  it("centsToInput devuelve dos decimales", () => {
    expect(centsToInput(12550)).toBe("125.50");
    expect(centsToInput(100)).toBe("1.00");
  });

  it("un eje usa un solo estilo: completo bajo 10,000 y compacto desde ahí", () => {
    expect([0, 200000, 400000].map((t) => formatCentsAxis(t, 400000))).toEqual(
      ["Q 0", "Q 2,000", "Q 4,000"].map((s) => expect.stringMatching(s.replace(" ", "\\s?"))),
    );
    const compact = [0, 500000, 1000000, 1500000].map((t) => formatCentsAxis(t, 1500000));
    expect(compact[0]).toMatch(/^Q\s?0$/);
    expect(compact.slice(1)).toEqual([/5K$/, /10K$/, /15K$/].map((r) => expect.stringMatching(r)));
  });
});
