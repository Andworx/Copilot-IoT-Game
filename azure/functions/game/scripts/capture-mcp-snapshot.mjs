#!/usr/bin/env node
/**
 * Captures a repo snapshot of an MCP server for MCP Quest.
 *
 *   node scripts/capture-mcp-snapshot.mjs <mcp-url> <output.json> [version]
 *
 * The judge runs from this snapshot instead of the live server so that cases, answer keys
 * and test runs are deterministic, work offline, and do not depend on a third-party host
 * during an event. Only read tools are called; nothing is written to the server.
 */
import { writeFileSync } from "node:fs";

const [url, output, versionArg] = process.argv.slice(2);
if (!url || !output) {
  console.error("Usage: node scripts/capture-mcp-snapshot.mjs <mcp-url> <output.json> [version]");
  process.exit(2);
}

let id = 0;
async function rpc(method, params) {
  id += 1;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, ...(params ? { params } : {}) }),
  });
  if (!response.ok) throw new Error(`${method} failed: HTTP ${response.status}`);
  const body = await response.json();
  if (body.error) throw new Error(`${method} failed: ${body.error.message}`);
  return body.result;
}

async function call(name, args) {
  const result = await rpc("tools/call", { name, arguments: args });
  const text = (result.content ?? []).map((c) => c.text ?? "").join("\n");
  return JSON.parse(text);
}

async function listAll(name, extra = {}) {
  const rows = [];
  for (let page = 0; page < 20; page += 1) {
    const body = await call(name, { limit: 100, offset: rows.length, ...extra });
    rows.push(...(body.data ?? []));
    if (!body.hasMore || (body.data ?? []).length === 0) break;
  }
  return rows;
}

const init = await rpc("initialize", {
  protocolVersion: "2025-03-26",
  capabilities: {},
  clientInfo: { name: "mcp-quest-snapshot", version: "1" },
});
const { tools } = await rpc("tools/list");

const incidents = await listAll("list_incidents");
const users = await listAll("list_users");
const groups = await listAll("list_assignment_groups");

const details = {};
for (const incident of incidents) {
  const detail = await call("get_incident", { incident_id: incident.incidentId });
  if (!detail.error) details[incident.incidentId] = detail;
}

const capturedAt = new Date().toISOString();
const snapshot = {
  version: versionArg ?? `${new URL(url).pathname.split("/").pop()}@${capturedAt.slice(0, 10)}`,
  source: url,
  capturedAt,
  server: { name: init.serverInfo?.name ?? "MCP server", protocolVersion: init.protocolVersion },
  tools,
  incidents,
  details,
  users,
  groups,
};

writeFileSync(output, JSON.stringify(snapshot, null, 2) + "\n");
console.log(
  `Captured ${snapshot.version}: ${tools.length} tools, ${incidents.length} incidents, ${users.length} users, ${groups.length} groups -> ${output}`,
);
