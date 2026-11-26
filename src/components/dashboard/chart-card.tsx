export function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-black/10 p-4 sm:p-5 dark:border-white/10">
      <header>
        <h2 className="font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-zinc-500">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

/** Vista de tabla: cada valor de la gráfica es accesible sin pasar el mouse. */
export function TableView({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <details className="group text-sm">
      <summary className="w-fit cursor-pointer select-none text-xs text-zinc-500 hover:text-foreground">
        Ver como tabla
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-black/10 text-xs text-zinc-500 dark:border-white/10">
              {headers.map((h, i) => (
                <th key={h} scope="col" className={`py-1.5 font-medium ${i > 0 ? "text-right" : ""}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]} className="border-b border-black/5 last:border-0 dark:border-white/5">
                {r.map((cell, i) =>
                  i === 0 ? (
                    <th key={i} scope="row" className="py-1.5 font-normal capitalize">
                      {cell}
                    </th>
                  ) : (
                    <td key={i} className="py-1.5 text-right tabular-nums">
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
