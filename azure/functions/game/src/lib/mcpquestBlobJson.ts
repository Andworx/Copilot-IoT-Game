import type { JsonBlobs, Precondition } from "../mcpquest/generate/jobs";
import { isBlobContainerUrl } from "./mcpquestSpecStore";

/**
 * JSON documents in a blob container, over the Blob REST API with the Function App's managed
 * identity. `put` uses the blob's ETag as the precondition, which is what makes the rate-limit
 * counters and the per-server lock safe across Function instances.
 */

const BLOB_API_VERSION = "2023-11-03";

export function blobJson(config: { containerUrl: string; getToken: () => Promise<string>; fetchFn?: typeof fetch }): JsonBlobs {
  if (!isBlobContainerUrl(config.containerUrl)) {
    throw new Error("MCPQUEST_SPEC_BLOB_URL must look like https://<account>.blob.core.windows.net/<container>");
  }
  const base = config.containerUrl.replace(/\/$/, "");
  const doFetch = config.fetchFn ?? fetch;
  const SAFE_PATH = /^[a-z0-9][a-z0-9/_.=-]{0,150}\.json$/i;

  const url = (path: string) => {
    if (!SAFE_PATH.test(path) || path.includes("..") || path.includes("//")) throw new Error("Invalid blob path");
    return `${base}/${path}`;
  };

  return {
    async get(path) {
      const response = await doFetch(url(path), {
        headers: { Authorization: `Bearer ${await config.getToken()}`, "x-ms-version": BLOB_API_VERSION },
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Blob read failed: HTTP ${response.status}`);
      const etag = response.headers.get("etag") ?? "";
      try {
        return { value: JSON.parse(await response.text()) as unknown, etag };
      } catch {
        return null;
      }
    },

    async put(path, value, condition: Precondition) {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${await config.getToken()}`,
        "x-ms-version": BLOB_API_VERSION,
        "x-ms-blob-type": "BlockBlob",
        "Content-Type": "application/json",
      };
      if ("create" in condition) headers["If-None-Match"] = "*";
      else if ("etag" in condition) headers["If-Match"] = condition.etag;
      const response = await doFetch(url(path), { method: "PUT", headers, body: JSON.stringify(value) });
      // 412 precondition failed, 409 blob already exists / lease conflict: someone else won.
      if (response.status === 412 || response.status === 409) return false;
      if (!response.ok) throw new Error(`Blob write failed: HTTP ${response.status}`);
      return true;
    },
  };
}
