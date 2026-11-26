import { z } from "zod";
import { isValidCategory } from "./categories";
import { parseAmountToCents } from "./money";

export const transactionInput = z
  .object({
    type: z.enum(["ingreso", "gasto"], { error: "Elige si es ingreso o gasto" }),
    amount: z
      .string({ error: "Escribe un monto" })
      .transform((v, ctx) => {
        const cents = parseAmountToCents(v);
        if (cents === null || cents <= 0) {
          ctx.addIssue({ code: "custom", message: "Monto inválido (ej. 150 o 150.50)" });
          return z.NEVER;
        }
        return cents;
      }),
    description: z
      .string({ error: "Escribe una descripción" })
      .trim()
      .min(1, "Escribe una descripción")
      .max(100, "Máximo 100 caracteres"),
    category: z.string({ error: "Elige una categoría" }).min(1, "Elige una categoría"),
    date: z.iso.date({ error: "Fecha inválida" }),
  })
  .refine((t) => isValidCategory(t.type, t.category), {
    path: ["category"],
    message: "Categoría no válida para este tipo",
    // Por defecto Zod omite este refine si otro campo falló (p. ej. el monto).
    // Lo corremos siempre que tipo y categoría tengan valor, para mostrar todos los errores juntos.
    when: ({ value }) => {
      const v = value as { type?: unknown; category?: unknown };
      return (v.type === "ingreso" || v.type === "gasto") && typeof v.category === "string" && v.category !== "";
    },
  });

export type TransactionInput = z.output<typeof transactionInput>;

export type TransactionFormValues = {
  type: string;
  amount: string;
  description: string;
  category: string;
  date: string;
};

export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Partial<Record<keyof TransactionFormValues, string[]>>;
  values?: TransactionFormValues;
  /** Cambia en cada envío para remontar los campos con valores nuevos. */
  key?: number;
};
