import { registerHttp } from "../lib/apiSurface";
import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { runGrandPrizeDraw } from "../lib/dataverse";

/**
 * POST /api/grand-prize/draw -- selects the committed grand-prize winner and
 * exposes it only to staff. Presentation screens poll authenticated drawing-state.
 */
export async function grandPrizeDraw(
  _request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const result = await runGrandPrizeDraw();

    return { jsonBody: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "draw_failed";
    if (message === "no_active_campaign") return { status: 404, jsonBody: { error: message } };
    if (message === "no_checked_in_entries") return { status: 409, jsonBody: { error: message } };

    context.error("grand-prize/draw failed", error);
    return { status: 500, jsonBody: { error: "Failed to run grand-prize draw" } };
  }
}

registerHttp("grand-prize-draw", {
  route: "grand-prize/draw",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: grandPrizeDraw,
});