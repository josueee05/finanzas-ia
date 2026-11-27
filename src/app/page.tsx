import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CategoryBars } from "@/components/dashboard/category-bars";
import { ChartCard, TableView } from "@/components/dashboard/chart-card";
import { MonthlyChart } from "@/components/dashboard/monthly-chart";
import { StatTiles } from "@/components/dashboard/stat-tiles";
import { MonthPicker } from "@/components/month-picker";
import { getExpensesByCategory, getMonthlyTotals, getTotals } from "@/db/queries";
import { requireUser } from "@/lib/auth/current-user";
import { addMonths, currentMonth, formatMonth, parseMonth } from "@/lib/dates";
import { formatCents } from "@/lib/money";

export default function DashboardPage({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Resumen</h1>
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Dashboard({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { mes } = await searchParams;
  const user = await requireUser();
  await connection();
  const now = currentMonth();
  // Un mes inválido o futuro en la URL cae al mes actual
  const parsed = parseMonth(mes);
  const month = parsed && parsed <= now ? parsed : now;
  const prevMonth = addMonths(month, -1);

  const [totals, prev, byCategory, monthly] = await Promise.all([
    getTotals(user.id, month),
    getTotals(user.id, prevMonth),
    getExpensesByCategory(user.id, month),
    getMonthlyTotals(user.id, month, 6),
  ]);

  return (
    <>
      {/* El filtro va en una sola fila, arriba de todo lo que afecta */}
      <MonthPicker month={month} currentMonth={now} basePath="/" />

      {totals.count === 0 ? (
        <div className="rounded-xl border border-dashed border-black/15 p-10 text-center text-sm text-zinc-500 dark:border-white/15">
          <p>
            No hay movimientos en <span className="capitalize">{formatMonth(month)}</span>.
          </p>
          <Link href="/transacciones" className="mt-2 inline-block font-medium text-foreground underline underline-offset-4">
            Registrar una transacción
          </Link>
        </div>
      ) : (
        <StatTiles month={month} prevMonth={prevMonth} totals={totals} prev={prev} />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Ingresos y gastos" subtitle="Últimos 6 meses · haz clic en un mes para verlo">
          <MonthlyChart data={monthly} selectedMonth={month} />
          <TableView
            caption="Ingresos y gastos por mes"
            headers={["Mes", "Ingresos", "Gastos", "Balance"]}
            rows={monthly.map((m) => [
              formatMonth(m.month),
              formatCents(m.incomeCents),
              formatCents(m.expenseCents),
              formatCents(m.incomeCents - m.expenseCents),
            ])}
          />
        </ChartCard>

        <CategoryBars data={byCategory} />
      </div>
    </>
  );
}

function DashboardSkeleton() {
  const block = "animate-pulse rounded-xl bg-black/5 dark:bg-white/10";
  return (
    <>
      <div className={`h-9 w-64 ${block}`} />
      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className={`h-[132px] ${block}`} />
        <div className={`h-[132px] ${block}`} />
        <div className={`h-[132px] ${block}`} />
        <div className={`h-[132px] ${block}`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className={`h-[380px] ${block}`} />
        <div className={`h-[380px] ${block}`} />
      </div>
    </>
  );
}
