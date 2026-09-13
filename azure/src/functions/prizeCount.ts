import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { countAvailablePrizes } from "../lib/dataverse";

/**
 * GET /api/prize-count -- total untaken andy_Prizes rows, for Game Box Control's
 * at-a-glance "prizes remaining" stat. Anonymous, same posture as prize-types/prizes:
 * a bare count isn't sensitive, only the write (bulk-create-prizes) needs a function key.
 */
export async function prizeCount(
  _request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const available = await countAvailablePrizes();
    return { jsonBody: { available } };
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
