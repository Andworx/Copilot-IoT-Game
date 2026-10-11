import { test } from "node:test";
import assert from "node:assert/strict";
import { GAME_SPEC_VERSION, computeToolsHash, type CaseSpec, type GameSpec } from "../src/mcpquest/gamespec";
import { emptyDesign, judgeCase, proveSpec, readPath, runDesign, scalarsEqual, undiscoverableValues } from "../src/mcpquest/specJudge";
import { DEFAULT_SNAPSHOT, SNAPSHOTS } from "../src/mcpquest/snapshot";
import type { ToolDef } from "../src/mcpquest/types";

const tools = SNAPSHOTS[DEFAULT_SNAPSHOT].tools as unknown as ToolDef[];

const scenario = { name: "p1", trigger: "record-created" as const, input: { incidentId: "INC0001", priority: "1" } };

/** Approval-style flow case: read the ticket, then move it to In Progress, never add a comment. */
function flowCase(): CaseSpec {
  return {
    id: "start-work",
    title: "Start work",
    designer: "flow",
    judging: "run",
    brief: "Move new incidents into progress.",
    scenarios: [scenario],
    hint: "Read before you write.",
    requirements: [
      {
        id: "read-first",
        text: "Read the incident before updating it",
        check: {
          op: "before",
          first: { tool: "get_incident", args: { incident_id: { fromInput: "incidentId" } } },
          then: { tool: "update_incident", args: { incident_id: { fromInput: "incidentId" } } },
        },
      },
      {
        id: "in-progress",
        text: "Move it to In Progress exactly once",
        check: { op: "called", call: { tool: "update_incident", args: { state: { equals: "In Progress" } } }, min: 1, max: 1 },
      },
      { id: "no-comment", text: "Leave no comment", check: { op: "not-called", call: { tool: "add_comment" } } },
    ],
    reference: {
      pass: {
        trigger: "record-created",
        steps: [
          { id: "s1", tool: "get_incident", args: { incident_id: { fromInput: "incidentId" } } },
          { id: "s2", tool: "update_incident", args: { incident_id: { fromInput: "incidentId" }, state: "In Progress" } },
        ],
      },
      fail: {
        trigger: "record-created",
        steps: [{ id: "s1", tool: "update_incident", args: { incident_id: "INC0001", state: "In Progress" } }],
      },
    },
  };
}

function reportCase(): CaseSpec {
  return {
    id: "queue-report",
    title: "Queue report",
    designer: "report",
    judging: "design",
    brief: "Show high priority queue.",
    scenarios: [],
    hint: "Filter it.",
    requirements: [
      { id: "priority", text: "Only priority 1", check: { op: "design", path: "filters[0].value", equals: "1" } },
      { id: "title", text: "Titled", check: { op: "design", path: "title", contains: "queue" } },
    ],
    reference: {
      pass: { title: "P1 Queue", filters: [{ field: "priority", value: "1" }] },
      fail: { title: "Everything", filters: [{ field: "priority", value: "3" }] },
    },
  };
}

const spec = (cases: CaseSpec[]): GameSpec => ({
  version: GAME_SPEC_VERSION,
  server: { id: "it-ticketing", name: "IT", toolsHash: computeToolsHash(tools) },
  title: "T",
  scenario: "S",
  cases,
});

test("a correct design passes every requirement, a wrong one does not", () => {
  const c = flowCase();
  assert.equal(judgeCase(c, c.reference!.pass, tools).passed, true);
  const bad = judgeCase(c, c.reference!.fail, tools);
  assert.equal(bad.passed, false);
  assert.deepEqual(bad.requirements.filter((r) => !r.ok).map((r) => r.id), ["read-first"]);
});

test("a design that does nothing, or has the wrong trigger, fires no calls", () => {
  const c = flowCase();
  const none = judgeCase(c, emptyDesign(c), tools);
  assert.equal(none.passed, false);
  assert.deepEqual(none.requirements.map((r) => r.ok), [false, false, true]);

  const wrongTrigger = { ...(c.reference!.pass as object), trigger: "manual" };
  assert.equal(runDesign(wrongTrigger, scenario, tools).fired, false);
  assert.equal(judgeCase(c, wrongTrigger, tools).requirements[0].ok, false);
});

test("min and max bound how often a call happens", () => {
  const c = flowCase();
  const twice = {
    trigger: "record-created",
    steps: [
      { tool: "get_incident", args: { incident_id: "INC0001" } },
      { tool: "update_incident", args: { incident_id: "INC0001", state: "In Progress" } },
      { tool: "update_incident", args: { incident_id: "INC0001", state: "In Progress" } },
    ],
  };
  const v = judgeCase(c, twice, tools);
  assert.equal(v.requirements.find((r) => r.id === "in-progress")!.ok, false, "max: 1 is exceeded");
});

test("argument matching: fromInput, equals, oneOf, and missing arguments", () => {
  const log = runDesign(
    { trigger: "record-created", steps: [{ tool: "update_incident", args: { incident_id: "inc0001", priority: "2" } }] },
    scenario,
    tools,
  );
  const c: CaseSpec = {
    ...flowCase(),
    requirements: [
      { id: "a", text: "a", check: { op: "called", call: { tool: "update_incident", args: { incident_id: { fromInput: "incidentId" } } } } },
      { id: "b", text: "b", check: { op: "called", call: { tool: "update_incident", args: { priority: { oneOf: ["1", "2"] } } } } },
      { id: "c", text: "c", check: { op: "called", call: { tool: "update_incident", args: { state: { equals: "Closed" } } } } },
    ],
  };
  assert.equal(log.calls.length, 1);
  const v = judgeCase(c, { trigger: "record-created", steps: [{ tool: "update_incident", args: { incident_id: "inc0001", priority: "2" } }] }, tools);
  assert.deepEqual(v.requirements.map((r) => r.ok), [true, true, false], "case-insensitive ids; absent argument never matches");
});

test("combinators: all, any, not", () => {
  const call = (tool: string) => ({ op: "called" as const, call: { tool } });
  const c: CaseSpec = {
    ...flowCase(),
    requirements: [
      { id: "all", text: "", check: { op: "all", of: [call("get_incident"), call("update_incident")] } },
      { id: "any", text: "", check: { op: "any", of: [call("add_comment"), call("get_incident")] } },
      { id: "not", text: "", check: { op: "not", of: call("add_comment") } },
    ],
  };
  assert.deepEqual(judgeCase(c, c.reference!.pass, tools).requirements.map((r) => r.ok), [true, true, true]);
});

test("calls that do not exist are reported and never counted", () => {
  const c = flowCase();
  const design = {
    trigger: "record-created",
    steps: [
      { tool: "get_incident", args: { incident_id: "INC0001" } },
      { tool: "launch_missiles", args: {} },
      { tool: "update_incident", args: { incident_id: "INC0001", colour: "red", state: "In Progress" } },
      { tool: "update_incident", args: { incident_id: "INC0001", state: "Exploded" } },
      { tool: "update_incident", args: {} },
    ],
  };
  const v = judgeCase(c, design, tools);
  assert.equal(v.problems.length, 4);
  assert.match(v.problems.join("\n"), /launch_missiles.*not on this server/);
  assert.match(v.problems.join("\n"), /no argument "colour"/);
  assert.match(v.problems.join("\n"), /not an allowed value/);
  assert.match(v.problems.join("\n"), /missing required argument "incident_id"/);
  assert.equal(v.passed, false);
});

test("malformed or oversized designs are rejected without throwing", () => {
  for (const design of [null, 5, "x", [], {}, { steps: "no" }, { trigger: "record-created", steps: [null, 3, { tool: 7 }] }]) {
    assert.doesNotThrow(() => judgeCase(flowCase(), design, tools));
    assert.equal(judgeCase(flowCase(), design, tools).passed, false);
  }
  const huge = { trigger: "record-created", steps: Array.from({ length: 41 }, () => ({ tool: "get_incident", args: { incident_id: "x" } })) };
  assert.match(judgeCase(flowCase(), huge, tools).problems.join(), /more than 40 steps/);
});

test("design-judged cases read paths in the design", () => {
  const c = reportCase();
  assert.equal(judgeCase(c, c.reference!.pass).passed, true);
  const v = judgeCase(c, c.reference!.fail);
  assert.deepEqual(v.requirements.map((r) => r.ok), [false, false]);
  assert.equal(judgeCase(c, {}).passed, false);
  assert.match(judgeCase(c, "nope").problems.join(), /JSON object/);
});

test("paths cannot reach prototypes and tolerate missing parts", () => {
  const design = { a: { b: [{ c: 5 }] } };
  assert.equal(readPath(design, "a.b[0].c"), 5);
  assert.equal(readPath(design, "a.b[1].c"), undefined);
  assert.equal(readPath(design, "a.x"), undefined);
  for (const p of ["__proto__", "a.__proto__", "constructor", "a.constructor.name", "toString"]) {
    assert.equal(readPath(design, p), undefined, p);
  }
});

test("scalar comparison is trimmed and case-insensitive, and never matches objects", () => {
  assert.equal(scalarsEqual(" High ", "high"), true);
  assert.equal(scalarsEqual(1, "1"), true);
  assert.equal(scalarsEqual(true, "True"), true);
  assert.equal(scalarsEqual({}, "x"), false);
  assert.equal(scalarsEqual(null, undefined), false);
});

test("a good spec is proven", () => {
  const proof = proveSpec(spec([flowCase(), reportCase()]), tools);
  assert.deepEqual(proof, { ok: true, problems: [] });
});

test("proof catches unwinnable, trivial and mis-referenced cases", () => {
  // Pass design that does not meet its own requirements.
  const unwinnable = flowCase();
  unwinnable.reference = { pass: unwinnable.reference!.fail, fail: unwinnable.reference!.fail };
  const a = proveSpec(spec([unwinnable]), tools);
  assert.equal(a.ok, false);
  assert.match(a.problems.join("\n"), /reference pass design fails "read-first"/);

  // Fail design that actually passes.
  const toothless = flowCase();
  toothless.reference = { pass: toothless.reference!.pass, fail: toothless.reference!.pass };
  assert.match(proveSpec(spec([toothless]), tools).problems.join("\n"), /reference fail design meets every requirement/);

  // Requirements a do-nothing design already meets.
  const trivial = flowCase();
  trivial.requirements = [trivial.requirements[2]];
  trivial.reference = { pass: trivial.reference!.pass, fail: { trigger: "record-created", steps: [{ tool: "add_comment", args: { incident_id: "INC0001", text: "x" } }] } };
  const t = proveSpec(spec([trivial]), tools);
  assert.match(t.problems.join("\n"), /does nothing meets every requirement/);

  // Reference using a tool that is not on the server.
  const invented = flowCase();
  invented.reference = { pass: { trigger: "record-created", steps: [{ tool: "teleport_ticket", args: {} }] }, fail: invented.reference!.fail };
  assert.match(proveSpec(spec([invented]), tools).problems.join("\n"), /teleport_ticket/);
});

test("values the player cannot find in what they are shown are reported", () => {
  const c: CaseSpec = {
    ...flowCase(),
    scenarios: [{ name: "s", trigger: "record-created", input: { incidentId: "INC0001" } }],
    requirements: [
      { id: "in-sample", text: "Assign it to the network team", check: { op: "called", call: { tool: "update_incident", args: { assignment_group_id: { equals: "GRP-0006" } } } } },
      { id: "in-enum", text: "Move it on", check: { op: "called", call: { tool: "update_incident", args: { state: { equals: "In Progress" } } } } },
      { id: "in-text", text: "Priority 3 only", check: { op: "called", call: { tool: "update_incident", args: { priority: { equals: "3" } } } } },
      { id: "hidden", text: "Assign it correctly", check: { op: "called", call: { tool: "update_incident", args: { assignment_group_id: { equals: "GRP-9999" } } } } },
      { id: "design-hidden", text: "Set the cap", check: { op: "design", path: "limit", equals: 876.25 } },
    ],
  };
  const samples = [{ tool: "list_assignment_groups", text: '{"data":[{"id":"GRP-0006","name":"Network"}]}' }];
  assert.deepEqual(undiscoverableValues(c, samples, tools), ['"GRP-9999" (requirement "hidden")', '"876.25" (requirement "design-hidden")']);
  assert.deepEqual(undiscoverableValues({ ...c, requirements: c.requirements.slice(0, 3) }, samples, tools), []);
  // Case-insensitive, and booleans are not data.
  c.requirements = [{ id: "b", text: "x", check: { op: "design", path: "open", equals: true } }];
  assert.deepEqual(undiscoverableValues(c, [], tools), []);
});

test("proof fails a case whose answer cannot be found, only when samples are supplied", () => {
  const c = flowCase();
  c.requirements[1] = {
    id: "in-progress",
    text: "Assign it to the right team",
    check: { op: "called", call: { tool: "update_incident", args: { assignment_group_id: { equals: "GRP-0042" } } } },
  };
  c.reference = {
    pass: { trigger: "record-created", steps: [
      { tool: "get_incident", args: { incident_id: { fromInput: "incidentId" } } },
      { tool: "update_incident", args: { incident_id: { fromInput: "incidentId" }, assignment_group_id: "GRP-0042" } },
    ] },
    fail: c.reference!.fail,
  };
  assert.equal(proveSpec(spec([c]), tools).ok, true, "no samples: not checked");
  const hidden = proveSpec(spec([c]), tools, [{ tool: "list_incidents", text: "{}" }]);
  assert.equal(hidden.ok, false);
  assert.match(hidden.problems.join(), /player cannot find "GRP-0042"/);
  assert.equal(proveSpec(spec([c]), tools, [{ tool: "list_assignment_groups", text: "GRP-0042" }]).ok, true);
});

test("{{key}} in a step argument means the scenario's input", () => {
  const c = flowCase();
  const design = {
    trigger: "record-created",
    steps: [
      { tool: "get_incident", args: { incident_id: "{{incidentId}}" } },
      { tool: "update_incident", args: { incident_id: " {{ incidentId }} ", state: "In Progress" } },
    ],
  };
  const v = judgeCase(c, design, tools);
  assert.equal(v.passed, true, JSON.stringify(v));
  const unknown = runDesign({ trigger: "record-created", steps: [{ tool: "get_incident", args: { incident_id: "{{nope}}" } }] }, scenario, tools);
  assert.equal(unknown.calls.length, 0);
  assert.match(unknown.problems.join(), /no usable value/);
});
