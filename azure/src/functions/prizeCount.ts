import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { countAllPrizes, countAvailablePrizes, countPrizesByType } from "../lib/dataverse";

/**
 * GET /api/prize-count -- andy_Prizes stock counts for Game Box Control's Prize
 * Management screen: `total` (every row ever created), `available` (still
 * untaken), and a per-prize-type breakdown. Anonymous, same posture as
 * prize-types/prizes: inventory counts are not sensitive, only writes need a
 * function key.
 */
export async function prizeCount(
  _request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const [total, available, byType] = await Promise.all([
      countAllPrizes(),
      countAvailablePrizes(),
      countPrizesByType(),
    ]);
    return { jsonBody: { total, available, byType } };
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
