import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { TransactionType } from "@/db/schema";
import { CATEGORIES } from "@/lib/categories";

/**
 * Categorización con Claude (solo si hay ANTHROPIC_API_KEY).
 * Usa salidas estructuradas: la respuesta se valida contra un esquema Zod cuyo
 * enum son exactamente las categorías válidas, así que nunca inventa una.
 */

const MODEL = process.env.AI_MODEL ?? "claude-opus-5-5";

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic({ timeout: 15_000, maxRetries: 1 }));

export const isClaudeEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

const SYSTEM = `Clasificas movimientos de una app de finanzas personales de Guatemala (moneda: quetzales).
Recibes la descripción que escribió el usuario y eliges UNA categoría de la lista dada.
Considera comercios y servicios locales (p. ej. Paiz, La Torre, Pollo Campero, Tigo, Claro, EEGSA, Empagua).
Si ninguna encaja claramente, elige la categoría "Otros" de la lista.`;

export async function categorizeWithClaude(
  description: string,
  type: TransactionType,
): Promise<string | null> {
  const options = CATEGORIES[type];
  const ids = options.map((c) => c.id) as [string, ...string[]];
  const schema = z.object({ category: z.enum(ids) });

  const response = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 2000,
    // Clasificación simple: poco esfuerzo = más rápido y barato
    output_config: { effort: "low", format: betaZodOutputFormat(schema) },
    // Si el modelo rechaza la solicitud, la API la reintenta con otro modelo
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          `Tipo de movimiento: ${type}`,
          `Categorías: ${options.map((c) => `${c.id} (${c.label})`).join(", ")}`,
          `Descripción: ${description}`,
        ].join("\n"),
      },
    ],
  });

  if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return null;
  return response.parsed_output?.category ?? null;
}
