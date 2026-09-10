import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { createPrizeInstances } from "../lib/dataverse";

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 100;

interface BulkCreatePrizesRequestBody {
  prizeTypeId: string;
  prizeTypeName: string;
  quantity: number;
}

/**
 * POST /api/bulk-create-prizes -- called by Game Box Control's Prize Management
 * section to stock the prize pool without leaving the control app. Creates `quantity`
 * andy_Prizes instance rows bound to one andy_PrizeTypes row, same shape as the
 * Bulk Add Prizes genpage in the Game Backend app (power apps/bulk-add-prizes/
 * bulk-add-prizes.tsx) -- that genpage is left running as a redundant alternate entry
 * point, this is a second way to do the same thing from Game Box Control.
 *
 * Function-key gated, same posture as toggle-device/set-game-mode -- this changes
 * what's in the prize pool, not public presentation data.
 */
export async function bulkCreatePrizes(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  let body: BulkCreatePrizesRequestBody;
  try {
    body = (await request.json()) as BulkCreatePrizesRequestBody;
  } catch {
    return { status: 400, jsonBody: { error: "Invalid JSON body" } };
  }

  if (typeof body.prizeTypeId !== "string" || !body.prizeTypeId) {
    return { status: 400, jsonBody: { error: "prizeTypeId is required" } };
  }
  if (typeof body.prizeTypeName !== "string" || !body.prizeTypeName) {
    return { status: 400, jsonBody: { error: "prizeTypeName is required" } };
  }
  if (
    typeof body.quantity !== "number" ||
    !Number.isInteger(body.quantity) ||
    body.quantity < MIN_QUANTITY ||
    body.quantity > MAX_QUANTITY
  ) {
    return {
      status: 400,
      jsonBody: { error: `quantity must be a whole number between ${MIN_QUANTITY} and ${MAX_QUANTITY}` },
    };
  }

  try {
    const created = await createPrizeInstances(body.prizeTypeId, body.quantity, body.prizeTypeName);
    return { jsonBody: { created } };
  } catch (error) {
    context.error("bulk-create-prizes failed", error);
    return { status: 500, jsonBody: { error: "Failed to create prizes" } };
  }
}

app.http("bulk-create-prizes", {
  route: "bulk-create-prizes",
  methods: ["POST"],
  authLevel: "function",
  handler: bulkCreatePrizes,
});
