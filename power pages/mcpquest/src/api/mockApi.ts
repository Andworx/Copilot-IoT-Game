import type { CallResult, ToolDef } from "@mcpquest/types";
import { createLocalApi } from "./localApi";
import type { Incident, World, WorldData } from "@mcpquest/api/world";

/**
 * Offline "preview" world: a seeded incident dataset and simulated tools, with no MCP
 * connection at all. Used when MCP Station is unreachable or with `?api=preview`.
 * Data and tool names intentionally mimic the public MCP Station `it-ticketing` server.
 */


const INCIDENTS: Incident[] = [
  row(1, "Production database server unresponsive", "In Progress", "1", "Database", "Marcus Chen", "Priya Sharma", "Database Support", "2026-10-08T14:45:00Z"),
  row(2, "Email delivery delayed for finance", "New", "3", "Email", "Aisha Rahman", "Unassigned", "Service Desk", "2026-10-08T15:10:00Z"),
  row(3, "Network connectivity issues in Building C", "Resolved", "1", "Network", "Tom O'Brien", "Jennifer Kowalski", "Network Operations", "2026-10-07T08:15:00Z"),
  row(4, "Urgent: potential security breach detected", "In Progress", "1", "Security", "Sam Ortiz", "Dmitri Volkov", "Security Incident Response", "2026-10-08T16:20:00Z"),
  row(5, "VPN drops every 30 minutes", "In Progress", "2", "Network", "Lena Fischer", "Jennifer Kowalski", "Network Operations", "2026-10-08T09:00:00Z"),
  row(6, "Payroll report fails to generate", "New", "2", "Application", "Aisha Rahman", "Lena Fischer", "Application Support", "2026-10-08T11:30:00Z"),
  row(7, "Laptop battery swelling", "Resolved", "3", "Hardware", "Sam Ortiz", "Aisha Rahman", "Service Desk", "2026-10-06T13:05:00Z"),
  row(8, "Backup job failed overnight", "In Progress", "2", "Database", "Marcus Chen", "Priya Sharma", "Database Support", "2026-10-09T02:10:00Z"),
  row(9, "Phishing email reported by HR", "Closed", "2", "Security", "Tom O'Brien", "Dmitri Volkov", "Security Incident Response", "2026-10-05T10:40:00Z"),
  row(10, "Printer queue stuck on floor 4", "Closed", "4", "Hardware", "Lena Fischer", "Aisha Rahman", "Service Desk", "2026-10-04T16:00:00Z"),
  row(11, "CRM login loop after SSO change", "New", "1", "Application", "Sam Ortiz", "Lena Fischer", "Application Support", "2026-10-09T07:50:00Z"),
  row(12, "Replication lag on reporting database", "In Progress", "2", "Database", "Tom O'Brien", "Priya Sharma", "Database Support", "2026-10-08T22:25:00Z"),
  row(13, "Wi-Fi dead zone in lobby", "New", "4", "Network", "Aisha Rahman", "Jennifer Kowalski", "Network Operations", "2026-10-09T08:30:00Z"),
  row(14, "Certificate expiring on intranet", "In Progress", "1", "Security", "Marcus Chen", "Dmitri Volkov", "Security Incident Response", "2026-10-09T06:15:00Z"),
];

function row(
  n: number,
  shortDescription: string,
  state: Incident["state"],
  priority: Incident["priority"],
  category: string,
  caller_name: string,
  assignedTo_name: string,
  assignmentGroup_name: string,
  createdAt: string,
): Incident {
  return {
    incidentId: `INC-${String(n).padStart(6, "0")}`,
    shortDescription,
    state,
    priority,
    category,
    caller_name,
    assignedTo_name,
    assignmentGroup_name,
    createdAt,
  };
}

const USERS = [
  { userId: "USR-001", name: "Priya Sharma", department: "Database Support" },
  { userId: "USR-002", name: "Jennifer Kowalski", department: "Network Operations" },
  { userId: "USR-003", name: "Dmitri Volkov", department: "Security Incident Response" },
  { userId: "USR-004", name: "Aisha Rahman", department: "Service Desk" },
  { userId: "USR-005", name: "Lena Fischer", department: "Application Support" },
  { userId: "USR-006", name: "Marcus Chen", department: "Finance" },
  { userId: "USR-007", name: "Tom O'Brien", department: "Human Resources" },
  { userId: "USR-008", name: "Sam Ortiz", department: "Sales" },
];

const GROUPS = [...new Set(INCIDENTS.map((i) => i.assignmentGroup_name))].map((name, idx) => ({
  groupId: `GRP-${String(idx + 1).padStart(3, "0")}`,
  name,
}));

const TOOLS: ToolDef[] = [
  {
    name: "list_incidents",
    description: "List incidents, optionally filtered by state, priority, category or assignment group.",
    inputSchema: {
      type: "object",
      properties: {
        state: { type: "string", enum: ["New", "In Progress", "Resolved", "Closed"], description: "Incident state" },
        priority: { type: "string", enum: ["1", "2", "3", "4"], description: "1 is most urgent" },
        category: { type: "string", description: "For example Database, Network, Security" },
        assignment_group: { type: "string", description: "Exact assignment group name" },
        limit: { type: "integer", minimum: 1, maximum: 25, default: 10, description: "Page size" },
        offset: { type: "integer", minimum: 0, default: 0, description: "Records to skip" },
      },
    },
  },
  {
    name: "get_incident",
    description: "Get the full record for one incident by its id, such as INC-000001.",
    inputSchema: {
      type: "object",
      properties: { incident_id: { type: "string", description: "Incident id" } },
      required: ["incident_id"],
    },
  },
  {
    name: "list_users",
    description: "List people, optionally filtered by department or part of a name.",
    inputSchema: {
      type: "object",
      properties: {
        department: { type: "string", description: "Exact department name" },
        name_contains: { type: "string", description: "Case-insensitive name fragment" },
      },
    },
  },
  {
    name: "list_assignment_groups",
    description: "List the support teams incidents can be assigned to.",
    inputSchema: { type: "object", properties: {} },
  },
];

// ---- tool execution -----------------------------------------------------------------

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function runTool(tool: string, args: Record<string, unknown>): CallResult {
  const ok = (body: unknown): CallResult => ({ text: JSON.stringify(body), isError: false });

  switch (tool) {
    case "list_incidents": {
      const state = str(args.state)?.toLowerCase();
      const priority = str(args.priority);
      const category = str(args.category)?.toLowerCase();
      const group = str(args.assignment_group)?.toLowerCase();
      const limit = Math.min(25, Math.max(1, Math.trunc(num(args.limit, 10))));
      const offset = Math.max(0, Math.trunc(num(args.offset, 0)));
      const filtered = INCIDENTS.filter(
        (i) =>
          (!state || i.state.toLowerCase() === state) &&
          (!priority || i.priority === priority) &&
          (!category || i.category.toLowerCase() === category) &&
          (!group || i.assignmentGroup_name.toLowerCase() === group),
      );
      return ok({ data: filtered.slice(offset, offset + limit), total: filtered.length, limit, offset });
    }
    case "get_incident": {
      const id = str(args.incident_id)?.toUpperCase();
      const found = INCIDENTS.find((i) => i.incidentId === id);
      return ok(found ? { ...found, comments: [] } : { error: "Record not found" });
    }
    case "list_users": {
      const dept = str(args.department)?.toLowerCase();
      const frag = str(args.name_contains)?.toLowerCase();
      const data = USERS.filter(
        (u) => (!dept || u.department.toLowerCase() === dept) && (!frag || u.name.toLowerCase().includes(frag)),
      );
      return ok({ data, total: data.length, limit: 25, offset: 0 });
    }
    case "update_incident": {
      const id = str(args.incident_id)?.toUpperCase();
      const found = INCIDENTS.find((i) => i.incidentId === id);
      if (!found) return ok({ error: "Record not found" });
      return ok({
        incident_id: found.incidentId,
        ...Object.fromEntries(Object.entries(args).filter(([k]) => k !== "incident_id")),
        message: "Incident updated successfully",
        _mock: true,
        _note: "This is a simulated response. No data was actually modified.",
      });
    }
    case "create_incident": {
      const required = ["short_description", "category", "priority", "caller_id"];
      const missing = required.find((k) => !str(args[k]));
      if (missing) return ok({ error: `Missing required field: ${missing}` });
      return ok({
        id: "INC-000099",
        status: "New",
        message: "Incident created successfully",
        _mock: true,
        _note: "This is a simulated response. No data was actually modified.",
      });
    }
    case "add_comment":
      return ok({
        commentId: `CMT-${Date.now().toString(36)}`,
        incident_id: str(args.incident_id) ?? null,
        message: "Comment added successfully",
        _mock: true,
        _note: "This is a simulated response. No data was actually modified.",
      });
    case "list_assignment_groups":
      return ok({ data: GROUPS, total: GROUPS.length, limit: 25, offset: 0 });
    default:
      return { text: JSON.stringify({ error: `Unknown tool: ${tool}` }), isError: true };
  }
}

// ---- world ----------------------------------------------------------------------------

const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

const data: WorldData = {
  incidents: INCIDENTS,
  userTotal: USERS.length,
  authorId: USERS[0].userId,
  groups: GROUPS.map((g) => ({ id: g.groupId, name: g.name })),
};

const mockWorld: World = {
  tools: TOOLS,
  data,
  async run(tool, args) {
    await delay(120 + Math.random() * 180);
    return runTool(tool, args);
  },
};

export function createMockApi() {
  return createLocalApi("preview", async () => mockWorld);
}
