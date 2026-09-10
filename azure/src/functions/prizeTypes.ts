import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { listAllPrizeTypes } from "../lib/dataverse";

/**
 * GET /api/prize-types -- lists every active andy_PrizeTypes row (id + name,
 * including the fallback type) for Game Box Control's bulk-create picker. Unlike
 * GET /api/prizes (the wheel's non-fallback, name-only list), staff need ids to bind
 * new andy_Prizes rows to a specific type, and may legitimately want to stock the
 * fallback type too. Anonymous, same posture as device-profiles/kiosk-state -- type
 * names/ids aren't sensitive, only the write (bulk-create-prizes) needs a function key.
 */
export async function prizeTypes(
  _request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const prizeTypes = await listAllPrizeTypes();
    return { jsonBody: { prizeTypes } };
  } catch (error) {
    context.error("prize-types failed", error);
    return { status: 500, jsonBody: { error: "Failed to list prize types" } };
  }
}

app.http("prize-types", {
  route: "prize-types",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: prizeTypes,
});
