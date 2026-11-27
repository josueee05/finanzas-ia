import { describe, expect, it } from "vitest";
import { addMonths, currentMonth, formatDate, formatMonth, monthRange, parseMonth, todayISO } from "./dates";

describe("todayISO / currentMonth", () => {
  it("usa la zona horaria de la app, no la del servidor (UTC)", () => {
    // 3:00 UTC del 1 de diciembre = 21:00 del 30 de noviembre en Guatemala (UTC-6)
    const instant = new Date("2026-12-01T03:00:00Z");
    expect(todayISO(instant)).toBe("2026-11-30");
    expect(currentMonth(instant)).toBe("2026-11");
  });
});

describe("addMonths", () => {
  it.each([
    ["2026-11", 1, "2026-12"],
    ["2026-12", 1, "2027-01"],
    ["2026-01", -1, "2025-12"],
    ["2026-11", -5, "2026-06"],
    ["2026-03", -15, "2024-12"],
    ["2026-05", 0, "2026-05"],
  ])("%s %+i = %s", (month, n, expected) => {
    expect(addMonths(month, n)).toBe(expected);
  });
});

describe("parseMonth", () => {
  it("acepta YYYY-MM válidos", () => {
    expect(parseMonth("2026-02")).toBe("2026-02");
    expect(parseMonth("2026-12")).toBe("2026-12");
  });

  it.each(["2026-13", "2026-00", "2026-1", "26-01", "basura", "", undefined, ["2026-01"]])(
    "rechaza %j",
    (value) => {
      expect(parseMonth(value)).toBeNull();
    },
  );
});

describe("monthRange", () => {
  it("devuelve [inicio, inicio del mes siguiente)", () => {
    expect(monthRange("2026-12")).toEqual({ start: "2026-12-01", end: "2027-01-01" });
  });
});

describe("formato en español", () => {
  it("formatea meses y fechas", () => {
    expect(formatMonth("2026-11")).toMatch(/noviembre/);
    expect(formatMonth("2026-11")).toMatch(/2026/);
    expect(formatMonth("2026-11", { short: true })).toMatch(/^nov/);
    expect(formatDate("2026-11-05")).toMatch(/^5 nov/);
  });
});
