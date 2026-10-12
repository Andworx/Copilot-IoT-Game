import { registerHttp } from "../lib/apiSurface";
import { output, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getProfile, setPlinkoGameMode } from "../lib/plinkoLanding";

/**
 * POST /api/plinko-game-mode { station, gameModeActive? } -- the Game Box Control app's Plinko switch.
 *
 * With `gameModeActive` the station's Game Mode is set; without it the call only reads the state, so
 * the app needs a single connector operation for both. OFF makes the booth display simply show which
 * bucket was hit (no QR, no entries, nothing recorded). Broadcasts `plinkoGameModeChanged` so an open
 * display follows immediately.
 *
 * Entra staff-role gated, same posture as set-game-mode.
 */
const signalROutput = output.generic({
  type: "signalR",
  name: "signalRMessages",
  hubName: "gamebox",
  connectionStringSetting: "AzureSignalRConnectionString",
});

export async function plinkoGameMode(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  let body: { station?: unknown; gameModeActive?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return { status: 400, jsonBody: { error: "Invalid JSON body" } };
  }
  if (typeof body.station !== "string" || !body.station.trim()) {
    return { status: 400, jsonBody: { error: "station is required" } };
  }
  if (body.gameModeActive !== undefined && typeof body.gameModeActive !== "boolean") {
    return { status: 400, jsonBody: { error: "gameModeActive must be a boolean" } };
  }
  const station = body.station.trim();

  try {
    const profile =
      typeof body.gameModeActive === "boolean"
        ? await setPlinkoGameMode(station, body.gameModeActive)
        : await getProfile(station);
    if (!profile) return { status: 404, jsonBody: { error: "Unknown station" } };

    if (typeof body.gameModeActive === "boolean") {
      context.extraOutputs.set(signalROutput, {
        target: "plinkoGameModeChanged",
        arguments: [{ stationSlug: profile.slug, gameModeActive: profile.gameModeActive }],
      });
    }
    return {
      jsonBody: { station: profile.slug, gameModeActive: profile.gameModeActive, bucketCount: profile.bucketCount },
    };
  } catch (error) {
    context.error("plinko-game-mode failed", error);
    return { status: 500, jsonBody: { error: "Failed to read or set Plinko game mode" } };
  }
}

registerHttp("plinko-game-mode", {
  route: "plinko-game-mode",
  methods: ["POST"],
  authLevel: "anonymous",
  extraOutputs: [signalROutput],
  handler: plinkoGameMode,
});
