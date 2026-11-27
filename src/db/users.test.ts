import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "@/test/db";
import { getDb } from ".";
import { listTransactions } from "./queries";
import { LOCAL_USER_ID, users } from "./schema";
import { createGuestUser, deleteStaleGuests, ensureLocalUser, getUserById, upsertGithubUser } from "./users";

beforeEach(async () => {
  await resetDb();
});

describe("usuarios", () => {
  it("un invitado nace con su propio set de datos de ejemplo", async () => {
    const guest = await createGuestUser();
    expect(guest.isGuest).toBe(true);
    const rows = await listTransactions(guest.id, { limit: 500 });
    expect(rows.length).toBeGreaterThan(40);
    expect(rows.every((r) => r.userId === guest.id)).toBe(true);
  });

  it("cada invitado tiene datos independientes", async () => {
    const [a, b] = [await createGuestUser(), await createGuestUser()];
    expect(a.id).not.toBe(b.id);
    expect((await listTransactions(a.id)).map((r) => r.id)).not.toContain((await listTransactions(b.id))[0].id);
  });

  it("borra invitados inactivos y, en cascada, sus movimientos", async () => {
    const stale = await createGuestUser();
    const active = await createGuestUser();
    await getDb()
      .update(users)
      .set({ lastSeenAt: sql`now() - interval '8 days'` })
      .where(eq(users.id, stale.id));

    expect(await deleteStaleGuests(7)).toBe(1);
    expect(await getUserById(stale.id)).toBeNull();
    expect(await listTransactions(stale.id)).toHaveLength(0);
    expect(await getUserById(active.id)).not.toBeNull();
  });

  it("nunca borra cuentas que no son de invitado", async () => {
    const github = await upsertGithubUser({ githubId: "1", name: "Ada", avatarUrl: null });
    await getDb().update(users).set({ lastSeenAt: sql`now() - interval '1 year'` });
    expect(await deleteStaleGuests(7)).toBe(0);
    expect(await getUserById(github.id)).not.toBeNull();
  });

  it("el login con GitHub crea la cuenta una vez y luego la actualiza", async () => {
    const first = await upsertGithubUser({ githubId: "42", name: "Ada", avatarUrl: null });
    const again = await upsertGithubUser({ githubId: "42", name: "Ada Lovelace", avatarUrl: "https://x.test/a.png" });
    expect(again.id).toBe(first.id);
    expect(again).toMatchObject({ name: "Ada Lovelace", avatarUrl: "https://x.test/a.png", isGuest: false });
  });

  it("el usuario local tiene un id fijo y se crea una sola vez", async () => {
    expect((await ensureLocalUser()).id).toBe(LOCAL_USER_ID);
    expect((await ensureLocalUser()).id).toBe(LOCAL_USER_ID);
  });
});
