import type { GameSpec } from "./gamespec";
import { judgeCase, runDesign } from "./specJudge";
import type { StoredSpec } from "./generate/service";
import { PRODUCT_FOR_DESIGNER, designFieldsOf } from "./specDesigns";
import type { CaseReport, DesignCatalog, Objective, RunTrace, ScoreBreakdown, SessionInfo, TestReport } from "./types";

/**
 * Play rules for an agent-generated game. Pure functions over a stored spec and the play's
 * persisted state; the play service owns I/O. Nothing here reads a requirement's check
 * logic into a value the client receives: only the plain-language text goes out.
 */

/** A play's mission slug when it runs a generated spec. */
export const SPEC_MODE_PREFIX = "spec:";
const SPEC_ID_RE = /^[0-9a-f]{16}$/;

export function specModeSlug(specId: string): string {
  return `${SPEC_MODE_PREFIX}${specId}`;
}

/** The spec id of a mission slug, or null when it is not a generated game. */
export function specIdOf(modeSlug: string): string | null {
  if (!modeSlug.startsWith(SPEC_MODE_PREFIX)) return null;
  const id = modeSlug.slice(SPEC_MODE_PREFIX.length);
  return SPEC_ID_RE.test(id) ? id : null;
}

export const SPEC_RULES = {
  /** Every generated game is scored out of this. */
  maxScore: 100,
  /** The score that counts as a pass (the 70-89 entry tier starts here). */
  passScore: 70,
  hintPenalty: 5,
  maxTests: 6,
  parSeconds: 300,
  maxSeconds: 900,
} as const;

const EMPTY_CATALOG: DesignCatalog = {
  categories: [],
  priorities: [],
  states: [],
  groups: [],
  aggregates: { category: [], priority: [], state: [], group: [] },
};

/** What the player is told about a generated game. No checks, no reference designs. */
export function specSession(stored: StoredSpec): Omit<SessionInfo, "token" | "startedAt" | "serverNow"> {
  const spec = stored.spec;
  const share = SPEC_RULES.maxScore / spec.cases.length;
  const objectives: Objective[] = spec.cases.map((c) => ({
    id: c.id,
    prompt: c.brief,
    kind: "build",
    answerFormat: "your design as JSON",
    points: Math.round(share),
    designer: c.designer,
    requirements: c.requirements.map((r) => r.text),
    caseTitle: c.title,
    label: c.title,
    scenarios: c.scenarios.map((s) => ({ name: s.name, trigger: s.trigger, input: s.input })),
    judging: c.judging,
    ...(c.judging === "design" ? { designFields: designFieldsOf(c) } : {}),
  }));
  return {
    modeSlug: specModeSlug(stored.specId),
    modeTitle: spec.title,
    scenario: spec.scenario,
    objectives,
    tools: stored.tools,
    samples: stored.samples,
    catalog: EMPTY_CATALOG,
    parSeconds: SPEC_RULES.parSeconds,
    maxSeconds: SPEC_RULES.maxSeconds,
    parCalls: 0,
    maxCalls: 0,
    maxTests: SPEC_RULES.maxTests,
    passScore: SPEC_RULES.passScore,
    maxScore: SPEC_RULES.maxScore,
    hintPenalty: SPEC_RULES.hintPenalty,
  };
}

/** A design arrives as JSON text. Returns the parsed value or null when it is not an object. */
export function parseSpecDesign(text: unknown): Record<string, unknown> | null {
  if (typeof text !== "string" || text.length === 0 || text.length > 20_000) return null;
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Whether a design does anything at all: a run case makes at least one valid call in some
 * scenario, a settings case has at least one value. Requirements such as "do not submit the
 * draft" are met by doing nothing, so without real work a case earns no credit and its
 * criteria are not shown as met.
 */
export function didWork(c: GameSpec["cases"][number], design: Record<string, unknown>, tools: StoredSpec["tools"]): boolean {
  if (c.judging === "design") return Object.keys(design).length > 0;
  return c.scenarios.some((scenario) => runDesign(design, scenario, tools).calls.length > 0);
}

/** Runs a design against one case and reports it the way the designers' test panel expects. */
export function testSpecCase(stored: StoredSpec, caseId: string, design: Record<string, unknown>, testsLeft: number): TestReport {
  const c = stored.spec.cases.find((x) => x.id === caseId);
  if (!c) throw new Error("Unknown case.");
  const raw = judgeCase(c, design, stored.tools);
  const worked = didWork(c, design, stored.tools);
  const verdict = worked ? raw : { ...raw, requirements: raw.requirements.map((r) => ({ ...r, ok: false })), passed: false };
  const runs: RunTrace[] | undefined =
    c.judging === "run"
      ? c.scenarios.map((scenario) => {
          const log = runDesign(design, scenario, stored.tools);
          return {
            scenario: scenario.name,
            fired: log.fired,
            steps: [
              ...log.calls.map((call) => ({
                label: call.tool,
                status: "succeeded" as const,
                detail: Object.entries(call.args)
                  .map(([k, v]) => `${k}=${String(v)}`)
                  .join(", "),
              })),
              ...log.problems.map((p) => ({ label: "Problem", status: "failed" as const, detail: p })),
            ],
          };
        })
      : undefined;
  return {
    criteria: verdict.requirements.map((r) => ({ label: r.text, ok: r.ok })),
    runs,
    testsLeft,
  };
}

export interface SpecGrade {
  score: ScoreBreakdown;
  cases: CaseReport[];
  /** Every requirement of every case is met. */
  perfect: boolean;
}

/** Grades the submitted designs. Deterministic; the share of each case is split over its requirements. */
export function gradeSpec(spec: GameSpec, stored: StoredSpec, answers: Record<string, string>, input: {
  hintsUsed: number;
  durationSeconds: number;
}): SpecGrade {
  const share = SPEC_RULES.maxScore / spec.cases.length;
  const objectives: ScoreBreakdown["objectives"] = [];
  const reports: CaseReport[] = [];
  let earned = 0;
  let perfect = true;

  for (const c of spec.cases) {
    const design = parseSpecDesign(answers[c.id]);
    const judged = design && didWork(c, design, stored.tools) ? judgeCase(c, design, stored.tools) : null;
    // No design, or one that does nothing, earns no credit even for requirements it meets by default.
    const verdict = judged ?? { requirements: c.requirements.map((r) => ({ id: r.id, text: r.text, ok: false })), passed: false, problems: [] };
    const met = verdict.requirements.filter((r) => r.ok).length;
    const points = share * (met / Math.max(1, c.requirements.length));
    earned += points;
    if (!verdict.passed) perfect = false;
    objectives.push({ id: c.id, correct: verdict.passed, partial: !verdict.passed && met > 0, points: Math.round(points) });
    reports.push({
      objectiveId: c.id,
      caseTitle: c.title,
      chosenProduct: PRODUCT_FOR_DESIGNER[c.designer].name,
      bestProduct: PRODUCT_FOR_DESIGNER[c.designer].name,
      misses: 0,
      criteria: verdict.requirements.map((r) => ({ label: r.text, ok: r.ok })),
      why: "",
    });
  }

  const hintPenalty = input.hintsUsed * SPEC_RULES.hintPenalty;
  const total = Math.max(0, Math.min(SPEC_RULES.maxScore, Math.round(earned - hintPenalty)));
  return {
    score: {
      objectives,
      timeBonus: 0,
      efficiencyPenalty: 0,
      hintPenalty,
      total,
      percent: total,
      passed: perfect && total >= SPEC_RULES.passScore,
      durationSeconds: input.durationSeconds,
      callCount: 0,
      hintsUsed: input.hintsUsed,
    },
    cases: reports,
    perfect,
  };
}
