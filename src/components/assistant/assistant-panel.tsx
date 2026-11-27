"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AiMode } from "@/lib/ai/categorize";
import { AssistantAvatar } from "./assistant-avatar";
import { Chat } from "./chat";

/**
 * Botón flotante + panel lateral del asistente. Vive en el layout, así que la
 * conversación se conserva al navegar entre páginas. Cerrado, el panel queda
 * fuera de pantalla e `inert` (no recibe foco ni clics) pero no se desmonta.
 */
export function AssistantPanel({ mode, suggestions }: { mode: AiMode; suggestions: string[] }) {
  const [open, setOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    // Devolvemos el foco al botón que abrió el panel
    requestAnimationFrame(() => launcherRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    // Esperamos a que termine de entrar el panel para enfocar el campo de texto
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <>
      {/* Botón flotante */}
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir asistente"
        aria-expanded={open}
        aria-controls="assistant-panel"
        title="Pregúntale a tus finanzas"
        className={`group fixed bottom-5 right-5 z-40 rounded-full shadow-lg ring-4 ring-background transition-all duration-200 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-500 sm:bottom-6 sm:right-6 ${
          open ? "pointer-events-none scale-75 opacity-0" : "opacity-100"
        }`}
      >
        <AssistantAvatar className="size-14" />
        <span className="pointer-events-none absolute right-full top-1/2 mr-3 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-black/10 bg-background px-2.5 py-1 text-xs font-medium opacity-0 shadow-sm transition-opacity group-hover:opacity-100 sm:block dark:border-white/15">
          Pregúntale a tus finanzas
        </span>
      </button>

      {/* Fondo: clic para cerrar */}
      <div
        aria-hidden
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Panel lateral */}
      <aside
        id="assistant-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assistant-title"
        inert={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-black/10 bg-background shadow-2xl transition-transform duration-300 ease-out sm:w-[420px] dark:border-white/10 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <Chat mode={mode} suggestions={suggestions} onClose={close} inputRef={inputRef} />
      </aside>
    </>
  );
}
