import { computeSpecId, computeToolsHash, validateGameSpec } from "../mcpquest/gamespec";
import type { SpecReader, SpecStore, StoredSpec } from "../mcpquest/generate/service";
import { isMcpStationSlug } from "../mcpquest/mcpstation";

/**
 * Blob storage for generated specs, over the Blob REST API with the Function App's managed
 * identity (no storage SDK, no keys). Layout inside the container:
 *
 *   by-id/<specId>.json                 what a play reads
 *   by-hash/<slug>/<toolsHash>.json     what the generator checks before calling the model
 *
 * Whatever comes back is treated as untrusted: it is re-validated against its own tool list
 * and its id is recomputed, so a blob edited by hand cannot change what a play judges.
 */

const CONTAINER_URL_RE = /^https:\/\/[a-z0-9]{3,24}\.blob\.core\.windows\.net\/[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/;
const SPEC_ID_RE = /^[0-9a-f]{16}$/;
const HASH_RE = /^[0-9a-f]{16}$/;
const BLOB_API_VERSION = "2023-11-03";
const MAX_BLOB_CHARS = 1_000_000;

export interface BlobSpecStoreConfig {
  /** `https://<account>.blob.core.windows.net/<container>` (app setting MCPQUEST_SPEC_BLOB_URL). */
  containerUrl: string;
  getToken: () => Promise<string>;
  fetchFn?: typeof fetch;
}

export function isBlobContainerUrl(url: string): boolean {
  return CONTAINER_URL_RE.test(url);
}

/** Entra token for Azure Storage from the Function App's managed identity. */
export async function storageToken(env: NodeJS.ProcessEnv = process.env, fetchFn: typeof fetch = fetch): Promise<string> {
  const endpoint = env.IDENTITY_ENDPOINT;
  const header = env.IDENTITY_HEADER;
  if (!endpoint || !header) throw new Error("No managed identity is available for blob storage");
  const url = new URL(endpoint);
  url.searchParams.set("resource", "https://storage.azure.com/");
  url.searchParams.set("api-version", "2019-08-01");
  const response = await fetchFn(url, { headers: { "X-IDENTITY-HEADER": header } });
  if (!response.ok) throw new Error(`Managed identity token request failed: HTTP ${response.status}`);
  const body = (await response.json()) as { access_token?: unknown };
  if (typeof body.access_token !== "string") throw new Error("Managed identity returned no token");
  return body.access_token;
}

function parseSamples(value: unknown): StoredSpec["samples"] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((s): s is { tool: string; text: string } => !!s && typeof s.tool === "string" && typeof s.text === "string")
    .slice(0, 8)
    .map((s) => ({ tool: s.tool.slice(0, 64), text: s.text.slice(0, 4000) }));
}

/** Returns the stored spec only if it is intact: well-formed, valid for its tools, id matches. */
export function parseStoredSpec(json: unknown): StoredSpec | null {
  if (!json || typeof json !== "object") return null;
  const raw = json as Record<string, unknown>;
  if (!Array.isArray(raw.tools) || typeof raw.specId !== "string" || !SPEC_ID_RE.test(raw.specId)) return null;
  const tools = raw.tools as StoredSpec["tools"];
  const checked = validateGameSpec(raw.spec, { tools, bindToTools: true, requireReference: true });
  if (!checked.ok) return null;
  if (computeSpecId(checked.spec) !== raw.specId) return null;
  if (computeToolsHash(tools) !== checked.spec.server.toolsHash || raw.toolsHash !== checked.spec.server.toolsHash) return null;
  return {
    specId: raw.specId,
    toolsHash: checked.spec.server.toolsHash,
    spec: checked.spec,
    tools,
    samples: parseSamples(raw.samples),
    validated: raw.validated === true,
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : 0,
  };
}

export function blobSpecStore(config: BlobSpecStoreConfig): SpecStore & SpecReader {
  if (!isBlobContainerUrl(config.containerUrl)) {
    throw new Error("MCPQUEST_SPEC_BLOB_URL must look like https://<account>.blob.core.windows.net/<container>");
  }
  const base = config.containerUrl.replace(/\/$/, "");
  const doFetch = config.fetchFn ?? fetch;

  async function headers(extra: Record<string, string> = {}): Promise<Record<string, string>> {
    return { Authorization: `Bearer ${await config.getToken()}`, "x-ms-version": BLOB_API_VERSION, ...extra };
  }

  async function read(path: string): Promise<StoredSpec | null> {
    const response = await doFetch(`${base}/${path}`, { headers: await headers() });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Spec store read failed: HTTP ${response.status}`);
    const text = await response.text();
    if (text.length > MAX_BLOB_CHARS) return null;
    try {
      return parseStoredSpec(JSON.parse(text));
    } catch {
      return null;
    }
  }

  async function write(path: string, body: string): Promise<void> {
    const response = await doFetch(`${base}/${path}`, {
      method: "PUT",
      headers: await headers({ "x-ms-blob-type": "BlockBlob", "Content-Type": "application/json" }),
      body,
    });
    if (!response.ok) throw new Error(`Spec store write failed: HTTP ${response.status}`);
  }

  return {
    async get(slug, toolsHash) {
      if (!isMcpStationSlug(slug) || !HASH_RE.test(toolsHash)) return null;
      return read(`by-hash/${slug}/${toolsHash}.json`);
    },
    async getById(specId) {
      if (!SPEC_ID_RE.test(specId)) return null;
      return read(`by-id/${specId}.json`);
    },
    async put(slug, stored) {
      if (!isMcpStationSlug(slug) || !HASH_RE.test(stored.toolsHash) || !SPEC_ID_RE.test(stored.specId)) {
        throw new Error("Refusing to store a spec with an invalid slug or id");
      }
      const body = JSON.stringify(stored);
      // Id first: a play can only be started from an id the generator has already finished storing.
      await write(`by-id/${stored.specId}.json`, body);
      await write(`by-hash/${slug}/${stored.toolsHash}.json`, body);
    },
  };
}
