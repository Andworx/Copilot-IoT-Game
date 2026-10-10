import { controlDef, type AppDesign } from "../designs";
import type { RunTrace, StepTrace } from "../types";
import type { Scenario, World } from "./world";

/** Server errors arrive inside a normal result body, so look for an `error` field. */
export function errorInBody(text: string): string | null {
  try {
    const body = JSON.parse(text) as { error?: unknown };
    return typeof body.error === "string" ? body.error : null;
  } catch {
    return null;
  }
}

export interface AppOutcome {
  /** An incident the app created, with the fields it actually sent. */
  created?: { ok: boolean; sent: Record<string, string> };
  listed?: { source: string; count: number; firstId?: string };
  resolved?: { incidentId: string };
  pressed: boolean;
}

const SOURCE_STATE: Record<string, string | undefined> = {
  "in-progress": "In Progress",
  new: "New",
  all: undefined,
};

/**
 * Runs a canvas app as a person would use it: the screen loads (galleries read from the
 * service desk), they fill in what the app lets them fill in, then press the button.
 * Anything the app has no control for is simply missing, and the server's own validation
 * decides whether that is acceptable.
 */
export async function runApp(
  design: AppDesign,
  scenario: Scenario,
  world: World,
): Promise<{ trace: RunTrace; outcome: AppOutcome }> {
  const steps: StepTrace[] = [];
  const outcome: AppOutcome = { pressed: false };
  const add = (label: string, status: StepTrace["status"], detail: string, mcp?: StepTrace["mcp"]) =>
    steps.push({ label, status, detail, mcp });

  const controls = design.controls;
  add(
    "The app opens",
    controls.length > 0 ? "succeeded" : "failed",
    controls.length > 0
      ? `${controls.length} control${controls.length === 1 ? "" : "s"} on the screen.`
      : "The screen is empty. Add some controls.",
  );
  if (controls.length === 0) return { trace: { scenario: scenario.name, fired: true, steps }, outcome };

  // Galleries load their items when the screen opens.
  const gallery = controls.find((c) => c.kind === "gallery" && c.params.source);
  if (gallery) {
    const source = gallery.params.source;
    const state = SOURCE_STATE[source];
    const args: Record<string, unknown> = { limit: 100 };
    if (state) args.state = state;
    const call = await world.run("list_incidents", args);
    let count = 0;
    let firstId: string | undefined;
    try {
      const body = JSON.parse(call.text) as { total?: unknown; data?: { incidentId?: unknown }[] };
      count = typeof body.total === "number" ? body.total : (body.data?.length ?? 0);
      const id = body.data?.[0]?.incidentId;
      if (typeof id === "string") firstId = id;
    } catch {
      // leave defaults
    }
    outcome.listed = { source: state ?? "all", count, firstId };
    add(
      "Gallery loads",
      call.isError ? "failed" : "succeeded",
      `Items: ${controlDef("gallery").params[0].options({}, emptyCatalog).find((o) => o.value === source)?.label ?? source}. ${count} row${count === 1 ? "" : "s"}.`,
      { tool: "list_incidents", args, text: call.text, isError: call.isError, wire: call.wire },
    );
  }

  // The person fills in whatever the app offers.
  const sent: Record<string, string> = {};
  const wanted: [keyof NonNullable<Scenario["input"]>, string, "text-input" | "dropdown"][] = [
    ["shortDescription", "short_description", "text-input"],
    ["category", "category", "dropdown"],
  ];
  for (const [key, serverField, kind] of wanted) {
    const value = scenario.input?.[key];
    if (value === undefined) continue;
    const control = controls.find((c) => c.kind === kind && c.params.field === key);
    if (control) {
      sent[serverField] = value;
      add(`Person fills in ${key === "shortDescription" ? "the description" : "the category"}`, "succeeded", `"${value}"`);
    } else {
      add(
        `Person fills in ${key === "shortDescription" ? "the description" : "the category"}`,
        "skipped",
        "There is no control for this in the app, so nothing is captured.",
      );
    }
  }

  if (!scenario.press) return { trace: { scenario: scenario.name, fired: true, steps }, outcome };

  const button = controls.find((c) => c.kind === "button" && c.params.onSelect && c.params.onSelect !== "none");
  if (!button) {
    add("Person presses the button", "failed", "There is no button wired to an action.");
    return { trace: { scenario: scenario.name, fired: true, steps }, outcome };
  }
  outcome.pressed = true;

  if (button.params.onSelect === "create-incident") {
    const args: Record<string, unknown> = {
      ...sent,
      priority: "3",
      caller_id: world.data.authorId ?? "USR-0001",
    };
    const call = await world.run("create_incident", args);
    const rejected = errorInBody(call.text);
    const ok = !call.isError && rejected === null;
    outcome.created = { ok, sent };
    add(
      "Button: create an incident",
      ok ? "succeeded" : "failed",
      ok ? "The service desk accepted the incident. (Simulated write.)" : `The service desk rejected it: ${rejected ?? "error"}.`,
      { tool: "create_incident", args, text: call.text, isError: !ok, wire: call.wire },
    );
  } else if (button.params.onSelect === "resolve-selected") {
    const id = outcome.listed?.firstId;
    if (!id) {
      add("Button: mark resolved", "failed", "Nothing is selected: the app has no list of incidents to pick from.");
    } else {
      const args = { incident_id: id, state: "Resolved" };
      const call = await world.run("update_incident", args);
      const rejected = errorInBody(call.text);
      const ok = !call.isError && rejected === null;
      if (ok) outcome.resolved = { incidentId: id };
      add(
        "Button: mark resolved",
        ok ? "succeeded" : "failed",
        ok ? `${id} set to Resolved. (Simulated write.)` : `The service desk rejected it: ${rejected ?? "error"}.`,
        { tool: "update_incident", args, text: call.text, isError: !ok, wire: call.wire },
      );
    }
  }

  return { trace: { scenario: scenario.name, fired: true, steps }, outcome };
}

// Only used to turn a gallery source value into its label in the trace.
const emptyCatalog = { categories: [], priorities: [], states: [], groups: [], aggregates: { category: [], priority: [], state: [], group: [] } };
