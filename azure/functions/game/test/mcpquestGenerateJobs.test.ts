import { test } from "node:test";
import assert from "node:assert/strict";
import { routeEnabled } from "../src/lib/apiSurface";
import { blobJson } from "../src/lib/mcpquestBlobJson";
import { createCatalogClient, parseCatalog } from "../src/mcpquest/generate/catalog";
import { answerFor, clientKeyFrom, parseGenerateRequest, parseLimit, statusBody } from "../src/mcpquest/generate/http";
import {
  LOCK_MS,
  blobGenerateLock,
  blobJobStore,
  blobRateLimiter,
  runGenerateJob,
  type JobStage,
  type JsonBlobs,
  type Precondition,
  type RunnerDeps,
} from "../src/mcpquest/generate/jobs";
import { GenerateError, generateGameSpec, type StoredSpec } from "../src/mcpquest/generate/service";
import type { FetchLike } from "../src/mcpquest/generate/digest";
import { GAME_SPEC_VERSION, computeToolsHash, type GameSpec } from "../src/mcpquest/gamespec";
import { DEFAULT_SNAPSHOT, SNAPSHOTS } from "../src/mcpquest/snapshot";
import type { ToolDef } from "../src/mcpquest/types";

const JOB = "11111111-1111-4111-8111-111111111111";
const JOB2 = "22222222-2222-4222-8222-222222222222";
const CLIENT = "a".repeat(32);

/** In-memory JsonBlobs with real ETag semantics. */
function memoryBlobs() {
  const docs = new Map<string, { value: unknown; etag: number }>();
  const blobs: JsonBlobs = {
    async get(path) {
      const d = docs.get(path);
      return d ? { value: JSON.parse(JSON.stringify(d.value)), etag: String(d.etag) } : null;
    },
    async put(path, value, c: Precondition) {
      const d = docs.get(path);
      if ("create" in c && d) return false;
      if ("etag" in c && (!d || String(d.etag) !== c.etag)) return false;
      docs.set(path, { value: JSON.parse(JSON.stringify(value)), etag: (d?.etag ?? 0) + 1 });
      return true;
    },
  };
  return { blobs, docs };
}

// ---- rate limit ---------------------------------------------------------------------------

test("the rate limiter enforces per-client and global hourly allowances", async () => {
  const { blobs } = memoryBlobs();
  const clock = { now: Date.UTC(2026, 9, 10, 12, 10, 0) };
  const limiter = blobRateLimiter(blobs, { perClientPerHour: 2, globalPerHour: 3 }, () => clock.now);
  const a = "a".repeat(16), b = "b".repeat(16), c = "c".repeat(16);

  assert.deepEqual(await limiter.take(a), { ok: true });
  assert.deepEqual(await limiter.take(a), { ok: true });
  const third = await limiter.take(a);
  assert.equal(third.ok, false);
  assert.equal((third as { retryAfterSeconds: number }).retryAfterSeconds, 50 * 60, "time left in the hour");

  assert.deepEqual(await limiter.take(b), { ok: true }, "global is now 3 of 3");
  assert.equal((await limiter.take(c)).ok, false, "the shared budget is spent");

  // A client refused on its own allowance does not use up the shared one.
  const { blobs: fresh } = memoryBlobs();
  const l2 = blobRateLimiter(fresh, { perClientPerHour: 1, globalPerHour: 2 }, () => clock.now);
  await l2.take(a);
  await l2.take(a);
  await l2.take(a);
  assert.deepEqual(await l2.take(b), { ok: true }, "a was refused twice without spending the global budget");

  // A new hour starts fresh.
  clock.now += 60 * 60 * 1000;
  assert.deepEqual(await limiter.take(a), { ok: true });
});

test("concurrent requests cannot exceed the limit", async () => {
  const { blobs } = memoryBlobs();
  const limiter = blobRateLimiter(blobs, { perClientPerHour: 100, globalPerHour: 5 }, () => 1_800_000_000_000);
  const results = await Promise.all(Array.from({ length: 12 }, (_, i) => limiter.take(String(i).padStart(8, "0"))));
  assert.ok(results.filter((r) => r.ok).length <= 5);
  assert.ok(results.filter((r) => r.ok).length >= 1);
});

test("the limiter only accepts hashed keys", async () => {
  const limiter = blobRateLimiter(memoryBlobs().blobs);
  await assert.rejects(() => limiter.take("203.0.113.9"), /must be a hash/);
});

// ---- lock --------------------------------------------------------------------------------

test("only one generation per server runs, and an expired lock can be taken over", async () => {
  const { blobs } = memoryBlobs();
  const clock = { now: 1_000_000 };
  const locks = blobGenerateLock(blobs, () => clock.now);

  const first = await locks.acquire("freight-tracking", JOB);
  assert.equal(first.ok, true);
  const second = await locks.acquire("freight-tracking", JOB2);
  assert.deepEqual(second, { ok: false, jobId: JOB }, "the second caller is pointed at the first job");
  assert.equal((await locks.acquire("it-ticketing", JOB2)).ok, true, "other servers are independent");

  clock.now += LOCK_MS + 1;
  const takeover = await locks.acquire("freight-tracking", JOB2);
  assert.equal(takeover.ok, true);
  // The original owner finishing late must not release the new owner's lock.
  if (first.ok) await first.release();
  assert.deepEqual(await locks.acquire("freight-tracking", "33333333-3333-4333-8333-333333333333"), { ok: false, jobId: JOB2 });

  if (takeover.ok) await takeover.release();
  assert.equal((await locks.acquire("freight-tracking", JOB)).ok, true, "released");
});

// ---- the runner --------------------------------------------------------------------------

const tools = SNAPSHOTS[DEFAULT_SNAPSHOT].tools as unknown as ToolDef[];
function stored(): StoredSpec {
  const spec: GameSpec = {
    version: GAME_SPEC_VERSION,
    server: { id: "it-ticketing", name: "IT", toolsHash: computeToolsHash(tools) },
    title: "Night shift",
    scenario: "S",
    cases: [],
  };
  return { specId: "0123456789abcdef", toolsHash: spec.server.toolsHash, spec, tools, samples: [], validated: true, createdAt: 1 };
}

function runner(overrides: Partial<RunnerDeps> = {}, limits = { perClientPerHour: 5, globalPerHour: 5 }) {
  const { blobs } = memoryBlobs();
  const stages: JobStage[] = [];
  const jobs = blobJobStore(blobs);
  const base: RunnerDeps = {
    jobs,
    locks: blobGenerateLock(blobs),
    limiter: blobRateLimiter(blobs, limits),
    isKnownServer: async (slug) => ["it-ticketing", "freight-tracking"].includes(slug),
    generate: async (_slug, hooks) => {
      await hooks.onStage("designing");
      const release = await hooks.admit();
      try {
        await hooks.onStage("checking");
        return { stored: stored(), cached: false, modelCalls: 1 };
      } finally {
        await release();
      }
    },
  };
  return { deps: { ...base, ...overrides }, jobs, blobs, stages };
}

test("a successful job reports its stages and ends with the spec id", async () => {
  const { deps, jobs } = runner();
  const outcome = await runGenerateJob({ slug: "it-ticketing", jobId: JOB, clientKey: CLIENT }, deps);
  assert.equal(outcome.ok, true);
  assert.equal(outcome.status.stage, "done");
  assert.equal(outcome.status.specId, "0123456789abcdef");
  assert.equal((await jobs.get(JOB))?.stage, "done");
  assert.deepEqual(answerFor(outcome), { status: 200, body: { specId: "0123456789abcdef", title: "Night shift", cached: false } });
});

test("an unknown server is refused before anything is built", async () => {
  let generated = false;
  const { deps, jobs } = runner({ generate: async () => { generated = true; throw new Error("no"); } });
  const outcome = await runGenerateJob({ slug: "not-in-catalog", jobId: JOB, clientKey: CLIENT }, deps);
  assert.equal(outcome.ok, false);
  assert.equal(generated, false);
  assert.equal(answerFor(outcome).status, 404);
  assert.equal((await jobs.get(JOB))?.stage, "failed");
});

test("the rate limit refuses with 429 and a Retry-After, and frees the lock", async () => {
  const { deps } = runner({}, { perClientPerHour: 1, globalPerHour: 10 });
  assert.equal((await runGenerateJob({ slug: "it-ticketing", jobId: JOB, clientKey: CLIENT }, deps)).ok, true);
  const limited = await runGenerateJob({ slug: "freight-tracking", jobId: JOB2, clientKey: CLIENT }, deps);
  assert.equal(limited.ok, false);
  const answer = answerFor(limited);
  assert.equal(answer.status, 429);
  assert.ok(Number(answer.headers?.["Retry-After"]) > 0);
  assert.equal(answer.body.code, "rate_limited");
  // The server was not left locked by the refused request.
  const other = await deps.locks.acquire("freight-tracking", "44444444-4444-4444-8444-444444444444");
  assert.equal(other.ok, true);
});

test("a second visitor on the same server is pointed at the running job and spends no allowance", async () => {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const { deps } = runner({
    generate: async (_slug, hooks) => {
      const done = await hooks.admit();
      await gate;
      await done();
      return { stored: stored(), cached: false, modelCalls: 1 };
    },
  });
  const first = runGenerateJob({ slug: "it-ticketing", jobId: JOB, clientKey: CLIENT }, deps);
  await new Promise((r) => setTimeout(r, 10));
  const second = await runGenerateJob({ slug: "it-ticketing", jobId: JOB2, clientKey: "b".repeat(32) }, deps);
  assert.equal(second.ok, false);
  const answer = answerFor(second);
  assert.equal(answer.status, 409);
  assert.equal(answer.body.jobId, JOB);
  release();
  assert.equal((await first).ok, true);
});

test("generator failures become safe messages, with details kept out of the answer", async () => {
  for (const [code, status] of [
    ["server_unavailable", 502],
    ["model_unavailable", 503],
    ["invalid_spec", 502],
    ["unproven_spec", 502],
    ["bad_server", 400],
  ] as const) {
    const { deps } = runner({ generate: async () => { throw new GenerateError(code, "internal detail with secret=abc", ["raw model output"]); } });
    const outcome = await runGenerateJob({ slug: "it-ticketing", jobId: JOB, clientKey: CLIENT }, deps);
    const answer = answerFor(outcome);
    assert.equal(answer.status, status, code);
    assert.doesNotMatch(JSON.stringify(answer), /secret|raw model output|internal detail/, code);
  }
  const { deps } = runner({ generate: async () => { throw new Error("db password=hunter2"); } });
  const answer = answerFor(await runGenerateJob({ slug: "it-ticketing", jobId: JOB, clientKey: CLIENT }, deps));
  assert.equal(answer.status, 500);
  assert.doesNotMatch(JSON.stringify(answer), /hunter2/);
});

test("a status write failure never fails the generation", async () => {
  const { deps } = runner({
    jobs: { get: async () => null, set: async () => { throw new Error("storage down"); } },
  });
  const outcome = await runGenerateJob({ slug: "it-ticketing", jobId: JOB, clientKey: CLIENT }, deps);
  assert.equal(outcome.ok, true);
});

// ---- the generator's own hooks --------------------------------------------------------------

test("generateGameSpec reports stages, admits only on a cache miss, and always releases", async () => {
  const station: FetchLike = async (_url, init) => {
    const body = JSON.parse(init.body) as { method: string };
    const respond = (result: unknown) => ({ ok: true, status: 200, json: async () => ({ result }) });
    if (body.method === "initialize") return respond({ serverInfo: { name: "IT" } });
    if (body.method === "tools/list") return respond({ tools: tools.map((t) => ({ ...t, annotations: { readOnlyHint: false } })) });
    return respond({ content: [] });
  };
  const hashed = computeToolsHash(tools);
  const events: string[] = [];
  const model = { generate: async () => { throw new Error("model down"); } };

  // Cache hit: no admission, no model.
  const hit = stored();
  hit.toolsHash = hashed;
  const result = await generateGameSpec("it-ticketing", {
    model,
    store: { get: async () => hit, put: async () => undefined },
    fetchFn: station,
    onStage: (s) => { events.push(s); },
    admit: async () => { events.push("admit"); return async () => { events.push("release"); }; },
  });
  assert.equal(result.cached, true);
  assert.deepEqual(events, ["reading"]);

  // Miss with a failing model: admitted, released, and the stages up to the failure were reported.
  events.length = 0;
  await assert.rejects(
    () =>
      generateGameSpec("it-ticketing", {
        model,
        store: { get: async () => null, put: async () => undefined },
        fetchFn: station,
        onStage: (s) => { events.push(s); },
        admit: async () => { events.push("admit"); return async () => { events.push("release"); }; },
      }),
    (e: unknown) => e instanceof GenerateError && e.code === "model_unavailable",
  );
  assert.deepEqual(events, ["reading", "admit", "designing", "release"]);

  // A refused admission stops before the model.
  let asked = false;
  await assert.rejects(
    () =>
      generateGameSpec("it-ticketing", {
        model: { generate: async () => { asked = true; return {}; } },
        store: { get: async () => null, put: async () => undefined },
        fetchFn: station,
        admit: async () => { throw new GenerateError("rate_limited", "slow down", [], { retryAfterSeconds: 60 }); },
      }),
    (e: unknown) => e instanceof GenerateError && e.code === "rate_limited" && e.meta.retryAfterSeconds === 60,
  );
  assert.equal(asked, false);
});

// ---- http helpers -------------------------------------------------------------------------

test("requests are validated and clients are identified by a salted hash", () => {
  assert.deepEqual(parseGenerateRequest({ server: "it-ticketing", jobId: JOB }), { slug: "it-ticketing", jobId: JOB });
  for (const bad of [{}, { server: "", jobId: JOB }, { server: "x", jobId: "nope" }, { server: "x".repeat(65), jobId: JOB }, { server: 5, jobId: JOB }]) {
    assert.ok("error" in parseGenerateRequest(bad as Record<string, unknown>));
  }
  const h = (v: string | null) => ({ get: (n: string) => (n === "x-forwarded-for" ? v : null) });
  const a = clientKeyFrom(h("203.0.113.9:5555, 10.0.0.1"), "salt");
  assert.match(a, /^[0-9a-f]{32}$/);
  assert.equal(a, clientKeyFrom(h("203.0.113.9"), "salt"), "port and later hops are ignored");
  assert.notEqual(a, clientKeyFrom(h("203.0.113.9"), "other-salt"));
  assert.notEqual(a, clientKeyFrom(h("203.0.113.10"), "salt"));
  assert.doesNotMatch(a, /203/);
  assert.match(clientKeyFrom(h(null), "salt"), /^[0-9a-f]{32}$/);
  assert.equal(parseLimit("7", 3), 7);
  for (const v of [undefined, "0", "-1", "abc", "1.5", "999999"]) assert.equal(parseLimit(v, 3), 3);
});

test("status bodies expose only what the page needs", () => {
  assert.deepEqual(statusBody({ stage: "proving", updatedAt: 1, server: "it-ticketing" }), { stage: "proving" });
  assert.deepEqual(statusBody({ stage: "done", updatedAt: 1, specId: "abc", title: "T", cached: true }), { stage: "done", specId: "abc", title: "T", cached: true });
  assert.deepEqual(statusBody({ stage: "failed", updatedAt: 1, error: { code: "invalid_spec", message: "m" } }), { stage: "failed", error: { code: "invalid_spec", message: "m" } });
});

test("the new routes are public-surface only", () => {
  for (const name of ["mcpquest-servers", "mcpquest-generate", "mcpquest-generate-status"]) {
    assert.equal(routeEnabled(name, "public"), true, name);
    assert.equal(routeEnabled(name, "staff"), false, name);
  }
});

// ---- catalog and blob client ---------------------------------------------------------------

test("the catalog keeps valid slugs, clips text, and survives a brief outage", async () => {
  const rows = [
    { slug: "it-ticketing", name: "IT Ticketing", public_description: "A  mock\n service desk. " + "x".repeat(400), tools: [1, 2, 3] },
    { slug: "Bad Slug", name: "No" },
    { slug: "../x", name: "No" },
    null,
    { slug: "freight-tracking", name: "Freight", tools: [] },
  ];
  const parsed = parseCatalog(rows);
  assert.deepEqual(parsed.map((s) => s.slug), ["it-ticketing", "freight-tracking"]);
  assert.equal(parsed[0].toolCount, 3);
  assert.ok(parsed[0].description.length <= 160);
  assert.match(parsed[0].description, /…$/, "clipped text says so");
  assert.doesNotMatch(parsed[0].description, /\n/);

  let fail = false;
  let calls = 0;
  const clock = { now: 0 };
  const client = createCatalogClient({
    now: () => clock.now,
    fetchFn: (async () => {
      calls += 1;
      return fail ? new Response("", { status: 503 }) : new Response(JSON.stringify(rows), { status: 200 });
    }) as unknown as typeof fetch,
  });
  assert.equal(await client.has("it-ticketing"), true);
  assert.equal(await client.has("not-listed"), false);
  assert.equal(calls, 1, "cached");
  fail = true;
  clock.now += 11 * 60 * 1000;
  assert.equal(await client.has("freight-tracking"), true, "stale list while MCP Station is down");
});

test("the blob JSON client uses ETags as preconditions and treats conflicts as lost races", async () => {
  const sent: { method: string; headers: Record<string, string> }[] = [];
  let status = 201;
  const fetchFn = (async (_url: string, init: RequestInit = {}) => {
    sent.push({ method: init.method ?? "GET", headers: init.headers as Record<string, string> });
    if ((init.method ?? "GET") === "GET") return new Response('{"count":2}', { status: 200, headers: { etag: '"0x1"' } });
    return new Response(null, { status });
  }) as unknown as typeof fetch;
  const blobs = blobJson({ containerUrl: "https://acct.blob.core.windows.net/specs", getToken: async () => "t", fetchFn });

  assert.deepEqual(await blobs.get("limits/1/global.json"), { value: { count: 2 }, etag: '"0x1"' });
  assert.equal(await blobs.put("limits/1/global.json", { count: 3 }, { etag: '"0x1"' }), true);
  assert.equal(sent[1].headers["If-Match"], '"0x1"');
  assert.equal(await blobs.put("locks/a.json", {}, { create: true }), true);
  assert.equal(sent[2].headers["If-None-Match"], "*");

  status = 412;
  assert.equal(await blobs.put("locks/a.json", {}, { create: true }), false);
  status = 409;
  assert.equal(await blobs.put("locks/a.json", {}, { create: true }), false);
  status = 500;
  await assert.rejects(() => blobs.put("locks/a.json", {}, { any: true }), /HTTP 500/);

  for (const bad of ["../x.json", "a//b.json", "a b.json", "x.txt", ""]) {
    await assert.rejects(() => blobs.get(bad), /Invalid blob path/, bad);
  }
});
