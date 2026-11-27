import { connection } from "next/server";
import { Suspense } from "react";
import { Chat } from "@/components/assistant/chat";
import { aiMode } from "@/lib/ai/categorize";
import { DEMO_SUGGESTIONS } from "@/lib/assistant/demo";

export const metadata = { title: "Asistente" };

export default function AssistantPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Asistente</h1>
        <p className="text-sm text-zinc-500">Pregunta en tus propias palabras sobre tus ingresos y gastos.</p>
      </div>
      <Suspense fallback={<div className="min-h-[60vh] flex-1 animate-pulse rounded-xl bg-black/5 dark:bg-white/10" />}>
        <AssistantChat />
      </Suspense>
    </main>
  );
}

async function AssistantChat() {
  // El modo (Claude o demo) depende de las variables de entorno en tiempo de ejecución
  await connection();
  return <Chat mode={aiMode()} suggestions={DEMO_SUGGESTIONS} />;
}
