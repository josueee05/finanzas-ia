import { getTotals } from "@/db/queries";
import { formatCents } from "@/lib/money";

export async function SummaryCards() {
  const { incomeCents, expenseCents, balanceCents } = await getTotals();

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Card
        label="Balance"
        value={formatCents(balanceCents)}
        tone={balanceCents < 0 ? "neg" : "neutral"}
      />
      <Card label="Ingresos" value={formatCents(incomeCents)} tone="pos" />
      <Card label="Gastos" value={formatCents(expenseCents)} tone="neg" />
    </div>
  );
}

export function SummaryCardsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[88px] animate-pulse rounded-xl bg-black/5 dark:bg-white/10" />
      ))}
    </div>
  );
}

const tones = {
  pos: "text-emerald-600 dark:text-emerald-400",
  neg: "text-rose-600 dark:text-rose-400",
  neutral: "",
};

function Card({ label, value, tone }: { label: string; value: string; tone: keyof typeof tones }) {
  return (
    <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${tones[tone]}`}>
        {value}
      </p>
    </div>
  );
}
