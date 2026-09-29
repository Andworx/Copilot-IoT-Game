import { registerHttp } from "../lib/apiSurface";
import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

const DIRECTLINE_USER_ID = "dl_kiosk_user";

/**
 * GET /api/directline-token -- exchanges the Copilot Studio agent's Direct Line secret
 * (server-side app setting DIRECTLINE_SECRET) for a short-lived token the kiosk's Help
 * Fix bar uses to talk to the troubleshooting agent. The secret never reaches the
 * browser. Anonymous, like /api/negotiate: CORS on the Function App restricts callers to
 * the site origins. Returns 503 until DIRECTLINE_SECRET is set, which the kiosk treats as
 * "agent not available yet" and falls back to the static steps.
 */
export async function directlineToken(
  _request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const secret = process.env.DIRECTLINE_SECRET;
  if (!secret) {
    return { status: 503, jsonBody: { error: "Direct Line is not configured on the server" } };
  }

  try {
    const response = await fetch("https://directline.botframework.com/v3/directline/tokens/generate", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({ user: { id: DIRECTLINE_USER_ID } }),
    });
    if (!response.ok) {
      context.error(`Direct Line token request failed: ${response.status}`);
      return { status: 502, jsonBody: { error: `Direct Line token request failed (${response.status})` } };
    }
    const { token } = (await response.json()) as { token: string };
    return { jsonBody: { token } };
  } catch (error) {
    context.error("directline-token failed", error);
    return { status: 502, jsonBody: { error: "Direct Line token request failed" } };
  }
}

registerHttp("directline-token", {
  route: "directline-token",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: directlineToken,
});
