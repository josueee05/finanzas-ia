"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { transactions } from "@/db/schema";
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
  const values = readForm(formData);
  const result = validate(values);
  if (result.state) return result.state;

  const { amount, ...rest } = result.data;
  await getDb().insert(transactions).values({ ...rest, amountCents: amount });

  revalidatePath("/");
  return { status: "success", message: "Transacción guardada", key: Date.now() };
}

export async function updateTransaction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(id).success) return { status: "error", message: "ID inválido" };

  const values = readForm(formData);
  const result = validate(values);
  if (result.state) return result.state;

  const { amount, ...rest } = result.data;
  const updated = await getDb()
    .update(transactions)
    .set({ ...rest, amountCents: amount })
    .where(eq(transactions.id, id))
    .returning({ id: transactions.id });

  if (updated.length === 0) return { status: "error", message: "La transacción ya no existe" };

  revalidatePath("/");
  redirect("/");
}

export async function deleteTransaction(id: string): Promise<void> {
  if (!z.uuid().safeParse(id).success) return;
  await getDb().delete(transactions).where(eq(transactions.id, id));
  revalidatePath("/");
}
