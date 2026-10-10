import type { DesignCatalog, ReportField } from "./types";

/**
 * The two designers' data models and palettes. A design is plain JSON so it can be sent to
 * the judge as-is (it travels in `answers[objectiveId]`).
 */

// ---- Flow (Power Automate) ------------------------------------------------------------

export type TriggerKind = "incident-created" | "recurrence" | "manual";

export type StepKind =
  | "condition"
  | "list-incidents"
  | "update-incident"
  | "add-comment"
  | "approval"
  | "send-email";

export interface FlowStep {
  id: string;
  kind: StepKind;
  params: Record<string, string>;
}

export interface FlowDesign {
  trigger: TriggerKind;
  triggerParams: Record<string, string>;
  steps: FlowStep[];
}

export const TRIGGERS: { kind: TriggerKind; label: string; description: string }[] = [
  { kind: "incident-created", label: "When an incident is created", description: "Automated: starts by itself on each new incident." },
  { kind: "recurrence", label: "Recurrence", description: "Scheduled: starts on a timer." },
  { kind: "manual", label: "Manually trigger a flow", description: "Instant: starts when someone presses a button." },
];

export const RECURRENCE_OPTIONS = ["Every hour", "Every day at 7:00 AM", "Every week on Monday"];

export const CONDITION_FIELDS = [
  { value: "category", label: "Category" },
  { value: "priority", label: "Priority" },
  { value: "state", label: "State" },
];

export const UPDATE_PROPERTIES = [
  { value: "assignment_group", label: "Assignment group" },
  { value: "priority", label: "Priority" },
  { value: "state", label: "State" },
];

export const APPROVERS = ["Duty manager", "Service desk lead", "Security lead"];
export const EMAIL_RECIPIENTS = ["Managers", "Duty manager", "Requester"];

export interface ParamDef {
  name: string;
  label: string;
  /** Resolves the options for this parameter given the step's other parameters. */
  options(params: Record<string, string>, catalog: DesignCatalog): { value: string; label: string }[];
}

export interface StepDef {
  kind: StepKind;
  label: string;
  /** Palette group, mirroring how connectors are grouped in the real designer. */
  group: "IT Ticketing (MCP)" | "Control" | "Approvals" | "Notifications";
  description: string;
  params: ParamDef[];
}

const plain = (values: string[]) => values.map((v) => ({ value: v, label: v }));

export const STEP_DEFS: StepDef[] = [
  {
    kind: "condition",
    label: "Condition",
    group: "Control",
    description: "Only continue when a field has a given value. Steps below it run only if it is true.",
    params: [
      { name: "field", label: "Field", options: () => CONDITION_FIELDS },
      {
        name: "value",
        label: "is equal to",
        options: (p, c) => {
          if (p.field === "priority") return plain(c.priorities);
          if (p.field === "state") return plain(c.states);
          if (p.field === "category") return plain(c.categories);
          return [];
        },
      },
    ],
  },
  {
    kind: "list-incidents",
    label: "List incidents",
    group: "IT Ticketing (MCP)",
    description: "Reads incidents from the service desk, optionally filtered.",
    params: [
      { name: "state", label: "State", options: (_p, c) => [{ value: "", label: "(any)" }, ...plain(c.states)] },
      { name: "priority", label: "Priority", options: (_p, c) => [{ value: "", label: "(any)" }, ...plain(c.priorities)] },
    ],
  },
  {
    kind: "update-incident",
    label: "Update incident",
    group: "IT Ticketing (MCP)",
    description: "Changes a property of the incident that started the flow.",
    params: [
      { name: "property", label: "Property", options: () => UPDATE_PROPERTIES },
      {
        name: "value",
        label: "New value",
        options: (p, c) => {
          if (p.property === "assignment_group") return plain(c.groups);
          if (p.property === "priority") return plain(c.priorities);
          if (p.property === "state") return plain(c.states);
          return [];
        },
      },
    ],
  },
  {
    kind: "add-comment",
    label: "Add work note",
    group: "IT Ticketing (MCP)",
    description: "Adds an internal note to the incident that started the flow.",
    params: [],
  },
  {
    kind: "approval",
    label: "Start and wait for an approval",
    group: "Approvals",
    description: "Sends the request to someone and pauses until they approve or reject.",
    params: [{ name: "approver", label: "Assigned to", options: () => plain(APPROVERS) }],
  },
  {
    kind: "send-email",
    label: "Send an email",
    group: "Notifications",
    description: "Emails a summary or an alert.",
    params: [{ name: "to", label: "To", options: () => plain(EMAIL_RECIPIENTS) }],
  },
];

export function stepDef(kind: StepKind): StepDef {
  return STEP_DEFS.find((d) => d.kind === kind) ?? STEP_DEFS[0];
}

export function emptyFlow(): FlowDesign {
  return { trigger: "incident-created", triggerParams: {}, steps: [] };
}

let stepCounter = 0;
export function newStep(kind: StepKind): FlowStep {
  stepCounter += 1;
  return { id: `s${Date.now().toString(36)}${stepCounter}`, kind, params: {} };
}

// ---- Report (Power BI) ----------------------------------------------------------------

export type VisualKind = "column" | "bar" | "donut" | "card" | "table";

export interface ReportDesign {
  visual: VisualKind;
  /** The field on the axis or legend. Empty until the player chooses one. */
  field: ReportField | "";
}

export const VISUALS: { kind: VisualKind; label: string; description: string }[] = [
  { kind: "column", label: "Clustered column", description: "Compare values side by side." },
  { kind: "bar", label: "Clustered bar", description: "Compare values, good for long labels." },
  { kind: "donut", label: "Donut", description: "Show each part's share of the whole." },
  { kind: "card", label: "Card", description: "One big number." },
  { kind: "table", label: "Table", description: "Rows and columns." },
];

export const REPORT_FIELDS: { value: ReportField; label: string }[] = [
  { value: "category", label: "Category" },
  { value: "priority", label: "Priority" },
  { value: "state", label: "State" },
  { value: "group", label: "Assignment group" },
];

export function emptyReport(): ReportDesign {
  return { visual: "column", field: "" };
}

// ---- Parsing -------------------------------------------------------------------------

const TRIGGER_KINDS = new Set<string>(TRIGGERS.map((t) => t.kind));
const STEP_KINDS = new Set<string>(STEP_DEFS.map((d) => d.kind));
const VISUAL_KINDS = new Set<string>(VISUALS.map((v) => v.kind));
const FIELD_KINDS = new Set<string>(REPORT_FIELDS.map((f) => f.value));

function stringRecord(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof value === "object" && value !== null) {
    for (const [k, v] of Object.entries(value)) if (typeof v === "string") out[k] = v;
  }
  return out;
}

/** Defensive parse of an untrusted design string. Returns null when it is not a flow. */
export function parseFlow(text: string): FlowDesign | null {
  try {
    const raw = JSON.parse(text) as Record<string, unknown>;
    if (typeof raw.trigger !== "string" || !TRIGGER_KINDS.has(raw.trigger) || !Array.isArray(raw.steps)) return null;
    const steps: FlowStep[] = [];
    for (const item of raw.steps.slice(0, 20)) {
      const s = item as Record<string, unknown>;
      if (typeof s.kind !== "string" || !STEP_KINDS.has(s.kind)) return null;
      steps.push({ id: typeof s.id === "string" ? s.id : `s${steps.length}`, kind: s.kind as StepKind, params: stringRecord(s.params) });
    }
    return { trigger: raw.trigger as TriggerKind, triggerParams: stringRecord(raw.triggerParams), steps };
  } catch {
    return null;
  }
}

export function parseReport(text: string): ReportDesign | null {
  try {
    const raw = JSON.parse(text) as Record<string, unknown>;
    if (typeof raw.visual !== "string" || !VISUAL_KINDS.has(raw.visual)) return null;
    const field = typeof raw.field === "string" && FIELD_KINDS.has(raw.field) ? (raw.field as ReportField) : "";
    return { visual: raw.visual as VisualKind, field };
  } catch {
    return null;
  }
}

// ---- App (Power Apps canvas app) ------------------------------------------------------

export type AppControlKind = "text-input" | "dropdown" | "button" | "gallery";

export interface AppControl {
  id: string;
  kind: AppControlKind;
  params: Record<string, string>;
}

export interface AppDesign {
  controls: AppControl[];
}

export interface ControlDef {
  kind: AppControlKind;
  label: string;
  description: string;
  params: ParamDef[];
}

export const APP_BUTTON_ACTIONS = [
  { value: "none", label: "(does nothing)" },
  { value: "create-incident", label: "Create an incident in IT Ticketing" },
  { value: "resolve-selected", label: "Mark the selected incident Resolved" },
];

export const GALLERY_SOURCES = [
  { value: "in-progress", label: "Incidents that are In Progress" },
  { value: "new", label: "Incidents that are New" },
  { value: "all", label: "All incidents" },
];

export const CONTROL_DEFS: ControlDef[] = [
  {
    kind: "text-input",
    label: "Text input",
    description: "A box people type into.",
    params: [{ name: "field", label: "Captures", options: () => [{ value: "shortDescription", label: "Short description" }] }],
  },
  {
    kind: "dropdown",
    label: "Dropdown",
    description: "A list people choose from.",
    params: [
      {
        name: "field",
        label: "Choices for",
        options: () => [
          { value: "category", label: "Category" },
          { value: "priority", label: "Priority" },
        ],
      },
    ],
  },
  {
    kind: "button",
    label: "Button",
    description: "Something people press.",
    params: [{ name: "onSelect", label: "OnSelect", options: () => APP_BUTTON_ACTIONS }],
  },
  {
    kind: "gallery",
    label: "Gallery",
    description: "A scrolling list of records.",
    params: [{ name: "source", label: "Items", options: () => GALLERY_SOURCES }],
  },
];

export function controlDef(kind: AppControlKind): ControlDef {
  return CONTROL_DEFS.find((d) => d.kind === kind) ?? CONTROL_DEFS[0];
}

let controlCounter = 0;
export function newControl(kind: AppControlKind): AppControl {
  controlCounter += 1;
  return { id: `c${Date.now().toString(36)}${controlCounter}`, kind, params: {} };
}

// ---- Site (Power Pages) ---------------------------------------------------------------

export interface SiteDesign {
  signIn: "none" | "required";
  list: "none" | "all" | "own";
  form: "none" | "anyone" | "signed-in";
}

export const SITE_SETTINGS: {
  key: keyof SiteDesign;
  label: string;
  help: string;
  options: { value: string; label: string }[];
}[] = [
  {
    key: "signIn",
    label: "Authentication",
    help: "Do visitors have to sign in before they can see or do anything?",
    options: [
      { value: "none", label: "Anyone can visit without signing in" },
      { value: "required", label: "Visitors must sign in" },
    ],
  },
  {
    key: "list",
    label: "Incident list: table permission",
    help: "Which incidents does the list page show?",
    options: [
      { value: "none", label: "No list page" },
      { value: "all", label: "Show every incident" },
      { value: "own", label: "Show only the signed-in person's incidents" },
    ],
  },
  {
    key: "form",
    label: "New incident form: who can submit",
    help: "Who is allowed to create an incident from the site?",
    options: [
      { value: "none", label: "No form" },
      { value: "anyone", label: "Anyone, signed in or not" },
      { value: "signed-in", label: "Only signed-in visitors" },
    ],
  },
];

// ---- Table (Dataverse) ----------------------------------------------------------------

export type TableField = "caller" | "group" | "priority" | "state" | "category" | "description";
export type ColumnType = "text" | "choice" | "lookup-user" | "lookup-team" | "number" | "date";

export interface TableDesign {
  columns: Record<TableField, ColumnType>;
}

export const TABLE_FIELDS: { key: TableField; label: string; example: string }[] = [
  { key: "description", label: "Short description", example: "Projector in room 4 will not connect" },
  { key: "caller", label: "Reported by", example: "Marcus Chen" },
  { key: "group", label: "Owning team", example: "Network Operations" },
  { key: "priority", label: "Priority", example: "1" },
  { key: "state", label: "State", example: "In Progress" },
  { key: "category", label: "Category", example: "Network" },
];

export const COLUMN_TYPES: { value: ColumnType; label: string; help: string }[] = [
  { value: "text", label: "Single line of text", help: "Anything can be typed, including typos." },
  { value: "choice", label: "Choice", help: "One value from a fixed list." },
  { value: "lookup-user", label: "Lookup to Contact", help: "A link to a real person record." },
  { value: "lookup-team", label: "Lookup to Team", help: "A link to a real team record." },
  { value: "number", label: "Whole number", help: "Digits only." },
  { value: "date", label: "Date and time", help: "A point in time." },
];

// ---- Security roles (Dataverse) -------------------------------------------------------

export type RoleKey = "agent" | "manager" | "contractor";
export type Privilege = "read" | "create" | "write" | "delete";

export interface SecurityDesign {
  roles: Record<RoleKey, Record<Privilege, boolean>>;
}

export const ROLES: { key: RoleKey; label: string; who: string }[] = [
  { key: "agent", label: "Service desk agent", who: "Works the queue every day" },
  { key: "manager", label: "Duty manager", who: "Runs the shift and owns the outcome" },
  { key: "contractor", label: "Contractor", who: "External. Only needs to look things up" },
];

export const PRIVILEGES: { key: Privilege; label: string }[] = [
  { key: "read", label: "Read" },
  { key: "create", label: "Create" },
  { key: "write", label: "Update" },
  { key: "delete", label: "Delete" },
];

// ---- Agent (Copilot Studio) -----------------------------------------------------------

export interface AgentDesign {
  knowledge: string[];
  actions: string[];
}

export const KNOWLEDGE_SOURCES = [
  { id: "it-kb", label: "IT knowledge base (all articles)" },
  { id: "password-guides", label: "Password and account guides" },
  { id: "vpn-guide", label: "VPN and remote work guide" },
  { id: "hr-handbook", label: "HR policy handbook" },
  { id: "finance-policy", label: "Finance expense policy" },
  { id: "facilities-guide", label: "Facilities booking guide" },
];

export const AGENT_ACTIONS = [
  { id: "create_incident", label: "Create incident", description: "Opens a new incident for the person.", writes: true },
  { id: "get_incident", label: "Get incident status", description: "Looks up one incident by its id.", writes: false },
  { id: "list_incidents", label: "List incidents", description: "Searches incidents.", writes: false },
  { id: "update_incident", label: "Update incident", description: "Changes any incident, including its state.", writes: true },
];

// ---- Defaults and parsing for every designer ------------------------------------------

export function defaultTable(): TableDesign {
  return {
    columns: { caller: "text", group: "text", priority: "text", state: "text", category: "text", description: "text" },
  };
}

export function defaultSecurity(): SecurityDesign {
  const open = { read: true, create: true, write: true, delete: true };
  return { roles: { agent: { ...open }, manager: { ...open }, contractor: { ...open } } };
}

export function defaultSite(): SiteDesign {
  return { signIn: "none", list: "all", form: "anyone" };
}

export function defaultDesign(kind: string): unknown {
  switch (kind) {
    case "flow":
      return { ...emptyFlow(), trigger: "manual" };
    case "report":
      return emptyReport();
    case "app":
      return { controls: [] } satisfies AppDesign;
    case "site":
      return defaultSite();
    case "table":
      return defaultTable();
    case "security":
      return defaultSecurity();
    case "agent":
      return { knowledge: [], actions: [] } satisfies AgentDesign;
    default:
      return {};
  }
}

const CONTROL_KINDS = new Set<string>(CONTROL_DEFS.map((d) => d.kind));
const COLUMN_VALUES = new Set<string>(COLUMN_TYPES.map((c) => c.value));

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").slice(0, 20) : [];
}

/** Defensive parse of an untrusted design string for any designer. Null when malformed. */
export function parseAnyDesign(kind: string, text: string): unknown | null {
  if (kind === "flow") return parseFlow(text);
  if (kind === "report") return parseReport(text);
  try {
    const raw = JSON.parse(text) as Record<string, unknown>;
    switch (kind) {
      case "app": {
        if (!Array.isArray(raw.controls)) return null;
        const controls: AppControl[] = [];
        for (const item of raw.controls.slice(0, 20)) {
          const c = item as Record<string, unknown>;
          if (typeof c.kind !== "string" || !CONTROL_KINDS.has(c.kind)) return null;
          controls.push({ id: typeof c.id === "string" ? c.id : `c${controls.length}`, kind: c.kind as AppControlKind, params: stringRecord(c.params) });
        }
        return { controls } satisfies AppDesign;
      }
      case "site": {
        const d = defaultSite();
        const pick = <T extends string>(v: unknown, allowed: T[], fallback: T): T =>
          typeof v === "string" && (allowed as string[]).includes(v) ? (v as T) : fallback;
        return {
          signIn: pick(raw.signIn, ["none", "required"], d.signIn),
          list: pick(raw.list, ["none", "all", "own"], d.list),
          form: pick(raw.form, ["none", "anyone", "signed-in"], d.form),
        } satisfies SiteDesign;
      }
      case "table": {
        const base = defaultTable();
        const given = (raw.columns ?? {}) as Record<string, unknown>;
        for (const f of TABLE_FIELDS) {
          const v = given[f.key];
          if (typeof v === "string" && COLUMN_VALUES.has(v)) base.columns[f.key] = v as ColumnType;
        }
        return base;
      }
      case "security": {
        const base = defaultSecurity();
        const given = (raw.roles ?? {}) as Record<string, Record<string, unknown>>;
        for (const role of ROLES) {
          for (const p of PRIVILEGES) {
            const v = given[role.key]?.[p.key];
            if (typeof v === "boolean") base.roles[role.key][p.key] = v;
          }
        }
        return base;
      }
      case "agent":
        return { knowledge: stringList(raw.knowledge), actions: stringList(raw.actions) } satisfies AgentDesign;
      default:
        return null;
    }
  } catch {
    return null;
  }
}
