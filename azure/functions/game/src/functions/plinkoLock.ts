import { registerHttp } from "../lib/apiSurface";
import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { isPlinkoWinActive, releasePlinkoLock } from "../lib/plinkoLanding";

/**
 * The booth display holds one win at a time. While a QR is on screen the backend ignores new
 * landings (lib/plinkoLanding.ts). These two routes let the display see and drop that hold:
 *
 *   GET  /api/plinko-lock?station=&eventId=   -> { active }  (false once claimed, skipped or expired)
 *   POST /api/plinko-release { station, eventId }            (the display's Skip or countdown end)
 *
 * Anonymous like create-win: the display is a public page, and releasing only ever re-opens the board.
 */
export async function plinkoLockStatus(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const station = request.query.get("station")?.trim();
  const eventId = request.query.get("eventId")?.trim();
  if (!station || !eventId) return { status: 400, jsonBody: { error: "station and eventId are required" } };
  try {
    return { headers: { "Cache-Control": "no-store" }, jsonBody: { active: await isPlinkoWinActive(station, eventId) } };
  } catch (error) {
    context.error("plinko-lock failed", error);
    // Keep the win on screen rather than clearing it on a transient failure.
    return { jsonBody: { active: true } };
  }
}

export async function plinkoRelease(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  let body: { station?: unknown; eventId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return { status: 400, jsonBody: { error: "Invalid JSON body" } };
  }
  if (typeof body.station !== "string" || typeof body.eventId !== "string" || !body.station || !body.eventId) {
    return { status: 400, jsonBody: { error: "station and eventId are required" } };
  }
  try {
    await releasePlinkoLock(body.station, body.eventId);
    return { status: 204 };
  } catch (error) {
    context.error("plinko-release failed", error);
    return { status: 500, jsonBody: { error: "Failed to release the board" } };
  }
}

registerHttp("plinko-lock", { route: "plinko-lock", methods: ["GET"], authLevel: "anonymous", handler: plinkoLockStatus });
registerHttp("plinko-release", { route: "plinko-release", methods: ["POST"], authLevel: "anonymous", handler: plinkoRelease });
