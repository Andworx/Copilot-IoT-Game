import { registerHttp } from "../lib/apiSurface";
import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { listDeviceProfiles } from "../lib/dataverse";

/**
 * GET /api/device-profiles -- lists every andy_deviceprofile row, for the
 * control app's device picker (GAME_MODE_PLAN.md §4a). Anonymous, same
 * posture as kiosk-state: device names aren't sensitive, only the write
 * (set-mode) requires Entra staff authorization.
 */
export async function deviceProfiles(
  _request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const profiles = await listDeviceProfiles();
    return { jsonBody: { profiles } };
  } catch (error) {
    context.error("device-profiles failed", error);
    return { status: 500, jsonBody: { error: "Failed to list device profiles" } };
  }
}

registerHttp("device-profiles", {
  route: "device-profiles",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: deviceProfiles,
});
