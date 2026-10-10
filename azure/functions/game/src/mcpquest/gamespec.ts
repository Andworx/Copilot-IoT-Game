import { createHash } from "node:crypto";
import type { DesignerKind, ToolDef } from "./types";

/**
 * GameSpec: the declarative description of one generated MCP Quest game.
 *
 * A Foundry agent reads an MCP server and returns a GameSpec; it never scores anything. The
 * Function App validates the spec with `validateGameSpec`, then a fixed judge interprets it.
 * Everything the agent can express is data from this vocabulary, so a bad or hostile spec can
 * only produce an unwinnable or trivial game, never code execution or a rigged score.
 *
 * Design: requirements/MCP_QUEST_AGENT_PLAN.md. The agent-facing JSON Schema is in
 * `gamespecSchema.ts`; this validator is authoritative and stricter (cross-checks against the
 * server's real tool list).
 */

export const GAME_SPEC_VERSION = 1;

export const SPEC_LIMITS = {
  titleChars: 80,
  scenarioChars: 600,
  briefChars: 600,
  requirementChars: 200,
  hintChars: 300,
  cases: { min: 1, max: 4 },
  requirementsPerCase: { min: 1, max: 6 },
  scenariosPerCase: { max: 6 },
  predicateDepth: 4,
  predicateNodes: 30,
  inputKeys: 8,
  scalarChars: 120,
  maxCallCount: 50,
  /** Same ceiling as a player's design (docs/MCP_QUEST_ENGINE.md). */
  referenceBytes: 20_000,
} as const;

export const DESIGNER_KINDS: readonly DesignerKind[] = ["flow", "report", "app", "site", "table", "security", "agent"];

export type Scalar = string | number | boolean;

/** How one tool argument must look in a call. */
export type ArgMatcher =
  | { equals: Scalar }
  | { oneOf: Scalar[] }
  /** The argument must equal the scenario's `input[key]`, so one rule covers every scenario. */
  | { fromInput: string };

export interface CallMatcher {
  tool: string;
  args?: Record<string, ArgMatcher>;
}

/**
 * A check over what a design did in one scenario. Call leaves read the scenario's tool-call
 * log; `design` leaves read the design JSON and are how configuration-only products (reports,
 * tables, security roles) are judged.
 */
export type Predicate =
  | { op: "called"; call: CallMatcher; min?: number; max?: number }
  | { op: "not-called"; call: CallMatcher }
  /** Some call matching `first` happens earlier in the log than some call matching `then`. */
  | { op: "before"; first: CallMatcher; then: CallMatcher }
  | { op: "all"; of: Predicate[] }
  | { op: "any"; of: Predicate[] }
  | { op: "not"; of: Predicate }
  /** `path` is dot/index notation into the design, for example `steps[0].params.value`. */
  | { op: "design"; path: string; equals?: Scalar; contains?: string };

export interface RequirementSpec {
  id: string;
  /** Shown to the player up front. Must not give the answer away. */
  text: string;
  /** Scenario name this applies to. Omitted: it must hold in every scenario of the case. */
  scenario?: string;
  check: Predicate;
}

export type TriggerSpec = "record-created" | "recurrence" | "manual";

export interface ScenarioSpec {
  name: string;
  trigger: TriggerSpec;
  /** Values the scenario supplies, referenced by `fromInput` matchers. */
  input: Record<string, Scalar>;
}

export interface CaseSpec {
  id: string;
  title: string;
  designer: DesignerKind;
  /** "run": execute the design against the scenarios. "design": judge the design JSON itself. */
  judging: "run" | "design";
  brief: string;
  requirements: RequirementSpec[];
  scenarios: ScenarioSpec[];
  hint: string;
  /**
   * A design that must pass every requirement and one that must fail at least one. The
   * validation loop (plan, Phase 1) runs them through the judge before a spec is served.
   */
  reference?: { pass: unknown; fail: unknown };
}

export interface GameSpec {
  version: typeof GAME_SPEC_VERSION;
  /** Binds the spec to the exact tool list it was written for. */
  server: { id: string; name: string; toolsHash: string };
  title: string;
  scenario: string;
  cases: CaseSpec[];
}

// ---- hashing ----------------------------------------------------------------------------

/** JSON with object keys sorted, so equal values always serialise identically. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

const sha = (text: string) => createHash("sha256").update(text).digest("hex").slice(0, 16);

/**
 * Identity of a tool list: names and input schemas only, so a reworded description does not
 * invalidate cached specs but a changed parameter does.
 */
export function computeToolsHash(tools: ToolDef[]): string {
  const view = tools
    .map((t) => ({ name: t.name, inputSchema: t.inputSchema }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return sha(canonicalJson(view));
}

/** Identity of a spec, used as the cache and leaderboard key. */
export function computeSpecId(spec: GameSpec): string {
  return sha(canonicalJson(spec));
}

// ---- validation -------------------------------------------------------------------------

export interface ValidateOptions {
  /** The server's real tool list. When given, tools, argument names and values are checked. */
  tools?: ToolDef[];
  /** Require `server.toolsHash` to match this tool list's hash. Needs `tools`. */
  bindToTools?: boolean;
  /** Require a reference pass/fail design on every case (needed before a spec may mint prizes). */
  requireReference?: boolean;
}

export type ValidationResult = { ok: true; spec: GameSpec } | { ok: false; errors: string[] };

const ID_RE = /^[a-z][a-z0-9-]{0,39}$/;
const TOOL_RE = /^[A-Za-z0-9_.-]{1,64}$/;
const INPUT_KEY_RE = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;
const DESIGN_PATH_RE = /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+|\[\d+\])*$/;
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

type Obj = Record<string, unknown>;

class Check {
  readonly errors: string[] = [];
  private nodes = 0;

  constructor(readonly opts: ValidateOptions) {}

  err(path: string, message: string) {
    if (this.errors.length < 50) this.errors.push(`${path}: ${message}`);
  }

  /** An object with exactly these keys. A null optional key counts as absent. */
  object(path: string, v: unknown, required: string[], optional: string[] = []): Obj | undefined {
    if (!v || typeof v !== "object" || Array.isArray(v)) {
      this.err(path, "must be an object");
      return undefined;
    }
    const o: Obj = {};
    for (const [k, val] of Object.entries(v as Obj)) {
      if (required.includes(k)) o[k] = val;
      else if (optional.includes(k)) {
        if (val !== null && val !== undefined) o[k] = val;
      } else this.err(`${path}.${k}`, "unknown field");
    }
    for (const k of required) if (!(k in o)) this.err(`${path}.${k}`, "is required");
    return o;
  }

  text(path: string, v: unknown, max: number, min = 1): string | undefined {
    if (typeof v !== "string") {
      this.err(path, "must be a string");
      return undefined;
    }
    if (v.trim().length < min) this.err(path, "must not be empty");
    if (v.length > max) this.err(path, `must be at most ${max} characters`);
    if (CONTROL_RE.test(v)) this.err(path, "must not contain control characters");
    return v;
  }

  pattern(path: string, v: unknown, re: RegExp, what: string): string | undefined {
    if (typeof v !== "string" || !re.test(v)) {
      this.err(path, `must be ${what}`);
      return undefined;
    }
    return v;
  }

  scalar(path: string, v: unknown): Scalar | undefined {
    if (typeof v === "string") return this.text(path, v, SPEC_LIMITS.scalarChars, 0);
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "boolean") return v;
    this.err(path, "must be a string, number or boolean");
    return undefined;
  }

  int(path: string, v: unknown, min: number, max: number): number | undefined {
    if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) {
      this.err(path, `must be an integer from ${min} to ${max}`);
      return undefined;
    }
    return v;
  }

  array(path: string, v: unknown, min: number, max: number): unknown[] | undefined {
    if (!Array.isArray(v)) {
      this.err(path, "must be an array");
      return undefined;
    }
    if (v.length < min || v.length > max) this.err(path, `must have ${min} to ${max} items`);
    return v.length > max ? v.slice(0, max) : v;
  }

  // ---- tool cross-checks ----

  private toolFor(path: string, name: string): ToolDef | undefined {
    const tools = this.opts.tools;
    if (!tools) return undefined;
    const tool = tools.find((t) => t.name === name);
    if (!tool) this.err(path, `tool "${name}" is not on this MCP server`);
    return tool;
  }

  private scalarMatchesParam(path: string, tool: ToolDef, arg: string, v: Scalar) {
    const prop = tool.inputSchema.properties[arg];
    if (!prop) return;
    if (prop.enum && !prop.enum.includes(String(v))) {
      this.err(path, `"${String(v)}" is not an allowed value of ${tool.name}.${arg}`);
    }
    const t = prop.type;
    if (t === "string" && typeof v !== "string") this.err(path, `${tool.name}.${arg} takes a string`);
    if ((t === "integer" || t === "number") && typeof v !== "number") this.err(path, `${tool.name}.${arg} takes a number`);
    if (t === "integer" && typeof v === "number" && !Number.isInteger(v)) this.err(path, `${tool.name}.${arg} takes an integer`);
    if (t === "boolean" && typeof v !== "boolean") this.err(path, `${tool.name}.${arg} takes a boolean`);
  }

  call(path: string, v: unknown, inputKeys: Set<string> | undefined): CallMatcher | undefined {
    const o = this.object(path, v, ["tool"], ["args"]);
    if (!o) return undefined;
    const tool = this.pattern(`${path}.tool`, o.tool, TOOL_RE, "a tool name");
    const def = tool ? this.toolFor(`${path}.tool`, tool) : undefined;
    const call: CallMatcher = { tool: tool ?? "" };
    if (o.args !== undefined) {
      const a = this.object(`${path}.args`, o.args, [], Object.keys(o.args as Obj));
      call.args = {};
      for (const [name, raw] of Object.entries(a ?? {})) {
        const ap = `${path}.args.${name}`;
        if (!INPUT_KEY_RE.test(name)) this.err(ap, "invalid argument name");
        if (def && !def.inputSchema.properties[name]) this.err(ap, `${def.name} has no argument "${name}"`);
        const m = this.object(ap, raw, [], ["equals", "oneOf", "fromInput"]);
        if (!m) continue;
        const kinds = Object.keys(m);
        if (kinds.length !== 1) {
          this.err(ap, "must have exactly one of equals, oneOf, fromInput");
          continue;
        }
        if ("equals" in m) {
          const s = this.scalar(`${ap}.equals`, m.equals);
          if (s !== undefined) {
            if (def) this.scalarMatchesParam(`${ap}.equals`, def, name, s);
            call.args[name] = { equals: s };
          }
        } else if ("oneOf" in m) {
          const list = this.array(`${ap}.oneOf`, m.oneOf, 1, 10);
          const vals = (list ?? []).map((x, i) => this.scalar(`${ap}.oneOf[${i}]`, x)).filter((x): x is Scalar => x !== undefined);
          if (def) vals.forEach((s, i) => this.scalarMatchesParam(`${ap}.oneOf[${i}]`, def, name, s));
          call.args[name] = { oneOf: vals };
        } else {
          const key = this.pattern(`${ap}.fromInput`, m.fromInput, INPUT_KEY_RE, "an input key");
          if (key) {
            if (inputKeys && !inputKeys.has(key)) this.err(`${ap}.fromInput`, `scenario input has no "${key}"`);
            call.args[name] = { fromInput: key };
          }
        }
      }
    }
    return call;
  }

  predicate(path: string, v: unknown, depth: number, inputKeys: Set<string> | undefined, judging: "run" | "design"): Predicate | undefined {
    if (++this.nodes > SPEC_LIMITS.predicateNodes) {
      if (this.nodes === SPEC_LIMITS.predicateNodes + 1) this.err(path, `a requirement may have at most ${SPEC_LIMITS.predicateNodes} checks`);
      return undefined;
    }
    if (depth > SPEC_LIMITS.predicateDepth) {
      this.err(path, `nested deeper than ${SPEC_LIMITS.predicateDepth}`);
      return undefined;
    }
    const op = v && typeof v === "object" ? (v as Obj).op : undefined;
    const callOps = ["called", "not-called", "before"];
    if (judging === "design" && typeof op === "string" && callOps.includes(op)) {
      this.err(`${path}.op`, `"${op}" needs a run; this case is judged on the design`);
      return undefined;
    }
    switch (op) {
      case "called": {
        const o = this.object(path, v, ["op", "call"], ["min", "max"]);
        if (!o) return undefined;
        const call = this.call(`${path}.call`, o.call, inputKeys);
        const min = o.min === undefined ? undefined : this.int(`${path}.min`, o.min, 0, SPEC_LIMITS.maxCallCount);
        const max = o.max === undefined ? undefined : this.int(`${path}.max`, o.max, 0, SPEC_LIMITS.maxCallCount);
        if (min !== undefined && max !== undefined && min > max) this.err(path, "min is greater than max");
        return call ? { op, call, ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}) } : undefined;
      }
      case "not-called": {
        const o = this.object(path, v, ["op", "call"]);
        const call = o ? this.call(`${path}.call`, o.call, inputKeys) : undefined;
        return call ? { op, call } : undefined;
      }
      case "before": {
        const o = this.object(path, v, ["op", "first", "then"]);
        if (!o) return undefined;
        const first = this.call(`${path}.first`, o.first, inputKeys);
        const then = this.call(`${path}.then`, o.then, inputKeys);
        return first && then ? { op, first, then } : undefined;
      }
      case "all":
      case "any": {
        const o = this.object(path, v, ["op", "of"]);
        const list = o ? this.array(`${path}.of`, o.of, 1, 8) : undefined;
        if (!list) return undefined;
        const of = list.map((x, i) => this.predicate(`${path}.of[${i}]`, x, depth + 1, inputKeys, judging));
        return of.every(Boolean) ? { op, of: of as Predicate[] } : undefined;
      }
      case "not": {
        const o = this.object(path, v, ["op", "of"]);
        const of = o ? this.predicate(`${path}.of`, o.of, depth + 1, inputKeys, judging) : undefined;
        return of ? { op, of } : undefined;
      }
      case "design": {
        const o = this.object(path, v, ["op", "path"], ["equals", "contains"]);
        if (!o) return undefined;
        const p = this.pattern(`${path}.path`, o.path, DESIGN_PATH_RE, "a path like steps[0].params.value");
        if (typeof p === "string" && p.length > 80) this.err(`${path}.path`, "must be at most 80 characters");
        const hasEq = "equals" in o;
        const hasContains = "contains" in o;
        if (hasEq === hasContains) this.err(path, "needs exactly one of equals, contains");
        const equals = hasEq ? this.scalar(`${path}.equals`, o.equals) : undefined;
        const contains = hasContains ? this.text(`${path}.contains`, o.contains, SPEC_LIMITS.scalarChars) : undefined;
        if (p === undefined) return undefined;
        if (hasEq && equals !== undefined) return { op, path: p, equals };
        if (hasContains && contains !== undefined) return { op, path: p, contains };
        return undefined;
      }
      default:
        this.err(`${path}.op`, "must be one of called, not-called, before, all, any, not, design");
        return undefined;
    }
  }

  resetNodes() {
    this.nodes = 0;
  }
}

function validateScenario(c: Check, path: string, v: unknown): ScenarioSpec | undefined {
  const o = c.object(path, v, ["name", "trigger", "input"]);
  if (!o) return undefined;
  const name = c.text(`${path}.name`, o.name, 60);
  const trigger = o.trigger;
  if (trigger !== "record-created" && trigger !== "recurrence" && trigger !== "manual") {
    c.err(`${path}.trigger`, "must be record-created, recurrence or manual");
  }
  const input: Record<string, Scalar> = {};
  const raw = c.object(`${path}.input`, o.input, [], Object.keys((o.input as Obj) ?? {}));
  const entries = Object.entries(raw ?? {});
  if (entries.length > SPEC_LIMITS.inputKeys) c.err(`${path}.input`, `at most ${SPEC_LIMITS.inputKeys} keys`);
  for (const [k, val] of entries) {
    if (!INPUT_KEY_RE.test(k)) c.err(`${path}.input.${k}`, "invalid key");
    const s = c.scalar(`${path}.input.${k}`, val);
    if (s !== undefined) input[k] = s;
  }
  return name !== undefined && (trigger === "record-created" || trigger === "recurrence" || trigger === "manual")
    ? { name, trigger, input }
    : undefined;
}

function validateCase(c: Check, path: string, v: unknown): CaseSpec | undefined {
  const o = c.object(path, v, ["id", "title", "designer", "judging", "brief", "requirements", "scenarios", "hint"], ["reference"]);
  if (!o) return undefined;
  const id = c.pattern(`${path}.id`, o.id, ID_RE, "a lowercase slug (a-z, 0-9, hyphen)");
  const title = c.text(`${path}.title`, o.title, SPEC_LIMITS.titleChars);
  const brief = c.text(`${path}.brief`, o.brief, SPEC_LIMITS.briefChars);
  const hint = c.text(`${path}.hint`, o.hint, SPEC_LIMITS.hintChars);
  const designer = o.designer as DesignerKind;
  if (!DESIGNER_KINDS.includes(designer)) c.err(`${path}.designer`, `must be one of ${DESIGNER_KINDS.join(", ")}`);
  const judging = o.judging;
  if (judging !== "run" && judging !== "design") c.err(`${path}.judging`, 'must be "run" or "design"');
  const mode: "run" | "design" = judging === "design" ? "design" : "run";

  const scenarioList = c.array(`${path}.scenarios`, o.scenarios, mode === "run" ? 1 : 0, SPEC_LIMITS.scenariosPerCase.max) ?? [];
  const scenarios = scenarioList
    .map((s, i) => validateScenario(c, `${path}.scenarios[${i}]`, s))
    .filter((s): s is ScenarioSpec => s !== undefined);
  const names = new Set<string>();
  for (const s of scenarios) {
    if (names.has(s.name)) c.err(`${path}.scenarios`, `duplicate scenario name "${s.name}"`);
    names.add(s.name);
  }

  const reqList = c.array(
    `${path}.requirements`,
    o.requirements,
    SPEC_LIMITS.requirementsPerCase.min,
    SPEC_LIMITS.requirementsPerCase.max,
  ) ?? [];
  const reqIds = new Set<string>();
  const requirements: RequirementSpec[] = [];
  reqList.forEach((r, i) => {
    const rp = `${path}.requirements[${i}]`;
    const ro = c.object(rp, r, ["id", "text", "check"], ["scenario"]);
    if (!ro) return;
    const rid = c.pattern(`${rp}.id`, ro.id, ID_RE, "a lowercase slug");
    if (rid) {
      if (reqIds.has(rid)) c.err(`${rp}.id`, `duplicate requirement id "${rid}"`);
      reqIds.add(rid);
    }
    const text = c.text(`${rp}.text`, ro.text, SPEC_LIMITS.requirementChars);
    let scenario: string | undefined;
    if (ro.scenario !== undefined) {
      scenario = c.text(`${rp}.scenario`, ro.scenario, 60);
      if (scenario !== undefined && !names.has(scenario)) c.err(`${rp}.scenario`, `no scenario named "${scenario}"`);
    }
    // fromInput keys must exist in every scenario the requirement is checked against.
    const targets = scenario === undefined ? scenarios : scenarios.filter((s) => s.name === scenario);
    const inputKeys = targets.length
      ? new Set(Object.keys(targets[0].input).filter((k) => targets.every((s) => k in s.input)))
      : undefined;
    c.resetNodes();
    const check = c.predicate(`${rp}.check`, ro.check, 1, mode === "run" ? inputKeys : undefined, mode);
    if (id && rid && text !== undefined && check) requirements.push({ id: rid, text, ...(scenario !== undefined ? { scenario } : {}), check });
  });

  let reference: CaseSpec["reference"];
  if (o.reference !== undefined) {
    const ref = c.object(`${path}.reference`, o.reference, ["pass", "fail"]);
    if (ref) {
      for (const k of ["pass", "fail"] as const) {
        if (!ref[k] || typeof ref[k] !== "object") c.err(`${path}.reference.${k}`, "must be a design object");
        else if (JSON.stringify(ref[k]).length > SPEC_LIMITS.referenceBytes) c.err(`${path}.reference.${k}`, `larger than ${SPEC_LIMITS.referenceBytes} bytes`);
      }
      reference = { pass: ref.pass, fail: ref.fail };
    }
  } else if (c.opts.requireReference) {
    c.err(`${path}.reference`, "is required (pass and fail designs)");
  }

  if (!id || title === undefined || brief === undefined || hint === undefined) return undefined;
  if (!DESIGNER_KINDS.includes(designer) || (judging !== "run" && judging !== "design")) return undefined;
  return { id, title, designer, judging, brief, requirements, scenarios, hint, ...(reference ? { reference } : {}) };
}

/**
 * Parses and checks untrusted agent output. Returns a normalised copy (optional nulls dropped)
 * or every problem found, which the generate route feeds back to the agent for one repair try.
 */
export function validateGameSpec(input: unknown, opts: ValidateOptions = {}): ValidationResult {
  const c = new Check(opts);
  const o = c.object("spec", input, ["version", "server", "title", "scenario", "cases"]);
  if (!o) return { ok: false, errors: c.errors };

  if (o.version !== GAME_SPEC_VERSION) c.err("spec.version", `must be ${GAME_SPEC_VERSION}`);
  const server = c.object("spec.server", o.server, ["id", "name", "toolsHash"]);
  const serverId = server && c.pattern("spec.server.id", server.id, ID_RE, "a lowercase slug");
  const serverName = server && c.text("spec.server.name", server.name, SPEC_LIMITS.titleChars);
  const toolsHash = server && c.pattern("spec.server.toolsHash", server.toolsHash, /^[0-9a-f]{16}$/, "a 16-character hex hash");
  if (opts.bindToTools) {
    if (!opts.tools) c.err("spec.server.toolsHash", "bindToTools needs the tool list");
    else if (toolsHash && toolsHash !== computeToolsHash(opts.tools)) c.err("spec.server.toolsHash", "does not match the server's tool list");
  }
  const title = c.text("spec.title", o.title, SPEC_LIMITS.titleChars);
  const scenario = c.text("spec.scenario", o.scenario, SPEC_LIMITS.scenarioChars);

  const caseList = c.array("spec.cases", o.cases, SPEC_LIMITS.cases.min, SPEC_LIMITS.cases.max) ?? [];
  const cases = caseList.map((x, i) => validateCase(c, `spec.cases[${i}]`, x)).filter((x): x is CaseSpec => x !== undefined);
  const ids = new Set<string>();
  for (const k of cases) {
    if (ids.has(k.id)) c.err("spec.cases", `duplicate case id "${k.id}"`);
    ids.add(k.id);
  }

  if (c.errors.length || !serverId || !serverName || !toolsHash || title === undefined || scenario === undefined) {
    return { ok: false, errors: c.errors.length ? c.errors : ["spec: invalid"] };
  }
  return {
    ok: true,
    spec: { version: GAME_SPEC_VERSION, server: { id: serverId, name: serverName, toolsHash }, title, scenario, cases },
  };
}
