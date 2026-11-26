import Link from "next/link";
import { addMonths, formatMonth } from "@/lib/dates";

type Props = {
  month: string;
  currentMonth: string;
  basePath: string;
};

/** Filtro de mes: vive arriba de todo lo que filtra y se guarda en la URL (?mes=YYYY-MM). */
export function MonthPicker({ month, currentMonth, basePath }: Props) {
  const href = (m: string) => (m === currentMonth ? basePath : `${basePath}?mes=${m}`);
  const isCurrent = month === currentMonth;
  const next = addMonths(month, 1);

  return (
    <nav aria-label="Elegir mes" className="flex flex-wrap items-center gap-2">
      <div className="flex items-center rounded-lg border border-black/10 dark:border-white/15">
        <Link
          href={href(addMonths(month, -1))}
          aria-label="Mes anterior"
          className="grid size-9 place-items-center rounded-l-lg text-zinc-500 transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
        >
          ‹
        </Link>
        <span className="min-w-36 px-2 text-center text-sm font-medium capitalize" aria-live="polite">
          {formatMonth(month)}
        </span>
        {next <= currentMonth ? (
          <Link
            href={href(next)}
            aria-label="Mes siguiente"
            className="grid size-9 place-items-center rounded-r-lg text-zinc-500 transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
          >
            ›
          </Link>
        ) : (
          <span aria-hidden className="grid size-9 place-items-center text-zinc-300 dark:text-zinc-700">
            ›
          </span>
        )}
      </div>
      {!isCurrent && (
        <Link
          href={basePath}
          className="rounded-lg px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
        >
          Ir al mes actual
        </Link>
      )}
    </nav>
  );
}
