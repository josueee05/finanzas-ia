"use client";

import { useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY as STORAGE_KEY } from "@/lib/theme";

type Theme = "system" | "light" | "dark";

const ORDER: Theme[] = ["system", "light", "dark"];
const LABELS: Record<Theme, { icon: string; text: string }> = {
  system: { icon: "🖥️", text: "Sistema" },
  light: { icon: "☀️", text: "Claro" },
  dark: { icon: "🌙", text: "Oscuro" },
};

const listeners = new Set<() => void>();

function readTheme(): Theme {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

function applyTheme(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Sin acceso a localStorage (modo privado): el cambio dura solo esta visita
  }
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function ThemeToggle() {
  // En el servidor no sabemos la preferencia: null hasta hidratar
  const theme = useSyncExternalStore(subscribe, readTheme, () => null);
  const current = theme ?? "system";
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];

  return (
    <button
      type="button"
      onClick={() => applyTheme(next)}
      aria-label={`Tema: ${LABELS[current].text}. Cambiar a ${LABELS[next].text}`}
      title={`Tema: ${LABELS[current].text}`}
      className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm text-zinc-500 transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
    >
      <span aria-hidden className={theme === null ? "invisible" : ""}>
        {LABELS[current].icon}
      </span>
      <span className={`hidden sm:inline ${theme === null ? "invisible" : ""}`}>
        {LABELS[current].text}
      </span>
    </button>
  );
}
