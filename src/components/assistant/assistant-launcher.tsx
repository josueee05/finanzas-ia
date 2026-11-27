import { connection } from "next/server";
import { aiMode } from "@/lib/ai/categorize";
import { DEMO_SUGGESTIONS } from "@/lib/assistant/demo";
import { AssistantPanel } from "./assistant-panel";

/** El modo (Claude o demo) depende de las variables de entorno en tiempo de ejecución. */
export async function AssistantLauncher() {
  await connection();
  return <AssistantPanel mode={aiMode()} suggestions={DEMO_SUGGESTIONS} />;
}
