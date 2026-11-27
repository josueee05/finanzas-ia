"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { suggestCategory } from "@/app/actions";
import type { AiMode, Suggestion } from "@/lib/ai/categorize";
import { AUTO_CATEGORY, CATEGORIES, getCategory } from "@/lib/categories";
import type { FormState, TransactionFormValues } from "@/lib/validation";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initialValues: TransactionFormValues;
  submitLabel: string;
  aiMode: AiMode;
};

export function TransactionForm({ action, initialValues, submitLabel, aiMode }: Props) {
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
        aiMode={aiMode}
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

type TxType = "gasto" | "ingreso";

function Fields({
  defaults,
  errors,
  aiMode,
}: {
  defaults: TransactionFormValues;
  errors?: FormState["errors"];
  aiMode: AiMode;
}) {
  const [type, setType] = useState<TxType>(defaults.type === "ingreso" ? "ingreso" : "gasto");
  const [category, setCategory] = useState(defaults.category || AUTO_CATEGORY);
  const [description, setDescription] = useState(defaults.description);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [thinking, startSuggest] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const requestId = useRef(0);

  const categories = CATEGORIES[type];
  const isAuto = category === AUTO_CATEGORY;

  /** Pide sugerencia al servidor 400 ms después de que el usuario deja de escribir. */
  function scheduleSuggestion(nextType: TxType, text: string) {
    clearTimeout(timer.current);
    const id = ++requestId.current;
    if (text.trim().length < 3) {
      setSuggestion(null);
      return;
    }
    timer.current = setTimeout(() => {
      startSuggest(async () => {
        const result = await suggestCategory(nextType, text);
        // Ignora respuestas viejas si el usuario siguió escribiendo
        if (id === requestId.current) setSuggestion(result);
      });
    }, 400);
  }

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
              onChange={() => {
                setType(t);
                // Las categorías cambian con el tipo: si había una elegida, vuelve a automática
                if (!categoryBelongs(t, category)) setCategory(AUTO_CATEGORY);
                scheduleSuggestion(t, description);
              }}
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
          placeholder={type === "gasto" ? "Ej. Almuerzo en Pollo Campero" : "Ej. Sueldo de noviembre"}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            scheduleSuggestion(type, e.target.value);
          }}
          autoComplete="off"
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Categoría"
          error={errors?.category}
          badge={
            <span
              title={aiMode === "claude" ? "Categorización con Claude" : "Modo demo: palabras clave, sin API key"}
              className="rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-white/10"
            >
              ✨ {aiMode === "claude" ? "IA" : "Demo"}
            </span>
          }
        >
          <select
            name="category"
            value={categoryBelongs(type, category) ? category : AUTO_CATEGORY}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
          >
            <option value={AUTO_CATEGORY}>✨ Automática</option>
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

      {isAuto && (
        <SuggestionHint
          description={description}
          suggestion={suggestion}
          thinking={thinking}
          type={type}
          onAccept={(id) => setCategory(id)}
        />
      )}
    </>
  );
}

function categoryBelongs(type: TxType, category: string) {
  return category === AUTO_CATEGORY || CATEGORIES[type].some((c) => c.id === category);
}

function SuggestionHint({
  description,
  suggestion,
  thinking,
  type,
  onAccept,
}: {
  description: string;
  suggestion: Suggestion | null;
  thinking: boolean;
  type: TxType;
  onAccept: (id: string) => void;
}) {
  const base = "-mt-1 flex min-h-5 items-center gap-1.5 text-xs text-zinc-500";

  if (description.trim().length < 3) {
    return <p className={base}>✨ Escribe la descripción y la categoría se elige sola.</p>;
  }
  if (thinking && !suggestion) {
    return <p className={base} aria-live="polite">✨ Analizando…</p>;
  }

  const cat = getCategory(suggestion?.category ?? `otros-${type}`);
  return (
    <p className={`${base} ${thinking ? "opacity-60" : ""}`} aria-live="polite">
      <span>
        ✨ Se guardará en{" "}
        <button
          type="button"
          onClick={() => onAccept(cat.id)}
          title="Fijar esta categoría"
          className="font-medium text-foreground underline decoration-dotted underline-offset-2"
        >
          {cat.emoji} {cat.label}
        </button>
        {suggestion
          ? suggestion.source === "claude"
            ? " · sugerida por IA"
            : " · detectada por palabras clave"
          : " · sin coincidencias"}
      </span>
    </p>
  );
}

const inputClass =
  "h-11 w-full rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none transition-colors focus:border-foreground dark:border-white/15";

function Field({
  label,
  error,
  badge,
  children,
}: {
  label: string;
  error?: string[];
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="flex items-center gap-1.5 font-medium">
        {label}
        {badge}
      </span>
      {children}
      {error?.[0] && <span className="text-xs text-rose-600 dark:text-rose-400">{error[0]}</span>}
    </label>
  );
}
