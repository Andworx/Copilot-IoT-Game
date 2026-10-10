import {
  chooseProduct,
  callTool,
  computeScore,
  gradeObjectives,
  requestHint,
  startPlay,
  testDesign,
  type JudgeSession,
} from "@mcpquest/judge";
import { randomHex } from "@mcpquest/api/shuffle";
import type { World } from "@mcpquest/api/world";
import type { GameApi, LeaderboardEntry, SessionInfo, SubmitResult } from "@mcpquest/types";

/**
 * Session and leaderboard handling for the browser-run backends. Both the offline "preview"
 * backend and the real-MCP "mcp" backend plug a `World` into the shared judge. None of this
 * is secure or prize-eligible; the Function App runs the same judge server-side.
 */

interface LocalSession extends JudgeSession {
  nickname: string;
  modeSlug: string;
  startedAt: number;
  result?: SubmitResult;
}

const sessions = new Map<string, LocalSession>();

// ---- leaderboard -----------------------------------------------------------------------

function boardKey(modeSlug: string): string {
  return `mcpquest.preview.leaderboard.${modeSlug}`;
}

type BoardRow = Omit<LeaderboardEntry, "rank">;
const SEED_BOARD: BoardRow[] = [
  { nickname: "ADA", score: 372, durationSeconds: 118 },
  { nickname: "GRACE", score: 341, durationSeconds: 164 },
  { nickname: "LINUS", score: 305, durationSeconds: 203 },
  { nickname: "MARGO", score: 262, durationSeconds: 291 },
];

function loadBoard(modeSlug: string): BoardRow[] {
  try {
    const raw = window.localStorage.getItem(boardKey(modeSlug));
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as BoardRow[];
    }
  } catch {
    // storage unavailable (private window, blocked); fall back to the seed
  }
  return SEED_BOARD;
}

function saveBoard(modeSlug: string, entries: BoardRow[]): void {
  try {
    window.localStorage.setItem(boardKey(modeSlug), JSON.stringify(entries));
  } catch {
    // best effort only
  }
}

function ranked(entries: BoardRow[]): LeaderboardEntry[] {
  return [...entries]
    .sort((a, b) => b.score - a.score || a.durationSeconds - b.durationSeconds)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

// ---- api -------------------------------------------------------------------------------

function sessionOf(session: SessionInfo): LocalSession {
  const state = sessions.get(session.token);
  if (!state) throw new Error("Session expired. Start a new play.");
  return state;
}

export function createLocalApi(kind: "preview" | "mcp", loadWorld: () => Promise<World>): GameApi {
  return {
    kind,

    async start(nickname, _station, modeSlug) {
      const world = await loadWorld();
      const { mode, templates, cases, base } = startPlay(world, modeSlug);
      const token = randomHex();
      const startedAt = Date.now();
      sessions.set(token, {
        nickname,
        modeSlug: mode.slug,
        startedAt,
        world,
        keys: new Map(templates.map((t) => [t.objective.id, t])),
        cases,
        hintsUsed: new Set(),
        calls: 0,
        passScore: mode.passScore,
        parSeconds: mode.parSeconds,
        submitted: false,
      });
      return { ...base, token, startedAt, serverNow: startedAt } satisfies SessionInfo;
    },

    async call(session, tool, args) {
      return callTool(sessionOf(session), tool, args);
    },

    async hint(session, objectiveId) {
      return requestHint(sessionOf(session), objectiveId);
    },

    async choose(session, objectiveId, productId) {
      return chooseProduct(sessionOf(session), objectiveId, productId);
    },

    async test(session, objectiveId, design) {
      return testDesign(sessionOf(session), objectiveId, design);
    },

    async submit(session, answers) {
      const state = sessionOf(session);
      if (state.result) return state.result;
      const durationSeconds = Math.max(1, Math.round((Date.now() - state.startedAt) / 1000));
      const { graded, reports } = await gradeObjectives(state, answers);
      const score = computeScore(state, graded, durationSeconds);
      state.submitted = true;

      const board = [...loadBoard(state.modeSlug), { nickname: state.nickname, score: score.total, durationSeconds }];
      saveBoard(state.modeSlug, board);
      const index = ranked(board).findIndex(
        (e) => e.nickname === state.nickname && e.score === score.total && e.durationSeconds === durationSeconds,
      );
      state.result = {
        score,
        cases: reports.length > 0 ? reports : undefined,
        rank: index >= 0 ? index + 1 : undefined,
        claimToken: score.passed ? `preview-${randomHex()}` : undefined,
      };
      return state.result;
    },

    async leaderboard(modeSlug) {
      return ranked(loadBoard(modeSlug)).slice(0, 10);
    },
  };
}
