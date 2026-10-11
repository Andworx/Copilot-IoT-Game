import { DESIGNER_KINDS, GAME_SPEC_VERSION, SPEC_LIMITS } from "./gamespec";

/**
 * JSON Schema handed to the Foundry model as its structured-output format, plus the converter
 * back to the internal GameSpec shape.
 *
 * Strict structured output (verified against the live service, 2026-10-10) only accepts a
 * subset of JSON Schema: every object lists all its properties as required and forbids extras,
 * every schema node has a `type` (so no bare `const`), and there are no open-ended maps. The
 * internal GameSpec uses maps (scenario inputs, argument matchers) and free-form reference
 * designs, so the wire format spells those as arrays of key/value entries and JSON strings, and
 * `fromWireSpec` rebuilds the internal shape. `validateGameSpec` stays authoritative: it also
 * checks tool names, argument values and `fromInput` keys against the real server.
 */

const str = (maxLength: number) => ({ type: "string", maxLength });
const nullable = (schema: object) => ({ anyOf: [schema, { type: "null" }] });
const scalar = { anyOf: [str(SPEC_LIMITS.scalarChars), { type: "number" }, { type: "boolean" }] };
const literal = (value: string) => ({ type: "string", enum: [value] });

function strictObject(properties: Record<string, object>) {
  return { type: "object", additionalProperties: false, required: Object.keys(properties), properties };
}

const argMatcher = {
  anyOf: [
    strictObject({ equals: scalar }),
    strictObject({ oneOf: { type: "array", items: scalar } }),
    strictObject({ fromInput: str(40) }),
  ],
};

const callMatcher = strictObject({
  tool: str(64),
  args: nullable({ type: "array", items: strictObject({ name: str(40), matcher: argMatcher }) }),
});

const predicateRef = { $ref: "#/$defs/predicate" };

const predicate = {
  anyOf: [
    strictObject({
      op: literal("called"),
      call: callMatcher,
      min: nullable({ type: "integer" }),
      max: nullable({ type: "integer" }),
    }),
    strictObject({ op: literal("not-called"), call: callMatcher }),
    strictObject({ op: literal("before"), first: callMatcher, then: callMatcher }),
    strictObject({ op: literal("all"), of: { type: "array", items: predicateRef } }),
    strictObject({ op: literal("any"), of: { type: "array", items: predicateRef } }),
    strictObject({ op: literal("not"), of: predicateRef }),
    strictObject({
      op: literal("design"),
      path: str(80),
      // One enum plus one value, so the model is never asked to fill an "unused" field. (Two
      // nullable fields made strict output set both, or put filler text in the unused one.)
      mode: { type: "string", enum: ["equals", "contains"] },
      value: scalar,
    }),
  ],
};

const slug = { type: "string", pattern: "^[a-z][a-z0-9-]{0,39}$" };

const scenarioSpec = strictObject({
  name: str(60),
  trigger: { type: "string", enum: ["record-created", "recurrence", "manual"] },
  input: { type: "array", items: strictObject({ key: str(40), value: scalar }) },
});

const requirementSpec = strictObject({
  id: slug,
  text: str(SPEC_LIMITS.requirementChars),
  scenario: nullable(str(60)),
  check: predicateRef,
});

const caseSpec = strictObject({
  id: slug,
  title: str(SPEC_LIMITS.titleChars),
  designer: { type: "string", enum: [...DESIGNER_KINDS] },
  judging: { type: "string", enum: ["run", "design"] },
  brief: str(SPEC_LIMITS.briefChars),
  requirements: { type: "array", items: requirementSpec },
  scenarios: { type: "array", items: scenarioSpec },
  hint: str(SPEC_LIMITS.hintChars),
  /**
   * Designs are JSON text on the wire: strict mode has no free-form objects. Required, not
   * nullable: when it was nullable the model sometimes skipped it.
   */
  reference: strictObject({ pass: str(SPEC_LIMITS.referenceBytes), fail: str(SPEC_LIMITS.referenceBytes) }),
});

export const GAME_SPEC_JSON_SCHEMA = {
  title: "MCP Quest GameSpec",
  ...strictObject({
    version: { type: "integer", enum: [GAME_SPEC_VERSION] },
    server: strictObject({ id: slug, name: str(SPEC_LIMITS.titleChars), toolsHash: { type: "string", pattern: "^[0-9a-f]{16}$" } }),
    title: str(SPEC_LIMITS.titleChars),
    scenario: str(SPEC_LIMITS.scenarioChars),
    cases: { type: "array", items: caseSpec },
  }),
  $defs: { predicate },
} as const;

// ---- wire -> internal ---------------------------------------------------------------------

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);

function callFromWire(call: unknown): unknown {
  if (!isObj(call)) return call;
  const { args, ...rest } = call;
  if (!Array.isArray(args)) return args === null || args === undefined ? rest : call;
  const map: Obj = {};
  for (const entry of args) {
    if (isObj(entry) && typeof entry.name === "string") map[entry.name] = entry.matcher;
  }
  return { ...rest, args: map };
}

function predicateFromWire(p: unknown): unknown {
  if (!isObj(p)) return p;
  const out: Obj = { ...p };
  for (const key of ["call", "first", "then"]) if (key in out) out[key] = callFromWire(out[key]);
  // Models often write JSONPath ("$.severity"); the internal grammar is plain dot/index notation.
  if (out.op === "design" && typeof out.path === "string") out.path = out.path.replace(/^\$\.?/, "");
  if (out.op === "design") {
    if (out.mode === "equals" || out.mode === "contains") {
      const { mode, value, ...rest } = out;
      return { ...rest, ...(mode === "equals" ? { equals: value } : { contains: String(value) }) };
    }
    // Older shape with separate fields: drop the one left as "" or null.
    if (out.contains === "" || out.contains === null) delete out.contains;
    if (out.equals === null) delete out.equals;
  }
  if (Array.isArray(out.of)) out.of = out.of.map(predicateFromWire);
  else if ("of" in out) out.of = predicateFromWire(out.of);
  return out;
}

/**
 * Turns a model answer in wire form into the internal GameSpec shape. Anything unexpected is
 * passed through untouched so `validateGameSpec` reports it.
 */
export function fromWireSpec(wire: unknown): unknown {
  if (!isObj(wire) || !Array.isArray(wire.cases)) return wire;
  const cases = wire.cases.map((c: unknown) => {
    if (!isObj(c)) return c;
    const out: Obj = { ...c };
    if (Array.isArray(c.scenarios)) {
      out.scenarios = c.scenarios.map((s: unknown) => {
        if (!isObj(s) || !Array.isArray(s.input)) return s;
        const input: Obj = {};
        for (const e of s.input) if (isObj(e) && typeof e.key === "string") input[e.key] = e.value;
        return { ...s, input };
      });
    }
    if (Array.isArray(c.requirements)) {
      out.requirements = c.requirements.map((r: unknown) => (isObj(r) ? { ...r, check: predicateFromWire(r.check) } : r));
    }
    if (isObj(c.reference)) {
      const parse = (v: unknown) => {
        if (typeof v !== "string") return v;
        try {
          return JSON.parse(v) as unknown;
        } catch {
          return v;
        }
      };
      out.reference = { pass: parse(c.reference.pass), fail: parse(c.reference.fail) };
    }
    return out;
  });
  return { ...wire, cases };
}
