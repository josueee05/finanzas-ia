"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import type { MonthTotal } from "@/db/queries";
import { formatMonth } from "@/lib/dates";
import { formatCents, formatCentsAxis } from "@/lib/money";

const SERIES = [
  { key: "incomeCents", label: "Ingresos", color: "var(--series-income)" },
  { key: "expenseCents", label: "Gastos", color: "var(--series-expense)" },
] as const;

const PLOT_HEIGHT = 200;
const MARGIN = { top: 8, right: 4, bottom: 28, left: 64 };
const HEIGHT = PLOT_HEIGHT + MARGIN.top + MARGIN.bottom; // incluye la banda del eje X
const BAR_MAX = 24;
const BAR_GAP = 2; // espacio del color del fondo entre barras vecinas
const RADIUS = 4;

/** Escala "bonita": máximo y paso redondos (1, 2, 2.5 o 5 × 10^n). */
function niceScale(max: number, ticks = 4) {
  if (max <= 0) return { max: 100_000, step: 25_000 };
  const raw = max / ticks;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw)!;
  return { max: Math.ceil(max / step) * step, step };
}

/** Barra con el extremo de datos redondeado y la base cuadrada. */
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(RADIUS, h, w / 2);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

const shortMonth = (m: string) => formatMonth(m, { short: true }).replace(".", "");

export function MonthlyChart({ data, selectedMonth }: { data: MonthTotal[]; selectedMonth: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { max, step } = niceScale(Math.max(...data.flatMap((d) => [d.incomeCents, d.expenseCents])));
  const plotW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const band = plotW / data.length;
  const barW = Math.max(4, Math.min(BAR_MAX, (band * 0.6 - BAR_GAP) / 2));
  const y = (v: number) => MARGIN.top + PLOT_HEIGHT - (v / max) * PLOT_HEIGHT;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);

  const activeData = active === null ? null : data[active];

  return (
    <div className="flex flex-col gap-3">
      {/* Leyenda: siempre presente con 2+ series; la muestra imita la marca (rectángulo) */}
      <ul className="flex gap-4 text-xs text-zinc-600 dark:text-zinc-400">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[2px]" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>

      <div ref={ref} className="relative" style={{ height: HEIGHT }}>
        {width > 0 && (
          <svg width={width} height={HEIGHT} role="img" aria-label="Ingresos y gastos por mes" className="block overflow-visible">
            {/* Cuadrícula y eje Y: líneas finas, sólidas, discretas */}
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={MARGIN.left}
                  x2={width - MARGIN.right}
                  y1={y(t)}
                  y2={y(t)}
                  stroke={t === 0 ? "var(--chart-axis)" : "var(--chart-grid)"}
                  strokeWidth={1}
                  shapeRendering="crispEdges"
                />
                <text x={MARGIN.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--chart-muted)" className="tabular-nums">
                  {formatCentsAxis(t, max)}
                </text>
              </g>
            ))}

            {data.map((d, i) => {
              const cx = MARGIN.left + band * i + band / 2;
              const groupX = cx - barW - BAR_GAP / 2;
              return (
                <g key={d.month}>
                  {active === i && (
                    <rect x={MARGIN.left + band * i} y={MARGIN.top} width={band} height={PLOT_HEIGHT} fill="currentColor" opacity={0.04} />
                  )}
                  {SERIES.map((s, j) => {
                    const v = d[s.key];
                    if (v <= 0) return null; // un valor en cero no dibuja nada
                    const h = Math.max(1, PLOT_HEIGHT - (y(v) - MARGIN.top));
                    return (
                      <path
                        key={s.key}
                        d={barPath(groupX + j * (barW + BAR_GAP), y(v), barW, h)}
                        fill={s.color}
                        opacity={active === null || active === i ? 1 : 0.55}
                      />
                    );
                  })}
                  <text
                    x={cx}
                    y={HEIGHT - 8}
                    textAnchor="middle"
                    fontSize={12}
                    fill={d.month === selectedMonth ? "currentColor" : "var(--chart-muted)"}
                    fontWeight={d.month === selectedMonth ? 600 : 400}
                  >
                    {shortMonth(d.month)}
                  </text>
                </g>
              );
            })}
          </svg>
        )}

        {/* Zonas de hover/foco: toda la columna del mes (más grande que la barra). Clic = ver ese mes */}
        {width > 0 &&
          data.map((d, i) => (
            <Link
              key={d.month}
              href={`/?mes=${d.month}`}
              aria-label={`${formatMonth(d.month)}: ingresos ${formatCents(d.incomeCents)}, gastos ${formatCents(d.expenseCents)}`}
              className="absolute rounded-md outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
              style={{ left: MARGIN.left + band * i, top: MARGIN.top, width: band, height: PLOT_HEIGHT + MARGIN.bottom }}
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            />
          ))}

        {activeData && active !== null && (
          <div
            role="tooltip"
            className="pointer-events-none absolute top-0 z-10 min-w-40 rounded-lg border border-black/10 bg-background px-3 py-2 text-xs shadow-md dark:border-white/15"
            style={{
              left: MARGIN.left + band * active + band / 2,
              transform:
                active === 0 ? "translateX(-25%)" : active === data.length - 1 ? "translateX(-75%)" : "translateX(-50%)",
            }}
          >
            <p className="mb-1 font-medium capitalize text-zinc-500">{formatMonth(activeData.month)}</p>
            {SERIES.map((s) => (
              <p key={s.key} className="flex items-center gap-2">
                {/* Clave de línea, no caja */}
                <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
                <strong className="font-semibold tabular-nums">{formatCents(activeData[s.key])}</strong>
                <span className="text-zinc-500">{s.label}</span>
              </p>
            ))}
            <p className="mt-1 border-t border-black/10 pt-1 text-zinc-500 dark:border-white/10">
              Balance{" "}
              <strong className="font-semibold tabular-nums text-foreground">
                {formatCents(activeData.incomeCents - activeData.expenseCents)}
              </strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
