import { GenerateError, type GenerateResult } from "./service";

/**
 * Running a generation as a tracked job, with a per-server lock and a rate limit.
 *
 * Everything shared (job status, the lock, the counters) lives in small JSON blobs behind the
 * `JsonBlobs` interface, so any number of Function instances see the same state. Writes that
 * must not race use the blob's ETag as a precondition.
 */

export type JobStage = "reading" | "designing" | "repairing" | "checking" | "proving" | "saving" | "done" | "failed";

export interface JobStatus {
  stage: JobStage;
  updatedAt: number;
  server?: string;
  specId?: string;
  title?: string;
  cached?: boolean;
  error?: { code: string; message: string };
}

export type Precondition = { create: true } | { etag: string } | { any: true };

/** A folder of JSON documents with optimistic concurrency. */
export interface JsonBlobs {
  get(path: string): Promise<{ value: unknown; etag: string } | null>;
  /** False when the precondition failed (someone else got there first). */
  put(path: string, value: unknown, condition: Precondition): Promise<boolean>;
}

const JOB_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const isJobId = (v: unknown): v is string => typeof v === "string" && JOB_ID_RE.test(v);

// ---- job status ------------------------------------------------------------------------

export interface JobStore {
  get(jobId: string): Promise<JobStatus | null>;
  set(jobId: string, status: JobStatus): Promise<void>;
}

export function blobJobStore(blobs: JsonBlobs): JobStore {
  return {
    async get(jobId) {
      if (!isJobId(jobId)) return null;
      const found = await blobs.get(`jobs/${jobId}.json`);
      const v = found?.value as JobStatus | undefined;
      return v && typeof v.stage === "string" ? v : null;
    },
    async set(jobId, status) {
      if (!isJobId(jobId)) throw new Error("Invalid job id");
      await blobs.put(`jobs/${jobId}.json`, status, { any: true });
    },
  };
}

// ---- one generation per server at a time -------------------------------------------------

export const LOCK_MS = 3 * 60 * 1000;

export type LockResult = { ok: true; release(): Promise<void> } | { ok: false; jobId: string };

export interface GenerateLock {
  acquire(slug: string, jobId: string): Promise<LockResult>;
}

export function blobGenerateLock(blobs: JsonBlobs, now: () => number = Date.now): GenerateLock {
  return {
    async acquire(slug, jobId) {
      const path = `locks/${slug}.json`;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const current = await blobs.get(path);
        const held = current?.value as { jobId?: unknown; expiresAt?: unknown } | undefined;
        if (held && typeof held.expiresAt === "number" && held.expiresAt > now() && typeof held.jobId === "string") {
          return { ok: false, jobId: held.jobId };
        }
        const mine = { jobId, expiresAt: now() + LOCK_MS };
        const won = await blobs.put(path, mine, current ? { etag: current.etag } : { create: true });
        if (won) {
          return {
            ok: true,
            async release() {
              const again = await blobs.get(path);
              const owner = (again?.value as { jobId?: unknown } | undefined)?.jobId;
              // Only the owner releases; an expired lock already taken over is left alone.
              if (again && owner === jobId) await blobs.put(path, { jobId, expiresAt: 0 }, { etag: again.etag });
            },
          };
        }
      }
      // Lost the race three times: someone else is generating. Tell the caller to look at their job.
      const latest = await blobs.get(path);
      const owner = (latest?.value as { jobId?: unknown } | undefined)?.jobId;
      return { ok: false, jobId: typeof owner === "string" ? owner : jobId };
    },
  };
}

// ---- rate limit ------------------------------------------------------------------------------

export interface RateLimiter {
  take(clientKey: string): Promise<{ ok: true } | { ok: false; retryAfterSeconds: number }>;
}

export interface RateLimits {
  /** Generations (model calls) one client may start per hour. */
  perClientPerHour: number;
  /** Generations all clients together may start per hour. */
  globalPerHour: number;
}

export const DEFAULT_LIMITS: RateLimits = { perClientPerHour: 10, globalPerHour: 40 };
const HOUR_MS = 60 * 60 * 1000;

/** Fixed hourly windows, counted in blobs. `clientKey` must already be hashed. */
export function blobRateLimiter(blobs: JsonBlobs, limits: RateLimits = DEFAULT_LIMITS, now: () => number = Date.now): RateLimiter {
  async function increment(path: string, limit: number): Promise<boolean> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const found = await blobs.get(path);
      const count = typeof (found?.value as { count?: unknown } | undefined)?.count === "number" ? (found!.value as { count: number }).count : 0;
      if (count >= limit) return false;
      const ok = await blobs.put(path, { count: count + 1 }, found ? { etag: found.etag } : { create: true });
      if (ok) return true;
    }
    // Heavy contention: refuse rather than risk going over.
    return false;
  }

  return {
    async take(clientKey) {
      if (!/^[0-9a-f]{8,64}$/.test(clientKey)) throw new Error("clientKey must be a hash");
      const t = now();
      const window = Math.floor(t / HOUR_MS);
      const retryAfterSeconds = Math.max(1, Math.ceil(((window + 1) * HOUR_MS - t) / 1000));
      // The shared budget is the scarce one, so take a visitor's own allowance first and the
      // shared one second: a visitor over their own limit never uses up anyone else's.
      if (!(await increment(`limits/${window}/c-${clientKey}.json`, limits.perClientPerHour))) return { ok: false, retryAfterSeconds };
      if (!(await increment(`limits/${window}/global.json`, limits.globalPerHour))) return { ok: false, retryAfterSeconds };
      return { ok: true };
    },
  };
}

// ---- the job runner -----------------------------------------------------------------------------

export interface JobHooks {
  onStage(stage: JobStage): Promise<void>;
  /** Called on a cache miss, before the model is used. Throws GenerateError to refuse. Returns a release. */
  admit(): Promise<() => Promise<void>>;
}

export interface RunnerDeps {
  jobs: JobStore;
  limiter: RateLimiter;
  locks: GenerateLock;
  /** Only catalog servers may be generated. */
  isKnownServer(slug: string): Promise<boolean>;
  generate(slug: string, hooks: JobHooks): Promise<GenerateResult>;
  now?: () => number;
}

export interface JobOutcome {
  ok: boolean;
  status: JobStatus;
  /** Set on failure: what the route should answer. */
  failure?: { code: GenerateError["code"] | "unknown_server" | "internal"; message: string; retryAfterSeconds?: number; jobId?: string };
}

const SAFE_MESSAGES: Record<string, string> = {
  bad_server: "That MCP server cannot be used.",
  server_unavailable: "The MCP server could not be reached. Try again in a moment.",
  model_unavailable: "The game builder is busy. Try again in a moment.",
  invalid_spec: "The builder could not make a good game from that server. Try another one.",
  unproven_spec: "The builder could not make a good game from that server. Try another one.",
  rate_limited: "Lots of games are being built right now. Try again shortly.",
  in_progress: "That game is already being built.",
  unknown_server: "That MCP server is not in the catalog.",
  internal: "Something went wrong. Please try again.",
};

/** Runs one generation and keeps the job's status current. Never throws for an expected failure. */
export async function runGenerateJob(input: { slug: string; jobId: string; clientKey: string }, deps: RunnerDeps): Promise<JobOutcome> {
  const now = deps.now ?? (() => Date.now());
  const write = async (status: Omit<JobStatus, "updatedAt">) => {
    const full: JobStatus = { ...status, server: input.slug, updatedAt: now() };
    try {
      await deps.jobs.set(input.jobId, full);
    } catch (error) {
      // Progress is a courtesy; a failed status write must not fail the generation.
      console.error("MCP Quest could not write job status", error);
    }
    return full;
  };
  const fail = async (code: NonNullable<JobOutcome["failure"]>["code"], extra: { retryAfterSeconds?: number; jobId?: string } = {}): Promise<JobOutcome> => {
    const message = SAFE_MESSAGES[code] ?? SAFE_MESSAGES.internal;
    return { ok: false, status: await write({ stage: "failed", error: { code, message } }), failure: { code, message, ...extra } };
  };

  try {
    if (!(await deps.isKnownServer(input.slug))) return await fail("unknown_server");
    await write({ stage: "reading" });

    const result = await deps.generate(input.slug, {
      onStage: async (stage) => {
        await write({ stage });
      },
      admit: async () => {
        const lock = await deps.locks.acquire(input.slug, input.jobId);
        if (!lock.ok) throw new GenerateError("in_progress", SAFE_MESSAGES.in_progress, [], { jobId: lock.jobId });
        const allowed = await deps.limiter.take(input.clientKey);
        if (!allowed.ok) {
          await lock.release();
          throw new GenerateError("rate_limited", SAFE_MESSAGES.rate_limited, [], { retryAfterSeconds: allowed.retryAfterSeconds });
        }
        return () => lock.release();
      },
    });
    const status = await write({
      stage: "done",
      specId: result.stored.specId,
      title: result.stored.spec.title,
      cached: result.cached,
    });
    return { ok: true, status };
  } catch (error) {
    if (error instanceof GenerateError) {
      if (error.details.length) console.warn(`MCP Quest generation ${error.code}:`, error.details.slice(0, 10));
      return fail(error.code, error.meta);
    }
    console.error("MCP Quest generation failed", error);
    return fail("internal");
  }
}
