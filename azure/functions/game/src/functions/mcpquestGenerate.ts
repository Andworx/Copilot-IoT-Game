import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { registerHttp } from "../lib/apiSurface";
import { blobJson } from "../lib/mcpquestBlobJson";
import { blobSpecStore, storageToken } from "../lib/mcpquestSpecStore";
import { createCatalogClient } from "../mcpquest/generate/catalog";
import { createFoundryModel, foundryAudience, foundryToken } from "../mcpquest/generate/foundry";
import { answerFor, clientKeyFrom, parseGenerateRequest, parseLimit, statusBody } from "../mcpquest/generate/http";
import {
  DEFAULT_LIMITS,
  blobGenerateLock,
  blobJobStore,
  blobRateLimiter,
  isJobId,
  runGenerateJob,
  type RunnerDeps,
} from "../mcpquest/generate/jobs";
import { generateGameSpec } from "../mcpquest/generate/service";
import { proveSpec } from "../mcpquest/specJudge";

/**
 * Building a game from an MCP Station server (public surface). The page picks a job id, sends it
 * with the request, and polls the status route while the request runs (about 25 seconds), so a
 * "building your mission" screen can show real progress.
 *
 *   GET  /api/mcpquest/servers                 -> { servers: [{ slug, name, description, toolCount }] }
 *   POST /api/mcpquest/generate  { server, jobId } -> { specId, title, cached }
 *   GET  /api/mcpquest/generate/status ?job=<jobId> -> { stage, specId?, title?, error? }
 *
 * Settings: MCPQUEST_SPEC_BLOB_URL (container for specs, jobs, locks and counters),
 * FOUNDRY_ENDPOINT, FOUNDRY_MODEL (or FOUNDRY_AGENT_NAME with a project endpoint), and the
 * optional MCPQUEST_GENERATE_PER_CLIENT_HOUR / MCPQUEST_GENERATE_GLOBAL_HOUR.
 */

class NotConfigured extends Error {}

const catalog = createCatalogClient();
let runtime: { deps: RunnerDeps; salt: string } | null = null;

function runtimeDeps(): { deps: RunnerDeps; salt: string } {
  if (runtime) return runtime;
  const container = process.env.MCPQUEST_SPEC_BLOB_URL;
  const endpoint = process.env.FOUNDRY_ENDPOINT;
  const model = process.env.FOUNDRY_MODEL;
  const agentName = process.env.FOUNDRY_AGENT_NAME;
  const salt = process.env.MCPQUEST_TOKEN_SECRET;
  if (!container || !endpoint || (!model && !agentName) || !salt) throw new NotConfigured();

  const blobs = blobJson({ containerUrl: container, getToken: () => storageToken() });
  const specs = blobSpecStore({ containerUrl: container, getToken: () => storageToken() });
  const llm = createFoundryModel({
    projectEndpoint: endpoint,
    model,
    agentName,
    getToken: () => foundryToken(process.env, fetch, foundryAudience(endpoint)),
  });
  const limits = {
    perClientPerHour: parseLimit(process.env.MCPQUEST_GENERATE_PER_CLIENT_HOUR, DEFAULT_LIMITS.perClientPerHour),
    globalPerHour: parseLimit(process.env.MCPQUEST_GENERATE_GLOBAL_HOUR, DEFAULT_LIMITS.globalPerHour),
  };

  runtime = {
    salt,
    deps: {
      jobs: blobJobStore(blobs),
      locks: blobGenerateLock(blobs),
      limiter: blobRateLimiter(blobs, limits),
      isKnownServer: (slug) => catalog.has(slug),
      generate: (slug, hooks) =>
        generateGameSpec(slug, {
          model: llm,
          store: specs,
          fetchFn: fetch,
          prove: async (spec, digest) => proveSpec(spec, digest.tools, digest.samples),
          onStage: hooks.onStage,
          admit: hooks.admit,
        }),
    },
  };
  return runtime;
}

const NOT_READY: HttpResponseInit = { status: 503, jsonBody: { error: "Game building is not set up yet.", code: "not_configured" } };

registerHttp("mcpquest-servers", {
  route: "mcpquest/servers",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async (_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      return { jsonBody: { servers: await catalog.list() } };
    } catch (error) {
      context.error("mcpquest-servers failed", error);
      return { status: 502, jsonBody: { error: "The MCP server list is unavailable. Try again shortly.", code: "server_unavailable" } };
    }
  },
});

registerHttp("mcpquest-generate", {
  route: "mcpquest/generate",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    let body: Record<string, unknown>;
    try {
      const parsed = (await request.json()) as unknown;
      body = typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
    } catch {
      return { status: 400, jsonBody: { error: "Invalid JSON body", code: "bad_request" } };
    }
    const input = parseGenerateRequest(body);
    if ("error" in input) return { status: 400, jsonBody: { error: input.error, code: "bad_request" } };

    try {
      const { deps, salt } = runtimeDeps();
      const outcome = await runGenerateJob({ ...input, clientKey: clientKeyFrom(request.headers, salt) }, deps);
      const answer = answerFor(outcome);
      return { status: answer.status, jsonBody: answer.body, ...(answer.headers ? { headers: answer.headers } : {}) };
    } catch (error) {
      if (error instanceof NotConfigured) return NOT_READY;
      context.error("mcpquest-generate failed", error);
      return { status: 500, jsonBody: { error: "Something went wrong. Please try again.", code: "internal" } };
    }
  },
});

registerHttp("mcpquest-generate-status", {
  route: "mcpquest/generate/status",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const job = request.query.get("job");
    if (!isJobId(job)) return { status: 400, jsonBody: { error: "job must be a GUID.", code: "bad_request" } };
    try {
      const status = await runtimeDeps().deps.jobs.get(job);
      if (!status) return { status: 404, jsonBody: { error: "No such job.", code: "not_found" } };
      return { jsonBody: statusBody(status) };
    } catch (error) {
      if (error instanceof NotConfigured) return NOT_READY;
      context.error("mcpquest-generate-status failed", error);
      return { status: 500, jsonBody: { error: "Something went wrong. Please try again.", code: "internal" } };
    }
  },
});
