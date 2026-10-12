import { registerHttp } from "../lib/apiSurface";
import { output, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getProfile, setPlinkoBucketIcons, setPlinkoGameMode } from "../lib/plinkoLanding";

/**
 * POST /api/plinko-game-mode { station, gameModeActive? } -- the Game Box Control app's Plinko switch.
 *
 * With `gameModeActive` the station's Game Mode is set; with `bucketIcons` its ordered bucket icon
 * ids are stored. Without either field the call only reads the state, so
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
  let body: { station?: unknown; gameModeActive?: unknown; bucketIcons?: unknown };
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
  if (body.bucketIcons !== undefined && !Array.isArray(body.bucketIcons)) {
    return { status: 400, jsonBody: { error: "bucketIcons must be an array" } };
  }
  const station = body.station.trim();

  try {
    let profile = await getProfile(station);
    if (!profile) return { status: 404, jsonBody: { error: "Unknown station" } };
    if (typeof body.gameModeActive === "boolean") profile = await setPlinkoGameMode(station, body.gameModeActive);
    if (body.bucketIcons !== undefined) profile = await setPlinkoBucketIcons(station, body.bucketIcons);
    if (!profile) return { status: 404, jsonBody: { error: "Unknown station" } };

    if (typeof body.gameModeActive === "boolean" || body.bucketIcons !== undefined) {
      context.extraOutputs.set(signalROutput, {
        target: "plinkoGameModeChanged",
        arguments: [{ stationSlug: profile.slug, gameModeActive: profile.gameModeActive, bucketIcons: profile.bucketIcons }],
      });
    }
    return {
      jsonBody: {
        station: profile.slug,
        gameModeActive: profile.gameModeActive,
        bucketCount: profile.bucketCount,
        bucketIcons: profile.bucketIcons,
      },
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
