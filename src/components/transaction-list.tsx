import Link from "next/link";
import { listTransactions } from "@/db/queries";
import { getCategory } from "@/lib/categories";
import { formatDate, formatMonth } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { DeleteButton } from "./delete-button";

export async function TransactionList({ month }: { month: string }) {
  const rows = await listTransactions({ month });

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-black/15 p-10 text-center text-sm text-zinc-500 dark:border-white/15">
        No hay movimientos en <span className="capitalize">{formatMonth(month)}</span>. Registra uno
        con el formulario.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-black/5 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/10">
      {rows.map((t) => {
        const cat = getCategory(t.category);
        const isIncome = t.type === "ingreso";
        return (
          <li key={t.id} className="flex items-center gap-3 px-4 py-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-black/5 text-lg dark:bg-white/10">
              {cat.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{t.description}</p>
              <p className="text-xs text-zinc-500">
                {cat.label} · {formatDate(t.date)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span
                className={`text-sm font-semibold tabular-nums ${
                  isIncome ? "text-emerald-600 dark:text-emerald-400" : ""
                }`}
              >
                {isIncome ? "+" : "−"}
                {formatCents(t.amountCents)}
              </span>
              <div className="flex">
                <Link
                  href={`/transacciones/${t.id}/editar`}
                  className="rounded-md px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
                >
                  Editar
                </Link>
                <DeleteButton id={t.id} description={t.description} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function TransactionListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-black/5 dark:bg-white/10" />
      ))}
    </div>
  );
}
