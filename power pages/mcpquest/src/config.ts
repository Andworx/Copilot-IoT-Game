export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "https://func-aw-iot-game-v2.azurewebsites.net";

export const PRIZE_WHEEL_URL =
  (import.meta.env.VITE_PRIZE_WHEEL_URL as string | undefined) ??
  "https://andworxprizewheel.powerappsportals.com";

/** MCP server the "mcp" backend connects to. Public MCP Station mock, no auth. */
export const MCP_SERVER_URL =
  (import.meta.env.VITE_MCPQUEST_MCP_URL as string | undefined) ??
  "https://www.mcpstation.io/mcp/it-ticketing";

export type ApiKind = "preview" | "mcp" | "live";

/**
 * Which backend the player page talks to:
 * - `mcp` (default): the browser calls a real MCP server directly; scoring runs locally.
 * - `preview`: fully offline simulated tools.
 * - `live`: the `/api/mcpquest/*` Function routes (not built yet).
 * Override with `?api=<kind>` or `VITE_MCPQUEST_API`.
 */
export function resolveApiKind(search: string = window.location.search): ApiKind {
  const fromQuery = new URLSearchParams(search).get("api");
  const raw = fromQuery ?? (import.meta.env.VITE_MCPQUEST_API as string | undefined) ?? "mcp";
  return raw === "live" || raw === "preview" ? raw : "mcp";
}

/** `?station=<slug>` identifies the physical device, like the Plinko display. */
export function resolveStation(search: string = window.location.search): string {
  const value = new URLSearchParams(search).get("station")?.trim();
  return value ? value.slice(0, 40) : "default";
}
