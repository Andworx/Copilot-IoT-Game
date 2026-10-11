import type { CaseSpec, Predicate } from "./gamespec";
import type { DesignerKind, JsonSchemaProperty, Objective } from "./types";

/**
 * The data model behind the two generic designers used for generated games. Pure functions, no
 * UI, so the rules (what a design looks like, what the player is asked to fill in) live next to
 * the judge that reads them and are tested with it.
 *
 *   Action sequence  { trigger, steps: [{ id, tool, args }] }   for cases the judge RUNS
 *   Settings         a plain JSON object, one value per field  for cases it INSPECTS
 */

// ---- products ----------------------------------------------------------------------------

/** The Power Platform product each designer stands for. */
export const PRODUCT_FOR_DESIGNER: Record<DesignerKind, { id: string; name: string; noun: string }> = {
  flow: { id: "power-automate", name: "Power Automate", noun: "flow" },
  app: { id: "power-apps", name: "Power Apps", noun: "app" },
  site: { id: "power-pages", name: "Power Pages", noun: "site" },
  agent: { id: "copilot-studio", name: "Copilot Studio", noun: "agent" },
  report: { id: "power-bi", name: "Power BI", noun: "report" },
  table: { id: "dataverse", name: "Dataverse", noun: "table" },
  security: { id: "dataverse", name: "Dataverse", noun: "security role" },
};

/** What starts a design, in the words each product uses. */
export const TRIGGER_LABELS: Record<DesignerKind, Record<string, string>> = {
  flow: { "record-created": "When a record is created", recurrence: "On a schedule", manual: "When someone presses a button" },
  app: { "record-created": "When a record is created", recurrence: "On a schedule", manual: "When someone uses the app" },
  site: { "record-created": "When a record is created", recurrence: "On a schedule", manual: "When a visitor uses the site" },
  agent: { "record-created": "When a record is created", recurrence: "On a schedule", manual: "When someone asks the agent" },
  report: {},
  table: {},
  security: {},
};

export function triggerLabel(designer: DesignerKind, trigger: string): string {
  return TRIGGER_LABELS[designer]?.[trigger] ?? trigger;
}

// ---- settings (design-judged cases) ---------------------------------------------------------------

export type FieldKind = "text" | "number" | "boolean";

export interface DesignField {
  /** Where the judge reads the value, e.g. `status` or `filters[0].value`. */
  path: string;
  kind: FieldKind;
  /** A readable name derived from the path. */
  label: string;
}

/** `minAmount` -> "Min amount", `filters[0].value` -> "Filters 1 value". */
export function labelForPath(path: string): string {
  const words = path
    .replace(/\[(\d+)\]/g, (_m, n: string) => ` ${Number(n) + 1} `)
    .replace(/[._]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function collectFields(p: Predicate, out: Map<string, FieldKind>) {
  switch (p.op) {
    case "design": {
      const kind: FieldKind =
        p.equals !== undefined ? (typeof p.equals === "number" ? "number" : typeof p.equals === "boolean" ? "boolean" : "text") : "text";
      // A text field is the safe superset if the same path is checked in two ways.
      const previous = out.get(p.path);
      out.set(p.path, previous && previous !== kind ? "text" : kind);
      break;
    }
    case "all":
    case "any":
      p.of.forEach((x) => collectFields(x, out));
      break;
    case "not":
      collectFields(p.of, out);
      break;
    default:
      break;
  }
}

/** The settings a design-judged case asks the player to fill in, in requirement order. */
export function designFieldsOf(c: CaseSpec): DesignField[] {
  const found = new Map<string, FieldKind>();
  for (const r of c.requirements) collectFields(r.check, found);
  return [...found.entries()].map(([path, kind]) => ({ path, kind, label: labelForPath(path) }));
}

type Container = Record<string, unknown> | unknown[];

function isIndex(token: string) {
  return /^\d+$/.test(token);
}

function tokens(path: string): string[] {
  return [...path.matchAll(/([A-Za-z0-9_]+)|\[(\d+)\]/g)].map((m) => m[1] ?? m[2]);
}

const FORBIDDEN = new Set(["__proto__", "constructor", "prototype"]);

/** Sets `a.b[0].c` on an object, creating the objects and arrays on the way. */
export function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = tokens(path);
  if (parts.length === 0 || parts.some((p) => FORBIDDEN.has(p))) return;
  let node: Container = target;
  parts.forEach((part, i) => {
    const last = i === parts.length - 1;
    const key = isIndex(part) ? Number(part) : part;
    if (last) {
      (node as Record<string | number, unknown>)[key] = value;
      return;
    }
    const nextIsIndex = isIndex(parts[i + 1]);
    let child = (node as Record<string | number, unknown>)[key];
    if (!child || typeof child !== "object") {
      child = nextIsIndex ? [] : {};
      (node as Record<string | number, unknown>)[key] = child;
    }
    node = child as Container;
  });
}

export function getPath(source: unknown, path: string): unknown {
  let node: unknown = source;
  for (const part of tokens(path)) {
    if (FORBIDDEN.has(part) || node === null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

/** Turns what the player typed into the typed value the check compares. Empty means "not set". */
export function coerceField(kind: FieldKind, raw: string): string | number | boolean | undefined {
  const text = raw.trim();
  if (text === "") return undefined;
  if (kind === "boolean") return text.toLowerCase() === "true" || text.toLowerCase() === "yes";
  if (kind === "number") {
    const n = Number(text);
    return Number.isFinite(n) ? n : text;
  }
  return text;
}

/** Builds the design object from the form's values. Unset fields are left out. */
export function buildSettings(fields: DesignField[], values: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = coerceField(f.kind, values[f.path] ?? "");
    if (v !== undefined) setPath(out, f.path, v);
  }
  return out;
}

/** The form's values, read back from a saved design. */
export function settingsValues(fields: DesignField[], design: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) {
    const v = getPath(design, f.path);
    if (v !== undefined && v !== null && typeof v !== "object") out[f.path] = String(v);
  }
  return out;
}

// ---- action sequences (run-judged cases) -----------------------------------------------------------

export type ArgValue = string | number | boolean;

export interface ActionStep {
  id: string;
  tool: string;
  args: Record<string, ArgValue>;
}

export interface ActionDesign {
  trigger: string;
  steps: ActionStep[];
}

export const MAX_ACTION_STEPS = 40;

/** `{{key}}`, the way a step argument uses a scenario's value. Returns the key. */
export function templateKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const m = /^\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}$/.exec(value.trim());
  return m ? m[1] : null;
}

export const template = (key: string) => `{{${key}}}`;

export function emptyActionDesign(triggers: string[]): ActionDesign {
  return { trigger: triggers[0] ?? "manual", steps: [] };
}

export function parseActionDesign(text: string): ActionDesign | null {
  try {
    const raw = JSON.parse(text) as Record<string, unknown>;
    if (typeof raw.trigger !== "string" || !Array.isArray(raw.steps)) return null;
    const steps: ActionStep[] = [];
    for (const item of raw.steps.slice(0, MAX_ACTION_STEPS)) {
      if (!item || typeof item !== "object") return null;
      const s = item as Record<string, unknown>;
      if (typeof s.tool !== "string") return null;
      const args: Record<string, ArgValue> = {};
      for (const [k, v] of Object.entries((s.args && typeof s.args === "object" ? s.args : {}) as Record<string, unknown>)) {
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") args[k] = v;
      }
      steps.push({ id: typeof s.id === "string" ? s.id : `s${steps.length + 1}`, tool: s.tool, args });
    }
    return { trigger: raw.trigger, steps };
  } catch {
    return null;
  }
}

/**
 * The design a generated case starts from, as the text that is submitted. Hand-built cases
 * return null (they have their own defaults).
 */
export function initialDesignText(objective: Objective): string | null {
  if (objective.judging === "run") return JSON.stringify(emptyActionDesign(scenarioTriggers(objective.scenarios)));
  if (objective.judging === "design") return "{}";
  return null;
}

export function nextStepId(steps: ActionStep[]): string {
  const used = new Set(steps.map((s) => s.id));
  let n = steps.length + 1;
  while (used.has(`s${n}`)) n += 1;
  return `s${n}`;
}

/** Converts what was typed into a value of the argument's declared type. */
export function coerceArg(prop: JsonSchemaProperty | undefined, raw: string): ArgValue | undefined {
  const text = raw.trim();
  if (text === "") return undefined;
  if (templateKey(text)) return text;
  switch (prop?.type) {
    case "integer":
    case "number": {
      const n = Number(text);
      return Number.isFinite(n) ? n : text;
    }
    case "boolean":
      return text.toLowerCase() === "true";
    default:
      return text;
  }
}

/** Scenario fact keys a case offers, for "use the scenario's value". */
export function scenarioKeys(scenarios: { input: Record<string, unknown> }[] | undefined): string[] {
  const keys = new Set<string>();
  for (const s of scenarios ?? []) for (const k of Object.keys(s.input)) keys.add(k);
  return [...keys];
}

export function scenarioTriggers(scenarios: { trigger: string }[] | undefined): string[] {
  return [...new Set((scenarios ?? []).map((s) => s.trigger))];
}
