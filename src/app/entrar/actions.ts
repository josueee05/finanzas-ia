"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createGuestUser, deleteStaleGuests, deleteUser, ensureLocalUser } from "@/db/users";
import { localLoginEnabled } from "@/lib/auth/constants";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createSession, destroySession } from "@/lib/auth/session";
import { createRateLimiter } from "@/lib/rate-limit";

// Cada invitado crea ~70 filas: máximo 5 cuentas por IP cada hora
const guestLimiter = createRateLimiter({ limit: 5, windowMs: 60 * 60_000 });

export async function enterAsGuest() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  if (!guestLimiter(ip).ok) redirect("/entrar?error=limite");

  // Aprovechamos para limpiar invitados abandonados (y sus datos, en cascada)
  await deleteStaleGuests();
  const user = await createGuestUser();
  await createSession(user.id);
  redirect("/");
}

export async function enterAsLocalUser() {
  if (!localLoginEnabled()) redirect("/entrar");
  const user = await ensureLocalUser();
  await createSession(user.id);
  redirect("/");
}

export async function signOut() {
  const user = await getCurrentUser();
  // Los datos de un invitado no le sirven a nadie más: se borran al salir
  if (user?.isGuest) await deleteUser(user.id);
  await destroySession();
  redirect("/entrar");
}
