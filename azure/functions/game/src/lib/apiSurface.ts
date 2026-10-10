import { app, type HttpFunctionOptions } from "@azure/functions";
import { requireStaff } from "./staffAuth";

const staffOnly = new Set([
  "set-mode", "toggle-device", "set-game-mode", "bulk-create-prizes",
  "prize-types", "prize-count", "grand-prize-check-in", "grand-prize-draw",
  "grand-prize-drawing-state", "grand-prize-drawing-slices",
]);
const shared = new Set(["kiosk-state", "device-profiles", "create-win", "claim-prize"]);
const publicOnly = new Set([
  "negotiate", "pick-random-mode", "prizes", "directline-token", "preferences",
  "mcpquest-start", "mcpquest-call", "mcpquest-hint", "mcpquest-choose", "mcpquest-test",
  "mcpquest-submit", "mcpquest-leaderboard",
]);

export function apiSurface(value = process.env.API_SURFACE): "public" | "staff" {
  if (value === "public") return "public";
  if (value === "staff") return "staff";
  throw new Error("API_SURFACE must be public or staff.");
}

export function backgroundWorkEnabled(value = process.env.MIGRATION_STAGING): boolean {
  if (value === undefined || value === "false") return true;
  if (value === "true") return false;
  throw new Error("MIGRATION_STAGING must be true or false.");
}

export function routeEnabled(name: string, surface: "public" | "staff"): boolean {
  if (!staffOnly.has(name) && !shared.has(name) && !publicOnly.has(name)) {
    throw new Error(`HTTP route needs an explicit API boundary: ${name}`);
  }
  return shared.has(name) || (surface === "staff" ? staffOnly.has(name) : publicOnly.has(name));
}

/** Both apps use one tested artifact. No staff route is registered on the public app. */
export function registerHttp(name: string, options: HttpFunctionOptions): void {
  const surface = apiSurface();
  if (!routeEnabled(name, surface)) return;
  app.http(name, surface === "staff"
    ? { ...options, authLevel: "anonymous", handler: requireStaff(options.handler) }
    : options);
}
