import type {
  BuildStage,
  BuiltGame,
  CallResult,
  ChooseResult,
  GameApi,
  LeaderboardEntry,
  ServerOption,
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
    readonly detail: { code?: string; jobId?: string; retryAfterSeconds?: number } = {},
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
      let detail: ApiError["detail"] = {};
      try {
        const body = (await response.json()) as { error?: unknown; code?: unknown; jobId?: unknown; retryAfterSeconds?: unknown };
        if (typeof body.error === "string") message = body.error;
        detail = {
          code: typeof body.code === "string" ? body.code : undefined,
          jobId: typeof body.jobId === "string" ? body.jobId : undefined,
          retryAfterSeconds: typeof body.retryAfterSeconds === "number" ? body.retryAfterSeconds : undefined,
        };
      } catch {
        // non-JSON error body; keep the generic message
      }
      throw new ApiError(message, response.status, detail);
    }
    return (await response.json()) as T;
  }

  const post = <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) });

  const STAGES: BuildStage[] = ["reading", "designing", "repairing", "checking", "proving", "saving", "done"];
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  interface JobView {
    stage: BuildStage | "failed";
    specId?: string;
    title?: string;
    cached?: boolean;
    error?: { code: string; message: string };
  }

  /** Watches a job (ours, or another visitor's build of the same server) until it ends. */
  async function follow(jobId: string, onStage: (stage: BuildStage) => void): Promise<BuiltGame> {
    for (let i = 0; i < 150; i += 1) {
      await sleep(i === 0 ? 300 : 1000);
      const job = await request<JobView>(`generate/status?job=${encodeURIComponent(jobId)}`);
      if (job.stage === "failed") {
        throw new ApiError(job.error?.message ?? "The game could not be built.", 502, { code: job.error?.code });
      }
      if (STAGES.includes(job.stage)) onStage(job.stage);
      if (job.stage === "done" && job.specId) {
        return { specId: job.specId, title: job.title ?? "Your mission", cached: job.cached === true };
      }
    }
    throw new ApiError("Building the game took too long. Please try again.", 504, { code: "timeout" });
  }

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
    listServers: async () => (await request<{ servers: ServerOption[] }>("servers")).servers,
    buildGame: async (slug, onStage) => {
      const jobId = crypto.randomUUID();
      let working = true;
      // Progress comes from the status route while the (long) generate request is open.
      const watcher = (async () => {
        while (working) {
          await sleep(900);
          if (!working) break;
          try {
            const job = await request<JobView>(`generate/status?job=${jobId}`);
            if (job.stage !== "failed" && STAGES.includes(job.stage)) onStage(job.stage);
          } catch {
            // The job may not exist for a moment, and progress is only a courtesy.
          }
        }
      })();
      try {
        const built = await post<{ specId: string; title: string; cached: boolean }>("generate", { server: slug, jobId });
        onStage("done");
        return built;
      } catch (error) {
        // Someone else is already building this server: share their build rather than start another.
        if (error instanceof ApiError && error.status === 409 && error.detail.jobId) {
          working = false;
          return await follow(error.detail.jobId, onStage);
        }
        throw error;
      } finally {
        working = false;
        await watcher;
      }
    },
    leaderboard: async (modeSlug) => {
      const result = await request<{ entries: LeaderboardEntry[] }>(
        `leaderboard?mode=${encodeURIComponent(modeSlug)}`,
      );
      return result.entries;
    },
  };
}
