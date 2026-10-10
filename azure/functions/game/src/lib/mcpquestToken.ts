import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed, expiring session token for an MCP Quest play. It carries only the play id (the row
 * that holds all state) and an expiry, is HMAC-signed with MCPQUEST_TOKEN_SECRET, and is
 * never stored. Rotating the secret ends every play in progress.
 */

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function secret(): string {
  const value = process.env.MCPQUEST_TOKEN_SECRET ?? "";
  if (value.length < 32) throw new Error("MCPQUEST_TOKEN_SECRET must be set to at least 32 characters");
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function signPlayToken(input: { playId: string; expiresAt: number }): string {
  if (!GUID.test(input.playId)) throw new Error("playId must be a GUID");
  const payload = Buffer.from(
    JSON.stringify({ p: input.playId.toLowerCase(), e: Math.floor(input.expiresAt / 1000) }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Returns the play id when the signature and expiry check out; otherwise null. */
export function verifyPlayToken(token: unknown, now: number = Date.now()): string | null {
  if (typeof token !== "string" || token.length > 300) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  try {
    const expected = Buffer.from(sign(payload));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { p?: unknown; e?: unknown };
    if (typeof claims.p !== "string" || !GUID.test(claims.p)) return null;
    if (typeof claims.e !== "number" || claims.e * 1000 < now) return null;
    return claims.p;
  } catch {
    return null;
  }
}
