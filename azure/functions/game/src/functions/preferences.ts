import { registerHttp } from "../lib/apiSurface";
import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import {
  confirmMarketingOptIn,
  getPreferenceState,
  optOutMarketing,
  requestDataCopy,
  requestMarketingOptIn,
  requestRemoval,
} from "../lib/consent";
import { verifyPreferenceToken } from "../lib/preferenceToken";

const NO_STORE = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
const ACTIONS = ["opt_in", "confirm", "opt_out", "remove", "copy"] as const;
type PreferenceAction = (typeof ACTIONS)[number];

/**
 * /api/preferences -- the preference-center backend (issue #133). The bearer is a signed token
 * from the email link, never a prize claim token. GET only reads (mail scanners prefetch links);
 * every change is a POST. `confirm` needs the confirm-purpose token mailed for double opt-in.
 */
export async function preferences(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const invalid = { status: 400, headers: NO_STORE, jsonBody: { error: "invalid_link" } };
  try {
    if (request.method === "GET") {
      const claims = verifyPreferenceToken(request.query.get("token"), ["manage", "confirm"]);
      if (!claims) return invalid;
      const state = await getPreferenceState(claims.contactId);
      if (!state) return { status: 404, headers: NO_STORE, jsonBody: { error: "not_found" } };
      return { headers: NO_STORE, jsonBody: { ...state, purpose: claims.purpose } };
    }

    let body: { token?: unknown; action?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return { status: 400, headers: NO_STORE, jsonBody: { error: "Invalid JSON body" } };
    }
    const action = body.action as PreferenceAction;
    if (!ACTIONS.includes(action)) return { status: 400, headers: NO_STORE, jsonBody: { error: "unknown_action" } };
    const claims = verifyPreferenceToken(typeof body.token === "string" ? body.token : null, action === "confirm" ? ["confirm"] : ["manage"]);
    if (!claims) return invalid;

    const id = claims.contactId;
    switch (action) {
      case "opt_in":
        return { headers: NO_STORE, jsonBody: { result: await requestMarketingOptIn(id, "preference-page") } };
      case "confirm": {
        const result = await confirmMarketingOptIn(id, "preference-page");
        return { status: result === "not_found" ? 404 : 200, headers: NO_STORE, jsonBody: { result } };
      }
      case "opt_out":
        return { headers: NO_STORE, jsonBody: { result: (await optOutMarketing(id, "preference-page")) ? "opted_out" : "not_found" } };
      case "remove":
        return { headers: NO_STORE, jsonBody: { result: await requestRemoval(id) } };
      case "copy":
        return { headers: NO_STORE, jsonBody: { result: (await requestDataCopy(id)) ? "requested" : "not_found" } };
    }
  } catch (error) {
    context.error("preferences failed", error);
    return { status: 500, headers: NO_STORE, jsonBody: { error: "internal_error" } };
  }
}

registerHttp("preferences", {
  route: "preferences",
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: preferences,
});
