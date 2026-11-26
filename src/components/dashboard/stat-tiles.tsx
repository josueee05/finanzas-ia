import type { Totals } from "@/db/queries";
import { formatMonth } from "@/lib/dates";
import { formatCents } from "@/lib/money";

type Props = { month: string; prevMonth: string; totals: Totals; prev: Totals };

/** Tasa de ahorro: qué parte de lo que entró no se gastó. null si no hubo ingresos. */
function savingsRate(t: Totals): number | null {
  return t.incomeCents > 0 ? t.balanceCents / t.incomeCents : null;
}

export function StatTiles({ month, prevMonth, totals, prev }: Props) {
  const vs = `vs ${formatMonth(prevMonth).split(" ")[0]}`;
  const rate = savingsRate(totals);
  const prevRate = savingsRate(prev);

  return (
    <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
      {/* Cifra principal: una sola por vista */}
      <div className="rounded-xl border border-black/10 p-5 sm:col-span-full lg:col-span-1 dark:border-white/10">
        <p className="text-sm text-zinc-500">
          Balance de <span className="capitalize">{formatMonth(month)}</span>
        </p>
        <p className="mt-1 text-5xl font-semibold tracking-tight">{formatCents(totals.balanceCents)}</p>
        <p className="mt-2 text-xs text-zinc-500">Ingresos menos gastos del mes</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:contents">
        <Tile
          label="Ingresos"
          value={formatCents(totals.incomeCents)}
          delta={percentChange(totals.incomeCents, prev.incomeCents)}
          upIsGood
          vs={vs}
        />
        <Tile
          label="Gastos"
          value={formatCents(totals.expenseCents)}
          delta={percentChange(totals.expenseCents, prev.expenseCents)}
          upIsGood={false}
          vs={vs}
        />
        <Tile
          label="Tasa de ahorro"
          value={rate === null ? "—" : formatPercent(rate)}
          delta={
            rate !== null && prevRate !== null
              ? { value: (rate - prevRate) * 100, text: `${formatPoints(rate - prevRate)} pts` }
              : null
          }
          upIsGood
          vs={vs}
        />
      </div>
    </div>
  );
}

type Delta = { value: number; text: string } | null;

function percentChange(current: number, previous: number): Delta {
  if (previous === 0) return null;
  const change = (current - previous) / previous;
  return { value: change, text: formatPercent(Math.abs(change)) };
}

const percent = new Intl.NumberFormat("es-GT", { style: "percent", maximumFractionDigits: 0 });
const formatPercent = (n: number) => percent.format(n);
const formatPoints = (n: number) => Math.abs(Math.round(n * 100)).toString();

function Tile({
  label,
  value,
  delta,
  upIsGood,
  vs,
}: {
  label: string;
  value: string;
  delta: Delta;
  upIsGood: boolean;
  vs: string;
}) {
  return (
    <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      <DeltaBadge delta={delta} upIsGood={upIsGood} vs={vs} />
    </div>
  );
}

/** Variación: el color depende de la dirección Y de si subir es bueno; siempre con flecha + texto. */
function DeltaBadge({ delta, upIsGood, vs }: { delta: Delta; upIsGood: boolean; vs: string }) {
  if (!delta) return <p className="mt-1 text-xs text-zinc-500">Sin datos del mes anterior</p>;

  const flat = Math.round(Math.abs(delta.value) * 100) === 0;
  if (flat) return <p className="mt-1 text-xs text-zinc-500">Sin cambio {vs}</p>;

  const up = delta.value > 0;
  const good = up === upIsGood;
  return (
    <p className={`mt-1 text-xs font-medium ${good ? "text-delta-good" : "text-delta-bad"}`}>
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      <span className="sr-only">{up ? "Subió" : "Bajó"}</span> {delta.text}{" "}
      <span className="font-normal text-zinc-500">{vs}</span>
    </p>
  );
}
