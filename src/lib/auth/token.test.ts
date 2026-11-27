import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "./token";

const SECRET = "una-clave-de-prueba-suficientemente-larga-1234";
const payload = { uid: "00000000-0000-4000-8000-00000000000a", exp: 2_000_000_000_000 };

describe("token de sesión", () => {
  it("verifica un token firmado con la misma clave", () => {
    expect(verifyToken(signToken(payload, SECRET), SECRET, 0)).toEqual(payload);
  });

  it("rechaza un token firmado con otra clave", () => {
    expect(verifyToken(signToken(payload, "otra-clave-distinta-0000000000000000"), SECRET, 0)).toBeNull();
  });

  it("rechaza un token modificado (p. ej. cambiar el usuario)", () => {
    const [, signature] = signToken(payload, SECRET).split(".");
    const forged = Buffer.from(JSON.stringify({ ...payload, uid: "otro-usuario" })).toString("base64url");
    expect(verifyToken(`${forged}.${signature}`, SECRET, 0)).toBeNull();
  });

  it("rechaza un token vencido", () => {
    const token = signToken({ ...payload, exp: 1000 }, SECRET);
    expect(verifyToken(token, SECRET, 999)).not.toBeNull();
    expect(verifyToken(token, SECRET, 1000)).toBeNull();
  });

  it.each([undefined, "", "basura", "a.b", "a.b.c", "..", `${"x".repeat(10)}.`])("rechaza %j", (token) => {
    expect(verifyToken(token, SECRET, 0)).toBeNull();
  });
});
