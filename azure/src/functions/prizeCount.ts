import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { countAllPrizes, countAvailablePrizes } from "../lib/dataverse";

/**
 * GET /api/prize-count -- andy_Prizes stock counts for Game Box Control's Prize
 * Management screen: `total` (every row ever created) and `available` (still
 * untaken). Anonymous, same posture as prize-types/prizes: a bare count isn't
 * sensitive, only the write (bulk-create-prizes) needs a function key.
 */
export async function prizeCount(
  _request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const [total, available] = await Promise.all([countAllPrizes(), countAvailablePrizes()]);
    return { jsonBody: { total, available } };
  } catch (error) {
    context.error("prize-count failed", error);
    return { status: 500, jsonBody: { error: "Failed to count prizes" } };
  }
}

app.http("prize-count", {
  route: "prize-count",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: prizeCount,
});
