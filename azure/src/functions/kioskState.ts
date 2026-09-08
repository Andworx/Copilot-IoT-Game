import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getGameBoxState } from "../lib/dataverse";

/**
 * GET /api/kiosk-state -- the kiosk SPA calls this once per page load, before
 * (or alongside) opening its SignalR connection, so a freshly-opened tab lands
 * on the right device immediately instead of waiting for the next
 * deviceChanged broadcast. See GAME_MODE_PLAN.md §4a.
 */
export async function kioskState(
  _request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const state = await getGameBoxState();
    return { jsonBody: { deviceSlug: state.deviceSlug, deviceName: state.deviceName } };
  } catch (error) {
    context.error("kiosk-state failed", error);
    return { status: 500, jsonBody: { error: "Failed to read kiosk state" } };
  }
}

app.http("kiosk-state", {
  route: "kiosk-state",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: kioskState,
});
