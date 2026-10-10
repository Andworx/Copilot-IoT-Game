import type { SiteDesign } from "../designs";
import type { RunTrace, StepTrace } from "../types";
import type { Scenario, World } from "./world";

export interface SiteOutcome {
  redirectedToSignIn: boolean;
  rows: number;
  /** Rows that belong to someone other than the person looking. */
  foreignRows: number;
  canSubmit: boolean;
}

/**
 * Previews a Power Pages site as a particular visitor. The list page reads incidents from
 * the service desk through MCP, then table permissions decide which rows the visitor gets.
 */
export async function previewSite(
  design: SiteDesign,
  scenario: Scenario,
  world: World,
): Promise<{ trace: RunTrace; outcome: SiteOutcome }> {
  const steps: StepTrace[] = [];
  const add = (label: string, status: StepTrace["status"], detail: string, mcp?: StepTrace["mcp"]) =>
    steps.push({ label, status, detail, mcp });

  const viewer = scenario.viewer ?? "visitor";
  const outcome: SiteOutcome = { redirectedToSignIn: false, rows: 0, foreignRows: 0, canSubmit: false };

  add("Someone opens the site", "succeeded", viewer === "partner" ? `${scenario.caller ?? "A partner"} arrives.` : "A visitor who has not signed in arrives.");

  const signedIn = viewer === "partner" && design.signIn === "required";
  if (design.signIn === "required" && viewer === "visitor") {
    outcome.redirectedToSignIn = true;
    add("Authentication", "succeeded", "Sign-in is required, so the visitor is sent to the sign-in page and sees no data.");
    return { trace: { scenario: scenario.name, fired: true, steps }, outcome };
  }
  add(
    "Authentication",
    "succeeded",
    signedIn ? `${scenario.caller ?? "The partner"} signs in.` : "No sign-in is needed, so the site cannot tell who is looking.",
  );

  if (design.list === "none") {
    add("Incident list", "skipped", "There is no list page.");
  } else {
    const args = { limit: 100 };
    const call = await world.run("list_incidents", args);
    let all: { caller?: string }[] = [];
    try {
      const body = JSON.parse(call.text) as { data?: { caller_name?: unknown }[] };
      all = (body.data ?? []).map((r) => ({ caller: typeof r.caller_name === "string" ? r.caller_name : undefined }));
    } catch {
      // empty list
    }

    let visible = all;
    let detail = `Table permission: every incident is visible. ${all.length} rows.`;
    if (design.list === "own") {
      if (signedIn) {
        visible = all.filter((r) => r.caller === scenario.caller);
        detail = `Table permission: only the signed-in person's incidents. ${visible.length} of ${all.length} rows.`;
      } else {
        visible = [];
        detail = "Table permission: own records only, but nobody is signed in, so there is nothing to show.";
      }
    }
    outcome.rows = visible.length;
    outcome.foreignRows = visible.filter((r) => r.caller !== scenario.caller).length;
    add("Incident list", "succeeded", detail, {
      tool: "list_incidents",
      args,
      text: call.text,
      isError: call.isError,
      wire: call.wire,
    });
  }

  outcome.canSubmit = design.form === "anyone" || (design.form === "signed-in" && signedIn);
  add(
    "New incident form",
    outcome.canSubmit ? "succeeded" : design.form === "none" ? "skipped" : "failed",
    design.form === "none"
      ? "There is no form."
      : outcome.canSubmit
        ? "The visitor can submit a new incident."
        : "The form needs a signed-in visitor, and this visitor is not signed in.",
  );

  return { trace: { scenario: scenario.name, fired: true, steps }, outcome };
}
