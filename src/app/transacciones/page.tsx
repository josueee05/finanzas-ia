import { connection } from "next/server";
import { Suspense } from "react";
import { createTransaction } from "@/app/actions";
import { aiMode } from "@/lib/ai/categorize";
import { requireUser } from "@/lib/auth/current-user";
import { MonthPicker } from "@/components/month-picker";
import { TransactionForm } from "@/components/transaction-form";
import { TransactionList, TransactionListSkeleton } from "@/components/transaction-list";
import { AUTO_CATEGORY } from "@/lib/categories";
import { currentMonth, parseMonth, todayISO } from "@/lib/dates";

export const metadata = { title: "Transacciones" };

export default function TransactionsPage({ searchParams }: PageProps<"/transacciones">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Transacciones</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <section className="order-2 flex flex-col gap-4 lg:order-1">
          <Suspense fallback={<TransactionListSkeleton />}>
            <FilteredList searchParams={searchParams} />
          </Suspense>
        </section>

        <section className="order-1 flex flex-col gap-4 lg:order-2">
          <h2 className="text-lg font-semibold tracking-tight">Nueva transacción</h2>
          <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
            <Suspense fallback={<div className="h-[340px]" />}>
              <NewTransactionForm />
            </Suspense>
          </div>
        </section>
      </div>
    </main>
  );
}

async function FilteredList({ searchParams }: Pick<PageProps<"/transacciones">, "searchParams">) {
  const { mes } = await searchParams;
  const user = await requireUser();
  await connection();
  const now = currentMonth();
  const parsed = parseMonth(mes);
  const month = parsed && parsed <= now ? parsed : now;

  return (
    <>
      <MonthPicker month={month} currentMonth={now} basePath="/transacciones" />
      <TransactionList userId={user.id} month={month} />
    </>
  );
}

async function NewTransactionForm() {
  // La fecha por defecto es "hoy", que depende de la petición: no se puede prerenderizar.
  await connection();
  return (
    <TransactionForm
      action={createTransaction}
      submitLabel="Guardar"
      aiMode={aiMode()}
      initialValues={{ type: "gasto", amount: "", description: "", category: AUTO_CATEGORY, date: todayISO() }}
    />
  );
}
