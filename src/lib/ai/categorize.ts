import Anthropic from "@anthropic-ai/sdk";
import type { TransactionType } from "@/db/schema";
import { isValidCategory } from "@/lib/categories";
import { categorizeWithClaude, isClaudeEnabled } from "./claude";
import { categorizeByRules } from "./rules";

export type Suggestion = { category: string; source: "claude" | "reglas" };
export type AiMode = "claude" | "demo";

// Si la API key es inválida o no tiene permiso, no tiene caso reintentar en cada
// tecla: desactivamos Claude hasta que se reinicie el servidor.
let claudeDisabled = false;

export const aiMode = (): AiMode => (isClaudeEnabled() && !claudeDisabled ? "claude" : "demo");

/** Lo llama cualquier función que reciba un 401/403 de la API (categorizar o chat). */
export function markClaudeUnavailable() {
  claudeDisabled = true;
}

// Caché en memoria: la misma descripción no se vuelve a mandar a la API.
const cache = new Map<string, Suggestion | null>();
const CACHE_LIMIT = 500;

/**
 * Sugiere una categoría: con Claude si hay API key y, si no (o si la API falla),
 * con el clasificador local por palabras clave. Nunca lanza error.
 */
export async function suggestCategoryFor(
  description: string,
  type: TransactionType,
): Promise<Suggestion | null> {
  const text = description.trim().slice(0, 100);
  if (text.length < 3) return null;

  const key = `${type}:${text.toLowerCase()}`;
  if (cache.has(key)) return cache.get(key)!;

  let result: Suggestion | null = null;

  if (aiMode() === "claude") {
    try {
      const category = await categorizeWithClaude(text, type);
      if (category && isValidCategory(type, category)) result = { category, source: "claude" };
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
        claudeDisabled = true;
        console.warn(`[ia] API key inválida o sin permiso (${error.status}). Uso reglas locales hasta reiniciar.`);
      } else {
        // Sin crédito, sin red, límite de uso, etc.: seguimos con las reglas locales
        const reason = error instanceof Anthropic.APIError ? error.message : String(error);
        console.warn(`[ia] Claude no respondió, uso reglas locales: ${reason}`);
      }
    }
  }

  if (!result) {
    const match = categorizeByRules(text, type);
    if (match) result = { category: match.category, source: "reglas" };
  }

  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
  cache.set(key, result);
  return result;
}
