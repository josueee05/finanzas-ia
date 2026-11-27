import {
  getExpensesByCategory,
  getMonthlyTotals,
  getTotals,
  searchTransactions,
  type SearchFilters,
} from "@/db/queries";
import { getCategory } from "@/lib/categories";
import { addMonths } from "@/lib/dates";

/*
 * Datos financieros en un formato pensado para el asistente: montos en quetzales
 * (no centavos) y categorías con su nombre legible. Lo usan las herramientas de
 * Claude y las respuestas del modo demo, así ambos dicen exactamente lo mismo.
 */

const q = (cents: number) => Math.round(cents) / 100;

export async function monthSummary(month: string) {
  const prevMonth = addMonths(month, -1);
  const [t, p] = await Promise.all([getTotals(month), getTotals(prevMonth)]);
  const rate = (inc: number, bal: number) => (inc > 0 ? Math.round((bal / inc) * 100) : null);
  return {
    mes: month,
    ingresos: q(t.incomeCents),
    gastos: q(t.expenseCents),
    balance: q(t.balanceCents),
    tasa_ahorro_pct: rate(t.incomeCents, t.balanceCents),
    movimientos: t.count,
    mes_anterior: {
      mes: prevMonth,
      ingresos: q(p.incomeCents),
      gastos: q(p.expenseCents),
      balance: q(p.balanceCents),
      tasa_ahorro_pct: rate(p.incomeCents, p.balanceCents),
    },
  };
}

export async function expensesByCategory(month: string) {
  const rows = await getExpensesByCategory(month);
  const total = rows.reduce((s, r) => s + r.totalCents, 0);
  return {
    mes: month,
    total_gastos: q(total),
    categorias: rows.map((r) => ({
      id: r.category,
      categoria: getCategory(r.category).label,
      monto: q(r.totalCents),
      porcentaje: total > 0 ? Math.round((r.totalCents / total) * 100) : 0,
      movimientos: r.count,
    })),
  };
}

export async function findTransactions(filters: SearchFilters) {
  const rows = await searchTransactions(filters);
  return {
    resultados: rows.length,
    movimientos: rows.map((r) => ({
      fecha: r.date,
      tipo: r.type,
      descripcion: r.description,
      categoria: getCategory(r.category).label,
      monto: q(r.amountCents),
    })),
  };
}

export async function monthlySeries(lastMonth: string, count: number) {
  const rows = await getMonthlyTotals(lastMonth, Math.min(Math.max(count, 1), 12));
  return rows.map((r) => ({
    mes: r.month,
    ingresos: q(r.incomeCents),
    gastos: q(r.expenseCents),
    balance: q(r.incomeCents - r.expenseCents),
  }));
}
