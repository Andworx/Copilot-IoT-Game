import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import type { HttpHandler, HttpResponseInit } from "@azure/functions";

export interface StaffAuthConfig {
  tenantId: string;
  audience: string;
  clientId: string;
}

export function readStaffAuthConfig(env = process.env): StaffAuthConfig {
  const config = {
    tenantId: env.STAFF_AUTH_TENANT_ID ?? "",
    audience: env.STAFF_AUTH_AUDIENCE ?? "",
    clientId: env.STAFF_AUTH_CLIENT_ID ?? "",
  };
  const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!Object.values(config).every(value => guid.test(value))) {
    throw new Error("Staff authentication requires tenant, API and connector client IDs.");
  }
  return config;
}

/** v2 delegated access tokens only; neither Function keys nor identity headers are accepted. */
export function createStaffGuard(config: StaffAuthConfig, keys?: JWTVerifyGetKey) {
  const issuer = `https://login.microsoftonline.com/${config.tenantId}/v2.0`;
  const trustedKeys = keys ?? createRemoteJWKSet(
    new URL(`https://login.microsoftonline.com/${config.tenantId}/discovery/v2.0/keys`),
    { timeoutDuration: 5000 },
  );
  return (handler: HttpHandler): HttpHandler => async (request, context) => {
    const authorization = request.headers.get("authorization") ?? "";
    const match = /^Bearer ([^\s]+)$/i.exec(authorization);
    const unauthorized: HttpResponseInit = {
      status: 401,
      headers: { "WWW-Authenticate": "Bearer", "Cache-Control": "no-store" },
      jsonBody: { error: "A valid staff access token is required." },
    };
    if (!match) return unauthorized;
    let payload;
    try {
      ({ payload } = await jwtVerify(match[1], trustedKeys, {
        algorithms: ["RS256"], issuer, audience: config.audience,
        requiredClaims: ["exp", "iat", "sub", "tid", "oid", "ver"],
        clockTolerance: 30,
      }));
    } catch {
      // Never log bearer tokens or validation exceptions containing token data.
      return unauthorized;
    }
    if (payload.tid !== config.tenantId || payload.ver !== "2.0") return unauthorized;
    if (payload.azp !== config.clientId ||
        typeof payload.scp !== "string" || !payload.scp.split(" ").includes("Staff.Access") ||
        !Array.isArray(payload.roles) || !payload.roles.includes("Game.Operator")) {
      return { status: 403, headers: { "Cache-Control": "no-store" }, jsonBody: { error: "Staff operator permission is required." } };
    }
    const response = await handler(request, context);
    // Staff responses can include participant data; do not cache them.
    return { ...response, headers: { ...Object.fromEntries(new Headers(response.headers)), "Cache-Control": "no-store" } };
  };
}

let guard: ReturnType<typeof createStaffGuard> | undefined;
export function requireStaff(handler: HttpHandler): HttpHandler {
  return async (request, context) => {
    if (!guard) {
      try { guard = createStaffGuard(readStaffAuthConfig()); }
      catch {
        context.error("Staff authentication configuration is missing or invalid.");
        return { status: 503, jsonBody: { error: "Staff API is not configured." } };
      }
    }
    return guard(handler)(request, context);
  };
}
