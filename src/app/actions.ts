"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { deleteTransactionRow, insertTransaction, updateTransactionRow } from "@/db/queries";
import type { TransactionType } from "@/db/schema";
import { suggestCategoryFor, type Suggestion } from "@/lib/ai/categorize";
import { getCurrentUser } from "@/lib/auth/current-user";
import { AUTO_CATEGORY, getCategory } from "@/lib/categories";
import {
  transactionInput,
  type FormState,
  type TransactionFormValues,
} from "@/lib/validation";

// Las Server Actions se pueden invocar con un POST directo, no solo desde la UI:
// cada una verifica la sesión, y las consultas filtran siempre por ese usuario.
const SESSION_EXPIRED: FormState = { status: "error", message: "Tu sesión expiró. Vuelve a entrar." };

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
  // Solo usuarios con sesión (la IA cuesta dinero)
  if (!(await getCurrentUser())) return null;
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
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;

  const submitted = readForm(formData);
  const { values, auto } = await resolveAutoCategory(submitted);
  const result = validate(values);
  // Si hay errores, devolvemos lo que el usuario envió (con "Automática" intacta)
  if (result.state) return { ...result.state, values: submitted };

  const { amount, ...rest } = result.data;
  await insertTransaction(user.id, { ...rest, amountCents: amount });

  revalidatePath("/", "layout");
  return { status: "success", message: autoMessage(rest.category, auto), key: Date.now() };
}

export async function updateTransaction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(id).success) return { status: "error", message: "ID inválido" };
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;

  const submitted = readForm(formData);
  const { values } = await resolveAutoCategory(submitted);
  const result = validate(values);
  if (result.state) return { ...result.state, values: submitted };

  const { amount, ...rest } = result.data;
  // Si el id es de otro usuario, no se actualiza nada (y respondemos igual que si no existiera)
  const updated = await updateTransactionRow(user.id, id, { ...rest, amountCents: amount });
  if (!updated) return { status: "error", message: "La transacción ya no existe" };

  revalidatePath("/", "layout");
  redirect("/transacciones");
}

export async function deleteTransaction(id: string): Promise<void> {
  if (!z.uuid().safeParse(id).success) return;
  const user = await getCurrentUser();
  if (!user) return;
  await deleteTransactionRow(user.id, id);
  revalidatePath("/", "layout");
}
