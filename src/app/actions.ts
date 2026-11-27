"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { transactions, type TransactionType } from "@/db/schema";
import { suggestCategoryFor, type Suggestion } from "@/lib/ai/categorize";
import { AUTO_CATEGORY, getCategory } from "@/lib/categories";
import {
  transactionInput,
  type FormState,
  type TransactionFormValues,
} from "@/lib/validation";

// TODO (Fase 5): verificar la sesión del usuario en cada acción. Las Server Actions
// se pueden invocar con un POST directo, no solo desde la UI.

function readForm(formData: FormData): TransactionFormValues {
  const get = (k: string) => String(formData.get(k) ?? "");
  return {
    type: get("type"),
    amount: get("amount"),
    description: get("description"),
    category: get("category"),
    date: get("date"),
  };
}

const isType = (t: string): t is TransactionType => t === "ingreso" || t === "gasto";

/**
 * Si el usuario dejó la categoría en "Automática", la elige la IA (o las reglas
 * locales). Si nada coincide, cae en "Otros" del tipo correspondiente.
 */
async function resolveAutoCategory(values: TransactionFormValues) {
  if (values.category !== AUTO_CATEGORY || !isType(values.type)) return { values, auto: null };
  const suggestion = await suggestCategoryFor(values.description, values.type);
  const category = suggestion?.category ?? `otros-${values.type}`;
  return { values: { ...values, category }, auto: suggestion };
}

function autoMessage(category: string, auto: Suggestion | null) {
  const cat = getCategory(category);
  if (!auto) return `Transacción guardada en ${cat.emoji} ${cat.label}`;
  return `Transacción guardada en ${cat.emoji} ${cat.label} (${auto.source === "claude" ? "elegida por IA" : "detectada automáticamente"})`;
}

/** Sugerencia en vivo mientras el usuario escribe la descripción. */
export async function suggestCategory(type: string, description: string): Promise<Suggestion | null> {
  if (!isType(type) || typeof description !== "string") return null;
  return suggestCategoryFor(description, type);
}

function validate(values: TransactionFormValues) {
  const parsed = transactionInput.safeParse(values);
  if (parsed.success) return { data: parsed.data } as const;
  return {
    state: {
      status: "error",
      message: "Revisa los campos marcados",
      errors: z.flattenError(parsed.error).fieldErrors,
      values,
      key: Date.now(),
    } satisfies FormState,
  } as const;
}

export async function createTransaction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const submitted = readForm(formData);
  const { values, auto } = await resolveAutoCategory(submitted);
  const result = validate(values);
  // Si hay errores, devolvemos lo que el usuario envió (con "Automática" intacta)
  if (result.state) return { ...result.state, values: submitted };

  const { amount, ...rest } = result.data;
  await getDb().insert(transactions).values({ ...rest, amountCents: amount });

  revalidatePath("/", "layout");
  return { status: "success", message: autoMessage(rest.category, auto), key: Date.now() };
}

export async function updateTransaction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(id).success) return { status: "error", message: "ID inválido" };

  const submitted = readForm(formData);
  const { values } = await resolveAutoCategory(submitted);
  const result = validate(values);
  if (result.state) return { ...result.state, values: submitted };

  const { amount, ...rest } = result.data;
  const updated = await getDb()
    .update(transactions)
    .set({ ...rest, amountCents: amount })
    .where(eq(transactions.id, id))
    .returning({ id: transactions.id });

  if (updated.length === 0) return { status: "error", message: "La transacción ya no existe" };

  revalidatePath("/", "layout");
  redirect("/transacciones");
}

export async function deleteTransaction(id: string): Promise<void> {
  if (!z.uuid().safeParse(id).success) return;
  await getDb().delete(transactions).where(eq(transactions.id, id));
  revalidatePath("/", "layout");
}
