import { app, output, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getGameBoxState, pickRandomEnabledMode } from "../lib/dataverse";

/**
 * POST /api/pick-random-mode -- called by the kiosk itself immediately after a device
 * completion (in both Game Mode ON and OFF), to auto-rotate to a new random *enabled*
 * mode with no staff action required. Reuses the same andy_gameboxstate write +
 * deviceChanged SignalR broadcast as set-mode, so the kiosk (and any other open kiosk
 * tabs) react through the existing SignalR listener -- no new client-side navigation
 * mechanism needed.
 *
 * Anonymous, same posture as create-win/claim-prize: this is a kiosk-triggered write
 * with no staff auth available at that point, not a privileged control-app action like
 * set-mode/toggle-device/set-game-mode.
 */
const signalROutput = output.generic({
  type: "signalR",
  name: "signalRMessages",
  hubName: "gamebox",
  connectionStringSetting: "AzureSignalRConnectionString",
});

export async function pickRandomMode(
  _request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const current = await getGameBoxState();
    const picked = await pickRandomEnabledMode(current.id);

    context.extraOutputs.set(signalROutput, {
      target: "deviceChanged",
      arguments: [{ deviceSlug: picked.deviceSlug, deviceName: picked.deviceName }],
    });

    return { jsonBody: { deviceSlug: picked.deviceSlug, deviceName: picked.deviceName } };
  } catch (error) {
    context.error("pick-random-mode failed", error);
    return { status: 500, jsonBody: { error: "Failed to pick a random mode" } };
  }
}

app.http("pick-random-mode", {
  route: "pick-random-mode",
  methods: ["POST"],
  authLevel: "anonymous",
  extraOutputs: [signalROutput],
  handler: pickRandomMode,
});
