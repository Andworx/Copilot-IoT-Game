import { registerHttp } from "../lib/apiSurface";
import { output, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getGameBoxState, setGameModeEnabled } from "../lib/dataverse";

interface SetGameModeRequestBody {
  gameModeEnabled: boolean;
}

/**
 * POST /api/set-game-mode -- called by Game Box Control's master "Game Mode" switch
 * (GAME_MODE_PLAN.md follow-up). Flips andy_gameboxstate.andy_gamemodeenabled.
 *
 * OFF makes the kiosk skip the whole QR/phone-spin/claim flow on a device completion --
 * it shows a simple on-kiosk success popup instead, with no andy_gamewin row created at
 * all (a Game Mode OFF completion is intentionally not logged). ON restores today's
 * flow exactly. Either way, the kiosk auto-picks a new random enabled mode afterward via
 * pick-random-mode -- that behavior doesn't depend on this flag.
 *
 * Broadcasts gameModeChanged over the same gamebox SignalR hub as set-mode's
 * deviceChanged, so an already-open kiosk tab picks up the new value immediately instead
 * of only on its next device-change remount (KioskDevicePage.tsx used to read this flag
 * once per mount with no live update -- toggling it mid-session on a kiosk sitting on the
 * same device had no visible effect until the device happened to rotate).
 *
 * Entra staff-role gated, same posture as set-mode/toggle-device.
 */
const signalROutput = output.generic({
  type: "signalR",
  name: "signalRMessages",
  hubName: "gamebox",
  connectionStringSetting: "AzureSignalRConnectionString",
});

export async function setGameMode(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  let body: SetGameModeRequestBody;
  try {
    body = (await request.json()) as SetGameModeRequestBody;
  } catch {
    return { status: 400, jsonBody: { error: "Invalid JSON body" } };
  }

  if (typeof body.gameModeEnabled !== "boolean") {
    return { status: 400, jsonBody: { error: "gameModeEnabled must be a boolean" } };
  }

  try {
    const current = await getGameBoxState();
    await setGameModeEnabled(current.id, body.gameModeEnabled);

    context.extraOutputs.set(signalROutput, {
      target: "gameModeChanged",
      arguments: [{ gameModeEnabled: body.gameModeEnabled }],
    });

    return { jsonBody: { gameModeEnabled: body.gameModeEnabled } };
  } catch (error) {
    context.error("set-game-mode failed", error);
    return { status: 500, jsonBody: { error: "Failed to set game mode" } };
  }
}

registerHttp("set-game-mode", {
  route: "set-game-mode",
  methods: ["POST"],
  authLevel: "anonymous",
  extraOutputs: [signalROutput],
  handler: setGameMode,
});
