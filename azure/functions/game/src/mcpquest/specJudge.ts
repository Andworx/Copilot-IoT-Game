import type { CallMatcher, CaseSpec, GameSpec, Predicate, RequirementSpec, ScenarioSpec, Scalar } from "./gamespec";
import type { ToolDef } from "./types";

/**
 * The fixed judge for agent-generated games. It interprets a GameSpec's predicates over what a
 * player's design did. It never calls a model and takes no input from the spec author other
 * than the declarative checks, so a spec can be unwinnable or trivial but cannot rig a score.
 *
 * Design formats (the contract spec authors and the player UI both follow):
 *
 *   run cases     { "trigger": "record-created" | "recurrence" | "manual",
 *                   "steps": [ { "id": "s1", "tool": "<tool>", "args": { "<arg>": <value> } } ] }
 *                 An arg value is a literal or { "fromInput": "<scenario input key>" }.
 *   design cases  any JSON object; checks read it with `design` paths.
 *
 * "Running" a design means building the log of tool calls it makes in a scenario, without
 * contacting any server: the checks are about which calls were made and with which arguments.
 * A design whose trigger differs from the scenario's does not fire, so its log is empty.
 */

export const MAX_STEPS = 40;

export interface LoggedCall {
  tool: string;
  args: Record<string, Scalar>;
  /** Index of the step in the design. */
  step: number;
}

export interface RunLog {
  scenario: string;
  fired: boolean;
  calls: LoggedCall[];
  /** Steps that could not be turned into calls (unknown tool, unknown argument, bad value). */
  problems: string[];
}

export interface RequirementResult {
  id: string;
  text: string;
  ok: boolean;
}

export interface CaseVerdict {
  caseId: string;
  requirements: RequirementResult[];
  /** Every requirement is met. */
  passed: boolean;
  /** Problems with the design itself (malformed, calls that do not exist). */
  problems: string[];
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const isScalar = (v: unknown): v is Scalar => ["string", "number", "boolean"].includes(typeof v);

// ---- comparing values -------------------------------------------------------------------

/** Strings compare trimmed and case-insensitively; numbers and booleans compare by their text. */
export function scalarsEqual(a: unknown, b: unknown): boolean {
  if (!isScalar(a) || !isScalar(b)) return false;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/** Reads `a.b[0].c` from a design. Returns undefined when any step is missing. */
export function readPath(design: unknown, path: string): unknown {
  const tokens = [...path.matchAll(/([A-Za-z0-9_]+)|\[(\d+)\]/g)];
  let node: unknown = design;
  for (const t of tokens) {
    if (t[1] !== undefined) {
      if (FORBIDDEN_KEYS.has(t[1]) || !isObj(node) || !Object.prototype.hasOwnProperty.call(node, t[1])) return undefined;
      node = node[t[1]];
    } else {
      const index = Number(t[2]);
      if (!Array.isArray(node) || index >= node.length) return undefined;
      node = node[index];
    }
  }
  return node;
}

// ---- running a design ---------------------------------------------------------------------

function resolveArg(value: unknown, scenario: ScenarioSpec): Scalar | undefined {
  if (isObj(value) && typeof value.fromInput === "string") return scenario.input[value.fromInput];
  return isScalar(value) ? value : undefined;
}

function checkCall(tool: string, args: Record<string, Scalar>, tools: ToolDef[] | undefined): string | null {
  if (!tools) return null;
  const def = tools.find((t) => t.name === tool);
  if (!def) return `calls "${tool}", which is not on this server`;
  for (const [name, value] of Object.entries(args)) {
    const prop = def.inputSchema.properties[name];
    if (!prop) return `${tool} has no argument "${name}"`;
    if (prop.enum && !prop.enum.some((e) => scalarsEqual(e, value))) return `"${String(value)}" is not an allowed value of ${tool}.${name}`;
  }
  for (const required of def.inputSchema.required ?? []) {
    if (!(required in args)) return `${tool} is missing required argument "${required}"`;
  }
  return null;
}

/** Builds the log of calls a run design makes in one scenario. */
export function runDesign(design: unknown, scenario: ScenarioSpec, tools?: ToolDef[]): RunLog {
  const log: RunLog = { scenario: scenario.name, fired: false, calls: [], problems: [] };
  if (!isObj(design) || !Array.isArray(design.steps)) {
    log.problems.push('the design must be an object with a "steps" list');
    return log;
  }
  if (design.steps.length > MAX_STEPS) {
    log.problems.push(`the design has more than ${MAX_STEPS} steps`);
    return log;
  }
  if (design.trigger !== scenario.trigger) return log;
  log.fired = true;

  design.steps.forEach((raw: unknown, step: number) => {
    if (!isObj(raw) || typeof raw.tool !== "string") {
      log.problems.push(`step ${step + 1} has no tool`);
      return;
    }
    const args: Record<string, Scalar> = {};
    for (const [name, value] of Object.entries(isObj(raw.args) ? raw.args : {})) {
      const resolved = resolveArg(value, scenario);
      if (resolved === undefined) {
        log.problems.push(`step ${step + 1}: argument "${name}" has no usable value`);
        continue;
      }
      args[name] = resolved;
    }
    const problem = checkCall(raw.tool, args, tools);
    if (problem) {
      log.problems.push(`step ${step + 1} ${problem}`);
      return;
    }
    log.calls.push({ tool: raw.tool, args, step });
  });
  return log;
}

// ---- evaluating checks --------------------------------------------------------------------

function matches(call: LoggedCall, m: CallMatcher, scenario: ScenarioSpec | undefined): boolean {
  if (call.tool !== m.tool) return false;
  for (const [name, rule] of Object.entries(m.args ?? {})) {
    if (!(name in call.args)) return false;
    const actual = call.args[name];
    if ("equals" in rule) {
      if (!scalarsEqual(actual, rule.equals)) return false;
    } else if ("oneOf" in rule) {
      if (!rule.oneOf.some((v) => scalarsEqual(actual, v))) return false;
    } else {
      const wanted = scenario?.input[rule.fromInput];
      if (wanted === undefined || !scalarsEqual(actual, wanted)) return false;
    }
  }
  return true;
}

interface Subject {
  design: unknown;
  scenario?: ScenarioSpec;
  calls: LoggedCall[];
}

function holds(p: Predicate, s: Subject): boolean {
  switch (p.op) {
    case "called": {
      const n = s.calls.filter((c) => matches(c, p.call, s.scenario)).length;
      return n >= (p.min ?? 1) && (p.max === undefined || n <= p.max);
    }
    case "not-called":
      return !s.calls.some((c) => matches(c, p.call, s.scenario));
    case "before": {
      const firsts = s.calls.map((c, i) => (matches(c, p.first, s.scenario) ? i : -1)).filter((i) => i >= 0);
      const thens = s.calls.map((c, i) => (matches(c, p.then, s.scenario) ? i : -1)).filter((i) => i >= 0);
      return firsts.length > 0 && thens.length > 0 && Math.min(...firsts) < Math.max(...thens);
    }
    case "all":
      return p.of.every((x) => holds(x, s));
    case "any":
      return p.of.some((x) => holds(x, s));
    case "not":
      return !holds(p.of, s);
    case "design": {
      const value = readPath(s.design, p.path);
      if (value === undefined) return false;
      if (p.equals !== undefined) return scalarsEqual(value, p.equals);
      return isScalar(value) && p.contains !== undefined && String(value).toLowerCase().includes(p.contains.toLowerCase());
    }
  }
}

function requirementOk(req: RequirementSpec, c: CaseSpec, design: unknown, logs: Map<string, RunLog>): boolean {
  if (c.judging === "design") return holds(req.check, { design, calls: [] });
  const scenarios = req.scenario === undefined ? c.scenarios : c.scenarios.filter((s) => s.name === req.scenario);
  if (scenarios.length === 0) return false;
  return scenarios.every((scenario) => {
    const log = logs.get(scenario.name);
    return !!log && holds(req.check, { design, scenario, calls: log.calls });
  });
}

/** Judges one design against one case. Deterministic: the same inputs always give the same verdict. */
export function judgeCase(c: CaseSpec, design: unknown, tools?: ToolDef[]): CaseVerdict {
  const problems: string[] = [];
  const logs = new Map<string, RunLog>();
  if (c.judging === "run") {
    for (const scenario of c.scenarios) {
      const log = runDesign(design, scenario, tools);
      logs.set(scenario.name, log);
      for (const p of log.problems) if (!problems.includes(p)) problems.push(p);
    }
  } else if (!isObj(design)) {
    problems.push("the design must be a JSON object");
  }
  const requirements = c.requirements.map((req) => ({
    id: req.id,
    text: req.text,
    ok: requirementOk(req, c, design, logs),
  }));
  return { caseId: c.id, requirements, passed: requirements.every((r) => r.ok), problems };
}

// ---- proving a spec ------------------------------------------------------------------------

/** A design that does nothing: fires on the first scenario's trigger and makes no calls. */
export function emptyDesign(c: CaseSpec): unknown {
  return c.judging === "run" ? { trigger: c.scenarios[0]?.trigger ?? "manual", steps: [] } : {};
}

export interface Proof {
  ok: boolean;
  problems: string[];
}

/**
 * Proves a spec is playable before it is served. Per case:
 *   - the reference "pass" design must meet every requirement and be a well-formed design,
 *   - the reference "fail" design must miss at least one requirement,
 *   - a do-nothing design must also miss at least one (the case is not trivially satisfied).
 */
export function proveSpec(spec: GameSpec, tools?: ToolDef[]): Proof {
  const problems: string[] = [];
  for (const c of spec.cases) {
    const at = `case "${c.id}"`;
    if (!c.reference) {
      problems.push(`${at}: has no reference designs`);
      continue;
    }
    const pass = judgeCase(c, c.reference.pass, tools);
    if (pass.problems.length) problems.push(`${at}: the reference pass design is not valid: ${pass.problems.join("; ")}`);
    const missed = pass.requirements.filter((r) => !r.ok);
    if (missed.length) problems.push(`${at}: the reference pass design fails ${missed.map((r) => `"${r.id}"`).join(", ")}`);

    const fail = judgeCase(c, c.reference.fail, tools);
    if (fail.passed) problems.push(`${at}: the reference fail design meets every requirement`);

    if (judgeCase(c, emptyDesign(c), tools).passed) problems.push(`${at}: a design that does nothing meets every requirement`);
  }
  return { ok: problems.length === 0, problems };
}
