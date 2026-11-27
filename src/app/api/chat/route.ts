import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { aiMode, markClaudeUnavailable } from "@/lib/ai/categorize";
import { getCurrentUser } from "@/lib/auth/current-user";
import { streamClaudeChat, type ChatEvent } from "@/lib/assistant/claude-chat";
import { answerDemo } from "@/lib/assistant/demo";
import { createRateLimiter } from "@/lib/rate-limit";

const body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(2000) }))
    .min(1)
    .max(20)
    .refine((m) => m.at(-1)?.role === "user", "El último mensaje debe ser del usuario"),
});

// Cada pregunta a Claude cuesta dinero: máximo 20 por usuario y 40 por IP cada 10 minutos
// (por IP también, para que crear muchos invitados no sirva para saltarse el límite).
const perUser = createRateLimiter({ limit: 20, windowMs: 10 * 60_000 });
const perIp = createRateLimiter({ limit: 40, windowMs: 10 * 60_000 });

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Tu sesión expiró. Vuelve a entrar." }, { status: 401 });

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const { messages } = parsed.data;
  const mode = aiMode();

  if (mode === "claude") {
    const blocked = [perUser(user.id), perIp(clientIp(request))].find((r) => !r.ok);
    if (blocked) {
      const { retryAfterSec } = blocked;
      return Response.json(
        { error: `Hiciste muchas preguntas seguidas. Intenta de nuevo en ${Math.ceil(retryAfterSec / 60)} min.` },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
      );
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let wroteText = false;
      const emit = (event: ChatEvent) => {
        if (event.type === "text") wroteText = true;
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      const question = messages[messages.length - 1].content;

      try {
        if (mode === "claude") {
          await streamClaudeChat(user.id, messages, emit, request.signal);
        } else {
          emit({ type: "text", delta: await answerDemo(user.id, question) });
        }
      } catch (error) {
        if (request.signal.aborted) return controller.close();

        if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
          markClaudeUnavailable();
        }
        console.warn("[asistente] error:", error instanceof Anthropic.APIError ? error.message : error);

        if (mode === "demo") {
          // En modo demo el fallo no es de la IA (p. ej. la base de datos no respondió)
          emit({ type: "error", message: "No pude consultar tus datos. Intenta de nuevo." });
        } else if (!wroteText) {
          // Si Claude falló antes de escribir nada, respondemos en modo demo
          emit({ type: "status", text: "No pude conectar con la IA; respondo en modo demo." });
          try {
            emit({ type: "text", delta: await answerDemo(user.id, question) });
          } catch {
            emit({ type: "error", message: "No pude consultar tus datos. Intenta de nuevo." });
          }
        } else {
          emit({ type: "error", message: "La respuesta se interrumpió. Intenta de nuevo." });
        }
      }

      emit({ type: "done" });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Assistant-Mode": mode,
    },
  });
}
