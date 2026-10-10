import type { CallResult } from "./types";
import { playerTools, type RawTool } from "./api/mcpTools";
import type { Incident, World, WorldData } from "./api/world";
import itTicketing from "./snapshots/it-ticketing.json";

/**
 * A repo snapshot of an MCP server, and a `World` that replays it.
 *
 * The prize-eligible judge runs from this, not the live server: cases, answer keys and test
 * runs are deterministic, work offline, and do not depend on a third-party host on the day.
 * Reads are served from the snapshot. Writes are simulated the same way the public server
 * simulates them (a success response, nothing changes), so a write in a test run is a
 * truthful "no data was modified".
 */

export interface McpSnapshot {
  version: string;
  source: string;
  capturedAt: string;
  server: { name: string; protocolVersion: string };
  tools: RawTool[];
  incidents: Record<string, unknown>[];
  details: Record<string, Record<string, unknown>>;
  users: Record<string, unknown>[];
  groups: Record<string, unknown>[];
}

export const SNAPSHOTS: Record<string, McpSnapshot> = {
  "it-ticketing": itTicketing as unknown as McpSnapshot,
};

export const DEFAULT_SNAPSHOT = "it-ticketing";

const NOTE = "This is a simulated response. No data was actually modified.";

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asIncident(row: Record<string, unknown>): Incident {
  const text = (k: string) => (typeof row[k] === "string" ? (row[k] as string) : "");
  return {
    incidentId: text("incidentId"),
    shortDescription: text("shortDescription"),
    state: text("state"),
    priority: text("priority"),
    category: text("category"),
    caller_name: text("caller_name"),
    assignedTo_name: text("assignedTo_name"),
    assignmentGroup_name: text("assignmentGroup_name"),
    createdAt: text("createdAt") || undefined,
  };
}

/** Builds the facts the case builders need from a snapshot. */
export function snapshotData(snapshot: McpSnapshot): WorldData {
  const firstUser = snapshot.users.find((u) => typeof u.userId === "string");
  return {
    incidents: snapshot.incidents.map(asIncident).filter((i) => i.incidentId && i.shortDescription),
    userTotal: snapshot.users.length,
    authorId: firstUser ? String(firstUser.userId) : undefined,
    groups: snapshot.groups
      .filter((g) => typeof g.groupId === "string" && typeof g.name === "string")
      .map((g) => ({ id: String(g.groupId), name: String(g.name) })),
  };
}

function page(rows: Record<string, unknown>[], args: Record<string, unknown>) {
  const limit = Math.min(100, Math.max(1, Math.trunc(num(args.limit, 10))));
  const offset = Math.max(0, Math.trunc(num(args.offset, 0)));
  const data = rows.slice(offset, offset + limit);
  return { data, total: rows.length, limit, offset, hasMore: offset + data.length < rows.length };
}

export function createSnapshotWorld(snapshot: McpSnapshot): World {
  const data = snapshotData(snapshot);
  const groupName = new Map(snapshot.groups.map((g) => [String(g.groupId), String(g.name)]));
  const userName = new Map(snapshot.users.map((u) => [String(u.userId), String(u.name)]));

  const ok = (body: unknown): CallResult => ({ text: JSON.stringify(body), isError: false });
  const missing = (field: string): CallResult => ok({ error: `Missing required field: ${field}` });

  function run(tool: string, args: Record<string, unknown>): CallResult {
    switch (tool) {
      case "list_incidents": {
        const state = str(args.state)?.toLowerCase();
        const priority = str(args.priority);
        const category = str(args.category)?.toLowerCase();
        const group = str(args.assignment_group_id);
        const caller = str(args.caller_id);
        const assignee = str(args.assigned_to_id);
        const rows = snapshot.incidents.filter((row) => {
          const rowState = String(row.state ?? "").toLowerCase();
          if (state && rowState !== state && rowState.replace(/\s+v\d+$/, "") !== state) return false;
          if (priority && row.priority !== priority) return false;
          if (category && String(row.category ?? "").toLowerCase() !== category) return false;
          if (group && row.assignmentGroup_name !== groupName.get(group)) return false;
          if (caller && row.caller_name !== userName.get(caller)) return false;
          if (assignee && row.assignedTo_name !== userName.get(assignee)) return false;
          return true;
        });
        return ok(page(rows, args));
      }
      case "get_incident": {
        const id = str(args.incident_id)?.toUpperCase();
        if (!id) return missing("incident_id");
        const detail = snapshot.details[id] ?? snapshot.incidents.find((r) => r.incidentId === id);
        return ok(detail ?? { error: "Record not found" });
      }
      case "list_users": {
        const dept = str(args.department)?.toLowerCase();
        const frag = str(args.name_contains)?.toLowerCase();
        const rows = snapshot.users.filter(
          (u) =>
            (!dept || String(u.department ?? "").toLowerCase() === dept) &&
            (!frag || String(u.name ?? "").toLowerCase().includes(frag)),
        );
        return ok(page(rows, args));
      }
      case "get_user": {
        const id = str(args.user_id);
        if (!id) return missing("user_id");
        return ok(snapshot.users.find((u) => u.userId === id) ?? { error: "Record not found" });
      }
      case "list_assignment_groups": {
        const dept = str(args.department)?.toLowerCase();
        const rows = snapshot.groups.filter((g) => !dept || String(g.department ?? "").toLowerCase() === dept);
        return ok(page(rows, args));
      }
      case "get_assignment_group": {
        const id = str(args.group_id);
        if (!id) return missing("group_id");
        return ok(snapshot.groups.find((g) => g.groupId === id) ?? { error: "Record not found" });
      }
      case "create_incident": {
        for (const field of ["caller_id", "short_description", "category", "priority"]) {
          if (!str(args[field])) return missing(field);
        }
        return ok({
          id: `INC-${String(snapshot.incidents.length + 1).padStart(6, "0")}`,
          status: "New",
          created_at: "2026-01-01T00:00:00.000Z",
          message: "Incident created successfully",
          _mock: true,
          _note: NOTE,
        });
      }
      case "update_incident": {
        const id = str(args.incident_id)?.toUpperCase();
        if (!id) return missing("incident_id");
        if (!snapshot.incidents.some((r) => r.incidentId === id)) return ok({ error: "Record not found" });
        const { incident_id: _ignored, ...changes } = args;
        return ok({ incident_id: id, ...changes, message: "Incident updated successfully", _mock: true, _note: NOTE });
      }
      case "add_comment": {
        for (const field of ["incident_id", "author_id", "text", "type"]) {
          if (!str(args[field])) return missing(field);
        }
        return ok({ message: "Comment created successfully", _mock: true, _note: NOTE });
      }
      default:
        return { text: JSON.stringify({ error: `Unknown tool: ${tool}` }), isError: true };
    }
  }

  return {
    tools: playerTools(snapshot.tools),
    data,
    mcpServer: {
      name: snapshot.server.name,
      url: snapshot.source,
      protocolVersion: snapshot.server.protocolVersion,
      toolCount: playerTools(snapshot.tools).length,
      totalToolCount: snapshot.tools.length,
    },
    async run(tool, args) {
      return run(tool, args);
    },
  };
}
