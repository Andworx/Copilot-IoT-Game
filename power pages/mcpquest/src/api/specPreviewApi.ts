import { entriesForScore } from "@mcpquest/entryTier";
import type { StoredSpec } from "@mcpquest/generate/service";
import { SPEC_RULES, gradeSpec, parseSpecDesign, specSession, testSpecCase } from "@mcpquest/specPlay";
import type { GameApi, SessionInfo, SubmitResult } from "@mcpquest/types";

/**
 * Plays a saved generated game entirely in the browser, with the same rules and judge the
 * Function App uses. For trying designers and specs without a deployed backend: it is not
 * prize-eligible and has no leaderboard. Reached with `?specUrl=<url of a stored spec JSON>`.
 */

interface Local {
  startedAt: number;
  nickname: string;
  hints: Set<string>;
  tests: Record<string, number>;
  result?: SubmitResult;
}

function randomToken(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function looksLikeStoredSpec(v: unknown): v is StoredSpec {
  const o = v as Partial<StoredSpec> | null;
  return !!o && typeof o === "object" && !!o.spec && Array.isArray(o.spec.cases) && Array.isArray(o.tools) && typeof o.specId === "string";
}

export function createSpecPreviewApi(specUrl: string, entryCap = 3): GameApi {
  let loading: Promise<StoredSpec> | null = null;
  const sessions = new Map<string, Local>();

  const load = () =>
    (loading ??= fetch(specUrl).then(async (response) => {
      if (!response.ok) throw new Error(`Could not load the game file (${response.status}).`);
      const json = (await response.json()) as unknown;
      if (!looksLikeStoredSpec(json)) throw new Error("That file is not a saved MCP Quest game.");
      return { ...json, samples: json.samples ?? [] };
    }));

  const local = (session: SessionInfo): Local => {
    const s = sessions.get(session.token);
    if (!s) throw new Error("Session expired. Start a new play.");
    return s;
  };

  return {
    kind: "preview",

    async start(nickname) {
      const stored = await load();
      const token = randomToken();
      const startedAt = Date.now();
      sessions.set(token, { startedAt, nickname, hints: new Set(), tests: {} });
      return { ...specSession(stored), token, startedAt, serverNow: startedAt };
    },

    async call() {
      throw new Error("Direct tool calls are not part of this game. Build and test a design.");
    },

    async hint(session, objectiveId) {
      const stored = await load();
      const c = stored.spec.cases.find((x) => x.id === objectiveId);
      if (!c) throw new Error("That hint is not available.");
      local(session).hints.add(objectiveId);
      return c.hint;
    },

    async choose() {
      throw new Error("This game gives you the product for each case. Build and test a design.");
    },

    async test(session, objectiveId, design) {
      const stored = await load();
      const state = local(session);
      const parsed = parseSpecDesign(design);
      if (!parsed) throw new Error("The design must be a JSON object.");
      if (!stored.spec.cases.some((c) => c.id === objectiveId)) throw new Error("Unknown case.");
      const used = state.tests[objectiveId] ?? 0;
      if (used >= SPEC_RULES.maxTests) throw new Error("No test runs left for this case.");
      state.tests[objectiveId] = used + 1;
      return testSpecCase(stored, objectiveId, parsed, SPEC_RULES.maxTests - used - 1);
    },

    async submit(session, answers) {
      const stored = await load();
      const state = local(session);
      if (state.result) return state.result;
      const durationSeconds = Math.min(SPEC_RULES.maxSeconds, Math.max(1, Math.round((Date.now() - state.startedAt) / 1000)));
      const grade = gradeSpec(stored.spec, stored, answers, { hintsUsed: state.hints.size, durationSeconds });
      const award = entriesForScore(grade.score.percent, entryCap);
      state.result = {
        score: grade.score,
        cases: grade.cases,
        entries: { tier: award.tier, awarded: award.entries },
        claimToken: `preview-${randomToken()}`,
      };
      return state.result;
    },

    async leaderboard() {
      return [];
    },
  };
}
