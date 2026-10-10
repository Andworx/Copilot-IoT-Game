import { stepDef, type FlowDesign, type FlowStep } from "../designs";
import type { RunTrace, StepTrace } from "../types";
import { normalizeState } from "./aggregate";
import type { Incident, Outcome, Scenario, World } from "./world";

/**
 * Executes a flow design against one scenario. Reads and writes go to the world's MCP
 * tools, so a test run produces real tool calls (writes are simulated by the public
 * server). Approvals and emails are simulated here: there is no real approver or mailbox.
 *
 * Semantics follow the designer: steps run top to bottom; a Condition guards the steps
 * below it until the next Condition; a failed step stops the flow.
 */

const KNOWN_PROPERTIES: Record<string, string> = {
  assignment_group: "Assignment group",
  priority: "Priority",
  state: "State",
};

function incidentField(incident: Incident, field: string): string | undefined {
  if (field === "category") return incident.category;
  if (field === "priority") return incident.priority;
  if (field === "state") return normalizeState(incident.state);
  return undefined;
}

function parseCount(text: string): number {
  try {
    const body = JSON.parse(text) as { total?: unknown; data?: unknown[] };
    if (typeof body.total === "number") return body.total;
    if (Array.isArray(body.data)) return body.data.length;
  } catch {
    // fall through
  }
  return 0;
}

export async function runFlow(
  design: FlowDesign,
  scenario: Scenario,
  world: World,
): Promise<{ trace: RunTrace; outcome: Outcome }> {
  const fired = design.trigger === scenario.trigger;
  const outcome: Outcome = { fired, updates: [], approvals: [], emails: [], comments: 0 };
  const steps: StepTrace[] = [];

  if (!fired) {
    for (const step of design.steps) {
      steps.push({ label: stepDef(step.kind).label, status: "not-run", detail: "The flow did not start." });
    }
    return { trace: { scenario: scenario.name, fired, steps }, outcome };
  }

  const incident = scenario.incident;
  let guard = true;
  let halted = false;

  const mcp = async (tool: string, args: Record<string, unknown>) => {
    const result = await world.run(tool, args);
    return { tool, args, text: result.text, isError: result.isError, wire: result.wire };
  };

  for (let index = 0; index < design.steps.length; index += 1) {
    const step: FlowStep = design.steps[index];
    const label = stepDef(step.kind).label;
    const push = (trace: Omit<StepTrace, "label">) => steps.push({ label, ...trace });

    if (halted) {
      push({ status: "not-run", detail: "An earlier step failed." });
      continue;
    }

    if (step.kind === "condition") {
      const { field, value } = step.params;
      if (!field || !value) {
        push({ status: "failed", detail: "Choose a field and a value for this condition." });
        halted = true;
        continue;
      }
      if (!incident) {
        push({ status: "failed", detail: "This flow started without an incident to check." });
        halted = true;
        continue;
      }
      const actual = incidentField(incident, field) ?? "";
      guard = actual === value;
      push({
        status: "succeeded",
        detail: `${field} is "${actual}". ${guard ? "Condition is true, continuing." : `Not equal to "${value}", skipping the steps below.`}`,
      });
      continue;
    }

    if (!guard) {
      push({ status: "skipped", detail: "Skipped: the condition above was not met." });
      continue;
    }

    try {
      switch (step.kind) {
        case "list-incidents": {
          const args: Record<string, unknown> = { limit: 100 };
          if (step.params.state) args.state = step.params.state;
          if (step.params.priority) args.priority = step.params.priority;
          const call = await mcp("list_incidents", args);
          if (call.isError) {
            push({ status: "failed", detail: "The service desk returned an error.", mcp: call });
            halted = true;
            break;
          }
          const count = parseCount(call.text);
          outcome.listed = {
            state: step.params.state ?? "",
            priority: step.params.priority ?? "",
            count,
            stepIndex: index,
          };
          push({ status: "succeeded", detail: `Found ${count} incident${count === 1 ? "" : "s"}.`, mcp: call });
          break;
        }

        case "update-incident": {
          const { property, value } = step.params;
          if (!property || !value) {
            push({ status: "failed", detail: "Choose a property and a new value." });
            halted = true;
            break;
          }
          if (!incident) {
            push({ status: "failed", detail: "There is no incident to update when the flow starts this way." });
            halted = true;
            break;
          }
          const args: Record<string, unknown> = { incident_id: incident.incidentId };
          if (property === "assignment_group") {
            const group = world.data.groups.find((g) => g.name === value);
            if (!group) {
              push({ status: "failed", detail: `Unknown team "${value}".` });
              halted = true;
              break;
            }
            args.assignment_group_id = group.id;
          } else {
            args[property] = value;
          }
          const call = await mcp("update_incident", args);
          if (call.isError) {
            push({ status: "failed", detail: "The service desk returned an error.", mcp: call });
            halted = true;
            break;
          }
          outcome.updates.push({ property, value, stepIndex: index });
          push({
            status: "succeeded",
            detail: `${KNOWN_PROPERTIES[property] ?? property} set to "${value}" on ${incident.incidentId}.`,
            mcp: call,
          });
          break;
        }

        case "add-comment": {
          if (!incident || !world.data.authorId) {
            push({ status: "failed", detail: "There is no incident to add a note to." });
            halted = true;
            break;
          }
          const call = await mcp("add_comment", {
            incident_id: incident.incidentId,
            author_id: world.data.authorId,
            type: "work_note",
            text: "Added by an automated flow built in MCP Quest.",
          });
          outcome.comments += call.isError ? 0 : 1;
          push({
            status: call.isError ? "failed" : "succeeded",
            detail: call.isError ? "The service desk returned an error." : `Work note added to ${incident.incidentId}.`,
            mcp: call,
          });
          if (call.isError) halted = true;
          break;
        }

        case "approval": {
          const approver = step.params.approver;
          if (!approver) {
            push({ status: "failed", detail: "Choose who should approve." });
            halted = true;
            break;
          }
          outcome.approvals.push({ approver, stepIndex: index });
          push({ status: "succeeded", detail: `Approval sent to ${approver}. Approved (simulated).` });
          break;
        }

        case "send-email": {
          const to = step.params.to;
          if (!to) {
            push({ status: "failed", detail: "Choose who to email." });
            halted = true;
            break;
          }
          outcome.emails.push({ to, stepIndex: index });
          const about = outcome.listed
            ? `with ${outcome.listed.count} incident${outcome.listed.count === 1 ? "" : "s"}`
            : incident
              ? `about ${incident.incidentId}`
              : "";
          push({ status: "succeeded", detail: `Email sent to ${to} ${about}. (simulated)`.replace(/\s+\./, ".") });
          break;
        }
      }
    } catch (error) {
      push({ status: "failed", detail: error instanceof Error ? error.message : "The step failed." });
      halted = true;
    }
  }

  return { trace: { scenario: scenario.name, fired, steps }, outcome };
}
