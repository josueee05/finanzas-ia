import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { CATEGORIES } from "@/lib/categories";
import { currentMonth, todayISO } from "@/lib/dates";
import { expensesByCategory, findTransactions, monthlySeries, monthSummary } from "./finance-data";

const MODEL = process.env.AI_MODEL ?? "claude-opus-5-5";

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic({ timeout: 60_000, maxRetries: 1 }));

export type ChatTurn = { role: "user" | "assistant"; content: string };

/** Eventos que la ruta /api/chat le transmite al navegador. */
export type ChatEvent =
  | { type: "status"; text: string }
  | { type: "text"; delta: string }
  | { type: "done" }
  | { type: "error"; message: string };

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).describe("Mes en formato YYYY-MM");
const allCategories = [...CATEGORIES.gasto, ...CATEGORIES.ingreso].map((c) => c.id) as [string, ...string[]];

const json = (data: unknown) => JSON.stringify(data);

/** Herramientas: todas son de solo lectura y solo ven los datos del usuario de la sesión. */
const makeTools = (userId: string) => [
  betaZodTool({
    name: "resumen_mes",
    description:
      "Ingresos, gastos, balance y tasa de ahorro de un mes, junto con los del mes anterior para comparar.",
    inputSchema: z.object({ mes: month }),
    run: async ({ mes }) => json(await monthSummary(userId, mes)),
  }),
  betaZodTool({
    name: "gastos_por_categoria",
    description: "Gastos de un mes agrupados por categoría, de mayor a menor, con porcentaje del total.",
    inputSchema: z.object({ mes: month }),
    run: async ({ mes }) => json(await expensesByCategory(userId, mes)),
  }),
  betaZodTool({
    name: "buscar_movimientos",
    description:
      "Busca movimientos individuales. Úsala para preguntas sobre compras concretas, el gasto más grande, " +
      "un comercio específico, etc. Todos los filtros son opcionales.",
    inputSchema: z.object({
      mes: month.optional(),
      tipo: z.enum(["ingreso", "gasto"]).optional(),
      categoria: z.enum(allCategories).optional().describe("ID de categoría"),
      texto: z.string().max(50).optional().describe("Texto a buscar en la descripción"),
      ordenar_por: z.enum(["fecha", "monto"]).optional().describe("Por defecto: fecha (más recientes primero)"),
      limite: z.number().int().min(1).max(50).optional(),
    }),
    run: async (i) =>
      json(
        await findTransactions(userId, {
          month: i.mes,
          type: i.tipo,
          category: i.categoria,
          text: i.texto,
          orderBy: i.ordenar_por,
          limit: i.limite ?? 20,
        }),
      ),
  }),
  betaZodTool({
    name: "serie_mensual",
    description: "Ingresos, gastos y balance de varios meses seguidos, para ver tendencias.",
    inputSchema: z.object({
      hasta_mes: month,
      meses: z.number().int().min(1).max(12).describe("Cuántos meses hacia atrás (incluido hasta_mes)"),
    }),
    run: async ({ hasta_mes, meses }) => json(await monthlySeries(userId, hasta_mes, meses)),
  }),
];

const STATUS: Record<string, string> = {
  resumen_mes: "Revisando el resumen del mes…",
  gastos_por_categoria: "Analizando tus gastos por categoría…",
  buscar_movimientos: "Buscando movimientos…",
  serie_mensual: "Revisando la tendencia de varios meses…",
};

function systemPrompt() {
  const categories = [...CATEGORIES.gasto.map((c) => `${c.id} (gasto: ${c.label})`), ...CATEGORIES.ingreso.map((c) => `${c.id} (ingreso: ${c.label})`)];
  return `Eres el asistente financiero de "Finanzas IA", una app de finanzas personales en Guatemala.
Respondes en español, en tono cercano y claro, preguntas sobre los ingresos y gastos del usuario.

Reglas:
- Usa SIEMPRE las herramientas para obtener cifras. Nunca inventes ni estimes montos que no vengan de ellas.
- Los montos están en quetzales; escríbelos como "Q 1,234.50".
- Sé breve: máximo unas 120 palabras. Usa **negritas** para las cifras clave y listas con "- " cuando ayuden.
- Si el usuario no dice el mes, asume el mes actual. "El mes pasado" es el anterior al actual.
- Si los datos no alcanzan para responder, dilo y sugiere qué podría registrar.
- Tus consejos son orientativos y prácticos; no des recomendaciones de inversión específicas.
- Si te preguntan algo ajeno a sus finanzas, explica amablemente que solo puedes ayudar con eso.

Contexto: hoy es ${todayISO()} y el mes actual es ${currentMonth()}.
Categorías disponibles: ${categories.join(", ")}.`;
}

/**
 * Responde una conversación con Claude. Claude decide qué herramientas usar; el
 * Tool Runner del SDK ejecuta el ciclo (pedir -> ejecutar herramienta -> responder)
 * y aquí solo reenviamos el texto que llega por streaming.
 */
export async function streamClaudeChat(
  userId: string,
  history: ChatTurn[],
  emit: (event: ChatEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const runner = getClient().beta.messages.toolRunner(
    {
      model: MODEL,
      max_tokens: 4000,
      // Chat: poco esfuerzo = respuestas rápidas; las herramientas hacen el trabajo pesado
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: systemPrompt(),
      tools: makeTools(userId),
      messages: history.map((t) => ({ role: t.role, content: t.content })),
      max_iterations: 6,
      stream: true,
    },
    { signal },
  );

  for await (const stream of runner) {
    for await (const event of stream) {
      if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
        emit({ type: "status", text: STATUS[event.content_block.name] ?? "Consultando tus datos…" });
      } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        emit({ type: "text", delta: event.delta.text });
      }
    }
    const message = await stream.finalMessage();
    if (message.stop_reason === "refusal") {
      emit({ type: "text", delta: "\n\nNo puedo ayudar con esa solicitud. Pregúntame sobre tus ingresos o gastos." });
    }
  }
}
