import { registerHttp } from "../lib/apiSurface";
import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { listActivePrizeTypes } from "../lib/dataverse";

/**
 * GET /api/prizes -- lists active andy_PrizeTypes names for the prize wheel SPA to
 * draw its wheel slices from. The actual pick happens server-side in claim-prize
 * (PRIZE_CODE_MIGRATION.md), now weighted-picking a type then claiming one of its
 * untaken andy_Prizes instance rows before falling back when stock is empty; this is
 * presentation data only, so anonymous is fine -- same posture as device-profiles/kiosk-state.
 */
export async function prizes(
  _request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const prizes = await listActivePrizeTypes();
    return { jsonBody: { prizes } };
  } catch (error) {
    context.error("prizes failed", error);
    return { status: 500, jsonBody: { error: "Failed to list prizes" } };
  }
}

registerHttp("prizes", {
  route: "prizes",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: prizes,
});
