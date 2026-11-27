import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { getUserById, touchUser } from "@/db/users";
import { readSessionUserId } from "./session";

/**
 * Capa de acceso a datos (DAL): el único lugar que traduce la cookie en un usuario.
 * `cache()` hace que varias llamadas en la misma petición consulten la base una vez.
 * Lee cookies, así que quien la use debe estar dentro de <Suspense>.
 */
export const getCurrentUser = cache(async () => {
  // Verificar el token compara su expiración con la hora actual: siempre en la petición
  await connection();
  const userId = await readSessionUserId();
  if (!userId) return null;
  const user = await getUserById(userId);
  if (user) await touchUser(user);
  return user;
});

/** Para páginas: sin sesión válida, manda a /entrar. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  return user;
}
