"use client";

import { useEffect, useRef, useState } from "react";
import type { AiMode } from "@/lib/ai/categorize";
import type { ChatEvent } from "@/lib/assistant/claude-chat";
import { AssistantAvatar } from "./assistant-avatar";
import { RichText } from "./rich-text";

type Message = {
  role: "user" | "assistant";
  content: string;
  /** Qué está haciendo el asistente ("Buscando movimientos…") mientras responde */
  status?: string;
  error?: boolean;
};

type ChatProps = {
  mode: AiMode;
  suggestions: string[];
  /** Si se pasa, muestra un botón para cerrar el panel */
  onClose?: () => void;
  inputRef?: React.Ref<HTMLInputElement>;
};

export function Chat({ mode, suggestions, onClose, inputRef }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Si el usuario sale de la página a mitad de una respuesta, la cancelamos
  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const updateLast = (fn: (m: Message) => Message) =>
    setMessages((prev) => [...prev.slice(0, -1), fn(prev[prev.length - 1])]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || pending) return;

    // Historial para el modelo: sin mensajes de error ni respuestas vacías
    const history = [...messages, { role: "user" as const, content: question }]
      .filter((m) => !m.error && m.content.trim())
      .slice(-20)
      .map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [...prev, { role: "user", content: question }, { role: "assistant", content: "" }]);
    setInput("");
    setPending(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        updateLast((m) => ({ ...m, content: data?.error ?? "Algo salió mal. Intenta de nuevo.", error: true }));
        return;
      }

      // La respuesta llega como NDJSON: un evento JSON por línea
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as ChatEvent;
          if (event.type === "status") updateLast((m) => ({ ...m, status: event.text }));
          else if (event.type === "text") updateLast((m) => ({ ...m, content: m.content + event.delta }));
          else if (event.type === "error")
            updateLast((m) => ({ ...m, content: m.content || event.message, error: !m.content }));
        }
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error(error);
      updateLast((m) => ({ ...m, content: "No pude conectar con el servidor.", error: true }));
    } finally {
      updateLast((m) => ({ ...m, status: undefined }));
      setPending(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-black/10 px-4 py-3 dark:border-white/10">
        <AssistantAvatar className="size-8" />
        <div className="min-w-0 flex-1">
          <h2 id="assistant-title" className="text-sm font-semibold leading-tight">
            Asistente
          </h2>
          <p
            className="text-xs text-zinc-500"
            title={mode === "claude" ? "Respuestas generadas por Claude" : "Modo demo: preguntas frecuentes, sin API key"}
          >
            ✨ {mode === "claude" ? "Con Claude" : "Modo demo"}
          </p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              abortRef.current?.abort();
              setMessages([]);
              setPending(false);
            }}
            className="rounded-md px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
          >
            Nueva conversación
          </button>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar asistente"
            className="grid size-8 place-items-center rounded-md text-zinc-500 transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
          >
            <svg viewBox="0 0 20 20" className="size-4" aria-hidden>
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 ? (
          <div className="m-auto flex max-w-md flex-col items-center gap-4 py-8 text-center">
            <AssistantAvatar className="size-14" />
            <div>
              <p className="font-medium">Pregúntale a tus finanzas</p>
              <p className="mt-1 text-sm text-zinc-500">
                Respondo con tus movimientos reales: gastos, ingresos, comparaciones y consejos.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-black/10 px-3 py-1.5 text-sm transition-colors hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => <Bubble key={i} message={m} />)
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t border-black/10 p-3 dark:border-white/10"
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ej. ¿Cuánto gasté en transporte el mes pasado?"
          maxLength={2000}
          aria-label="Tu pregunta"
          className="h-11 flex-1 rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none transition-colors focus:border-foreground dark:border-white/15"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="h-11 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {pending ? "…" : "Enviar"}
        </button>
      </form>
    </div>
  );
}

function Bubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-foreground px-4 py-2.5 text-sm text-background">
        {message.content}
      </div>
    );
  }
  return (
    <div className="flex max-w-[90%] flex-col gap-1.5">
      {message.status && (
        <p className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden />
          {message.status}
        </p>
      )}
      {message.content ? (
        <div
          className={`rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-relaxed ${
            message.error
              ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
              : "bg-black/5 dark:bg-white/10"
          }`}
        >
          <RichText text={message.content} />
        </div>
      ) : (
        !message.status && (
          <div className="flex w-16 gap-1 rounded-2xl rounded-bl-md bg-black/5 px-4 py-3.5 dark:bg-white/10" aria-label="Escribiendo">
            {[0, 150, 300].map((d) => (
              <span key={d} className="size-1.5 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
