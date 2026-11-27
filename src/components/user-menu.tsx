import { signOut } from "@/app/entrar/actions";
import { getCurrentUser } from "@/lib/auth/current-user";

/** Usuario actual y botón para salir. Lee la sesión: va dentro de <Suspense>. */
export async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatar pequeño de GitHub, no vale la pena optimizarlo
        <img src={user.avatarUrl} alt="" className="size-7 rounded-full" />
      ) : (
        <span aria-hidden className="grid size-7 place-items-center rounded-full bg-black/5 text-sm dark:bg-white/10">
          {user.isGuest ? "👤" : user.name.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="hidden max-w-32 truncate text-sm md:inline">{user.name}</span>
      <form action={signOut}>
        <button
          type="submit"
          title={user.isGuest ? "Salir (se borran los datos de invitado)" : "Cerrar sesión"}
          className="rounded-md px-2 py-1.5 text-sm text-zinc-500 transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
        >
          Salir
        </button>
      </form>
    </div>
  );
}
