/**
 * MCP Station is the only MCP source for generated games. The page and the agent name a server
 * by catalog slug; the endpoint is built here from a fixed host, so no caller can point the
 * Function (or the Foundry agent's MCP tool) at an arbitrary URL.
 */

export const MCP_STATION_ORIGIN = "https://www.mcpstation.io";
export const MCP_STATION_CATALOG_URL = `${MCP_STATION_ORIGIN}/api/catalog`;

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const HOSTS = new Set(["mcpstation.io", "www.mcpstation.io"]);

export function isMcpStationSlug(slug: unknown): slug is string {
  return typeof slug === "string" && SLUG_RE.test(slug);
}

/** The MCP endpoint for a catalog slug. Throws for anything that is not a plain slug. */
export function mcpStationEndpoint(slug: string): string {
  if (!isMcpStationSlug(slug)) throw new Error("Not a valid MCP Station server id");
  return `${MCP_STATION_ORIGIN}/mcp/${slug}`;
}

/** True only for an https MCP Station `/mcp/<slug>` URL with no credentials, port, query or fragment. */
export function isMcpStationEndpoint(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || !HOSTS.has(u.hostname) || u.port || u.username || u.password || u.search || u.hash) return false;
  const m = /^\/mcp\/([^/]+)$/.exec(u.pathname);
  return !!m && isMcpStationSlug(m[1]);
}
