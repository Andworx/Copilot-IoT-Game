import type {
  CallResult,
  ChooseResult,
  GameApi,
  LeaderboardEntry,
  SessionInfo,
  SubmitResult,
  TestReport,
} from "@mcpquest/types";

/**
 * Live client for the `/api/mcpquest/*` Function routes described in
 * requirements/MCP_QUEST_PLAN.md. Those routes are not built yet, so this is only reached
 * with `?api=live`. Every request is anonymous; trust comes from the signed session token.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function createHttpApi(baseUrl: string): GameApi {
  const root = baseUrl.replace(/\/+$/, "");

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${root}/api/mcpquest/${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const body = (await response.json()) as { error?: unknown };
        if (typeof body.error === "string") message = body.error;
      } catch {
        // non-JSON error body; keep the generic message
      }
      throw new ApiError(message, response.status);
    }
    return (await response.json()) as T;
  }

  const post = <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) });

  return {
    kind: "live",
    // A generated game's mission slug is `spec:<id>`; the route takes the id as `spec`.
    start: (nickname, station, mode) =>
      mode.startsWith("spec:")
        ? post<SessionInfo>("start", { nickname, station, spec: mode.slice(5) })
        : post<SessionInfo>("start", { nickname, station, mode }),
    call: (session, tool, args) =>
      post<CallResult>("call", { sessionToken: session.token, tool, arguments: args }),
    hint: async (session, objectiveId) => {
      const result = await post<{ hint: string }>("hint", { sessionToken: session.token, objectiveId });
      return result.hint;
    },
    choose: (session, objectiveId, productId) =>
      post<ChooseResult>("choose", { sessionToken: session.token, objectiveId, productId }),
    test: (session, objectiveId, design) =>
      post<TestReport>("test", { sessionToken: session.token, objectiveId, design }),
    submit: (session, answers) => post<SubmitResult>("submit", { sessionToken: session.token, answers }),
    leaderboard: async (modeSlug) => {
      const result = await request<{ entries: LeaderboardEntry[] }>(
        `leaderboard?mode=${encodeURIComponent(modeSlug)}`,
      );
      return result.entries;
    },
  };
}
