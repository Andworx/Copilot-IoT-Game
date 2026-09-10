import { app, output, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getGameBoxState, setActiveDeviceProfile } from "../lib/dataverse";

interface SetModeRequestBody {
  /** andy_deviceprofile GUID, or null to return to demo/info. */
  deviceProfileId: string | null;
  /** Passed by the caller rather than looked up server-side -- see README's hardening note. */
  deviceSlug: string | null;
  deviceName?: string | null;
}

/**
 * POST /api/set-mode -- called by the Power App control device (and later,
 * once GAME_MODE_PLAN.md's IoT phase lands, potentially the physical dial
 * too). Writes andy_gameboxstate, then broadcasts deviceChanged to every
 * connected kiosk client via the gamebox SignalR hub.
 *
 * TODO (deferred on purpose, see GAME_MODE_PLAN.md §4a): send the panel Pi an
 * IoT Hub cloud-to-device message here too, once the IoT phase of the build
 * starts, so it knows which logic_maps/<slug>.json to apply.
 */
const signalROutput = output.generic({
  type: "signalR",
  name: "signalRMessages",
  hubName: "gamebox",
  connectionStringSetting: "AzureSignalRConnectionString",
});

export async function setMode(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  let body: SetModeRequestBody;
  try {
    body = (await request.json()) as SetModeRequestBody;
  } catch {
    return { status: 400, jsonBody: { error: "Invalid JSON body" } };
  }

  if (body.deviceProfileId !== null && typeof body.deviceProfileId !== "string") {
    return { status: 400, jsonBody: { error: "deviceProfileId must be a string GUID or null" } };
  }
  if (body.deviceSlug !== null && typeof body.deviceSlug !== "string") {
    return { status: 400, jsonBody: { error: "deviceSlug must be a string or null" } };
  }

  try {
    const current = await getGameBoxState();
    await setActiveDeviceProfile(current.id, body.deviceProfileId);

    context.extraOutputs.set(signalROutput, {
      target: "deviceChanged",
      arguments: [{ deviceSlug: body.deviceSlug, deviceName: body.deviceName ?? null }],
    });

    return { jsonBody: { deviceSlug: body.deviceSlug } };
  } catch (error) {
    context.error("set-mode failed", error);
    return { status: 500, jsonBody: { error: "Failed to set mode" } };
  }
}

app.http("set-mode", {
  route: "set-mode",
  methods: ["POST"],
  authLevel: "function",
  extraOutputs: [signalROutput],
  handler: setMode,
});
