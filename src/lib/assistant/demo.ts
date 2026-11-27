import { normalize } from "@/lib/ai/rules";
import { CATEGORIES } from "@/lib/categories";
import { addMonths, currentMonth, formatMonth } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { expensesByCategory, findTransactions, monthSummary } from "./finance-data";

/**
 * Asistente del modo demo (sin API key): reconoce las preguntas más comunes en
 * español y las responde con los datos reales del usuario. Sin IA generativa,
 * pero nunca inventa: cada número sale de la base de datos.
 */

const money = (quetzales: number) => formatCents(Math.round(quetzales * 100));
const monthName = (m: string) => formatMonth(m).replace(" de ", " ");

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "¿cuánto gasté en octubre?" -> "2026-10" (el octubre más reciente, sin pasar de hoy). */
export function detectMonth(text: string, now = currentMonth()): string {
  if (/\b(mes pasado|mes anterior)\b/.test(text)) return addMonths(now, -1);
  if (/\b(antepasado|hace dos meses)\b/.test(text)) return addMonths(now, -2);
  const year = Number(/\b(20\d\d)\b/.exec(text)?.[1]);
  const idx = MONTHS.findIndex((m) => new RegExp(`\\b${m === "septiembre" ? "sept?iembre" : m}\\b`).test(text));
  if (idx === -1) return now;

  const mm = String(idx + 1).padStart(2, "0");
  if (year) return `${year}-${mm}`;
  const [y] = now.split("-").map(Number);
  const candidate = `${y}-${mm}`;
  return candidate <= now ? candidate : `${y - 1}-${mm}`;
}

const EXPENSE_CATEGORY_WORDS: Record<string, string[]> = {
  comida: ["comida", "comer", "restaurante", "super", "supermercado", "alimentos"],
  transporte: ["transporte", "gasolina", "uber", "carro", "bus"],
  vivienda: ["vivienda", "alquiler", "renta", "casa"],
  servicios: ["servicios", "luz", "agua", "internet", "telefono"],
  entretenimiento: ["entretenimiento", "diversion", "salidas", "streaming", "netflix"],
  salud: ["salud", "medicina", "farmacia", "doctor"],
  educacion: ["educacion", "estudios", "cursos", "universidad"],
  compras: ["compras", "ropa"],
};

export function detectCategory(text: string): string | null {
  for (const [id, words] of Object.entries(EXPENSE_CATEGORY_WORDS)) {
    if (words.some((w) => new RegExp(`\\b${w}`).test(text))) return id;
  }
  return null;
}

const has = (text: string, ...patterns: string[]) => patterns.some((p) => new RegExp(p).test(text));

type Intent =
  | "consejos"
  | "comparar"
  | "mas_grande"
  | "top_categorias"
  | "gasto_categoria"
  | "ingresos"
  | "ahorro"
  | "gastos"
  | "ayuda";

export function detectIntent(text: string): Intent {
  if (has(text, "consejo", "recomienda", "recomendacion", "tips?\\b", "como (puedo )?ahorr", "ayuda(me)? a ahorrar", "reducir", "gastar menos")) return "consejos";
  if (has(text, "compar", "como voy", "vs", "contra el mes", "mejor o peor", "diferencia")) return "comparar";
  if (has(text, "mas (grande|caro|alto)", "mayor (gasto|compra)", "gasto mas", "compra mas")) return "mas_grande";
  if (has(text, "en que (gaste|se me fue|se va)", "donde (gaste|se me va)", "mas gaste", "gaste mas", "categorias?")) return "top_categorias";
  if (detectCategory(text) && has(text, "gast", "cuanto", "pague")) return "gasto_categoria";
  if (has(text, "ingres", "gane", "cobre", "entro", "recibi", "salario", "sueldo")) return "ingresos";
  if (has(text, "ahorr", "balance", "sobro", "me queda")) return "ahorro";
  if (has(text, "gast", "egreso", "pague")) return "gastos";
  return "ayuda";
}

export const DEMO_SUGGESTIONS = [
  "¿En qué gasté más este mes?",
  "¿Cómo voy comparado con el mes pasado?",
  "¿Cuánto gasté en comida en octubre?",
  "¿Cuál fue mi gasto más grande?",
  "Dame consejos para ahorrar",
];

export async function answerDemo(question: string): Promise<string> {
  const text = normalize(question);
  const intent = detectIntent(text);
  // "¿Cómo voy comparado con el mes pasado?": el mes pasado es la referencia,
  // no el mes a analizar, así que comparamos el mes actual contra él.
  const comparingAgainstLastMonth =
    intent === "comparar" && /\b(con|contra|vs|al|que) el mes (pasado|anterior)\b/.test(text);
  const month = comparingAgainstLastMonth ? currentMonth() : detectMonth(text);
  const label = monthName(month);

  switch (intent) {
    case "top_categorias": {
      const data = await expensesByCategory(month);
      if (data.categorias.length === 0) return `No registraste gastos en ${label}.`;
      const top = data.categorias.slice(0, 3);
      return [
        `En ${label} gastaste **${money(data.total_gastos)}**. Lo que más pesó:`,
        ...top.map((c) => `- **${c.categoria}**: ${money(c.monto)} (${c.porcentaje}%)`),
        // La vivienda suele ser un gasto fijo: no tiene sentido sugerir recortarla
        top[0].id !== "vivienda" && top[0].porcentaje >= 35
          ? `\n${top[0].categoria} se lleva más de un tercio de tus gastos: es el primer lugar donde buscar ahorros.`
          : "",
      ].filter(Boolean).join("\n");
    }

    case "gasto_categoria": {
      const id = detectCategory(text)!;
      const [now, prev] = await Promise.all([expensesByCategory(month), expensesByCategory(addMonths(month, -1))]);
      const cat = now.categorias.find((c) => c.id === id);
      const before = prev.categorias.find((c) => c.id === id);
      const name = CATEGORIES.gasto.find((c) => c.id === id)!.label;
      if (!cat) return `No tienes gastos de **${name}** en ${label}.`;
      const lines = [
        `En ${label} gastaste **${money(cat.monto)}** en ${name} (${cat.movimientos} ${cat.movimientos === 1 ? "movimiento" : "movimientos"}, ${cat.porcentaje}% de tus gastos).`,
      ];
      if (before && before.monto > 0) {
        const diff = Math.round(((cat.monto - before.monto) / before.monto) * 100);
        lines.push(
          diff === 0
            ? "Igual que el mes anterior."
            : `Eso es ${Math.abs(diff)}% ${diff > 0 ? "más" : "menos"} que el mes anterior (${money(before.monto)}).`,
        );
      }
      return lines.join(" ");
    }

    case "gastos": {
      const s = await monthSummary(month);
      if (s.movimientos === 0) return `No hay movimientos registrados en ${label}.`;
      return `En ${label} tus gastos suman **${money(s.gastos)}**, contra ${money(s.ingresos)} de ingresos.`;
    }

    case "ingresos": {
      const data = await findTransactions({ month, type: "ingreso", orderBy: "monto", limit: 5 });
      const s = await monthSummary(month);
      if (s.ingresos === 0) return `No registraste ingresos en ${label}.`;
      return [
        `En ${label} recibiste **${money(s.ingresos)}**:`,
        ...data.movimientos.map((m) => `- ${m.descripcion}: ${money(m.monto)}`),
      ].join("\n");
    }

    case "ahorro": {
      const s = await monthSummary(month);
      if (s.ingresos === 0) return `No registraste ingresos en ${label}, así que no puedo calcular tu ahorro.`;
      const verdict =
        s.tasa_ahorro_pct! >= 20 ? "¡Muy bien! Estás arriba del 20% recomendado. 🎉"
        : s.tasa_ahorro_pct! >= 10 ? "Vas bien; la meta recomendada es ahorrar al menos 20%."
        : s.tasa_ahorro_pct! >= 0 ? "Es poco margen: intenta llegar al menos al 10%."
        : "Gastaste más de lo que ganaste este mes. ⚠️";
      return `En ${label} te quedaron **${money(s.balance)}**, es decir, ahorraste el **${s.tasa_ahorro_pct}%** de tus ingresos. ${verdict}`;
    }

    case "mas_grande": {
      const data = await findTransactions({ month, type: "gasto", orderBy: "monto", limit: 3 });
      if (data.resultados === 0) return `No registraste gastos en ${label}.`;
      const [first, ...rest] = data.movimientos;
      return [
        `Tu gasto más grande de ${label} fue **${first.descripcion}**: ${money(first.monto)} (${first.categoria}).`,
        ...(rest.length ? ["Le siguen:", ...rest.map((m) => `- ${m.descripcion}: ${money(m.monto)}`)] : []),
      ].join("\n");
    }

    case "comparar": {
      const s = await monthSummary(month);
      const p = s.mes_anterior;
      if (s.movimientos === 0) return `No hay movimientos en ${label} para comparar.`;
      const pct = (a: number, b: number) => (b > 0 ? Math.round(((a - b) / b) * 100) : null);
      const g = pct(s.gastos, p.gastos);
      const i = pct(s.ingresos, p.ingresos);
      const fmt = (n: number | null) => (n === null ? "sin datos previos" : `${n > 0 ? "+" : ""}${n}%`);
      return [
        `**${label}** vs. **${monthName(p.mes)}**:`,
        `- Ingresos: ${money(s.ingresos)} (${fmt(i)})`,
        `- Gastos: ${money(s.gastos)} (${fmt(g)})`,
        `- Balance: ${money(s.balance)} (antes ${money(p.balance)})`,
        g !== null && g > 0
          ? `\nTus gastos subieron. Pregúntame "¿en qué gasté más?" para ver dónde.`
          : g !== null && g < 0
            ? "\nGastaste menos que el mes anterior. ¡Bien hecho! 👏"
            : "",
      ].filter(Boolean).join("\n");
    }

    case "consejos": {
      const [s, cats] = await Promise.all([monthSummary(month), expensesByCategory(month)]);
      if (s.movimientos === 0) return `No hay movimientos en ${label} para analizar todavía.`;
      const tips: string[] = [];
      const top = cats.categorias.find((c) => c.id !== "vivienda") ?? cats.categorias[0];
      if (top) {
        tips.push(`- **${top.categoria}** es tu mayor gasto variable (${money(top.monto)}). Reducirlo un 15% te ahorraría unos **${money(top.monto * 0.15)}** al mes.`);
      }
      const fun = cats.categorias.filter((c) => ["entretenimiento", "compras"].includes(c.id));
      const funTotal = fun.reduce((sum, c) => sum + c.monto, 0);
      if (s.ingresos > 0 && funTotal / s.ingresos > 0.1) {
        tips.push(`- Entre entretenimiento y compras se va el ${Math.round((funTotal / s.ingresos) * 100)}% de tus ingresos. Ponte un tope mensual para esos gastos.`);
      }
      if (s.tasa_ahorro_pct !== null && s.tasa_ahorro_pct < 20) {
        const goal = s.ingresos * 0.2 - s.balance;
        tips.push(`- Para llegar al 20% de ahorro te faltan **${money(goal)}** este mes. Separa ese monto apenas recibas tu salario ("págate primero").`);
      } else if (s.tasa_ahorro_pct !== null) {
        tips.push(`- Ya ahorras el ${s.tasa_ahorro_pct}% de tus ingresos. Considera mover ese dinero a una cuenta de ahorro o un plazo fijo para que genere intereses.`);
      }
      tips.push("- Revisa tus suscripciones (streaming, apps, gimnasio): son gastos pequeños que se acumulan cada mes.");
      return [`Algunas ideas basadas en tus datos de ${label}:`, ...tips].join("\n");
    }

    case "ayuda":
      return [
        "En **modo demo** entiendo preguntas como estas:",
        ...DEMO_SUGGESTIONS.map((s) => `- ${s}`),
        '\nPuedes mencionar un mes ("en octubre", "el mes pasado") o una categoría. Con una API key de Anthropic puedo responder cualquier pregunta sobre tus finanzas.',
      ].join("\n");
  }
}
