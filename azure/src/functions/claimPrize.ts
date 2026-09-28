import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { claimGameWin, ClaimError } from "../lib/dataverse";

interface ClaimPrizeRequestBody {
  claimToken: string;
  contestantFirstName?: string;
  contestantLastName?: string;
  contestantName?: string;
  contestantEmail?: string;
  sharedInfo?: boolean;
}

const CLAIM_ERROR_STATUS: Record<ClaimError["code"], number> = {
  invalid_token: 400,
  not_found: 404,
  already_claimed: 409,
  no_prizes_available: 503,
};

/**
 * POST /api/claim-prize -- called by the prize wheel SPA once it has the token from
 * the kiosk QR (`?token=...`). Runs PRIZE_ENGINE_SPEC.md §1.2/§1.3/§3 step 4 entirely
 * server-side: validates the token is Unclaimed, weighted-picks a prize, atomically
 * claims its stock row, and marks the Prize Claim Claimed.
 *
 * Anonymous -- the security boundary here is possession of the claim token (a
 * hard-to-guess GUID from the kiosk QR), not a login, per PRIZE_ENGINE_SPEC.md §2.2's
 * note that the token is a bearer secret.
 */
export async function claimPrize(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  let body: ClaimPrizeRequestBody;
  try {
    body = (await request.json()) as ClaimPrizeRequestBody;
  } catch {
    return { status: 400, jsonBody: { error: "Invalid JSON body" } };
  }

  if (typeof body.claimToken !== "string" || !body.claimToken) {
    return { status: 400, jsonBody: { error: "claimToken is required" } };
  }

  try {
    const result = await claimGameWin(body.claimToken, {
      firstName: typeof body.contestantFirstName === "string" ? body.contestantFirstName : undefined,
      lastName: typeof body.contestantLastName === "string" ? body.contestantLastName : undefined,
      name: typeof body.contestantName === "string" ? body.contestantName : undefined,
      email: typeof body.contestantEmail === "string" ? body.contestantEmail : undefined,
      sharedInfo: !!body.sharedInfo,
    });
    return { jsonBody: result };
  } catch (error) {
    if (error instanceof ClaimError) {
      return {
        status: CLAIM_ERROR_STATUS[error.code],
        jsonBody: { error: error.code, message: error.message },
      };
    }
    context.error("claim-prize failed", error);
    return { status: 500, jsonBody: { error: "internal_error" } };
  }
}

app.http("claim-prize", {
  route: "claim-prize",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: claimPrize,
});
