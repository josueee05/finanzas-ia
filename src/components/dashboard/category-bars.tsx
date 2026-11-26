import type { CategoryTotal } from "@/db/queries";
import { getCategory } from "@/lib/categories";
import { formatCents } from "@/lib/money";
import { ChartCard, TableView } from "./chart-card";

const percent = new Intl.NumberFormat("es-GT", { style: "percent", maximumFractionDigits: 0 });

/**
 * Gastos por categoría como barras horizontales ordenadas (no un pie: las barras
 * permiten comparar valores parecidos). Una sola serie, así que un solo color.
 */
export function CategoryBars({ data }: { data: CategoryTotal[] }) {
  const total = data.reduce((sum, d) => sum + d.totalCents, 0);
  const max = data[0]?.totalCents ?? 0;

  return (
    <ChartCard title="Gastos por categoría" subtitle={`${formatCents(total)} en total`}>
      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">No hubo gastos este mes.</p>
      ) : (
        <ul className="flex flex-col">
          {data.map((d) => {
            const cat = getCategory(d.category);
            const share = total > 0 ? d.totalCents / total : 0;
            return (
              <li
                key={d.category}
                tabIndex={0}
                aria-label={`${cat.label}: ${formatCents(d.totalCents)}, ${percent.format(share)} del gasto`}
                className="group relative grid grid-cols-[7.5rem_1fr] items-center gap-3 rounded-md px-2 py-1.5 outline-none hover:bg-black/[.03] focus-visible:ring-2 focus-visible:ring-foreground/30 dark:hover:bg-white/[.04]"
              >
                <span className="truncate text-sm text-zinc-600 dark:text-zinc-400">
                  <span aria-hidden>{cat.emoji}</span> {cat.label}
                </span>
                <span className="flex min-w-0 items-center gap-2">
                  {/* Extremo de datos redondeado (4px), cuadrado en la línea base */}
                  <span
                    className="h-4 shrink-0 rounded-r-[4px] bg-series-expense transition-opacity group-hover:opacity-80"
                    style={{ width: `calc((100% - 6.5rem) * ${max > 0 ? d.totalCents / max : 0})` }}
                  />
                  <span className="text-sm font-medium tabular-nums">{formatCents(d.totalCents)}</span>
                </span>

                {/* Tooltip: complementa (participación y número de movimientos); no es la única vía al dato */}
                <span
                  role="tooltip"
                  className="pointer-events-none absolute -top-9 right-2 z-10 hidden whitespace-nowrap rounded-md border border-black/10 bg-background px-2.5 py-1.5 text-xs shadow-md group-hover:block group-focus-visible:block dark:border-white/15"
                >
                  <strong className="font-semibold">{percent.format(share)}</strong>
                  <span className="text-zinc-500"> del gasto · {d.count} {d.count === 1 ? "movimiento" : "movimientos"}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {data.length > 0 && (
        <TableView
          caption="Gastos por categoría"
          headers={["Categoría", "Monto", "% del gasto", "Movimientos"]}
          rows={data.map((d) => [
            getCategory(d.category).label,
            formatCents(d.totalCents),
            percent.format(total > 0 ? d.totalCents / total : 0),
            String(d.count),
          ])}
        />
      )}
    </ChartCard>
  );
}
