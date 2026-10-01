import { registerHttp } from "../lib/apiSurface";
import { HttpResponseInit, InvocationContext } from "@azure/functions";
import { listGrandPrizeDrawingLineup } from "../lib/dataverse";

/**
 * GET /api/grand-prize/drawing-slices -- reads the active campaign's checked-in
 * Grand Prize Entry rows and returns weighted slices for the staff prize wheel.
 */
export async function grandPrizeDrawingSlices(
  _request: unknown,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const lineup = await listGrandPrizeDrawingLineup();
    if (!lineup) {
      return { status: 404, jsonBody: { error: "no_active_campaign" } };
    }

    return { jsonBody: lineup };
  } catch (error) {
    context.error("grand-prize/drawing-slices failed", error);
    return { status: 500, jsonBody: { error: "Failed to load grand-prize drawing lineup" } };
  }
}

registerHttp("grand-prize-drawing-slices", {
  route: "grand-prize/drawing-slices",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: grandPrizeDrawingSlices,
});