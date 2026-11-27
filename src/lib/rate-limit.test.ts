import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("permite hasta el límite y luego bloquea, por clave", () => {
    const check = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(check("a", 0).ok).toBe(true);
    expect(check("a", 100).ok).toBe(true);
    expect(check("a", 200)).toEqual({ ok: false, retryAfterSec: 1 });
    expect(check("b", 200).ok).toBe(true); // otra IP no se ve afectada
  });

  it("la ventana es deslizante: se libera cuando expira la petición más vieja", () => {
    const check = createRateLimiter({ limit: 2, windowMs: 1000 });
    check("a", 0);
    check("a", 500);
    expect(check("a", 999).ok).toBe(false);
    expect(check("a", 1000).ok).toBe(true);
    expect(check("a", 1001).ok).toBe(false);
  });
});
