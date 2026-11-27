import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { updateTransaction } from "@/app/actions";
import { TransactionForm } from "@/components/transaction-form";
import { aiMode } from "@/lib/ai/categorize";
import { requireUser } from "@/lib/auth/current-user";
import { getTransaction } from "@/db/queries";
import { centsToInput } from "@/lib/money";

export const metadata = { title: "Editar transacción" };

export default function EditTransactionPage({ params }: PageProps<"/transacciones/[id]/editar">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <Link href="/transacciones" className="text-sm text-zinc-500 hover:text-foreground">
        ← Volver
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Editar transacción</h1>
      <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
        <Suspense fallback={<div className="h-[340px] animate-pulse" />}>
          <EditForm params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function EditForm({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const user = await requireUser();
  // Un id de otro usuario se trata igual que uno inexistente: 404
  const tx = await getTransaction(user.id, id);
  if (!tx) notFound();

  return (
    <TransactionForm
      action={updateTransaction.bind(null, id)}
      submitLabel="Guardar cambios"
      aiMode={aiMode()}
      initialValues={{
        type: tx.type,
        amount: centsToInput(tx.amountCents),
        description: tx.description,
        category: tx.category,
        date: tx.date,
      }}
    />
  );
}
