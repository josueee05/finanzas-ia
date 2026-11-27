import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * Chequeo optimista: si no hay cookie de sesión, manda a /entrar antes de renderizar.
 * No valida la firma (eso lo hace `getCurrentUser()` en el servidor), solo evita
 * trabajo inútil. Una cookie inválida o vencida la detecta la página y redirige igual.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/entrar", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Todo menos /entrar, las APIs (responden 401 por su cuenta) y archivos estáticos
  matcher: ["/((?!entrar|api|_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
