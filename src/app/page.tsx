import { connection } from "next/server";
import { Suspense } from "react";
import { SummaryCards, SummaryCardsSkeleton } from "@/components/summary-cards";
import { TransactionForm } from "@/components/transaction-form";
import { TransactionList, TransactionListSkeleton } from "@/components/transaction-list";
import { todayISO } from "@/lib/dates";
import { createTransaction } from "./actions";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8">
      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Resumen</h1>
        <Suspense fallback={<SummaryCardsSkeleton />}>
          <SummaryCards />
        </Suspense>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <section className="order-2 flex flex-col gap-4 lg:order-1">
          <h2 className="text-lg font-semibold tracking-tight">Movimientos recientes</h2>
          <Suspense fallback={<TransactionListSkeleton />}>
            <TransactionList />
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

async function NewTransactionForm() {
  // La fecha por defecto es "hoy", que depende de la petición: no se puede prerenderizar.
  await connection();
  return (
    <TransactionForm
      action={createTransaction}
      submitLabel="Guardar"
      initialValues={{ type: "gasto", amount: "", description: "", category: "", date: todayISO() }}
    />
  );
}
