import { createHash } from "node:crypto";
import { isJobId, type JobOutcome, type JobStatus } from "./jobs";

/** What the generate routes answer, kept free of the Functions runtime so it can be tested. */

export interface HttpAnswer {
  status: number;
  body: Record<string, unknown>;
  headers?: Record<string, string>;
}

const STATUS: Record<string, number> = {
  unknown_server: 404,
  bad_server: 400,
  rate_limited: 429,
  in_progress: 409,
  server_unavailable: 502,
  model_unavailable: 503,
  invalid_spec: 502,
  unproven_spec: 502,
  internal: 500,
};

export function answerFor(outcome: JobOutcome): HttpAnswer {
  if (outcome.ok) {
    const s = outcome.status;
    return { status: 200, body: { specId: s.specId, title: s.title, cached: s.cached === true } };
  }
  const f = outcome.failure!;
  const body: Record<string, unknown> = { error: f.message, code: f.code };
  if (f.jobId) body.jobId = f.jobId;
  const headers: Record<string, string> = {};
  if (f.retryAfterSeconds) {
    body.retryAfterSeconds = f.retryAfterSeconds;
    headers["Retry-After"] = String(f.retryAfterSeconds);
  }
  return { status: STATUS[f.code] ?? 500, body, ...(Object.keys(headers).length ? { headers } : {}) };
}

/** The public view of a job. Nothing here is sensitive; the job id itself is the secret. */
export function statusBody(status: JobStatus): Record<string, unknown> {
  return {
    stage: status.stage,
    ...(status.specId ? { specId: status.specId, title: status.title, cached: status.cached === true } : {}),
    ...(status.error ? { error: status.error } : {}),
  };
}

export function parseGenerateRequest(body: Record<string, unknown>): { slug: string; jobId: string } | { error: string } {
  if (typeof body.server !== "string" || body.server.length === 0 || body.server.length > 64) {
    return { error: "Choose an MCP server." };
  }
  if (!isJobId(body.jobId)) return { error: "jobId must be a GUID chosen by the page." };
  return { slug: body.server, jobId: body.jobId };
}

/**
 * Identifies a caller for the rate limit without keeping their address: a salted hash of the
 * first forwarded IP. Behind a shared NAT many visitors share one key, which is why the
 * per-client allowance is deliberately generous.
 */
export function clientKeyFrom(headers: { get(name: string): string | null }, salt: string): string {
  const forwarded = headers.get("x-forwarded-for") ?? headers.get("x-azure-clientip") ?? "";
  const first = forwarded.split(",")[0].trim().replace(/:\d+$/, "") || "unknown";
  return createHash("sha256").update(`${salt}|${first}`).digest("hex").slice(0, 32);
}

export function parseLimit(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 10_000 ? n : fallback;
}
