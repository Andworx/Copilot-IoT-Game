import { registerHttp } from "../lib/apiSurface";
import { HttpResponseInit, InvocationContext } from "@azure/functions";
import { getGrandPrizeDrawingState } from "../lib/dataverse";

/**
 * GET /api/grand-prize/drawing-state -- returns the latest committed draw result
 * for the active campaign when this Function host has one cached.
 */
export async function grandPrizeDrawingState(
  _request: unknown,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    return { jsonBody: await getGrandPrizeDrawingState() };
  } catch (error) {
    context.error("grand-prize/drawing-state failed", error);
    return { status: 500, jsonBody: { error: "Failed to load grand-prize drawing state" } };
  }
}

registerHttp("grand-prize-drawing-state", {
  route: "grand-prize/drawing-state",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: grandPrizeDrawingState,
});