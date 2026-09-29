import { registerHttp } from "../lib/apiSurface";
import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { setDeviceProfileEnabled } from "../lib/dataverse";

interface ToggleDeviceRequestBody {
  deviceProfileId: string;
  isEnabled: boolean;
}

/**
 * POST /api/toggle-device -- called by Game Box Control's per-tile enable/disable
 * switch (GAME_MODE_PLAN.md follow-up). Flips andy_deviceprofile.andy_isenabled. A
 * disabled device is hidden from staff's manual picker in the control app and skipped
 * by pick-random-mode, but the row and its data stay intact for later re-enabling.
 *
 * Entra staff-role gated, same posture as set-mode -- this changes what staff can offer at
 * the booth, not public presentation data.
 */
export async function toggleDevice(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  let body: ToggleDeviceRequestBody;
  try {
    body = (await request.json()) as ToggleDeviceRequestBody;
  } catch {
    return { status: 400, jsonBody: { error: "Invalid JSON body" } };
  }

  if (typeof body.deviceProfileId !== "string" || !body.deviceProfileId) {
    return { status: 400, jsonBody: { error: "deviceProfileId is required" } };
  }
  if (typeof body.isEnabled !== "boolean") {
    return { status: 400, jsonBody: { error: "isEnabled must be a boolean" } };
  }

  try {
    await setDeviceProfileEnabled(body.deviceProfileId, body.isEnabled);
    return { jsonBody: { deviceProfileId: body.deviceProfileId, isEnabled: body.isEnabled } };
  } catch (error) {
    context.error("toggle-device failed", error);
    return { status: 500, jsonBody: { error: "Failed to toggle device" } };
  }
}

registerHttp("toggle-device", {
  route: "toggle-device",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: toggleDevice,
});
