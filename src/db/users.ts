import { and, eq, lt, sql } from "drizzle-orm";
import { sampleTransactions } from "@/lib/sample-data";
import { getDb } from ".";
import { LOCAL_USER_ID, transactions, users, type User } from "./schema";

export const GUEST_TTL_DAYS = 7;

export async function getUserById(id: string): Promise<User | null> {
  const [user] = await getDb().select().from(users).where(eq(users.id, id));
  return user ?? null;
}

/** Marca actividad como máximo una vez por hora (para limpiar invitados inactivos). */
export async function touchUser(user: User) {
  if (Date.now() - user.lastSeenAt.getTime() < 60 * 60_000) return;
  await getDb().update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, user.id));
}

/** Crea un invitado con su propio set de datos de ejemplo, en una sola transacción. */
export async function createGuestUser(): Promise<User> {
  return getDb().transaction(async (tx) => {
    const [user] = await tx.insert(users).values({ name: "Invitado", isGuest: true }).returning();
    await tx.insert(transactions).values(sampleTransactions(user.id));
    return user;
  });
}

/** Usuario de desarrollo dueño de la base local (se crea si no existe). */
export async function ensureLocalUser(): Promise<User> {
  await getDb().insert(users).values({ id: LOCAL_USER_ID, name: "Usuario local" }).onConflictDoNothing();
  return (await getUserById(LOCAL_USER_ID))!;
}

export async function upsertGithubUser(profile: { githubId: string; name: string; avatarUrl: string | null }) {
  const [user] = await getDb()
    .insert(users)
    .values({ ...profile, isGuest: false })
    .onConflictDoUpdate({
      target: users.githubId,
      set: { name: profile.name, avatarUrl: profile.avatarUrl, lastSeenAt: new Date() },
    })
    .returning();
  return user;
}

/** Borra un usuario y, en cascada, todos sus movimientos. */
export async function deleteUser(id: string) {
  await getDb().delete(users).where(eq(users.id, id));
}

/** Borra los invitados sin actividad en los últimos días (y sus datos, en cascada). */
export async function deleteStaleGuests(days = GUEST_TTL_DAYS): Promise<number> {
  const deleted = await getDb()
    .delete(users)
    .where(and(eq(users.isGuest, true), lt(users.lastSeenAt, sql`now() - make_interval(days => ${days})`)))
    .returning({ id: users.id });
  return deleted.length;
}
