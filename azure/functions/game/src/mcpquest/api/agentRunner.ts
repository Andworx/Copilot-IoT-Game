import { KNOWLEDGE_SOURCES, type AgentDesign } from "../designs";
import type { RunTrace, StepTrace } from "../types";
import { errorInBody } from "./appRunner";
import type { Scenario, World } from "./world";

export interface AgentOutcome {
  answered: boolean;
  source?: string;
  created: boolean;
  statusKnown: boolean;
}

/** Which knowledge sources can answer which question. The broad KB covers both. */
const FAQ_SOURCES: Record<string, string[]> = {
  "faq-password": ["password-guides", "it-kb"],
  "faq-vpn": ["vpn-guide", "it-kb"],
};

const label = (id: string) => KNOWLEDGE_SOURCES.find((s) => s.id === id)?.label ?? id;

/**
 * Runs one message through the agent like Copilot Studio's test pane: understand the
 * request, then either search the enabled knowledge or call an enabled action. Actions
 * reach the service desk through MCP.
 */
export async function runAgent(
  design: AgentDesign,
  scenario: Scenario,
  world: World,
): Promise<{ trace: RunTrace; outcome: AgentOutcome }> {
  const steps: StepTrace[] = [];
  const outcome: AgentOutcome = { answered: false, created: false, statusKnown: false };
  const add = (stepLabel: string, status: StepTrace["status"], detail: string, mcp?: StepTrace["mcp"]) =>
    steps.push({ label: stepLabel, status, detail, mcp });

  const intent = scenario.intent;
  add("Understand the message", "succeeded", `"${scenario.message ?? ""}"`);

  if (intent === "faq-password" || intent === "faq-vpn") {
    const wanted = FAQ_SOURCES[intent];
    const used = wanted.find((id) => design.knowledge.includes(id));
    if (used) {
      outcome.answered = true;
      outcome.source = used;
      add("Search knowledge", "succeeded", `Answered from "${label(used)}".`);
    } else {
      add("Search knowledge", "failed", "None of the enabled knowledge sources cover this, so the agent says it does not know.");
    }
  } else if (intent === "open-ticket") {
    if (!design.actions.includes("create_incident")) {
      add("Choose an action", "failed", "The agent has no action that can create an incident, so it can only tell the person to use the web form.");
    } else {
      const args = {
        short_description: "Laptop will not boot",
        category: "Hardware",
        priority: "3",
        caller_id: world.data.authorId ?? "USR-0001",
      };
      const call = await world.run("create_incident", args);
      const rejected = errorInBody(call.text);
      const ok = !call.isError && rejected === null;
      outcome.created = ok;
      add(
        "Action: Create incident",
        ok ? "succeeded" : "failed",
        ok ? "The incident was created. (Simulated write.)" : `The service desk rejected it: ${rejected ?? "error"}.`,
        { tool: "create_incident", args, text: call.text, isError: !ok, wire: call.wire },
      );
    }
  } else if (intent === "status") {
    const incident = scenario.incident;
    if (!design.actions.includes("get_incident")) {
      add("Choose an action", "failed", "The agent cannot look up an incident, so it cannot tell the person where theirs is up to.");
    } else if (!incident) {
      add("Action: Get incident status", "failed", "No incident to look up.");
    } else {
      const args = { incident_id: incident.incidentId };
      const call = await world.run("get_incident", args);
      const rejected = errorInBody(call.text);
      const ok = !call.isError && rejected === null;
      outcome.statusKnown = ok;
      add(
        "Action: Get incident status",
        ok ? "succeeded" : "failed",
        ok ? `The agent tells the person ${incident.incidentId} is ${incident.state}.` : `The service desk could not find it: ${rejected ?? "error"}.`,
        { tool: "get_incident", args, text: call.text, isError: !ok, wire: call.wire },
      );
    }
  }

  return { trace: { scenario: scenario.name, fired: true, steps }, outcome };
}
