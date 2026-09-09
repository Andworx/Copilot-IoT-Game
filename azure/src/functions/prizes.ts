import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { listActivePrizes } from "../lib/dataverse";

/**
 * GET /api/prizes -- lists active, non-fallback andy_prize names for the prize wheel
 * SPA to draw its wheel slices from. The actual pick happens server-side in
 * claim-prize (PRIZE_ENGINE_SPEC.md §1.2); this is presentation data only, so
 * anonymous is fine -- same posture as device-profiles/kiosk-state.
 */
export async function prizes(
  _request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const prizes = await listActivePrizes();
    return { jsonBody: { prizes } };
  } catch (error) {
    context.error("prizes failed", error);
    return { status: 500, jsonBody: { error: "Failed to list prizes" } };
  }
}

app.http("prizes", {
  route: "prizes",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: prizes,
});
