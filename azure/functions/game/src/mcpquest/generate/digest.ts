import { toToolDef, type RawTool } from "../api/mcpTools";
import { mcpStationEndpoint } from "../mcpstation";
import type { ToolDef } from "../types";

/**
 * What the generator reads from an MCP Station server: every tool (so specs can reference
 * write tools, which MCP Station simulates) and a small sample of read-only data.
 *
 * The sample is untrusted text that ends up in a prompt. It is clipped here and fenced as
 * data in the prompt (see prompt.ts); nothing in it is ever treated as an instruction.
 */
export interface ServerDigest {
  slug: string;
  serverName: string;
  tools: ToolDef[];
  /** Names of the tools MCP Station marks read-only. */
  readOnlyTools: string[];
  samples: { tool: string; args: Record<string, unknown>; text: string }[];
}

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

export const SAMPLE_LIMITS = { tools: 4, records: 5, chars: 1500, tool_names: 40 } as const;

async function rpc(fetchFn: FetchLike, url: string, id: number, method: string, params?: unknown): Promise<any> {
  const response = await fetchFn(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, ...(params ? { params } : {}) }),
  });
  if (!response.ok) throw new Error(`MCP ${method} failed: HTTP ${response.status}`);
  const body = (await response.json()) as { result?: unknown; error?: { message?: string } };
  if (body.error) throw new Error(`MCP ${method} failed: ${body.error.message ?? "error"}`);
  return body.result;
}

/** Reads tools and a few records from `https://www.mcpstation.io/mcp/<slug>` and nothing else. */
export async function fetchServerDigest(slug: string, fetchFn: FetchLike): Promise<ServerDigest> {
  const url = mcpStationEndpoint(slug);
  let id = 0;
  const init = await rpc(fetchFn, url, ++id, "initialize", {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "mcp-quest-generator", version: "1" },
  });
  const listed = await rpc(fetchFn, url, ++id, "tools/list");
  const raw = (Array.isArray(listed?.tools) ? listed.tools : []).slice(0, SAMPLE_LIMITS.tool_names) as RawTool[];

  const tools = raw.map(toToolDef).filter((t): t is ToolDef => t !== null);
  const readOnlyTools = raw.filter((t) => t.annotations?.readOnlyHint === true && typeof t.name === "string").map((t) => t.name as string);

  // Sample only read-only tools that need no arguments (apart from paging) so the call is safe and generic.
  const samples: ServerDigest["samples"] = [];
  for (const name of readOnlyTools) {
    if (samples.length >= SAMPLE_LIMITS.tools) break;
    const def = tools.find((t) => t.name === name);
    if (!def || (def.inputSchema.required ?? []).length > 0) continue;
    const args: Record<string, unknown> = "limit" in def.inputSchema.properties ? { limit: SAMPLE_LIMITS.records } : {};
    try {
      const result = await rpc(fetchFn, url, ++id, "tools/call", { name, arguments: args });
      const text = ((result?.content ?? []) as { text?: unknown }[]).map((c) => (typeof c.text === "string" ? c.text : "")).join("\n");
      samples.push({ tool: name, args, text: text.slice(0, SAMPLE_LIMITS.chars) });
    } catch {
      // A tool that errors is simply left out of the sample.
    }
  }

  const serverInfo = init?.serverInfo as { name?: unknown } | undefined;
  return { slug, serverName: typeof serverInfo?.name === "string" ? serverInfo.name.slice(0, 80) : slug, tools, readOnlyTools, samples };
}
