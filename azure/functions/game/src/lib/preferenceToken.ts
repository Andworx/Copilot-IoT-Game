import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed, expiring preference-center tokens (issue #133). Separate from prize claim tokens:
 * a token carries a contact id and a purpose, is HMAC-signed with PREFERENCE_TOKEN_SECRET and
 * is never stored. `manage` links go in emails; `confirm` links are mailed once to confirm a
 * marketing opt-in (double opt-in). Rotating the secret revokes every outstanding link.
 */
export type PreferenceTokenPurpose = "manage" | "confirm";

export const PREFERENCE_LINK_PARAM = "pref";

const LIFETIME_SECONDS: Record<PreferenceTokenPurpose, number> = {
  manage: 180 * 24 * 60 * 60,
  confirm: 7 * 24 * 60 * 60,
};

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function secret(): string {
  const value = process.env.PREFERENCE_TOKEN_SECRET ?? "";
  if (value.length < 32) throw new Error("PREFERENCE_TOKEN_SECRET must be set to at least 32 characters");
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function signPreferenceToken(input: { contactId: string; purpose: PreferenceTokenPurpose; now?: Date }): string {
  if (!GUID.test(input.contactId)) throw new Error("contactId must be a GUID");
  const issued = Math.floor((input.now ?? new Date()).getTime() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ c: input.contactId.toLowerCase(), p: input.purpose, e: issued + LIFETIME_SECONDS[input.purpose] })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Returns the contact id when the signature, purpose and expiry all check out; otherwise null. */
export function verifyPreferenceToken(
  token: string | null | undefined,
  allowed: PreferenceTokenPurpose[],
  now: Date = new Date()
): { contactId: string; purpose: PreferenceTokenPurpose } | null {
  if (typeof token !== "string" || token.length > 400) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  try {
    const expected = Buffer.from(sign(payload));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { c?: unknown; p?: unknown; e?: unknown };
    if (typeof claims.c !== "string" || !GUID.test(claims.c)) return null;
    if (claims.p !== "manage" && claims.p !== "confirm") return null;
    if (!allowed.includes(claims.p)) return null;
    if (typeof claims.e !== "number" || claims.e * 1000 < now.getTime()) return null;
    return { contactId: claims.c, purpose: claims.p };
  } catch {
    return null;
  }
}

/** Appends the token to the campaign's preference page URL, keeping any existing query string. */
export function buildPreferenceLink(baseUrl: string, token: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set(PREFERENCE_LINK_PARAM, token);
  return url.toString();
}
