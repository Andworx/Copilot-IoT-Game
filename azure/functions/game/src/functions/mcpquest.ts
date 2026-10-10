import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { registerHttp } from "../lib/apiSurface";
import { getActiveContestCampaignId } from "../lib/dataverse";
import { signPlayToken, verifyPlayToken } from "../lib/mcpquestToken";
import { dataverseClaimIssuer, dataversePlayStore } from "../lib/mcpquestStore";
import { PlayError, createPlayService, type PlayService } from "../mcpquest/service";

/**
 * MCP Quest routes (public surface). The browser sends the session token it received from
 * `start` on every call; nothing else identifies a player. The judge, the answer keys and the
 * prize claim all live behind these routes. See docs/MCP_QUEST_ENGINE.md.
 *
 *   POST /api/mcpquest/start       { nickname, station, mode }     -> SessionInfo
 *   POST /api/mcpquest/call        { sessionToken, tool, arguments } -> CallResult
 *   POST /api/mcpquest/hint        { sessionToken, objectiveId }     -> { hint }
 *   POST /api/mcpquest/choose      { sessionToken, objectiveId, productId } -> ChooseResult
 *   POST /api/mcpquest/test        { sessionToken, objectiveId, design }    -> TestReport
 *   POST /api/mcpquest/submit      { sessionToken, answers }         -> SubmitResult
 *   GET  /api/mcpquest/leaderboard ?mode=<slug>                      -> { entries }
 */

let service: PlayService | null = null;
function playService(): PlayService {
  service ??= createPlayService({
    store: dataversePlayStore(),
    claims: dataverseClaimIssuer(),
    signToken: (playId, expiresAt) => signPlayToken({ playId, expiresAt }),
    verifyToken: (token, now) => verifyPlayToken(token, now),
    activeCampaignId: getActiveContestCampaignId,
  });
  return service;
}

async function body(request: HttpRequest): Promise<Record<string, unknown>> {
  try {
    const parsed = (await request.json()) as unknown;
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    throw new PlayError("bad_request", "Invalid JSON body");
  }
}

function handler(
  name: string,
  run: (service: PlayService, request: HttpRequest) => Promise<unknown>,
) {
  return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      return { jsonBody: await run(playService(), request) };
    } catch (error) {
      if (error instanceof PlayError) {
        return { status: error.status, jsonBody: { error: error.message, code: error.code } };
      }
      context.error(`${name} failed`, error);
      return { status: 500, jsonBody: { error: "Something went wrong. Please try again." } };
    }
  };
}

registerHttp("mcpquest-start", {
  route: "mcpquest/start",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: handler("mcpquest-start", async (s, r) => {
    const b = await body(r);
    return s.start({ nickname: b.nickname, station: b.station, mode: b.mode });
  }),
});

registerHttp("mcpquest-call", {
  route: "mcpquest/call",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: handler("mcpquest-call", async (s, r) => {
    const b = await body(r);
    return s.call(b.sessionToken, b.tool, b.arguments);
  }),
});

registerHttp("mcpquest-hint", {
  route: "mcpquest/hint",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: handler("mcpquest-hint", async (s, r) => {
    const b = await body(r);
    return { hint: await s.hint(b.sessionToken, b.objectiveId) };
  }),
});

registerHttp("mcpquest-choose", {
  route: "mcpquest/choose",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: handler("mcpquest-choose", async (s, r) => {
    const b = await body(r);
    return s.choose(b.sessionToken, b.objectiveId, b.productId);
  }),
});

registerHttp("mcpquest-test", {
  route: "mcpquest/test",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: handler("mcpquest-test", async (s, r) => {
    const b = await body(r);
    return s.test(b.sessionToken, b.objectiveId, b.design);
  }),
});

registerHttp("mcpquest-submit", {
  route: "mcpquest/submit",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: handler("mcpquest-submit", async (s, r) => {
    const b = await body(r);
    return s.submit(b.sessionToken, b.answers);
  }),
});

registerHttp("mcpquest-leaderboard", {
  route: "mcpquest/leaderboard",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: handler("mcpquest-leaderboard", async (s, r) => ({
    entries: await s.leaderboard(r.query.get("mode")),
  })),
});
