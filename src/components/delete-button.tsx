"use client";

import { useTransition } from "react";
import { deleteTransaction } from "@/app/actions";

export function DeleteButton({ id, description }: { id: string; description: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`¿Eliminar "${description}"?`)) return;
        startTransition(() => deleteTransaction(id));
      }}
      className="rounded-md px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50"
    >
      {pending ? "Eliminando…" : "Eliminar"}
    </button>
  );
}
