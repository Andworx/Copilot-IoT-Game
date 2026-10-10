import {
  callTool,
  chooseProduct,
  computeScore,
  gradeObjectives,
  requestHint,
  startPlay,
  testDesign,
  type JudgeSession,
} from "./judge";
import { MODES } from "./api/modes";
import { randomHex, withSeed } from "./api/shuffle";
import type { World } from "./api/world";
import { DEFAULT_SNAPSHOT, SNAPSHOTS, createSnapshotWorld } from "./snapshot";
import { ConflictError, type ClaimIssuer, type PlayRow, type PlayState, type PlayStore } from "./store";
import type {
  CallResult,
  ChooseResult,
  LeaderboardEntry,
  SessionInfo,
  SubmitResult,
  TestReport,
} from "./types";

/**
 * The prize-eligible MCP Quest backend. Every request is stateless: the play lives in a
 * store row, the cases are rebuilt from the row's seed and a repo snapshot, and the answer
 * keys never leave this module. A win is only minted here, after the judge has graded the
 * submitted designs.
 */

export type PlayErrorCode =
  | "bad_request"
  | "unauthorized"
  | "not_found"
  | "time_up"
  | "already_submitted"
  | "claim_unavailable";

const STATUS: Record<PlayErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  not_found: 404,
  time_up: 409,
  already_submitted: 409,
  claim_unavailable: 503,
};

export class PlayError extends Error {
  readonly status: number;
  constructor(
    readonly code: PlayErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PlayError";
    this.status = STATUS[code];
  }
}

const NICKNAME = /^[A-Za-z0-9 _.-]{3,12}$/;
const STATION = /^[a-z0-9][a-z0-9_-]{0,39}$/;
/** Network and clock slack on top of a mode's time limit. */
const GRACE_SECONDS = 30;
const TOP_N = 10;

export interface PlayServiceDeps {
  store: PlayStore;
  claims: ClaimIssuer;
  /** Signs a session token for a play. */
  signToken(playId: string, expiresAt: number): string;
  /** Returns the play id for a valid token, or null. */
  verifyToken(token: unknown, now: number): string | null;
  /** The active Contest Campaign id, so boards can be scoped to it. */
  activeCampaignId(): Promise<string | null>;
  now?: () => number;
  newSeed?: () => string;
  newClaimToken?: () => string;
}

const worlds = new Map<string, World>();
function worldFor(snapshotId: string): World {
  const cached = worlds.get(snapshotId);
  if (cached) return cached;
  const snapshot = SNAPSHOTS[snapshotId];
  if (!snapshot) throw new PlayError("not_found", "This play uses a snapshot that is no longer available");
  const world = createSnapshotWorld(snapshot);
  worlds.set(snapshotId, world);
  return world;
}

function parseResult(row: PlayRow): SubmitResult | null {
  if (!row.resultJson) return null;
  try {
    return JSON.parse(row.resultJson) as SubmitResult;
  } catch {
    return null;
  }
}

export function createPlayService(deps: PlayServiceDeps) {
  const now = deps.now ?? (() => Date.now());
  const newSeed = deps.newSeed ?? (() => randomHex(12));
  const newClaimToken = deps.newClaimToken ?? (() => crypto.randomUUID());

  /** Rebuilds the judge's view of a play from its row. Deterministic. */
  function hydrate(row: PlayRow): JudgeSession & { modeTimeLimit: number } {
    const world = worldFor(row.snapshot);
    const { mode, templates, cases } = withSeed(row.seed, () => startPlay(world, row.modeSlug));
    for (const [id, state] of Object.entries(row.state.cases)) {
      if (cases.has(id)) cases.set(id, { ...state });
    }
    return {
      world,
      keys: new Map(templates.map((t) => [t.objective.id, t])),
      cases,
      hintsUsed: new Set(row.state.hints),
      calls: row.state.calls,
      passScore: mode.passScore,
      parSeconds: mode.parSeconds,
      submitted: row.submitted,
      modeTimeLimit: mode.maxSeconds,
    };
  }

  function stateOf(session: JudgeSession): PlayState {
    return {
      v: 1,
      cases: Object.fromEntries([...session.cases.entries()].map(([id, c]) => [id, { ...c }])),
      hints: [...session.hintsUsed],
      calls: session.calls,
    };
  }

  async function load(token: unknown): Promise<PlayRow> {
    const playId = deps.verifyToken(token, now());
    if (!playId) throw new PlayError("unauthorized", "The session is not valid. Start a new play.");
    const row = await deps.store.load(playId);
    if (!row) throw new PlayError("not_found", "That play could not be found.");
    return row;
  }

  /** Runs an action against a play and persists the new state, retrying once on a race. */
  async function mutate<T>(token: unknown, action: (session: JudgeSession) => Promise<T> | T): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
      const row = await load(token);
      if (row.submitted) throw new PlayError("already_submitted", "This play has already been submitted.");
      const session = hydrate(row);
      if (now() > row.startedAt + (session.modeTimeLimit + GRACE_SECONDS) * 1000) {
        throw new PlayError("time_up", "Time is up. Submit what you have.");
      }
      const result = await action(session);
      try {
        await deps.store.saveState(row.id, stateOf(session), row.etag);
        return result;
      } catch (error) {
        if (error instanceof ConflictError && attempt === 0) continue;
        throw error;
      }
    }
  }

  return {
    async start(input: { nickname: unknown; station: unknown; mode: unknown }): Promise<SessionInfo> {
      const nickname = typeof input.nickname === "string" ? input.nickname.trim() : "";
      if (!NICKNAME.test(nickname)) {
        throw new PlayError("bad_request", "Choose a player name of 3 to 12 letters or numbers.");
      }
      const station = typeof input.station === "string" && input.station ? input.station.trim().toLowerCase() : "default";
      if (!STATION.test(station)) throw new PlayError("bad_request", "That station name is not valid.");
      const modeSlug = typeof input.mode === "string" && input.mode ? input.mode : MODES[0].slug;
      if (!MODES.some((m) => m.slug === modeSlug)) throw new PlayError("bad_request", "Unknown mission.");

      const seed = newSeed();
      const world = worldFor(DEFAULT_SNAPSHOT);
      const { cases, base } = withSeed(seed, () => startPlay(world, modeSlug));
      const startedAt = now();
      const state: PlayState = {
        v: 1,
        cases: Object.fromEntries([...cases.entries()]),
        hints: [],
        calls: 0,
      };
      const created = await deps.store.create({
        station,
        modeSlug,
        nickname,
        seed,
        snapshot: DEFAULT_SNAPSHOT,
        startedAt,
        state,
        campaignId: await deps.activeCampaignId(),
      });
      const expiresAt = startedAt + (base.maxSeconds + GRACE_SECONDS + 600) * 1000;
      return { ...base, token: deps.signToken(created.id, expiresAt), startedAt, serverNow: startedAt };
    },

    call(token: unknown, tool: unknown, args: unknown): Promise<CallResult> {
      if (typeof tool !== "string") throw new PlayError("bad_request", "tool is required");
      const safeArgs = typeof args === "object" && args !== null ? (args as Record<string, unknown>) : {};
      return mutate(token, (session) => callTool(session, tool, safeArgs));
    },

    hint(token: unknown, objectiveId: unknown): Promise<string> {
      if (typeof objectiveId !== "string") throw new PlayError("bad_request", "objectiveId is required");
      return mutate(token, (session) => {
        try {
          return requestHint(session, objectiveId);
        } catch {
          throw new PlayError("bad_request", "That hint is not available.");
        }
      });
    },

    choose(token: unknown, objectiveId: unknown, productId: unknown): Promise<ChooseResult> {
      if (typeof objectiveId !== "string" || typeof productId !== "string") {
        throw new PlayError("bad_request", "objectiveId and productId are required");
      }
      return mutate(token, (session) => {
        try {
          return chooseProduct(session, objectiveId, productId);
        } catch (error) {
          throw new PlayError("bad_request", error instanceof Error ? error.message : "Choice unavailable");
        }
      });
    },

    test(token: unknown, objectiveId: unknown, design: unknown): Promise<TestReport> {
      if (typeof objectiveId !== "string" || typeof design !== "string" || design.length > 20_000) {
        throw new PlayError("bad_request", "objectiveId and a design are required");
      }
      return mutate(token, async (session) => {
        try {
          return await testDesign(session, objectiveId, design);
        } catch (error) {
          throw new PlayError("bad_request", error instanceof Error ? error.message : "Test unavailable");
        }
      });
    },

    async submit(token: unknown, answers: unknown): Promise<SubmitResult> {
      const row = await load(token);

      // A repeat submit returns the original result, and finishes a claim that failed earlier.
      if (row.submitted) {
        const stored = parseResult(row);
        if (!stored) throw new PlayError("not_found", "The result for this play is unavailable.");
        if (row.passed && row.claimToken && !row.claimIssued) await issueClaim(row);
        return stored;
      }

      const safeAnswers: Record<string, string> = {};
      if (typeof answers === "object" && answers !== null) {
        for (const [key, value] of Object.entries(answers)) {
          if (typeof value === "string" && value.length <= 20_000) safeAnswers[key] = value;
        }
      }

      const session = hydrate(row);
      const elapsed = Math.round((now() - row.startedAt) / 1000);
      const durationSeconds = Math.min(session.modeTimeLimit, Math.max(1, elapsed));
      const { graded, reports } = await gradeObjectives(session, safeAnswers);
      const score = computeScore(session, graded, durationSeconds);
      const claimToken = score.passed ? newClaimToken() : null;

      const result: SubmitResult = {
        score,
        cases: reports.length > 0 ? reports : undefined,
        claimToken: claimToken ?? undefined,
      };
      await deps.store.complete(row.id, row.etag, {
        passed: score.passed,
        score: score.total,
        durationSeconds,
        callCount: score.callCount,
        hintsUsed: score.hintsUsed,
        testCount: [...session.cases.values()].reduce((sum, c) => sum + c.tests, 0),
        claimToken,
        resultJson: JSON.stringify(result),
        submittedAt: now(),
        state: stateOf(session),
      });

      if (claimToken) await issueClaim({ ...row, submitted: true, passed: true, claimToken, claimIssued: false });
      result.rank = await deps.store.rankOf(row.modeSlug, score.total, durationSeconds);
      return result;
    },

    leaderboard(modeSlug: unknown): Promise<LeaderboardEntry[]> {
      const mode = typeof modeSlug === "string" && MODES.some((m) => m.slug === modeSlug) ? modeSlug : MODES[0].slug;
      return deps.store.leaderboard(mode, TOP_N);
    },
  };

  async function issueClaim(row: PlayRow): Promise<void> {
    if (!row.claimToken) return;
    try {
      const { prizeClaimId } = await deps.claims.issue({
        claimToken: row.claimToken,
        station: row.station,
        modeSlug: row.modeSlug,
        nickname: row.nickname,
      });
      await deps.store.markClaimIssued(row.id, prizeClaimId);
    } catch (error) {
      console.error("MCP Quest could not issue the Prize Claim", error);
      throw new PlayError("claim_unavailable", "You passed, but the prize could not be set up. Press submit again.");
    }
  }
}

export type PlayService = ReturnType<typeof createPlayService>;
