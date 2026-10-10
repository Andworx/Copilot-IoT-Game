/** Shapes shared by the UI and every API implementation (preview, mcp and live). */

export interface JsonSchemaProperty {
  type?: "string" | "integer" | "number" | "boolean";
  description?: string;
  enum?: string[];
  default?: string | number | boolean;
  minimum?: number;
  maximum?: number;
}

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, JsonSchemaProperty>;
    required?: string[];
  };
}

export type DesignerKind = "flow" | "report" | "app" | "site" | "table" | "security" | "agent";

export interface Objective {
  id: string;
  prompt: string;
  /**
   * "number" answers are compared numerically, "text" answers case-insensitively.
   * "build" objectives are Power Platform solutions: the answer is the design as JSON.
   */
  kind: "number" | "text" | "build";
  /** Placeholder shown in the answer box, for example "a whole number". */
  answerFormat: string;
  /** Points this objective is worth. */
  points: number;
  /** Which designer a "build" objective opens. */
  designer?: DesignerKind;
  /** Acceptance criteria for a "build" objective, shown before and after testing. */
  requirements?: string[];
  /** Heading for the case. */
  caseTitle?: string;
  /** Short name used in the score breakdown. Falls back to the prompt. */
  label?: string;
}

export type ReportField = "category" | "priority" | "state" | "group";

/** Option lists and aggregate counts the designers need. Nothing here reveals an answer. */
export interface DesignCatalog {
  categories: string[];
  priorities: string[];
  states: string[];
  groups: string[];
  /** Incident counts per field value, so the report designer can preview instantly. */
  aggregates: Record<ReportField, { value: string; count: number }[]>;
  /** One real record, so the table and app designers can show what their choices look like. */
  sample?: { description: string; caller: string; group: string; priority: string; state: string; category: string };
}

/** Everything the player UI needs for one play. The answer key is never in here. */
export interface SessionInfo {
  /** Opaque, signed by the server in live mode. Sent back on every call. */
  token: string;
  modeSlug: string;
  modeTitle: string;
  scenario: string;
  objectives: Objective[];
  tools: ToolDef[];
  catalog: DesignCatalog;
  /** Present when tool calls go to a real MCP server. */
  mcpServer?: McpServerInfo;
  /** Server clock, epoch milliseconds, at the moment the session started. */
  startedAt: number;
  /** Server clock when this response was produced; used to correct client skew. */
  serverNow: number;
  parSeconds: number;
  maxSeconds: number;
  parCalls: number;
  maxCalls: number;
  /** Test runs allowed per build objective. */
  maxTests: number;
  passScore: number;
  maxScore: number;
  hintPenalty: number;
}

export interface McpServerInfo {
  name: string;
  url: string;
  protocolVersion: string;
  /** Tools shown to the player (read-only ones). */
  toolCount: number;
  /** Tools the server advertises in total. */
  totalToolCount: number;
}

/** The JSON-RPC messages behind a tool call, kept for the "MCP messages" view. */
export interface WireTrace {
  request: unknown;
  response: unknown;
}

export interface CallRecord {
  n: number;
  tool: string;
  args: Record<string, unknown>;
  isError: boolean;
  text: string;
  durationMs: number;
  wire?: WireTrace;
}

// ---- test runs and results ------------------------------------------------------------

export interface StepTrace {
  label: string;
  status: "succeeded" | "skipped" | "failed" | "not-run";
  detail: string;
  /** Set for steps that called the MCP server. */
  mcp?: { tool: string; args: Record<string, unknown>; text: string; isError: boolean; wire?: WireTrace };
}

export interface RunTrace {
  scenario: string;
  fired: boolean;
  steps: StepTrace[];
}

export interface CriterionResult {
  label: string;
  ok: boolean;
}

export interface ChartData {
  visual: string;
  field: ReportField | "";
  bars: { label: string; count: number }[];
}

export interface TestReport {
  criteria: CriterionResult[];
  runs?: RunTrace[];
  chart?: ChartData;
  testsLeft: number;
}

export interface ChooseResult {
  correct: boolean;
  message: string;
}

export interface ScoreBreakdown {
  /** `partial` marks a build that met some but not all of its criteria. */
  objectives: {
    id: string;
    correct: boolean;
    partial: boolean;
    points: number;
    pickPoints?: number;
    buildPoints?: number;
  }[];
  timeBonus: number;
  efficiencyPenalty: number;
  hintPenalty: number;
  total: number;
  /** Score out of 100 (total as a share of the most this play could earn). Drives the entry tier. */
  percent: number;
  passed: boolean;
  durationSeconds: number;
  callCount: number;
  hintsUsed: number;
}

/** What happened to one case, revealed after submission. */
export interface CaseReport {
  objectiveId: string;
  caseTitle: string;
  chosenProduct?: string;
  bestProduct: string;
  misses: number;
  criteria: CriterionResult[];
  /** Why the best product fits this problem. Only revealed after submission. */
  why: string;
}

export interface SubmitResult {
  score: ScoreBreakdown;
  cases?: CaseReport[];
  /** Encoded into the prize QR. Every submitted play gets one; the score sets the entries. */
  claimToken?: string;
  /** Grand-prize entries this play earned, and the tier that set them. */
  entries?: { tier: "top" | "mid" | "base"; awarded: number };
  rank?: number;
}

export interface LeaderboardEntry {
  rank: number;
  nickname: string;
  score: number;
  durationSeconds: number;
}

export interface CallResult {
  text: string;
  isError: boolean;
  wire?: WireTrace;
}

export interface GameApi {
  /**
   * "preview": simulated tools, no MCP. "mcp": real MCP server, scored in the browser.
   * "live": Function App proxy with server-side scoring. Only "live" is prize-eligible.
   */
  readonly kind: "preview" | "mcp" | "live";
  start(nickname: string, station: string, modeSlug: string): Promise<SessionInfo>;
  call(session: SessionInfo, tool: string, args: Record<string, unknown>): Promise<CallResult>;
  hint(session: SessionInfo, objectiveId: string): Promise<string>;
  /** Check a product choice for a build objective. Wrong choices cost points. */
  choose(session: SessionInfo, objectiveId: string, productId: string): Promise<ChooseResult>;
  /** Run a design against the case's scenarios and report how it did. */
  test(session: SessionInfo, objectiveId: string, design: string): Promise<TestReport>;
  submit(session: SessionInfo, answers: Record<string, string>): Promise<SubmitResult>;
  leaderboard(modeSlug: string): Promise<LeaderboardEntry[]>;
}
