"use client";

import { useActionState, useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import type { FormState, TransactionFormValues } from "@/lib/validation";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initialValues: TransactionFormValues;
  submitLabel: string;
};

export function TransactionForm({ action, initialValues, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {/*
        React resetea el formulario después de cada acción. Remontamos los campos con
        `key` para mostrar los valores enviados (si hubo error) o los iniciales (si se guardó).
      */}
      <Fields
        key={state.key ?? 0}
        defaults={state.status === "error" && state.values ? state.values : initialValues}
        errors={state.errors}
      />

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-lg bg-foreground font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Guardando…" : submitLabel}
      </button>

      {state.message && (
        <p
          role="status"
          className={
            state.status === "error"
              ? "text-sm text-rose-600 dark:text-rose-400"
              : "text-sm text-emerald-600 dark:text-emerald-400"
          }
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

function Fields({
  defaults,
  errors,
}: {
  defaults: TransactionFormValues;
  errors?: FormState["errors"];
}) {
  const [type, setType] = useState<"gasto" | "ingreso">(
    defaults.type === "ingreso" ? "ingreso" : "gasto",
  );
  const categories = CATEGORIES[type];
  const defaultCategory = categories.some((c) => c.id === defaults.category)
    ? defaults.category
    : "";

  return (
    <>
      <fieldset className="grid grid-cols-2 gap-1 rounded-lg bg-black/5 p-1 dark:bg-white/10">
        <legend className="sr-only">Tipo</legend>
        {(["gasto", "ingreso"] as const).map((t) => (
          <label
            key={t}
            className="cursor-pointer rounded-md py-2 text-center text-sm font-medium capitalize text-zinc-600 transition-colors has-checked:bg-background has-checked:text-foreground has-checked:shadow-sm dark:text-zinc-400"
          >
            <input
              type="radio"
              name="type"
              value={t}
              checked={type === t}
              onChange={() => setType(t)}
              className="sr-only"
            />
            {t}
          </label>
        ))}
      </fieldset>

      <Field label="Monto" error={errors?.amount}>
        <input
          name="amount"
          inputMode="decimal"
          placeholder="0.00"
          defaultValue={defaults.amount}
          className={inputClass}
        />
      </Field>

      <Field label="Descripción" error={errors?.description}>
        <input
          name="description"
          maxLength={100}
          placeholder={type === "gasto" ? "Ej. Almuerzo con amigos" : "Ej. Pago de noviembre"}
          defaultValue={defaults.description}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoría" error={errors?.category}>
          {/* key: al cambiar de tipo cambia la lista de categorías */}
          <select key={type} name="category" defaultValue={defaultCategory} className={inputClass}>
            <option value="" disabled>
              Elegir…
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Fecha" error={errors?.date}>
          <input type="date" name="date" defaultValue={defaults.date} className={inputClass} />
        </Field>
      </div>
    </>
  );
}

const inputClass =
  "h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none transition-colors focus:border-foreground dark:border-white/15";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string[];
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {error?.[0] && <span className="text-xs text-rose-600 dark:text-rose-400">{error[0]}</span>}
    </label>
  );
}
