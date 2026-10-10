import { test } from "node:test";
import assert from "node:assert/strict";
import { GAME_SPEC_VERSION, computeSpecId, computeToolsHash, type CaseSpec, type GameSpec } from "../src/mcpquest/gamespec";
import type { SpecReader, StoredSpec } from "../src/mcpquest/generate/service";
import { PlayError, createPlayService } from "../src/mcpquest/service";
import { DEFAULT_SNAPSHOT, SNAPSHOTS } from "../src/mcpquest/snapshot";
import { SPEC_RULES, specIdOf, specModeSlug } from "../src/mcpquest/specPlay";
import { ConflictError, type ClaimIssuer, type PlayRow, type PlayStore } from "../src/mcpquest/store";
import type { LeaderboardEntry, ToolDef } from "../src/mcpquest/types";
import { blobSpecStore, isBlobContainerUrl, parseStoredSpec, storageToken } from "../src/lib/mcpquestSpecStore";
import { signPlayToken, verifyPlayToken } from "../src/lib/mcpquestToken";

process.env.MCPQUEST_TOKEN_SECRET = "test-secret-test-secret-test-secret-0123456789";

const tools = SNAPSHOTS[DEFAULT_SNAPSHOT].tools as unknown as ToolDef[];

// ---- a generated game: one flow case and one report case (50 points each) -----------------

const flowCase: CaseSpec = {
  id: "start-work",
  title: "Start work",
  designer: "flow",
  judging: "run",
  brief: "Move new incidents into progress.",
  scenarios: [{ name: "p1", trigger: "record-created", input: { incidentId: "INC0001" } }],
  hint: "Read before you write.",
  requirements: [
    {
      id: "read-first",
      text: "Read the incident before updating it",
      check: {
        op: "before",
        first: { tool: "get_incident", args: { incident_id: { fromInput: "incidentId" } } },
        then: { tool: "update_incident", args: { incident_id: { fromInput: "incidentId" } } },
      },
    },
    { id: "in-progress", text: "Move it to In Progress", check: { op: "called", call: { tool: "update_incident", args: { state: { equals: "In Progress" } } } } },
  ],
  reference: { pass: {}, fail: {} },
};

const reportCase: CaseSpec = {
  id: "queue-report",
  title: "Queue report",
  designer: "report",
  judging: "design",
  brief: "Show the high priority queue.",
  scenarios: [],
  hint: "Filter it.",
  requirements: [
    { id: "priority", text: "Only priority 1", check: { op: "design", path: "priority", equals: "1" } },
    { id: "state", text: "Only open incidents", check: { op: "design", path: "state", equals: "New" } },
  ],
  reference: { pass: {}, fail: {} },
};

const PERFECT_FLOW = JSON.stringify({
  trigger: "record-created",
  steps: [
    { id: "s1", tool: "get_incident", args: { incident_id: { fromInput: "incidentId" } } },
    { id: "s2", tool: "update_incident", args: { incident_id: { fromInput: "incidentId" }, state: "In Progress" } },
  ],
});
const PERFECT_REPORT = JSON.stringify({ priority: "1", state: "New" });
const HALF_REPORT = JSON.stringify({ priority: "1", state: "Closed" });

function storedSpec(validated = true): StoredSpec {
  const spec: GameSpec = {
    version: GAME_SPEC_VERSION,
    server: { id: "it-ticketing", name: "IT Ticketing", toolsHash: computeToolsHash(tools) },
    title: "Night shift",
    scenario: "The overnight queue is on fire.",
    cases: [flowCase, reportCase],
  };
  return { specId: computeSpecId(spec), toolsHash: spec.server.toolsHash, spec, tools, validated, createdAt: 1 };
}

// ---- in-memory store, claims and service ------------------------------------------------

function memoryStore() {
  const rows = new Map<string, PlayRow & { score?: number; entriesAwarded?: number }>();
  const store: PlayStore = {
    async create(play) {
      const id = crypto.randomUUID();
      rows.set(id, {
        id, etag: "1", station: play.station, modeSlug: play.modeSlug, nickname: play.nickname, seed: play.seed,
        snapshot: play.snapshot, startedAt: play.startedAt, state: play.state, submitted: false, passed: false,
        claimToken: null, claimIssued: false, resultJson: null,
      });
      return { id, etag: "1" };
    },
    async load(id) {
      const r = rows.get(id);
      return r ? { ...r, state: JSON.parse(JSON.stringify(r.state)) } : null;
    },
    async saveState(id, state, etag) {
      const r = rows.get(id)!;
      if (r.etag !== etag) throw new ConflictError();
      r.state = state;
      r.etag = String(Number(r.etag) + 1);
      return r.etag;
    },
    async complete(id, etag, play) {
      const r = rows.get(id)!;
      if (r.etag !== etag) throw new ConflictError();
      Object.assign(r, {
        submitted: true, passed: play.passed, claimToken: play.claimToken, resultJson: play.resultJson,
        score: play.score, entriesAwarded: play.entriesAwarded, state: play.state, etag: String(Number(r.etag) + 1),
      });
    },
    async markClaimIssued(id) {
      rows.get(id)!.claimIssued = true;
    },
    async leaderboard(): Promise<LeaderboardEntry[]> {
      return [];
    },
    async rankOf() {
      return 1;
    },
  };
  return { store, rows };
}

function harness(opts: { stored?: StoredSpec | null; cap?: number; withSpecs?: boolean } = {}) {
  const { store, rows } = memoryStore();
  const stored = opts.stored === undefined ? storedSpec() : opts.stored;
  const issued: string[] = [];
  const clock = { now: 1_800_000_000_000 };
  let failClaims = 0;
  const claims: ClaimIssuer = {
    async issue(input) {
      if (failClaims > 0) {
        failClaims -= 1;
        throw new Error("Dataverse is down");
      }
      issued.push(input.claimToken);
      return { prizeClaimId: `claim-${issued.length}` };
    },
  };
  const specs: SpecReader = { getById: async (id) => (stored && stored.specId === id ? stored : null) };
  const service = createPlayService({
    store,
    claims,
    specs: opts.withSpecs === false ? undefined : specs,
    maxEntries: async () => opts.cap ?? 3,
    signToken: (playId, expiresAt) => signPlayToken({ playId, expiresAt }),
    verifyToken: (token, now) => verifyPlayToken(token, now),
    activeCampaignId: async () => null,
    now: () => clock.now,
  });
  return { service, rows, issued, clock, stored, failClaims: (k: number) => (failClaims = k) };
}

const start = (h: ReturnType<typeof harness>) =>
  h.service.start({ nickname: "TESTER", station: "tablet-1", spec: h.stored!.specId });

// ---- tests ------------------------------------------------------------------------------

test("a generated game starts with plain requirements and no checks or reference designs", async () => {
  const h = harness();
  const session = await start(h);
  assert.equal(session.modeSlug, specModeSlug(h.stored!.specId));
  assert.equal(session.maxScore, 100);
  assert.equal(session.passScore, SPEC_RULES.passScore);
  assert.deepEqual(session.objectives.map((o) => o.id), ["start-work", "queue-report"]);
  assert.deepEqual(session.objectives[0].requirements, ["Read the incident before updating it", "Move it to In Progress"]);
  assert.deepEqual(session.objectives[0].scenarios, [{ name: "p1", trigger: "record-created", input: { incidentId: "INC0001" } }]);
  assert.ok(session.tools.some((t) => t.name === "update_incident"));

  const wire = JSON.stringify(session);
  assert.doesNotMatch(wire, /reference|"check"|"op":|fromInput|"equals"/);
  assert.equal([...h.rows.values()][0].modeSlug, session.modeSlug);
  assert.equal(specIdOf(session.modeSlug), h.stored!.specId);
});

test("a perfect play scores 100, earns the cap, and mints exactly one claim", async () => {
  const h = harness();
  const s = await start(h);
  for (const [id, design] of [["start-work", PERFECT_FLOW], ["queue-report", PERFECT_REPORT]] as const) {
    const report = await h.service.test(s.token, id, design);
    assert.ok(report.criteria.every((c) => c.ok), id);
  }
  h.clock.now += 90_000;
  const result = await h.service.submit(s.token, { "start-work": PERFECT_FLOW, "queue-report": PERFECT_REPORT });
  assert.equal(result.score.total, 100);
  assert.equal(result.score.percent, 100);
  assert.equal(result.score.passed, true);
  assert.deepEqual(result.entries, { tier: "top", awarded: 3 });
  assert.ok(result.claimToken);
  assert.equal(h.issued.length, 1);
  assert.equal([...h.rows.values()][0].entriesAwarded, 3);
  assert.equal(result.score.durationSeconds, 90);

  const again = await h.service.submit(s.token, {});
  assert.equal(again.claimToken, result.claimToken);
  assert.equal(h.issued.length, 1, "a repeat submit never mints a second claim");
});

test("score tiers: partial credit per requirement, then 90 / 70 / below", async () => {
  // 50 (flow) + 25 (half the report) = 75 -> mid tier, one fewer than the cap
  let h = harness();
  let s = await start(h);
  let r = await h.service.submit(s.token, { "start-work": PERFECT_FLOW, "queue-report": HALF_REPORT });
  assert.equal(r.score.total, 75);
  assert.equal(r.score.passed, false, "not every requirement is met");
  assert.deepEqual(r.entries, { tier: "mid", awarded: 2 });

  // A flow that reads but never updates meets neither requirement of the case
  h = harness();
  s = await start(h);
  const readOnly = JSON.stringify({ trigger: "record-created", steps: [{ tool: "get_incident", args: { incident_id: "INC0001" } }] });
  r = await h.service.submit(s.token, { "start-work": readOnly });
  assert.equal(r.score.total, 0);
  assert.deepEqual(r.entries, { tier: "base", awarded: 1 });
  assert.ok(r.claimToken, "even a low score earns a claim");

  // Nothing submitted at all still earns the base entry
  h = harness();
  s = await start(h);
  r = await h.service.submit(s.token, {});
  assert.equal(r.score.total, 0);
  assert.deepEqual(r.entries, { tier: "base", awarded: 1 });
});

test("hints cost points, once per case, and can move a play down a tier", async () => {
  const h = harness();
  const s = await start(h);
  assert.equal(await h.service.hint(s.token, "start-work"), "Read before you write.");
  await h.service.hint(s.token, "start-work");
  await assert.rejects(() => h.service.hint(s.token, "nope"), (e: unknown) => e instanceof PlayError && e.code === "bad_request");
  const r = await h.service.submit(s.token, { "start-work": PERFECT_FLOW, "queue-report": HALF_REPORT });
  assert.equal(r.score.hintsUsed, 1, "asking twice for the same case is one hint");
  assert.equal(r.score.hintPenalty, 5);
  assert.equal(r.score.total, 70);
  assert.equal(r.entries?.tier, "mid");
});

test("test runs report each requirement, show calls, and are limited per case", async () => {
  const h = harness();
  const s = await start(h);
  const report = await h.service.test(s.token, "start-work", JSON.stringify({ trigger: "record-created", steps: [{ tool: "launch_missiles" }] }));
  assert.deepEqual(report.criteria.map((c) => c.ok), [false, false]);
  assert.equal(report.testsLeft, SPEC_RULES.maxTests - 1);
  assert.match(JSON.stringify(report.runs), /launch_missiles.*not on this server/);

  for (let i = 1; i < SPEC_RULES.maxTests; i += 1) await h.service.test(s.token, "start-work", PERFECT_FLOW);
  await assert.rejects(() => h.service.test(s.token, "start-work", PERFECT_FLOW), /No test runs left/);
  // The other case has its own allowance.
  assert.equal((await h.service.test(s.token, "queue-report", PERFECT_REPORT)).testsLeft, SPEC_RULES.maxTests - 1);

  await assert.rejects(() => h.service.test(s.token, "start-work", "not json"), /JSON object/);
  await assert.rejects(() => h.service.test(s.token, "unknown-case", PERFECT_REPORT), /Unknown case/);
});

test("an unproven game is scored and ranked but earns no claim or entries", async () => {
  const h = harness({ stored: storedSpec(false) });
  const s = await start(h);
  const r = await h.service.submit(s.token, { "start-work": PERFECT_FLOW, "queue-report": PERFECT_REPORT });
  assert.equal(r.score.total, 100);
  assert.equal(r.claimToken, undefined);
  assert.equal(r.entries, undefined);
  assert.equal(h.issued.length, 0);
  assert.equal([...h.rows.values()][0].entriesAwarded, 0);
});

test("a failed claim is completed by submitting again, with the same entries", async () => {
  const h = harness();
  const s = await start(h);
  h.failClaims(1);
  await assert.rejects(
    () => h.service.submit(s.token, { "start-work": PERFECT_FLOW, "queue-report": PERFECT_REPORT }),
    (e: unknown) => e instanceof PlayError && e.code === "claim_unavailable",
  );
  assert.equal(h.issued.length, 0);
  const retried = await h.service.submit(s.token, {});
  assert.equal(h.issued.length, 1);
  assert.equal(retried.score.total, 100, "the stored result is returned, not a re-grade of the empty submit");
  assert.equal(retried.entries?.awarded, 3);
});

test("the cap comes from the campaign and tiers collapse with a small cap", async () => {
  const one = harness({ cap: 1 });
  const s1 = await start(one);
  assert.equal((await one.service.submit(s1.token, { "start-work": PERFECT_FLOW, "queue-report": PERFECT_REPORT })).entries?.awarded, 1);

  const five = harness({ cap: 5 });
  const s5 = await start(five);
  assert.equal((await five.service.submit(s5.token, { "start-work": PERFECT_FLOW, "queue-report": PERFECT_REPORT })).entries?.awarded, 5);
});

test("direct calls and product choices are not part of a generated game", async () => {
  const h = harness();
  const s = await start(h);
  await assert.rejects(() => h.service.call(s.token, "list_incidents", {}), /Direct tool calls are not part/);
  await assert.rejects(() => h.service.choose(s.token, "start-work", "power-automate"), /gives you the product/);
});

test("starting rejects unknown, malformed and unconfigured games", async () => {
  const h = harness();
  const bad = (spec: unknown) => h.service.start({ nickname: "TESTER", station: "tablet-1", spec });
  await assert.rejects(() => bad("0000000000000000"), (e: unknown) => e instanceof PlayError && e.code === "not_found");
  for (const spec of ["../etc", "", 5, {}, "ABCDEF0123456789"]) {
    await assert.rejects(() => bad(spec), (e: unknown) => e instanceof PlayError && e.code === "bad_request", String(spec));
  }
  const none = harness({ withSpecs: false });
  await assert.rejects(() => none.service.start({ nickname: "TESTER", station: "t", spec: "0123456789abcdef" }), /Unknown game/);
});

test("a game removed from storage cannot be continued", async () => {
  const h = harness();
  const s = await start(h);
  h.stored!.specId = "ffffffffffffffff";
  await assert.rejects(() => h.service.hint(s.token, "start-work"), (e: unknown) => e instanceof PlayError && e.code === "not_found");
});

test("the leaderboard accepts a generated game's mission", async () => {
  const h = harness();
  assert.deepEqual(await h.service.leaderboard(specModeSlug(h.stored!.specId)), []);
});

// ---- blob store -------------------------------------------------------------------------

const CONTAINER = "https://stmcpquest.blob.core.windows.net/mcpquest-specs";

function fakeBlob() {
  const blobs = new Map<string, string>();
  const seen: { method: string; path: string; headers: Record<string, string> }[] = [];
  const fetchFn = (async (url: string, init: RequestInit = {}) => {
    const path = url.slice(CONTAINER.length + 1);
    const method = init.method ?? "GET";
    seen.push({ method, path, headers: init.headers as Record<string, string> });
    if (method === "PUT") {
      blobs.set(path, String(init.body));
      return new Response(null, { status: 201 });
    }
    const body = blobs.get(path);
    return body === undefined ? new Response(null, { status: 404 }) : new Response(body, { status: 200 });
  }) as unknown as typeof fetch;
  return { blobs, seen, fetchFn };
}

test("the blob store round-trips a spec under both keys, using the managed identity token", async () => {
  const blob = fakeBlob();
  const store = blobSpecStore({ containerUrl: CONTAINER, getToken: async () => "tok", fetchFn: blob.fetchFn });
  const stored = storedSpec();
  await store.put("it-ticketing", stored);

  assert.deepEqual([...blob.blobs.keys()].sort(), [`by-hash/it-ticketing/${stored.toolsHash}.json`, `by-id/${stored.specId}.json`].sort());
  assert.ok(blob.seen.every((c) => c.headers.Authorization === "Bearer tok" && c.headers["x-ms-version"]));
  assert.ok(blob.seen.filter((c) => c.method === "PUT").every((c) => c.headers["x-ms-blob-type"] === "BlockBlob"));

  assert.deepEqual(await store.getById(stored.specId), stored);
  assert.deepEqual(await store.get("it-ticketing", stored.toolsHash), stored);
  assert.equal(await store.getById("0000000000000000"), null, "missing blob");
});

test("a tampered or malformed blob is never served", async () => {
  const blob = fakeBlob();
  const store = blobSpecStore({ containerUrl: CONTAINER, getToken: async () => "tok", fetchFn: blob.fetchFn });
  const stored = storedSpec();
  await store.put("it-ticketing", stored);
  const key = `by-id/${stored.specId}.json`;
  const original = blob.blobs.get(key)!;

  const edit = (mutate: (j: any) => void) => {
    const j = JSON.parse(original);
    mutate(j);
    blob.blobs.set(key, JSON.stringify(j));
  };

  edit((j) => (j.spec.cases[0].requirements[0].text = "Do nothing at all"));
  assert.equal(await store.getById(stored.specId), null, "id no longer matches the content");

  edit((j) => (j.spec.cases[0].requirements[0].check.first.tool = "delete_everything"));
  assert.equal(await store.getById(stored.specId), null, "tool is not on the server");

  blob.blobs.set(key, "not json");
  assert.equal(await store.getById(stored.specId), null);
  assert.equal(parseStoredSpec(null), null);
  assert.equal(parseStoredSpec({ specId: "x", tools: [] }), null);
});

test("blob store input checks", async () => {
  assert.equal(isBlobContainerUrl(CONTAINER), true);
  for (const bad of ["http://a.blob.core.windows.net/c", "https://evil.test/c", `${CONTAINER}/sub`, "https://stmcpquest.blob.core.windows.net/"]) {
    assert.equal(isBlobContainerUrl(bad), false, bad);
  }
  assert.throws(() => blobSpecStore({ containerUrl: "https://evil.test/x", getToken: async () => "t" }), /MCPQUEST_SPEC_BLOB_URL/);

  const blob = fakeBlob();
  const store = blobSpecStore({ containerUrl: CONTAINER, getToken: async () => "tok", fetchFn: blob.fetchFn });
  assert.equal(await store.getById("../../x"), null);
  assert.equal(await store.get("../x", "0123456789abcdef"), null);
  assert.equal(blob.seen.length, 0, "bad ids never reach storage");
  await assert.rejects(() => store.put("../x", storedSpec()), /invalid slug or id/);

  const url: string[] = [];
  const token = await storageToken(
    { IDENTITY_ENDPOINT: "http://127.0.0.1:1/msi/token", IDENTITY_HEADER: "h" } as any,
    (async (u: URL) => {
      url.push(u.toString());
      return new Response(JSON.stringify({ access_token: "mi" }), { status: 200 });
    }) as unknown as typeof fetch,
  );
  assert.equal(token, "mi");
  assert.match(url[0], /resource=https%3A%2F%2Fstorage\.azure\.com%2F/);
  await assert.rejects(() => storageToken({} as any), /No managed identity/);
});
