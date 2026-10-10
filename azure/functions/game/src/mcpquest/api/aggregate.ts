import type { ChartData, DesignCatalog, ReportField } from "../types";
import type { Incident, WorldData } from "./world";

export const CANONICAL_STATES = ["New", "In Progress", "On Hold", "Resolved", "Closed"];

/** The public server also returns noisy variants such as "In Progress v11". */
export function normalizeState(state: string): string {
  return state.replace(/\s+v\d+$/, "");
}

function fieldValue(incident: Incident, field: ReportField): string {
  switch (field) {
    case "category":
      return incident.category;
    case "priority":
      return incident.priority;
    case "state":
      return normalizeState(incident.state);
    case "group":
      return incident.assignmentGroup_name || "Unassigned";
  }
}

export function aggregate(incidents: Incident[], field: ReportField): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const incident of incidents) {
    const value = fieldValue(incident, field);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

/** Option lists and counts the designers need. Reveals no answer keys. */
export function buildCatalog(data: WorldData): DesignCatalog {
  const priorities = [...new Set(data.incidents.map((i) => i.priority))].sort();
  const categories = [...new Set(data.incidents.map((i) => i.category))].sort();
  const groupNames = [...new Set(data.groups.map((g) => g.name))].sort();
  const first = data.incidents.find((i) => i.caller_name && i.assignmentGroup_name);
  return {
    sample: first
      ? {
          description: first.shortDescription,
          caller: first.caller_name,
          group: first.assignmentGroup_name,
          priority: first.priority,
          state: normalizeState(first.state),
          category: first.category,
        }
      : undefined,
    categories,
    priorities,
    states: CANONICAL_STATES,
    groups: groupNames,
    aggregates: {
      category: aggregate(data.incidents, "category"),
      priority: aggregate(data.incidents, "priority"),
      state: aggregate(data.incidents, "state"),
      group: aggregate(data.incidents, "group"),
    },
  };
}

export function chartFor(visual: string, field: ReportField | "", incidents: Incident[]): ChartData {
  const bars = field ? aggregate(incidents, field).map((a) => ({ label: a.value, count: a.count })) : [];
  return { visual, field, bars };
}
