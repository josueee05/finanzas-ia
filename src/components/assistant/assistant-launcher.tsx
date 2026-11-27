import { connection } from "next/server";
import { aiMode } from "@/lib/ai/categorize";
import { getCurrentUser } from "@/lib/auth/current-user";
import { DEMO_SUGGESTIONS } from "@/lib/assistant/demo";
import { AssistantPanel } from "./assistant-panel";

/** El modo (Claude o demo) depende de las variables de entorno en tiempo de ejecución. */
export async function AssistantLauncher() {
  await connection();
  // Sin sesión (p. ej. en /entrar) no se muestra el asistente
  if (!(await getCurrentUser())) return null;
  return <AssistantPanel mode={aiMode()} suggestions={DEMO_SUGGESTIONS} />;
}
