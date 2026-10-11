import { test } from "node:test";
import assert from "node:assert/strict";
import type { CaseSpec } from "../src/mcpquest/gamespec";
import { judgeCase } from "../src/mcpquest/specJudge";
import {
  type ActionStep,
  buildSettings,
  coerceArg,
  coerceField,
  designFieldsOf,
  emptyActionDesign,
  getPath,
  labelForPath,
  nextStepId,
  parseActionDesign,
  scenarioKeys,
  scenarioTriggers,
  setPath,
  settingsValues,
  template,
  templateKey,
  triggerLabel,
} from "../src/mcpquest/specDesigns";
import { specSession } from "../src/mcpquest/specPlay";
import { DEFAULT_SNAPSHOT, SNAPSHOTS } from "../src/mcpquest/snapshot";
import { GAME_SPEC_VERSION, computeSpecId, computeToolsHash, type GameSpec } from "../src/mcpquest/gamespec";
import type { ToolDef } from "../src/mcpquest/types";

const tools = SNAPSHOTS[DEFAULT_SNAPSHOT].tools as unknown as ToolDef[];

const reportCase: CaseSpec = {
  id: "queue-report",
  title: "Queue report",
  designer: "report",
  judging: "design",
  brief: "Show the queue.",
  scenarios: [],
  hint: "Filter it.",
  requirements: [
    { id: "a", text: "Only submitted", check: { op: "design", path: "status", equals: "Submitted" } },
    { id: "b", text: "Minimum total", check: { op: "design", path: "minAmount", equals: 876.25 } },
    { id: "c", text: "Open only", check: { op: "design", path: "filters[0].open", equals: true } },
    { id: "d", text: "Titled", check: { op: "all", of: [{ op: "design", path: "title", contains: "queue" }, { op: "not", of: { op: "design", path: "status", equals: "Closed" } }] } },
  ],
  reference: { pass: {}, fail: {} },
};

const flowCase: CaseSpec = {
  id: "start-work",
  title: "Start work",
  designer: "flow",
  judging: "run",
  brief: "Move new incidents into progress.",
  scenarios: [
    { name: "p1", trigger: "record-created", input: { incidentId: "INC0001", priority: "1" } },
    { name: "p2", trigger: "record-created", input: { incidentId: "INC0002" } },
  ],
  hint: "h",
  requirements: [
    { id: "read", text: "Read it", check: { op: "called", call: { tool: "get_incident", args: { incident_id: { fromInput: "incidentId" } } } } },
    { id: "move", text: "Move it", check: { op: "called", call: { tool: "update_incident", args: { state: { equals: "In Progress" }, incident_id: { fromInput: "incidentId" } } } } },
  ],
  reference: { pass: {}, fail: {} },
};

test("fields are derived from the checks, in order, deduplicated, with the right kind", () => {
  assert.deepEqual(designFieldsOf(reportCase), [
    { path: "status", kind: "text", label: "Status" },
    { path: "minAmount", kind: "number", label: "Min amount" },
    { path: "filters[0].open", kind: "boolean", label: "Filters 1 open" },
    { path: "title", kind: "text", label: "Title" },
  ]);
  assert.equal(labelForPath("first_name"), "First name");
  assert.equal(labelForPath("a.b[2].cDe"), "A b 3 c de");
});

test("a settings form filled from the fields satisfies the judge", () => {
  const fields = designFieldsOf(reportCase);
  const design = buildSettings(fields, { status: "Submitted", minAmount: "876.25", "filters[0].open": "true", title: "Open queue" });
  assert.deepEqual(design, { status: "Submitted", minAmount: 876.25, filters: [{ open: true }], title: "Open queue" });
  assert.equal(judgeCase(reportCase, design, tools).passed, true);

  const wrong = buildSettings(fields, { status: "Closed", minAmount: "1", "filters[0].open": "false", title: "x" });
  assert.equal(judgeCase(reportCase, wrong, tools).passed, false);

  // Unset fields are left out of the design, not written as empty values.
  assert.deepEqual(buildSettings(fields, { status: "Submitted", minAmount: "  " }), { status: "Submitted" });
  assert.deepEqual(settingsValues(fields, design), { status: "Submitted", minAmount: "876.25", "filters[0].open": "true", title: "Open queue" });
});

test("paths are written and read safely", () => {
  const o: Record<string, unknown> = {};
  setPath(o, "a.b[1].c", 5);
  assert.equal(JSON.stringify(o), '{"a":{"b":[null,{"c":5}]}}');
  assert.equal(getPath(o, "a.b[1].c"), 5);
  assert.equal(getPath(o, "a.x.y"), undefined);
  for (const p of ["__proto__.x", "a.constructor.prototype.y", ""]) {
    setPath(o, p, "polluted");
    assert.equal(({} as Record<string, unknown>).x, undefined);
    assert.equal(({} as Record<string, unknown>).y, undefined);
  }
  assert.equal(getPath({ a: 1 }, "constructor"), undefined);
});

test("typed values are coerced, and empty means not set", () => {
  assert.equal(coerceField("number", "12.5"), 12.5);
  assert.equal(coerceField("number", "abc"), "abc", "kept as typed so the judge reports it, not lost");
  assert.equal(coerceField("boolean", "Yes"), true);
  assert.equal(coerceField("text", "  hi "), "hi");
  assert.equal(coerceField("text", ""), undefined);

  assert.equal(coerceArg({ type: "integer" }, "5"), 5);
  assert.equal(coerceArg({ type: "boolean" }, "TRUE"), true);
  assert.equal(coerceArg({ type: "string" }, "5"), "5");
  assert.equal(coerceArg({ type: "integer" }, "{{limit}}"), "{{limit}}", "a scenario value is kept as a template");
  assert.equal(coerceArg(undefined, ""), undefined);
});

test("scenario values use {{key}} and are listed from the case's scenarios", () => {
  assert.equal(templateKey("{{ incidentId }}"), "incidentId");
  assert.equal(templateKey("INC0001"), null);
  assert.equal(templateKey(5), null);
  assert.equal(template("priority"), "{{priority}}");
  assert.deepEqual(scenarioKeys(flowCase.scenarios), ["incidentId", "priority"]);
  assert.deepEqual(scenarioTriggers(flowCase.scenarios), ["record-created"]);
  assert.equal(triggerLabel("flow", "record-created"), "When a record is created");
  assert.equal(triggerLabel("agent", "manual"), "When someone asks the agent");
});

test("an action sequence built with the helpers satisfies the judge", () => {
  const empty = emptyActionDesign(scenarioTriggers(flowCase.scenarios));
  assert.deepEqual(empty, { trigger: "record-created", steps: [] });
  assert.equal(judgeCase(flowCase, empty, tools).passed, false);

  const steps: ActionStep[] = [
    { id: nextStepId([]), tool: "get_incident", args: { incident_id: template("incidentId") } },
  ];
  steps.push({ id: nextStepId(steps), tool: "update_incident", args: { incident_id: template("incidentId"), state: coerceArg({ type: "string" }, "In Progress")! } });
  const design = { ...empty, steps };
  assert.deepEqual(steps.map((s) => s.id), ["s1", "s2"]);
  assert.equal(judgeCase(flowCase, design, tools).passed, true);

  // It survives being saved as text and read back.
  assert.deepEqual(parseActionDesign(JSON.stringify(design)), design);
});

test("a saved design that is not an action sequence is rejected, not crashed on", () => {
  for (const text of ["", "null", "[]", '{"trigger":5,"steps":[]}', '{"trigger":"manual","steps":[null]}', '{"trigger":"manual","steps":[{"tool":4}]}', "{bad"]) {
    assert.equal(parseActionDesign(text), null, text);
  }
  const loose = parseActionDesign('{"trigger":"manual","steps":[{"tool":"x","args":{"a":1,"b":{"n":1},"c":null,"d":true}}]}');
  assert.deepEqual(loose?.steps[0].args, { a: 1, d: true });
  assert.equal(parseActionDesign(JSON.stringify({ trigger: "manual", steps: Array.from({ length: 60 }, () => ({ tool: "x" })) }))?.steps.length, 40);
});

test("the session tells the player what to fill in, and nothing about the checks", () => {
  const spec: GameSpec = {
    version: GAME_SPEC_VERSION,
    server: { id: "it-ticketing", name: "IT", toolsHash: computeToolsHash(tools) },
    title: "T",
    scenario: "S",
    cases: [flowCase, reportCase],
  };
  const stored = { specId: computeSpecId(spec), toolsHash: spec.server.toolsHash, spec, tools, samples: [], validated: true, createdAt: 1 };
  const session = specSession(stored);
  const [flow, report] = session.objectives;

  assert.equal(flow.judging, "run");
  assert.equal(flow.designFields, undefined);
  assert.equal(report.judging, "design");
  assert.deepEqual(report.designFields?.map((f) => f.path), ["status", "minAmount", "filters[0].open", "title"]);
  // The field list names the settings but never the values the checks compare against.
  assert.doesNotMatch(JSON.stringify(session), /Submitted|876\.25|"equals"|"contains"|fromInput/);

  // It says which system the mission was built from, without exposing the server's address.
  assert.deepEqual(session.generatedFrom, { serverName: "IT", toolCount: tools.length });
  assert.doesNotMatch(JSON.stringify(session.generatedFrom), /https?:/);
});
