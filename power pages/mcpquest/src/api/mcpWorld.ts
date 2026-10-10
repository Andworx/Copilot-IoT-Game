import type { CallResult, WireTrace } from "@mcpquest/types";
import { playerTools, type RawTool } from "@mcpquest/api/mcpTools";
import { createLocalApi } from "./localApi";
import type { Incident, World, WorldData } from "@mcpquest/api/world";

/**
 * Real MCP backend. The browser speaks JSON-RPC 2.0 over HTTP straight to an MCP server
 * (`initialize`, `tools/list`, `tools/call`). Questions and their answer keys are derived
 * from the server's own data at the start of each play, so they stay consistent with it.
 *
 * Scoring still happens in the browser, so this is a prototyping path, not a prize path.
 * The server contract was checked against the public MCP Station `it-ticketing` server;
 * the question builders in `modes.ts` rely on the incident fields listed in `Incident`.
 */

interface RpcOutcome {
  request: unknown;
  response: Record<string, unknown>;
  ms: number;
}

let rpcCounter = 0;

async function rpc(url: string, method: string, params?: unknown): Promise<RpcOutcome> {
  rpcCounter += 1;
  const request = { jsonrpc: "2.0", id: rpcCounter, method, ...(params === undefined ? {} : { params }) };
  const began = performance.now();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(`MCP server answered HTTP ${res.status}`);
  const response = (await res.json()) as Record<string, unknown>;
  return { request, response, ms: Math.round(performance.now() - began) };
}

function resultOf(outcome: RpcOutcome): Record<string, unknown> {
  const error = outcome.response.error as { message?: unknown } | undefined;
  if (error) throw new Error(typeof error.message === "string" ? error.message : "MCP error");
  const result = outcome.response.result;
  if (typeof result !== "object" || result === null) throw new Error("MCP server returned no result");
  return result as Record<string, unknown>;
}

function textOf(result: Record<string, unknown>): string {
  const content = result.content;
  if (!Array.isArray(content)) return JSON.stringify(result);
  return content
    .map((part) => (typeof part === "object" && part && "text" in part ? String((part as { text: unknown }).text) : ""))
    .filter(Boolean)
    .join("\n");
}

// ---- incidents ----------------------------------------------------------------------

function asIncident(value: unknown): Incident | null {
  if (typeof value !== "object" || value === null) return null;
  const r = value as Record<string, unknown>;
  const need = ["incidentId", "shortDescription", "state", "priority", "category"] as const;
  if (!need.every((k) => typeof r[k] === "string" && (r[k] as string).length > 0)) return null;
  const optional = (k: string) => (typeof r[k] === "string" ? (r[k] as string) : "");
  return {
    incidentId: r.incidentId as string,
    shortDescription: r.shortDescription as string,
    state: r.state as string,
    priority: r.priority as string,
    category: r.category as string,
    caller_name: optional("caller_name"),
    assignedTo_name: optional("assignedTo_name"),
    assignmentGroup_name: optional("assignmentGroup_name"),
  };
}

async function fetchIncidents(url: string): Promise<Incident[]> {
  const all: Incident[] = [];
  for (let page = 0; page < 10; page += 1) {
    const outcome = await rpc(url, "tools/call", {
      name: "list_incidents",
      arguments: { limit: 100, offset: all.length },
    });
    const result = resultOf(outcome);
    const body = JSON.parse(textOf(result)) as { data?: unknown[]; hasMore?: unknown };
    const rows = (body.data ?? []).map(asIncident).filter((i): i is Incident => i !== null);
    all.push(...rows);
    if (!body.hasMore || rows.length === 0) break;
  }
  return all;
}

// ---- world --------------------------------------------------------------------------

async function loadMcpWorld(url: string): Promise<World> {
  const init = resultOf(
    await rpc(url, "initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "mcp-quest-player", version: "0.1.0" },
    }),
  );
  const serverInfo = (init.serverInfo ?? {}) as { name?: unknown };

  const listed = resultOf(await rpc(url, "tools/list"));
  const rawTools = (Array.isArray(listed.tools) ? listed.tools : []) as RawTool[];
  const tools = playerTools(rawTools);
  if (!tools.some((t) => t.name === "list_incidents")) {
    throw new Error("This MCP server does not expose list_incidents, so no questions can be built.");
  }

  const incidents = await fetchIncidents(url);
  const users = JSON.parse(
    textOf(resultOf(await rpc(url, "tools/call", { name: "list_users", arguments: { limit: 1 } }))),
  ) as { total?: unknown; data?: { userId?: unknown }[] };
  const groupsBody = JSON.parse(
    textOf(resultOf(await rpc(url, "tools/call", { name: "list_assignment_groups", arguments: { limit: 100 } }))),
  ) as { data?: { groupId?: unknown; name?: unknown }[] };
  const groups = (groupsBody.data ?? [])
    .filter((g): g is { groupId: string; name: string } => typeof g.groupId === "string" && typeof g.name === "string")
    .map((g) => ({ id: g.groupId, name: g.name }));
  const data: WorldData = {
    groups,
    incidents,
    userTotal: typeof users.total === "number" ? users.total : 0,
    authorId: typeof users.data?.[0]?.userId === "string" ? users.data[0].userId : undefined,
  };

  return {
    tools,
    data,
    mcpServer: {
      name: typeof serverInfo.name === "string" ? serverInfo.name : "MCP server",
      url,
      protocolVersion: typeof init.protocolVersion === "string" ? init.protocolVersion : "unknown",
      toolCount: tools.length,
      totalToolCount: rawTools.length,
    },
    async run(tool, args): Promise<CallResult> {
      const outcome = await rpc(url, "tools/call", { name: tool, arguments: args });
      const wire: WireTrace = { request: outcome.request, response: outcome.response };
      const error = outcome.response.error as { message?: unknown } | undefined;
      if (error) {
        return { text: JSON.stringify({ error: String(error.message ?? "MCP error") }), isError: true, wire };
      }
      const result = outcome.response.result as Record<string, unknown> | undefined;
      if (!result) return { text: JSON.stringify({ error: "Empty MCP result" }), isError: true, wire };
      return { text: textOf(result), isError: result.isError === true, wire };
    },
  };
}

export function createMcpApi(url: string) {
  return createLocalApi("mcp", () => loadMcpWorld(url));
}
