import { registerHttp } from "../lib/apiSurface";
import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { countPrizesByType, summarizePrizeCounts } from "../lib/dataverse";

/**
 * GET /api/prize-count -- andy_Prizes stock counts for Game Box Control's Prize
 * Management screen: `total` (every row ever created), `available` (still
 * untaken), and a per-prize-type breakdown. All three cover active prize types only. Anonymous, same posture as
 * prize-types/prizes: inventory counts are not sensitive, only writes need a
 * function key.
 */
export async function prizeCount(
  _request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    return { jsonBody: summarizePrizeCounts(await countPrizesByType()) };
  } catch (error) {
    context.error("prize-count failed", error);
    return { status: 500, jsonBody: { error: "Failed to count prizes" } };
  }
}

registerHttp("prize-count", {
  route: "prize-count",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: prizeCount,
});
