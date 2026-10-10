import type { CallResult, DesignerKind, McpServerInfo, Objective, ToolDef } from "../types";
import type { TriggerKind } from "../designs";

/** The incident fields the question builders rely on (public MCP Station `it-ticketing`). */
export interface Incident {
  incidentId: string;
  shortDescription: string;
  state: string;
  priority: string;
  category: string;
  caller_name: string;
  assignedTo_name: string;
  assignmentGroup_name: string;
  createdAt?: string;
}

/** Facts read from the MCP server (or the offline simulation) at the start of a play. */
export interface WorldData {
  incidents: Incident[];
  /** Total people in the user directory. */
  userTotal: number;
  /** A real user id, required by the server's `add_comment` write tool. */
  authorId?: string;
  /** Assignment groups, so a group name can be turned into the id the write tool wants. */
  groups: { id: string; name: string }[];
}

/** A source of tools and data: the real MCP server, or the offline simulation. */
export interface World {
  tools: ToolDef[];
  data: WorldData;
  mcpServer?: McpServerInfo;
  run(tool: string, args: Record<string, unknown>): Promise<CallResult>;
}

/** One situation a design is tested against. Which fields matter depends on the designer. */
export interface Scenario {
  name: string;
  /** Flow: what starts it. */
  trigger?: TriggerKind;
  /** Flow: the incident that arrives. Agent: the incident being asked about. */
  incident?: Incident;
  /** App: what the person types and picks. */
  input?: { shortDescription?: string; category?: string };
  /** App: whether the person presses the button. */
  press?: boolean;
  /** Site: who is looking, and who they are when signed in. */
  viewer?: "visitor" | "partner";
  caller?: string;
  /** Agent: what the person says to it. */
  intent?: "faq-password" | "faq-vpn" | "open-ticket" | "status";
  message?: string;
}

/** What a flow did in one scenario, used by the criteria. */
export interface Outcome {
  fired: boolean;
  updates: { property: string; value: string; stepIndex: number }[];
  approvals: { approver: string; stepIndex: number }[];
  emails: { to: string; stepIndex: number }[];
  listed?: { state: string; priority: string; count: number; stepIndex: number };
  comments: number;
}

/** A case turned into concrete scenarios and checks for one play. */
export interface PreparedCase {
  scenarios: Scenario[];
  hint: string;
  /**
   * Plain-language acceptance criteria shown to the player up front. They describe the
   * behaviour wanted without giving away the answer (for example which team owns a category).
   */
  requirements: string[];
  /**
   * Evaluates a design (a parsed flow or report) against the outcomes of its scenarios.
   * Returns one boolean per requirement, in the same order.
   */
  evaluate(design: unknown, outcomes: unknown[]): boolean[];
}

/** An authored case: a business problem, the right product, and how to check a solution. */
export interface BuildCaseDef {
  id: string;
  title: string;
  brief: string;
  productId: string;
  designer: DesignerKind;
  why: string;
  /** Returns null when the data cannot support this case. */
  prepare(data: WorldData): PreparedCase | null;
}

export interface ObjectiveTemplate {
  objective: Objective;
  answer: string;
  hint: string;
  /** Present for "build" objectives. */
  build?: { def: BuildCaseDef; prepared: PreparedCase };
}

export interface ModeDef {
  slug: string;
  title: string;
  tagline: string;
  scenario: string;
  passScore: number;
  parSeconds: number;
  maxSeconds: number;
  /** Builds the ordered objectives for one play, or throws if the data is too thin. */
  build(data: WorldData): ObjectiveTemplate[];
}
