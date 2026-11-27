import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { upsertGithubUser } from "@/db/users";
import { githubConfigured, OAUTH_STATE_COOKIE } from "@/lib/auth/constants";
import { createSession } from "@/lib/auth/session";

const tokenResponse = z.object({ access_token: z.string() });
const githubUser = z.object({
  id: z.number(),
  login: z.string(),
  name: z.string().nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
});

const sameString = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Paso 2: GitHub vuelve con `code` y `state`; canjeamos el código por el perfil. */
export async function GET(request: Request) {
  await connection(); // siempre en la petición, nunca durante el build
  if (!githubConfigured()) redirect("/entrar?error=github-config");

  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const jar = await cookies();
  const savedState = jar.get(OAUTH_STATE_COOKIE)?.value;
  jar.delete({ name: OAUTH_STATE_COOKIE, path: "/api/auth/github" });

  if (!code || !state || !savedState || !sameString(state, savedState)) {
    redirect("/entrar?error=github");
  }

  let profile: z.infer<typeof githubUser>;
  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: new URL("/api/auth/github/callback", request.url).toString(),
      }),
    });
    const { access_token } = tokenResponse.parse(await tokenRes.json());

    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "finanzas-ia",
      },
    });
    profile = githubUser.parse(await userRes.json());
  } catch (error) {
    console.warn("[auth] fallo el login con GitHub:", error);
    redirect("/entrar?error=github");
  }

  // El token de GitHub no se guarda: solo lo usamos para leer el perfil una vez
  const user = await upsertGithubUser({
    githubId: String(profile.id),
    name: (profile.name || profile.login).slice(0, 100),
    avatarUrl: profile.avatar_url ?? null,
  });
  await createSession(user.id);
  redirect("/");
}
