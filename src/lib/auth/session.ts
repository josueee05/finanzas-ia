import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./constants";
import { signToken, verifyToken } from "./token";
const MAX_AGE_SEC = 30 * 24 * 60 * 60; // 30 días

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Falta AUTH_SECRET (mínimo 32 caracteres). Genera uno con: openssl rand -base64 32");
  }
  // Solo en desarrollo: una clave fija para no obligar a configurar nada
  return "dev-only-secret-no-usar-en-produccion-0123456789";
}

const cookieOptions = {
  httpOnly: true, // JavaScript del navegador no puede leerla
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const, // se envía al volver del login de GitHub, no en POST de otros sitios
  path: "/",
};

/** Inicia sesión. Solo funciona en Server Actions y Route Handlers. */
export async function createSession(userId: string) {
  const token = signToken({ uid: userId, exp: Date.now() + MAX_AGE_SEC * 1000 }, secret());
  (await cookies()).set(SESSION_COOKIE, token, { ...cookieOptions, maxAge: MAX_AGE_SEC });
}

export async function destroySession() {
  (await cookies()).delete({ name: SESSION_COOKIE, path: "/" });
}

/** Id del usuario de la cookie, si la firma es válida y no expiró. */
export async function readSessionUserId(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifyToken(token, secret())?.uid ?? null;
}
