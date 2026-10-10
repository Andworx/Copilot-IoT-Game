import { defaultDesign, type AgentDesign, type AppDesign, type FlowDesign, type SiteDesign, type ReportDesign } from "./designs";
import { findProduct } from "./platform";
import { runAgent } from "./api/agentRunner";
import { runApp } from "./api/appRunner";
import { buildCatalog, chartFor } from "./api/aggregate";
import { BUILD_POINTS, MAX_TESTS, MISS_PENALTY, PICK_POINTS, parseDesign } from "./api/cases";
import { runFlow } from "./api/flowRunner";
import { findMode } from "./api/modes";
import { previewSite } from "./api/siteRunner";
import type { ObjectiveTemplate, World } from "./api/world";
import type {
  CallResult,
  CaseReport,
  ChartData,
  ChooseResult,
  CriterionResult,
  Objective,
  RunTrace,
  ScoreBreakdown,
  SessionInfo,
  TestReport,
} from "./types";

/**
 * The judge: everything that decides what a play is worth. It is pure with respect to the
 * outside world (it only talks to the `World` it is given), so the same code runs in the
 * browser for the offline modes and in the Function App for prize-eligible plays.
 */

export const PAR_CALLS = 8;
export const MAX_CALLS = 40;
export const TIME_BONUS_MAX = 100;
export const HINT_PENALTY = 25;
export const CALL_PENALTY = 5;
export const CALL_PENALTY_CAP = 50;

/** Per-case progress. This is the part of a play that has to be persisted between requests. */
export interface CaseState {
  picked: boolean;
  chosenProduct?: string;
  misses: number;
  tests: number;
}

export interface JudgeSession {
  world: World;
  keys: Map<string, ObjectiveTemplate>;
  cases: Map<string, CaseState>;
  hintsUsed: Set<string>;
  calls: number;
  passScore: number;
  parSeconds: number;
  submitted: boolean;
}

export function normalizeAnswer(kind: Objective["kind"], value: string): string {
  const trimmed = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (kind === "number") {
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? String(parsed) : trimmed;
  }
  return trimmed;
}

// ---- starting a play -----------------------------------------------------------------------

/** The session fields that do not depend on who is playing or when. */
export type SessionBase = Omit<SessionInfo, "token" | "startedAt" | "serverNow">;

export function startPlay(world: World, modeSlug: string) {
  const mode = findMode(modeSlug);
  const templates = mode.build(world.data);
  const maxScore = templates.reduce((sum, p) => sum + p.objective.points, 0) + TIME_BONUS_MAX;
  const base: SessionBase = {
    modeSlug: mode.slug,
    modeTitle: mode.title,
    scenario: mode.scenario,
    objectives: templates.map((p) => p.objective),
    tools: world.tools,
    catalog: buildCatalog(world.data),
    mcpServer: world.mcpServer,
    parSeconds: mode.parSeconds,
    maxSeconds: mode.maxSeconds,
    parCalls: PAR_CALLS,
    maxCalls: MAX_CALLS,
    maxTests: MAX_TESTS,
    passScore: mode.passScore,
    maxScore,
    hintPenalty: HINT_PENALTY,
  };
  const cases = new Map<string, CaseState>(
    templates.filter((p) => p.build).map((p) => [p.objective.id, { picked: false, misses: 0, tests: 0 }]),
  );
  return { mode, templates, cases, base };
}

// ---- actions during a play -----------------------------------------------------------------

export async function callTool(session: JudgeSession, tool: string, args: Record<string, unknown>): Promise<CallResult> {
  if (session.submitted) return { text: JSON.stringify({ error: "Session is not active" }), isError: true };
  if (session.calls >= MAX_CALLS) {
    return { text: JSON.stringify({ error: "Call limit reached for this play" }), isError: true };
  }
  // Only the tools the player was shown may be called directly. Writes happen only inside a
  // test run of something the player built.
  if (!session.world.tools.some((t) => t.name === tool)) {
    return { text: JSON.stringify({ error: `Tool not available: ${tool}` }), isError: true };
  }
  session.calls += 1;
  return session.world.run(tool, args);
}

export function requestHint(session: JudgeSession, objectiveId: string): string {
  const entry = session.keys.get(objectiveId);
  if (!entry || session.submitted) throw new Error("Hint unavailable");
  session.hintsUsed.add(objectiveId);
  return entry.hint;
}

export function chooseProduct(session: JudgeSession, objectiveId: string, productId: string): ChooseResult {
  const template = session.keys.get(objectiveId);
  const state = session.cases.get(objectiveId);
  if (session.submitted || !template?.build || !state) throw new Error("Choice unavailable");
  const product = findProduct(productId);
  if (!product) throw new Error("Unknown product");
  if (state.picked) return { correct: true, message: "You have already chosen the tool for this case." };

  if (productId === template.build.def.productId) {
    state.picked = true;
    state.chosenProduct = productId;
    return { correct: true, message: `${product.name} is the right place to start. Build the fix below, then test it.` };
  }
  state.misses += 1;
  return {
    correct: false,
    message: `${product.name} is for ${product.bestFor}. That is not the best fit for this problem. (−${MISS_PENALTY} points)`,
  };
}

// ---- running a design against a case -------------------------------------------------------

export interface Evaluation {
  criteria: CriterionResult[];
  runs?: RunTrace[];
  chart?: ChartData;
}

export async function evaluateBuild(world: World, template: ObjectiveTemplate, designText: string): Promise<Evaluation> {
  const build = template.build;
  if (!build) return { criteria: [] };
  const { def, prepared } = build;
  const design = parseDesign(def, designText) ?? defaultDesign(def.designer);

  // Designs that can be exercised are run once per scenario; configuration designers
  // (report, table, security) are judged on the design itself.
  const runs: RunTrace[] = [];
  const outcomes: unknown[] = [];
  for (const scenario of prepared.scenarios) {
    const result =
      def.designer === "flow"
        ? await runFlow(design as FlowDesign, scenario, world)
        : def.designer === "app"
          ? await runApp(design as AppDesign, scenario, world)
          : def.designer === "site"
            ? await previewSite(design as SiteDesign, scenario, world)
            : def.designer === "agent"
              ? await runAgent(design as AgentDesign, scenario, world)
              : null;
    if (result) {
      runs.push(result.trace);
      outcomes.push(result.outcome);
    }
  }

  const passes = prepared.evaluate(design, outcomes);
  const criteria = prepared.requirements.map((label, index) => ({ label, ok: passes[index] === true }));
  const chart =
    def.designer === "report"
      ? chartFor((design as ReportDesign).visual, (design as ReportDesign).field, world.data.incidents)
      : undefined;
  return { criteria, runs: runs.length > 0 ? runs : undefined, chart };
}

export async function testDesign(session: JudgeSession, objectiveId: string, designText: string): Promise<TestReport> {
  const template = session.keys.get(objectiveId);
  const state = session.cases.get(objectiveId);
  if (session.submitted || !template?.build || !state) throw new Error("Test unavailable");
  if (!state.picked) throw new Error("Choose the tool for this case first.");
  if (state.tests >= MAX_TESTS) throw new Error("No test runs left for this case.");
  state.tests += 1;
  const evaluation = await evaluateBuild(session.world, template, designText);
  return { ...evaluation, testsLeft: MAX_TESTS - state.tests };
}

// ---- grading -------------------------------------------------------------------------------

export interface GradedObjective {
  id: string;
  correct: boolean;
  partial: boolean;
  points: number;
  pickPoints?: number;
  buildPoints?: number;
}

export async function gradeObjectives(session: JudgeSession, answers: Record<string, string>) {
  const graded: GradedObjective[] = [];
  const reports: CaseReport[] = [];

  for (const template of session.keys.values()) {
    const { objective } = template;
    const given = answers[objective.id] ?? "";

    if (objective.kind === "build" && template.build) {
      const state = session.cases.get(objective.id);
      const picked = state?.picked === true;
      const evaluation = picked
        ? await evaluateBuild(session.world, template, given)
        : { criteria: [] as CriterionResult[] };
      const passed = evaluation.criteria.filter((c) => c.ok).length;
      const total = Math.max(1, template.build.prepared.requirements.length);
      const pickPoints = picked ? Math.max(0, PICK_POINTS - MISS_PENALTY * (state?.misses ?? 0)) : 0;
      const buildPoints = picked ? Math.round((BUILD_POINTS * passed) / total) : 0;
      const everyCriterion = picked && passed === total;
      graded.push({
        id: objective.id,
        correct: everyCriterion,
        partial: !everyCriterion && passed > 0,
        points: pickPoints + buildPoints,
        pickPoints,
        buildPoints,
      });
      reports.push({
        objectiveId: objective.id,
        caseTitle: objective.caseTitle ?? objective.id,
        chosenProduct: state?.chosenProduct ? findProduct(state.chosenProduct)?.name : undefined,
        bestProduct: findProduct(template.build.def.productId)?.name ?? template.build.def.productId,
        misses: state?.misses ?? 0,
        criteria: picked
          ? evaluation.criteria
          : template.build.prepared.requirements.map((label) => ({ label, ok: false })),
        why: template.build.def.why,
      });
      continue;
    }

    const correct = normalizeAnswer(objective.kind, given) === normalizeAnswer(objective.kind, template.answer);
    graded.push({ id: objective.id, correct, partial: false, points: correct ? objective.points : 0 });
  }
  return { graded, reports };
}

export function computeScore(session: JudgeSession, graded: GradedObjective[], durationSeconds: number): ScoreBreakdown {
  const par = session.parSeconds;
  const timeBonus = Math.round(TIME_BONUS_MAX * Math.min(1, Math.max(0, (2 * par - durationSeconds) / (1.5 * par))));
  const efficiencyPenalty = Math.min(CALL_PENALTY_CAP, Math.max(0, session.calls - PAR_CALLS) * CALL_PENALTY);
  const hintPenalty = session.hintsUsed.size * HINT_PENALTY;
  const base = graded.reduce((sum, o) => sum + o.points, 0);
  // The time bonus only counts when something scored, so a blank submit cannot win by being fast.
  const total = Math.max(0, base + (base > 0 ? timeBonus : 0) - efficiencyPenalty - hintPenalty);
  return {
    objectives: graded,
    timeBonus: base > 0 ? timeBonus : 0,
    efficiencyPenalty,
    hintPenalty,
    total,
    passed: graded.every((o) => o.correct) && total >= session.passScore,
    durationSeconds,
    callCount: session.calls,
    hintsUsed: session.hintsUsed.size,
  };
}
