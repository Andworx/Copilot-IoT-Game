import { registerHttp } from "../lib/apiSurface";
import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { createGameWin } from "../lib/dataverse";

interface CreateWinRequestBody {
  deviceSlug: string;
  contestSourceKey?: string;
}

/**
 * POST /api/create-win -- called by the kiosk SPA the moment `device.checkWin()`
 * flips true. Stands in for the not-yet-built Copilot Studio resolved-topic action
 * (PRIZE_ENGINE_SPEC.md §3 step 1); creates the Prize Claim parent and IoT Game
 * Win detail row, then returns the claim token the kiosk encodes into the real QR.
 *
 * Anonymous, same posture as kiosk-state/device-profiles: any legitimate kiosk
 * visitor who actually fixed the device should be able to trigger this -- that's
 * the game, not a privileged action like set-mode.
 */
export async function createWin(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  let body: CreateWinRequestBody;
  try {
    body = (await request.json()) as CreateWinRequestBody;
  } catch {
    return { status: 400, jsonBody: { error: "Invalid JSON body" } };
  }

  if (typeof body.deviceSlug !== "string" || !body.deviceSlug) {
    return { status: 400, jsonBody: { error: "deviceSlug is required" } };
  }

  try {
    const { claimToken } = await createGameWin(body.deviceSlug, {
      contestSourceKey: typeof body.contestSourceKey === "string" ? body.contestSourceKey : undefined,
    });
    return { jsonBody: { claimToken } };
  } catch (error) {
    context.error("create-win failed", error);
    return { status: 500, jsonBody: { error: "Failed to create game win claim" } };
  }
}

registerHttp("create-win", {
  route: "create-win",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: createWin,
});
