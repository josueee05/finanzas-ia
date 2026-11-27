import type { TransactionType } from "@/db/schema";

export type Category = { id: string; label: string; emoji: string };

/** Valor del <select> cuando el usuario deja que la IA elija la categoría. */
export const AUTO_CATEGORY = "auto";

export const CATEGORIES: Record<TransactionType, Category[]> = {
  gasto: [
    { id: "comida", label: "Comida", emoji: "🍔" },
    { id: "transporte", label: "Transporte", emoji: "🚌" },
    { id: "vivienda", label: "Vivienda", emoji: "🏠" },
    { id: "servicios", label: "Servicios", emoji: "💡" },
    { id: "entretenimiento", label: "Entretenimiento", emoji: "🎬" },
    { id: "salud", label: "Salud", emoji: "💊" },
    { id: "educacion", label: "Educación", emoji: "📚" },
    { id: "compras", label: "Compras", emoji: "🛍️" },
    { id: "otros-gasto", label: "Otros", emoji: "📦" },
  ],
  ingreso: [
    { id: "salario", label: "Salario", emoji: "💼" },
    { id: "freelance", label: "Freelance", emoji: "💻" },
    { id: "inversiones", label: "Inversiones", emoji: "📈" },
    { id: "regalos", label: "Regalos", emoji: "🎁" },
    { id: "otros-ingreso", label: "Otros", emoji: "💰" },
  ],
};

const byId = new Map(Object.values(CATEGORIES).flat().map((c) => [c.id, c]));

export function getCategory(id: string): Category {
  return byId.get(id) ?? { id, label: id, emoji: "❔" };
}

export function isValidCategory(type: TransactionType, id: string): boolean {
  return CATEGORIES[type].some((c) => c.id === id);
}
