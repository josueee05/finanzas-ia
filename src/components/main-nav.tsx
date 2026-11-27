"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

const LINKS = [
  { href: "/", label: "Resumen" },
  { href: "/transacciones", label: "Transacciones" },
];

/**
 * `usePathname()` es dato de la URL: en rutas dinámicas solo se conoce al recibir la
 * petición. El fallback (mismos links, sin resaltar) va en el HTML estático.
 */
export function MainNav() {
  return (
    <nav className="flex gap-1">
      <Suspense fallback={<Links pathname={null} />}>
        <ActiveLinks />
      </Suspense>
    </nav>
  );
}

function ActiveLinks() {
  return <Links pathname={usePathname()} />;
}

function Links({ pathname }: { pathname: string | null }) {
  return LINKS.map(({ href, label }) => {
    const active =
      pathname !== null && (href === "/" ? pathname === "/" : pathname.startsWith(href));
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`rounded-md px-2 py-1.5 text-sm transition-colors sm:px-3 ${
          active
            ? "bg-black/5 font-medium text-foreground dark:bg-white/10"
            : "text-zinc-500 hover:text-foreground"
        }`}
      >
        {label}
      </Link>
    );
  });
}
