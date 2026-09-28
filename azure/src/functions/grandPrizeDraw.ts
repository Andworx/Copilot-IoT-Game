import { app, HttpRequest, HttpResponseInit, InvocationContext, output } from "@azure/functions";
import { runGrandPrizeDraw } from "../lib/dataverse";

const signalROutput = output.generic({
  type: "signalR",
  name: "signalRMessages",
  hubName: "gamebox",
  connectionStringSetting: "AzureSignalRConnectionString",
});

/**
 * POST /api/grand-prize/draw -- selects the committed grand-prize winner and
 * broadcasts it so presentation-mode displays animate from another device.
 */
export async function grandPrizeDraw(
  _request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const result = await runGrandPrizeDraw();
    context.extraOutputs.set(signalROutput, {
      target: "grandPrizeDrawn",
      arguments: [result],
    });

    return { jsonBody: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "draw_failed";
    if (message === "no_active_campaign") return { status: 404, jsonBody: { error: message } };
    if (message === "no_checked_in_entries") return { status: 409, jsonBody: { error: message } };

    context.error("grand-prize/draw failed", error);
    return { status: 500, jsonBody: { error: "Failed to run grand-prize draw" } };
  }
}

app.http("grand-prize-draw", {
  route: "grand-prize/draw",
  methods: ["POST"],
  authLevel: "function",
  extraOutputs: [signalROutput],
  handler: grandPrizeDraw,
});