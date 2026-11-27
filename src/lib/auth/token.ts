import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Token de sesión firmado: `base64url(payload).base64url(hmac-sha256)`.
 * No guarda nada secreto (solo el id del usuario y la expiración), pero sin la
 * clave nadie puede fabricar uno ni modificarlo. Puro y sin dependencias de Next,
 * para poder probarlo aislado.
 */
export type SessionPayload = { uid: string; exp: number };

const b64 = (data: string | Buffer) => Buffer.from(data).toString("base64url");
const hmac = (data: string, secret: string) => createHmac("sha256", secret).update(data).digest();

export function signToken(payload: SessionPayload, secret: string): string {
  const body = b64(JSON.stringify(payload));
  return `${body}.${b64(hmac(body, secret))}`;
}

export function verifyToken(token: string | undefined, secret: string, now = Date.now()): SessionPayload | null {
  if (!token) return null;
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra !== undefined) return null;

  const expected = hmac(body, secret);
  const given = Buffer.from(signature, "base64url");
  // Comparación en tiempo constante: no filtra cuántos bytes coinciden
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as Partial<SessionPayload>;
    if (typeof payload.uid !== "string" || typeof payload.exp !== "number" || payload.exp <= now) return null;
    return { uid: payload.uid, exp: payload.exp };
  } catch {
    return null;
  }
}
