import { MCP_STATION_CATALOG_URL, isMcpStationSlug } from "../mcpstation";

/**
 * The MCP Station catalog, as far as the console needs it: which servers a visitor may pick.
 * Only servers the catalog lists can be generated, so a slug that merely looks valid but is not
 * in the catalog is refused before anything is read or any model is called.
 */

export interface CatalogServer {
  slug: string;
  name: string;
  description: string;
  toolCount: number;
}

const TTL_MS = 10 * 60 * 1000;
const MAX_SERVERS = 100;

export interface CatalogClient {
  list(): Promise<CatalogServer[]>;
  has(slug: string): Promise<boolean>;
}

export function parseCatalog(body: unknown): CatalogServer[] {
  const rows = Array.isArray(body) ? body : [];
  const out: CatalogServer[] = [];
  for (const row of rows.slice(0, MAX_SERVERS)) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (!isMcpStationSlug(r.slug)) continue;
    const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
    out.push({
      slug: r.slug,
      name: text(r.name, 80) || r.slug,
      description: text(r.public_description ?? r.description, 240),
      toolCount: Array.isArray(r.tools) ? r.tools.length : 0,
    });
  }
  return out;
}

export function createCatalogClient(options: { fetchFn?: typeof fetch; now?: () => number } = {}): CatalogClient {
  const doFetch = options.fetchFn ?? fetch;
  const now = options.now ?? (() => Date.now());
  let cached: { at: number; servers: CatalogServer[] } | null = null;

  async function load(): Promise<CatalogServer[]> {
    if (cached && now() - cached.at < TTL_MS) return cached.servers;
    try {
      const response = await doFetch(MCP_STATION_CATALOG_URL, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const servers = parseCatalog(await response.json());
      if (servers.length === 0) throw new Error("empty catalog");
      cached = { at: now(), servers };
      return servers;
    } catch (error) {
      // A stale list beats no list while MCP Station is briefly unreachable.
      if (cached) return cached.servers;
      throw error;
    }
  }

  return {
    list: load,
    async has(slug) {
      return (await load()).some((s) => s.slug === slug);
    },
  };
}
