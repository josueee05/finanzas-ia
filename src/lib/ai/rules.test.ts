import { describe, expect, it } from "vitest";
import { categorizeByRules, normalize } from "./rules";

describe("normalize", () => {
  it("quita tildes, signos y mayúsculas", () => {
    expect(normalize("¿Almuerzo en CAMPERÓ?!")).toBe("almuerzo en campero");
    expect(normalize("  muchos    espacios ")).toBe("muchos espacios");
  });
});

describe("categorizeByRules", () => {
  it.each([
    ["Almuerzo en Pollo Campero", "comida"],
    ["Súper en Paiz", "comida"],
    ["Supermercado La Torre", "comida"],
    ["Uber al trabajo", "transporte"],
    ["Gasolina Shell", "transporte"],
    ["Pago de luz EEGSA", "servicios"],
    ["Recarga Tigo", "servicios"],
    ["Factura de Claro", "servicios"],
    ["Netflix", "entretenimiento"],
    ["Entradas al cine", "entretenimiento"],
    ["Farmacia Galeno", "salud"],
    ["Consulta con el dentista", "salud"],
    ["Curso de Platzi", "educacion"],
    ["Libros de la U", "educacion"],
    ["Zapatos nuevos", "compras"],
    ["Pedido en Amazon", "compras"],
    ["Alquiler de noviembre", "vivienda"],
  ])('gasto "%s" -> %s', (description, category) => {
    expect(categorizeByRules(description, "gasto")?.category).toBe(category);
  });

  it.each([
    ["Sueldo de noviembre", "salario"],
    ["Quincena", "salario"],
    ["Proyecto web para cliente", "freelance"],
    ["Intereses del banco", "inversiones"],
    ["Remesa de mi tía", "regalos"],
  ])('ingreso "%s" -> %s', (description, category) => {
    expect(categorizeByRules(description, "ingreso")?.category).toBe(category);
  });

  it("la coincidencia más específica gana: 'Uber Eats' es comida, no transporte", () => {
    expect(categorizeByRules("Uber Eats sushi", "gasto")?.category).toBe("comida");
  });

  it("las palabras cortas solo coinciden completas: 'Barbería' no es 'bar'", () => {
    expect(categorizeByRules("Barbería", "gasto")).toBeNull();
  });

  it("las palabras largas coinciden como prefijo: 'super' encuentra 'supermercado'", () => {
    expect(categorizeByRules("supermercados", "gasto")?.category).toBe("comida");
  });

  it.each(["xyz", "", "   ", "Gasto varios"])("devuelve null cuando nada coincide (%j)", (description) => {
    expect(categorizeByRules(description, "gasto")).toBeNull();
  });

  it("solo busca en las categorías del tipo indicado", () => {
    expect(categorizeByRules("Netflix", "ingreso")).toBeNull();
  });
});
