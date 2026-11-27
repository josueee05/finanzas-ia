import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { AssistantLauncher } from "@/components/assistant/assistant-launcher";
import { MainNav } from "@/components/main-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { themeScript } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Finanzas IA", template: "%s · Finanzas IA" },
  description: "Controla tus ingresos y gastos, con ayuda de IA.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // El script del tema agrega data-theme antes de que React hidrate
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-black/10 dark:border-white/10">
          <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-4 px-4 sm:gap-6">
            <Link href="/" className="shrink-0 font-semibold tracking-tight">
              💸 <span className="hidden sm:inline">Finanzas IA</span>
            </Link>
            <MainNav />
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <ThemeToggle />
              <Suspense fallback={null}>
                <UserMenu />
              </Suspense>
            </div>
          </div>
        </header>
        {children}
        {/* Asistente flotante: disponible en todas las páginas */}
        <Suspense fallback={null}>
          <AssistantLauncher />
        </Suspense>
      </body>
    </html>
  );
}
