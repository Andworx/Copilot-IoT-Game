import { registerHttp } from "../lib/apiSurface";
import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getProfile } from "../lib/plinkoLanding";
import { CHASE_STEP_MS } from "../lib/plinkoChase";

/**
 * GET /api/plinko-chase?station=<slug> -- the booth display calls this on load (and now and
 * then) to learn the chase schedule and the server clock. It draws the light from
 * `litBucketAt(serverNow, bucketCount, stepMs)`, the same function the backend scores a landing
 * with, so the lit bucket on screen is the one that counts. Anonymous and read-only.
 */
export async function plinkoChase(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const station = request.query.get("station")?.trim();
  if (!station) return { status: 400, jsonBody: { error: "station is required" } };
  try {
    const profile = await getProfile(station);
    if (!profile || profile.bucketCount === null) return { status: 404, jsonBody: { error: "Unknown station" } };
    return {
      headers: { "Cache-Control": "no-store" },
      jsonBody: { serverTime: Date.now(), stepMs: CHASE_STEP_MS, bucketCount: profile.bucketCount },
    };
  } catch (error) {
    context.error("plinko-chase failed", error);
    return { status: 500, jsonBody: { error: "Failed to read the chase schedule" } };
  }
}

registerHttp("plinko-chase", {
  route: "plinko-chase",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: plinkoChase,
});
