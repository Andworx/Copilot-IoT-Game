import { registerHttp } from "../lib/apiSurface";
import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { checkInGrandPrizeEntry } from "../lib/dataverse";

interface GrandPrizeCheckInRequestBody {
  checkInCode?: string;
}

/**
 * POST /api/grand-prize/check-in -- marks all active campaign entries for a
 * scanned check-in code as present for the staff grand-prize wheel.
 */
export async function grandPrizeCheckIn(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  let body: GrandPrizeCheckInRequestBody;
  try {
    body = (await request.json()) as GrandPrizeCheckInRequestBody;
  } catch {
    return { status: 400, jsonBody: { error: "Invalid JSON body" } };
  }

  if (typeof body.checkInCode !== "string" || !body.checkInCode.trim()) {
    return { status: 400, jsonBody: { error: "checkInCode is required" } };
  }

  try {
    const result = await checkInGrandPrizeEntry(body.checkInCode);
    return { status: result.status === "invalid" ? 404 : 200, jsonBody: result };
  } catch (error) {
    context.error("grand-prize/check-in failed", error);
    return { status: 500, jsonBody: { error: "Failed to check in grand-prize entry" } };
  }
}

registerHttp("grand-prize-check-in", {
  route: "grand-prize/check-in",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: grandPrizeCheckIn,
});