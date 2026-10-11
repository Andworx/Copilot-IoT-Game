import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GAME_SPEC_VERSION,
  SPEC_LIMITS,
  canonicalJson,
  computeSpecId,
  computeToolsHash,
  validateGameSpec,
  type GameSpec,
} from "../src/mcpquest/gamespec";
import { GAME_SPEC_JSON_SCHEMA, fromWireSpec } from "../src/mcpquest/gamespecSchema";
import { DEFAULT_SNAPSHOT, SNAPSHOTS } from "../src/mcpquest/snapshot";
import type { ToolDef } from "../src/mcpquest/types";

const tools = SNAPSHOTS[DEFAULT_SNAPSHOT].tools as unknown as ToolDef[];
const toolsHash = computeToolsHash(tools);

/** A realistic spec for the bundled it-ticketing server. Tests clone and break it. */
function validSpec(): GameSpec {
  return {
    version: GAME_SPEC_VERSION,
    server: { id: "it-ticketing", name: "IT Ticketing", toolsHash },
    title: "Night shift triage",
    scenario: "The overnight queue is out of control. Build the automation that calms it down.",
    cases: [
      {
        id: "escalate-p1",
        title: "Escalate priority 1",
        designer: "flow",
        judging: "run",
        brief: "Priority 1 incidents need a manager's sign-off before work starts.",
        requirements: [
          {
            id: "approval-first",
            text: "A priority 1 incident is approved before it moves to In Progress",
            scenario: "p1-arrives",
            check: {
              op: "all",
              of: [
                { op: "called", call: { tool: "update_incident", args: { state: { equals: "In Progress" }, incident_id: { fromInput: "incidentId" } } } },
                { op: "not", of: { op: "not-called", call: { tool: "add_comment" } } },
              ],
            },
          },
          {
            id: "routine-untouched",
            text: "A routine incident is left alone",
            scenario: "routine-arrives",
            check: { op: "not-called", call: { tool: "update_incident", args: { priority: { oneOf: ["1", "2"] } } } },
          },
        ],
        scenarios: [
          { name: "p1-arrives", trigger: "record-created", input: { incidentId: "INC0001", priority: "1" } },
          { name: "routine-arrives", trigger: "record-created", input: { incidentId: "INC0002", priority: "4" } },
        ],
        hint: "Think about which field decides who has to agree.",
      },
      {
        id: "queue-report",
        title: "Queue by category",
        designer: "report",
        judging: "design",
        brief: "Managers want to see the queue broken down by category.",
        requirements: [{ id: "grouped", text: "The report groups incidents by category", check: { op: "design", path: "field", equals: "category" } }],
        scenarios: [],
        hint: "Pick the field managers slice the queue by.",
      },
    ],
  };
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

function errorsOf(mutate: (s: any) => void, opts = { tools }): string[] {
  const s = clone(validSpec()) as any;
  mutate(s);
  const r = validateGameSpec(s, opts);
  assert.equal(r.ok, false, "expected the spec to be rejected");
  return r.ok ? [] : r.errors;
}

test("a valid spec passes and round-trips unchanged", () => {
  const r = validateGameSpec(validSpec(), { tools, bindToTools: true });
  assert.equal(r.ok, true, r.ok ? "" : r.errors.join("\n"));
  if (r.ok) assert.deepEqual(r.spec, validSpec());
});

test("null optional fields (strict structured output) are treated as absent", () => {
  const s = clone(validSpec()) as any;
  s.cases[0].reference = null;
  s.cases[0].requirements[0].scenario = null;
  s.cases[1].requirements[0].scenario = null;
  const r = validateGameSpec(s, { tools });
  assert.equal(r.ok, true, r.ok ? "" : r.errors.join("\n"));
  if (r.ok) assert.equal("scenario" in r.spec.cases[1].requirements[0], false);
});

test("unknown fields are rejected at every level", () => {
  assert.match(errorsOf((s) => (s.extra = 1)).join(), /spec\.extra: unknown field/);
  assert.match(errorsOf((s) => (s.cases[0].script = "x")).join(), /cases\[0\]\.script: unknown field/);
  assert.match(errorsOf((s) => (s.cases[0].requirements[0].check.extra = 1)).join(), /unknown field/);
});

test("tools, arguments and values are checked against the real server", () => {
  assert.match(
    errorsOf((s) => (s.cases[0].requirements[1].check.call.tool = "delete_everything")).join(),
    /tool "delete_everything" is not on this MCP server/,
  );
  assert.match(
    errorsOf((s) => (s.cases[0].requirements[1].check.call.args = { colour: { equals: "red" } })).join(),
    /has no argument "colour"/,
  );
  assert.match(
    errorsOf((s) => (s.cases[0].requirements[0].check.of[0].call.args.state = { equals: "Exploded" })).join(),
    /not an allowed value of update_incident\.state/,
  );
});

test("fromInput must name a key every targeted scenario supplies", () => {
  const e = errorsOf((s) => (s.cases[0].requirements[0].check.of[0].call.args.incident_id = { fromInput: "missing" }));
  assert.match(e.join(), /scenario input has no "missing"/);
  // Without a scenario the key must exist in all of them.
  const e2 = errorsOf((s) => {
    delete s.cases[0].requirements[0].scenario;
    delete s.cases[0].scenarios[1].input.incidentId;
  });
  assert.match(e2.join(), /scenario input has no "incidentId"/);
});

test("an arg matcher needs exactly one condition", () => {
  const e = errorsOf((s) => (s.cases[0].requirements[0].check.of[0].call.args.state = { equals: "New", oneOf: ["New"] }));
  assert.match(e.join(), /exactly one of equals, oneOf, fromInput/);
});

test("a design-judged case cannot use call predicates", () => {
  const e = errorsOf((s) => (s.cases[1].requirements[0].check = { op: "called", call: { tool: "list_incidents" } }));
  assert.match(e.join(), /needs a run/);
});

test("a run case needs scenarios; duplicates and unknown scenario names are rejected", () => {
  assert.match(errorsOf((s) => (s.cases[0].scenarios = [])).join(), /scenarios: must have 1 to 6 items/);
  assert.match(errorsOf((s) => (s.cases[0].scenarios[1].name = "p1-arrives")).join(), /duplicate scenario name/);
  assert.match(errorsOf((s) => (s.cases[0].requirements[0].scenario = "nope")).join(), /no scenario named "nope"/);
});

test("ids must be unique slugs", () => {
  assert.match(errorsOf((s) => (s.cases[1].id = "escalate-p1")).join(), /duplicate case id/);
  assert.match(errorsOf((s) => (s.cases[0].requirements[1].id = "approval-first")).join(), /duplicate requirement id/);
  assert.match(errorsOf((s) => (s.cases[0].id = "Not A Slug")).join(), /lowercase slug/);
});

test("predicate depth and size are bounded", () => {
  const e = errorsOf((s) => {
    let p: any = { op: "not-called", call: { tool: "add_comment" } };
    for (let i = 0; i < 6; i++) p = { op: "not", of: p };
    s.cases[0].requirements[1].check = p;
  });
  assert.match(e.join(), /nested deeper than 4/);

  const wide = errorsOf((s) => {
    const leaf = { op: "not-called", call: { tool: "add_comment" } };
    s.cases[0].requirements[1].check = {
      op: "all",
      of: Array.from({ length: 8 }, () => ({ op: "all", of: Array.from({ length: 8 }, () => leaf) })),
    };
  });
  assert.match(wide.join(), /at most 30 checks/);
});

test("called min/max are bounded and ordered", () => {
  const e = errorsOf((s) => (s.cases[0].requirements[0].check.of[0] = { op: "called", call: { tool: "get_incident" }, min: 5, max: 2 }));
  assert.match(e.join(), /min is greater than max/);
  assert.match(errorsOf((s) => (s.cases[0].requirements[0].check.of[0] = { op: "called", call: { tool: "get_incident" }, min: 999 })).join(), /integer from 0 to 50/);
});

test("design paths use a restricted grammar", () => {
  for (const bad of ["__proto__.x y", "a..b", "a[x]", "constructor.prototype; drop", ""]) {
    const e = errorsOf((s) => (s.cases[1].requirements[0].check.path = bad));
    assert.match(e.join(), /must be a path like/, bad);
  }
});

test("text limits and control characters are enforced", () => {
  assert.match(errorsOf((s) => (s.title = "x".repeat(SPEC_LIMITS.titleChars + 1))).join(), /at most 80 characters/);
  assert.match(errorsOf((s) => (s.scenario = "bad\u0007bell")).join(), /control characters/);
  assert.match(errorsOf((s) => (s.cases[0].hint = "  ")).join(), /must not be empty/);
});

test("the spec is bound to the server's tool list", () => {
  const wrong = clone(validSpec());
  wrong.server.toolsHash = "0123456789abcdef";
  const r = validateGameSpec(wrong, { tools, bindToTools: true });
  assert.equal(r.ok, false);
  assert.match(r.ok ? "" : r.errors.join(), /does not match the server's tool list/);
  assert.equal(validateGameSpec(wrong, { tools }).ok, true, "binding is opt-in");
  // A reworded description does not change the hash; a changed parameter does.
  const reworded = clone(tools);
  reworded[0].description = "something else";
  assert.equal(computeToolsHash(reworded), toolsHash);
  const changed = clone(tools);
  changed[0].inputSchema.properties.limit = { type: "string" };
  assert.notEqual(computeToolsHash(changed), toolsHash);
});

test("requireReference demands pass and fail designs, within the size cap", () => {
  const without = validateGameSpec(validSpec(), { tools, requireReference: true });
  assert.equal(without.ok, false);

  const withRef = (s: any) => {
    for (const c of s.cases) c.reference = { pass: { trigger: "record-created", steps: [] }, fail: { trigger: "manual", steps: [] } };
  };
  const ok = clone(validSpec()) as any;
  withRef(ok);
  assert.equal(validateGameSpec(ok, { tools, requireReference: true }).ok, true);

  const huge = clone(ok);
  huge.cases[0].reference.pass = { blob: "x".repeat(SPEC_LIMITS.referenceBytes) };
  const r = validateGameSpec(huge, { tools });
  assert.equal(r.ok, false);
  assert.match(r.ok ? "" : r.errors.join(), /larger than 20000 bytes/);
});

test("non-object input never throws", () => {
  for (const v of [null, undefined, 42, "x", [], { cases: "no" }]) {
    assert.equal(validateGameSpec(v, { tools }).ok, false);
  }
});

test("canonical JSON and spec ids are stable under key order", () => {
  assert.equal(canonicalJson({ b: 1, a: { d: 2, c: [3, { z: 1, y: 2 }] } }), '{"a":{"c":[3,{"y":2,"z":1}],"d":2},"b":1}');
  const a = validSpec();
  const reverse = (v: any): any =>
    Array.isArray(v) ? v.map(reverse) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).reverse().map(([k, x]) => [k, reverse(x)])) : v;
  assert.equal(computeSpecId(a), computeSpecId(reverse(a)));
  const changed = validSpec();
  changed.title = "Different";
  assert.notEqual(computeSpecId(changed), computeSpecId(a));
});

test("the JSON Schema follows strict structured-output rules and covers every predicate op", () => {
  const schema = GAME_SPEC_JSON_SCHEMA as any;
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual([...schema.required].sort(), Object.keys(schema.properties).sort());
  const ops = schema.$defs.predicate.anyOf.map((o: any) => o.properties.op.enum[0]).sort();
  assert.deepEqual(ops, ["all", "any", "before", "called", "design", "not", "not-called"]);

  // Rules the live service enforced (2026-10-09 run): fixed properties, all required, no
  // open maps, and a `type` on every node (a bare `const` was rejected).
  const walk = (n: any, path: string) => {
    if (!n || typeof n !== "object") return;
    assert.equal("const" in n, false, `${path} uses const`);
    if (n.type === "object") {
      assert.ok(n.properties, `${path} is an object without fixed properties`);
      assert.equal(n.additionalProperties, false, path);
      assert.deepEqual([...n.required].sort(), Object.keys(n.properties).sort(), path);
    }
    for (const [k, v] of Object.entries(n)) walk(v, `${path}.${k}`);
  };
  walk(schema, "schema");
});

test("the wire format converts back to the internal spec and validates", () => {
  const wire = clone(validSpec()) as any;
  for (const c of wire.cases) {
    c.scenarios = c.scenarios.map((s: any) => ({ ...s, input: Object.entries(s.input).map(([key, value]) => ({ key, value })) }));
    c.reference = { pass: JSON.stringify({ trigger: "record-created", steps: [] }), fail: JSON.stringify({ trigger: "manual", steps: [] }) };
  }
  // Rewrite every call's args map as the wire's name/matcher array.
  const toArray = (node: any): void => {
    if (!node || typeof node !== "object") return;
    if (node.args && !Array.isArray(node.args)) node.args = Object.entries(node.args).map(([name, matcher]) => ({ name, matcher }));
    for (const v of Object.values(node)) toArray(v);
  };
  wire.cases.forEach((c: any) => c.requirements.forEach((r: any) => toArray(r.check)));

  const internal = fromWireSpec(wire) as any;
  assert.deepEqual(internal.cases[0].scenarios[0].input, { incidentId: "INC0001", priority: "1" });
  assert.deepEqual(internal.cases[0].reference.pass, { trigger: "record-created", steps: [] });
  assert.deepEqual(internal.cases[0].requirements[0].check.of[0].call.args.state, { equals: "In Progress" });
  const r = validateGameSpec(internal, { tools, bindToTools: true, requireReference: true });
  assert.equal(r.ok, true, r.ok ? "" : r.errors.join("\n"));
});

test("fromWireSpec passes unexpected shapes through for the validator to report", () => {
  for (const v of [null, 5, "x", { cases: "no" }, { cases: [null, 3] }]) assert.doesNotThrow(() => fromWireSpec(v));
  assert.equal(validateGameSpec(fromWireSpec({ cases: "no" }), { tools }).ok, false);
});
test("JSONPath-style design paths from a model are normalised", () => {
  const wire = clone(validSpec()) as any;
  wire.cases[1].requirements[0].check.path = "$.field";
  const internal = fromWireSpec(wire) as any;
  assert.equal(internal.cases[1].requirements[0].check.path, "field");
  assert.equal(validateGameSpec(internal, { tools }).ok, true);
});
test("placeholder values for the unused equals/contains are dropped, real conflicts are not", () => {
  const wire = clone(validSpec()) as any;
  wire.cases[1].requirements[0].check = { op: "design", path: "field", equals: "category", contains: "" };
  assert.equal(validateGameSpec(fromWireSpec(wire), { tools }).ok, true);
  wire.cases[1].requirements[0].check = { op: "design", path: "field", equals: "category", contains: "cat" };
  assert.equal(validateGameSpec(fromWireSpec(wire), { tools }).ok, false, "both set is still an error");
});
test("a design check's mode and value become equals or contains", () => {
  const wire = clone(validSpec()) as any;
  wire.cases[1].requirements[0].check = { op: "design", path: "$.field", mode: "equals", value: "category" };
  let internal = fromWireSpec(wire) as any;
  assert.deepEqual(internal.cases[1].requirements[0].check, { op: "design", path: "field", equals: "category" });
  assert.equal(validateGameSpec(internal, { tools }).ok, true);
  wire.cases[1].requirements[0].check = { op: "design", path: "field", mode: "contains", value: 5 };
  internal = fromWireSpec(wire) as any;
  assert.deepEqual(internal.cases[1].requirements[0].check, { op: "design", path: "field", contains: "5" });
});