/**
 * Límite de peticiones en memoria (ventana deslizante) por clave, p. ej. la IP.
 * Suficiente para una sola instancia; con varias réplicas habría que usar Redis.
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, number[]>();

  return function check(key: string, now = Date.now()): { ok: boolean; retryAfterSec: number } {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return { ok: false, retryAfterSec: Math.ceil((windowMs - (now - recent[0])) / 1000) };
    }
    recent.push(now);
    hits.set(key, recent);
    // Limpieza ocasional para que el mapa no crezca sin control
    if (hits.size > 5_000) for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
    return { ok: true, retryAfterSec: 0 };
  };
}
