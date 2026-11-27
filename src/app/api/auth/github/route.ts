import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { githubConfigured, OAUTH_STATE_COOKIE } from "@/lib/auth/constants";

/**
 * Paso 1 del login con GitHub (OAuth 2.0): genera un `state` aleatorio, lo guarda
 * en una cookie y manda al usuario a GitHub. Al volver, el callback compara ambos:
 * así nadie puede forzar a otro a iniciar sesión con una cuenta ajena (CSRF).
 */
export async function GET(request: Request) {
  // Sin esto, Next.js ejecutaría este GET una sola vez durante el build
  await connection();
  if (!githubConfigured()) redirect("/entrar?error=github-config");

  const state = randomBytes(24).toString("base64url");
  (await cookies()).set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/github",
    maxAge: 10 * 60,
  });

  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID!);
  url.searchParams.set("redirect_uri", new URL("/api/auth/github/callback", request.url).toString());
  url.searchParams.set("scope", "read:user"); // solo el perfil público
  url.searchParams.set("state", state);
  redirect(url.toString());
}
