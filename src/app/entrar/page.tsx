import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AssistantAvatar } from "@/components/assistant/assistant-avatar";
import { githubConfigured, localLoginEnabled } from "@/lib/auth/constants";
import { getCurrentUser } from "@/lib/auth/current-user";
import { GUEST_TTL_DAYS } from "@/db/users";
import { enterAsGuest, enterAsLocalUser } from "./actions";

export const metadata = { title: "Entrar" };

const ERRORS: Record<string, string> = {
  github: "No se pudo iniciar sesión con GitHub. Intenta de nuevo.",
  "github-config": "El inicio de sesión con GitHub no está configurado en este servidor.",
  limite: "Se crearon demasiadas cuentas de invitado desde tu red. Intenta en una hora.",
};

export default function SignInPage({ searchParams }: PageProps<"/entrar">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-12">
      <div className="flex flex-col items-center gap-4 text-center">
        <AssistantAvatar className="size-16" />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Finanzas IA</h1>
          <p className="mt-2 text-zinc-500">
            Registra tus ingresos y gastos, mira a dónde se va tu dinero y pregúntale a tu asistente.
          </p>
        </div>
      </div>

      <Suspense fallback={<div className="h-48" />}>
        <SignInOptions searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function SignInOptions({ searchParams }: Pick<PageProps<"/entrar">, "searchParams">) {
  // Si ya hay una sesión válida, no tiene sentido mostrar esta página
  if (await getCurrentUser()) redirect("/");
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;

  const button =
    "flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90";

  return (
    <div className="flex flex-col gap-3">
      {message && (
        <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          {message}
        </p>
      )}

      <form action={enterAsGuest}>
        <button type="submit" className={`${button} bg-foreground text-background`}>
          ✨ Probar como invitado
        </button>
      </form>
      <p className="-mt-1 text-center text-xs text-zinc-500">
        Sin registro. Tendrás tu propio espacio con 6 meses de datos de ejemplo; se borra al salir o
        tras {GUEST_TTL_DAYS} días sin uso.
      </p>

      {githubConfigured() && (
        <>
          <div className="my-2 flex items-center gap-3 text-xs text-zinc-400">
            <span className="h-px flex-1 bg-black/10 dark:bg-white/10" /> o <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
          </div>
          {/* Enlace normal (no <Link>): es una navegación completa hacia GitHub */}
          <a href="/api/auth/github" className={`${button} border border-black/15 dark:border-white/20`}>
            <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden>
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            Entrar con GitHub
          </a>
          <p className="-mt-1 text-center text-xs text-zinc-500">Tus datos se guardan en tu cuenta.</p>
        </>
      )}

      {localLoginEnabled() && (
        <form action={enterAsLocalUser} className="mt-4 border-t border-dashed border-black/10 pt-4 dark:border-white/10">
          <button type="submit" className="w-full text-center text-xs text-zinc-500 underline underline-offset-4 hover:text-foreground">
            Continuar como usuario local (solo en desarrollo)
          </button>
        </form>
      )}
    </div>
  );
}
