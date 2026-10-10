import { shuffled } from "./shuffle";
import { mission } from "../missions";
import { BUILD_CASES, BUILD_POINTS, PICK_POINTS } from "./cases";
import type { BuildCaseDef, Incident, ModeDef, ObjectiveTemplate, PreparedCase, WorldData } from "./world";

/**
 * Game modes. Each mode turns the data read from the MCP server into the objectives for a
 * single play. Answer keys are computed from that same data, so they cannot drift from
 * what the tools return.
 */

type Evidence = Omit<ObjectiveTemplate, "build"> | null;

const NUMBER = "a whole number";
const pick = <T,>(items: T[]): T | undefined => shuffled(items)[0];

function uniqueByTitle(incidents: Incident[]): Incident[] {
  const counts = new Map<string, number>();
  for (const i of incidents) counts.set(i.shortDescription, (counts.get(i.shortDescription) ?? 0) + 1);
  return incidents.filter((i) => counts.get(i.shortDescription) === 1);
}

/** Question builders. Each returns null when the data cannot support an unambiguous answer. */
const ask = {
  countPriority(data: WorldData, id: string, priority?: string, points = 100): Evidence {
    const values = [...new Set(data.incidents.map((i) => i.priority))];
    const p = priority && values.includes(priority) ? priority : pick(values);
    if (!p) return null;
    return {
      objective: { id, prompt: `How many incidents have priority ${p}?`, kind: "number", answerFormat: NUMBER, points },
      answer: String(data.incidents.filter((i) => i.priority === p).length),
      hint: "list_incidents has a priority filter. The response includes a total.",
    };
  },

  countCategory(data: WorldData, id: string, points = 100): Evidence {
    const category = pick([...new Set(data.incidents.map((i) => i.category))]);
    if (!category) return null;
    return {
      objective: { id, prompt: `How many incidents are in the ${category} category?`, kind: "number", answerFormat: NUMBER, points },
      answer: String(data.incidents.filter((i) => i.category === category).length),
      hint: "Filter list_incidents by category, then read the total.",
    };
  },

  // Exact state names only: the public server also returns noisy variants like "In Progress v11".
  countState(data: WorldData, id: string, states: string[], points = 100): Evidence {
    const count = (s: string) => data.incidents.filter((i) => i.state === s).length;
    const state = pick(states.filter((s) => count(s) > 0));
    if (!state) return null;
    return {
      objective: { id, prompt: `How many incidents are in the exact state "${state}"?`, kind: "number", answerFormat: NUMBER, points },
      answer: String(count(state)),
      hint: "Use the state filter, or count rows whose state matches exactly.",
    };
  },

  topCategory(data: WorldData, id: string, points = 100): Evidence {
    const byCategory = new Map<string, number>();
    for (const i of data.incidents) byCategory.set(i.category, (byCategory.get(i.category) ?? 0) + 1);
    const ranking = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
    if (ranking.length < 2 || ranking[0][1] === ranking[1][1]) return null;
    return {
      objective: { id, prompt: "Which category has the most incidents?", kind: "text", answerFormat: "a category name", points },
      answer: ranking[0][0],
      hint: "Page through list_incidents and tally the category column.",
    };
  },

  assigneeOf(data: WorldData, id: string, points = 100): Evidence {
    const found = pick(uniqueByTitle(data.incidents).filter((i) => i.assignedTo_name));
    if (!found) return null;
    return {
      objective: { id, prompt: `Who is assigned the incident "${found.shortDescription}"?`, kind: "text", answerFormat: "a person's full name", points },
      answer: found.assignedTo_name,
      hint: `Find it with list_incidents, or call get_incident for ${found.incidentId} once you know the id.`,
    };
  },

  reporterOf(data: WorldData, id: string, points = 100): Evidence {
    const found = pick(uniqueByTitle(data.incidents).filter((i) => i.caller_name));
    if (!found) return null;
    return {
      objective: { id, prompt: `Who reported the incident "${found.shortDescription}"?`, kind: "text", answerFormat: "a person's full name", points },
      answer: found.caller_name,
      hint: "The reporter is the caller on the incident record.",
    };
  },

  ownerOf(data: WorldData, id: string, points = 100): Evidence {
    const found = pick(uniqueByTitle(data.incidents).filter((i) => i.assignmentGroup_name));
    if (!found) return null;
    return {
      objective: { id, prompt: `Which team owns the incident "${found.shortDescription}"?`, kind: "text", answerFormat: "a team name", points },
      answer: found.assignmentGroup_name,
      hint: "Look at the assignment group on the incident.",
    };
  },

  userTotal(data: WorldData, id: string, points = 100): Evidence {
    if (data.userTotal <= 0) return null;
    return {
      objective: { id, prompt: "How many people are in the user directory?", kind: "number", answerFormat: NUMBER, points },
      answer: String(data.userTotal),
      hint: "list_users returns a total.",
    };
  },
};

// ---- Investigate mode ---------------------------------------------------------------

function investigate(data: WorldData): ObjectiveTemplate[] {
  const builders: Evidence[] = [
    ask.countPriority(data, "count-priority"),
    ask.countCategory(data, "count-category"),
    ask.countState(data, "count-state", ["New", "On Hold", "Resolved", "Closed"]),
    ask.topCategory(data, "top-category"),
    ask.assigneeOf(data, "assignee"),
    ask.reporterOf(data, "reporter"),
    ask.ownerOf(data, "owner-team"),
  ];
  const pool = builders.filter((b): b is NonNullable<Evidence> => b !== null);
  if (pool.length < 3) throw new Error("Not enough questions could be built from this server's data.");
  return shuffled(pool).slice(0, 3);
}

// ---- Fix it mode --------------------------------------------------------------------

/**
 * Three build cases per play, each from a different Power Platform product. Every case
 * must be supported by the data it is prepared from.
 */
function fixIt(data: WorldData): ObjectiveTemplate[] {
  const prepared: { def: BuildCaseDef; prepared: PreparedCase }[] = [];
  for (const def of shuffled(BUILD_CASES)) {
    const p = def.prepare(data);
    if (p) prepared.push({ def, prepared: p });
  }

  // One case per product, so a play shows breadth across the Power Platform.
  const chosen: typeof prepared = [];
  const seen = new Set<string>();
  for (const entry of prepared) {
    if (seen.has(entry.def.productId)) continue;
    seen.add(entry.def.productId);
    chosen.push(entry);
    if (chosen.length === 3) break;
  }
  if (chosen.length < 3) throw new Error("Not enough cases could be built from this server's data.");

  return shuffled(chosen).map(({ def, prepared: p }, index) => ({
    objective: {
      id: def.id,
      prompt: def.brief,
      kind: "build" as const,
      designer: def.designer,
      answerFormat: "Choose the tool, build it, then test it",
      points: PICK_POINTS + BUILD_POINTS,
      caseTitle: `Case ${index + 1}: ${def.title}`,
      label: def.title,
      requirements: p.requirements,
    },
    answer: "",
    hint: p.hint,
    build: { def, prepared: p },
  }));
}

export const MODES: ModeDef[] = [
  {
    ...mission("fixit"),
    scenario:
      "Three teams have raised problems with how incidents are handled. For each one, choose the part of the " +
      "Power Platform that fits, build the solution in its designer, and test it. Your tests run against a live " +
      "service desk through MCP, so what you see is real data.",
    passScore: 330,
    parSeconds: 480,
    maxSeconds: 1200,
    build: fixIt,
  },
  {
    ...mission("incident-queue"),
    scenario:
      "The overnight incident queue is on fire and the duty manager needs answers fast. " +
      "Use the service-desk tools to look up the facts. Everything here is read-only.",
    passScore: 250,
    parSeconds: 240,
    maxSeconds: 900,
    build: investigate,
  },
];

export const DEFAULT_MODE = MODES[0].slug;

export function findMode(slug: string): ModeDef {
  return MODES.find((m) => m.slug === slug) ?? MODES[0];
}
