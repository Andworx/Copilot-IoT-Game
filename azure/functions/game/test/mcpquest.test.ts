import { test } from "node:test";
import assert from "node:assert/strict";
import { MODES } from "../src/mcpquest/api/modes";
import { withSeed } from "../src/mcpquest/api/shuffle";
import type { ObjectiveTemplate } from "../src/mcpquest/api/world";
import { chooseProduct, computeScore, gradeObjectives, startPlay, testDesign, type JudgeSession } from "../src/mcpquest/judge";
import { PlayError, createPlayService } from "../src/mcpquest/service";
import { DEFAULT_SNAPSHOT, SNAPSHOTS, createSnapshotWorld } from "../src/mcpquest/snapshot";
import { ConflictError, type PlayRow, type PlayState, type PlayStore, type ClaimIssuer } from "../src/mcpquest/store";
import type { LeaderboardEntry, SubmitResult } from "../src/mcpquest/types";
import { signPlayToken, verifyPlayToken } from "../src/lib/mcpquestToken";
import {
  CAMPAIGN_NAV_DEFAULT,
  PLAYS_SET_DEFAULT,
  PLAY_COLUMNS,
  PRIZE_CLAIM_NAV_DEFAULT,
  buildCompletePayload,
  buildCreatePayload,
  parsePlayRow,
} from "../src/lib/mcpquestStore";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

process.env.MCPQUEST_TOKEN_SECRET = "test-secret-test-secret-test-secret-0123456789";

const world = createSnapshotWorld(SNAPSHOTS[DEFAULT_SNAPSHOT]);

// ---- reference solutions ---------------------------------------------------------------
// One correct design per authored case. If a case's criteria change, these must change too,
// which is the point: the criteria and a solution that satisfies them stay in step.

function step(kind: string, params: Record<string, string> = {}) {
  return { id: `s-${kind}-${Math.random().toString(36).slice(2, 7)}`, kind, params };
}

function referenceDesign(template: ObjectiveTemplate): unknown {
  const reqs = template.objective.requirements ?? [];
  switch (template.objective.id) {
    case "routing": {
      const steps: unknown[] = [];
      for (const r of reqs) {
        const m = r.match(/^A new (.+?) incident is assigned to (.+)$/);
        if (!m) continue;
        steps.push(step("condition", { field: "category", value: m[1] }));
        steps.push(step("update-incident", { property: "assignment_group", value: m[2] }));
      }
      return { trigger: "incident-created", triggerParams: {}, steps };
    }
    case "approval":
      return {
        trigger: "incident-created",
        triggerParams: {},
        steps: [
          step("condition", { field: "priority", value: "1" }),
          step("approval", { approver: "Duty manager" }),
          step("update-incident", { property: "state", value: "In Progress" }),
        ],
      };
    case "digest":
      return {
        trigger: "recurrence",
        triggerParams: { frequency: "Every day at 7:00 AM" },
        steps: [step("list-incidents", { state: "New" }), step("send-email", { to: "Managers" })],
      };
    case "concentration":
      return { visual: "column", field: "category" };
    case "priority-share":
      return { visual: "donut", field: "priority" };
    case "team-load":
      return { visual: "bar", field: "group" };
    case "intake":
      return {
        controls: [
          { id: "a", kind: "text-input", params: { field: "shortDescription" } },
          { id: "b", kind: "dropdown", params: { field: "category" } },
          { id: "c", kind: "button", params: { onSelect: "create-incident" } },
        ],
      };
    case "tablet":
      return {
        controls: [
          { id: "a", kind: "gallery", params: { source: "in-progress" } },
          { id: "b", kind: "button", params: { onSelect: "resolve-selected" } },
        ],
      };
    case "partners":
      return { signIn: "required", list: "own", form: "signed-in" };
    case "spreadsheets":
      return {
        columns: {
          caller: "lookup-user", group: "lookup-team", priority: "choice",
          state: "choice", category: "choice", description: "text",
        },
      };
    case "access":
      return {
        roles: {
          agent: { read: true, create: true, write: true, delete: false },
          manager: { read: true, create: true, write: true, delete: true },
          contractor: { read: true, create: false, write: false, delete: false },
        },
      };
    case "faq":
      return { knowledge: ["password-guides", "vpn-guide"], actions: [] };
    case "doer":
      return { knowledge: [], actions: ["create_incident", "get_incident"] };
    default:
      throw new Error(`no reference solution for ${template.objective.id}`);
  }
}

function sessionFor(seed: string, modeSlug = "fixit"): JudgeSession {
  const { mode, templates, cases } = withSeed(seed, () => startPlay(world, modeSlug));
  return {
    world,
    keys: new Map(templates.map((t) => [t.objective.id, t])),
    cases,
    hintsUsed: new Set(),
    calls: 0,
    passScore: mode.passScore,
    parSeconds: mode.parSeconds,
    submitted: false,
  };
}

// ---- snapshot world --------------------------------------------------------------------

test("the snapshot world serves reads, filters and pages deterministically", async () => {
  const all = JSON.parse((await world.run("list_incidents", { limit: 100 })).text);
  assert.equal(all.total, all.data.length);
  assert.ok(all.total >= 10);

  const first = JSON.parse((await world.run("list_incidents", { limit: 3 })).text);
  assert.equal(first.data.length, 3);
  assert.equal(first.hasMore, true);
  const again = JSON.parse((await world.run("list_incidents", { limit: 3 })).text);
  assert.deepEqual(first, again);

  const priorityOne = JSON.parse((await world.run("list_incidents", { priority: "1", limit: 100 })).text);
  assert.ok(priorityOne.data.every((r: { priority: string }) => r.priority === "1"));
  assert.ok(priorityOne.total < all.total);
});

test("snapshot writes succeed but never change what is read afterwards", async () => {
  const before = (await world.run("list_incidents", { limit: 100 })).text;
  const id = world.data.incidents[0].incidentId;
  const updated = JSON.parse((await world.run("update_incident", { incident_id: id, state: "Closed" })).text);
  assert.equal(updated._mock, true);
  assert.equal((await world.run("list_incidents", { limit: 100 })).text, before);

  const rejected = JSON.parse((await world.run("create_incident", { short_description: "x" })).text);
  assert.match(rejected.error, /Missing required field/);
  const created = JSON.parse(
    (await world.run("create_incident", { short_description: "x", category: "Network", priority: "3", caller_id: "u" })).text,
  );
  assert.equal(created._mock, true);

  assert.equal((await world.run("nope", {})).isError, true);
});

// ---- determinism and the cases -----------------------------------------------------------

test("a seed reproduces the same play, and different seeds vary", () => {
  const prompts = (seed: string) =>
    withSeed(seed, () => startPlay(world, "fixit")).templates.map((t) => `${t.objective.id}:${t.objective.prompt}`);
  assert.deepEqual(prompts("alpha"), prompts("alpha"));
  const variety = new Set(Array.from({ length: 25 }, (_, i) => prompts(`seed-${i}`).join("|")));
  assert.ok(variety.size > 3, "plays should vary between seeds");
});

test("every authored case is solvable by its reference solution and fails when left blank", async () => {
  const seen = new Set<string>();
  for (let i = 0; i < 400 && seen.size < 13; i += 1) {
    const session = sessionFor(`cover-${i}`);
    const answers: Record<string, string> = {};
    for (const template of session.keys.values()) {
      assert.equal(chooseProduct(session, template.objective.id, template.build!.def.productId).correct, true);
      answers[template.objective.id] = JSON.stringify(referenceDesign(template));
      seen.add(template.objective.id);
    }
    const { graded } = await gradeObjectives(session, answers);
    assert.ok(graded.every((g) => g.correct), `reference solutions should pass (seed cover-${i})`);

    // The same play with untouched default designs must not pass.
    const blank = sessionFor(`cover-${i}`);
    for (const template of blank.keys.values()) chooseProduct(blank, template.objective.id, template.build!.def.productId);
    const { graded: blankGraded } = await gradeObjectives(blank, {});
    assert.ok(blankGraded.some((g) => !g.correct), "blank designs should not satisfy every case");
  }
  assert.equal(seen.size, 13, `expected all 13 cases to appear, saw ${[...seen].join(", ")}`);
});

test("each play draws three cases from three different products", () => {
  for (let i = 0; i < 40; i += 1) {
    const { templates } = withSeed(`mix-${i}`, () => startPlay(world, "fixit"));
    assert.equal(templates.length, 3);
    const products = templates.map((t) => t.build!.def.productId);
    assert.equal(new Set(products).size, 3);
  }
});

// ---- choosing, testing and scoring -------------------------------------------------------

test("a wrong tool choice costs points, and a test needs the right tool first", async () => {
  const session = sessionFor("choices");
  const template = [...session.keys.values()][0];
  const id = template.objective.id;
  const wrong = template.build!.def.productId === "dataverse" ? "power-apps" : "dataverse";

  await assert.rejects(() => testDesign(session, id, "{}"), /Choose the tool/);
  assert.equal(chooseProduct(session, id, wrong).correct, false);
  assert.equal(session.cases.get(id)!.misses, 1);
  assert.equal(chooseProduct(session, id, template.build!.def.productId).correct, true);

  const answers = Object.fromEntries(
    [...session.keys.values()].map((t) => [t.objective.id, JSON.stringify(referenceDesign(t))]),
  );
  // Only the case we chose for has a picked tool, so only it can score.
  const { graded } = await gradeObjectives(session, answers);
  const mine = graded.find((g) => g.id === id)!;
  assert.equal(mine.pickPoints, 20, "30 minus one 10-point miss");
  assert.equal(mine.buildPoints, 100);
  assert.ok(graded.filter((g) => g.id !== id).every((g) => g.points === 0));
});

test("test runs are limited per case", async () => {
  const session = sessionFor("limits");
  const template = [...session.keys.values()][0];
  chooseProduct(session, template.objective.id, template.build!.def.productId);
  const design = JSON.stringify(referenceDesign(template));
  for (let i = 0; i < 6; i += 1) await testDesign(session, template.objective.id, design);
  await assert.rejects(() => testDesign(session, template.objective.id, design), /No test runs left/);
});

test("hints, extra tool calls and time adjust the score; a blank play scores nothing", async () => {
  const session = sessionFor("scoring");
  for (const t of session.keys.values()) chooseProduct(session, t.objective.id, t.build!.def.productId);
  const answers = Object.fromEntries(
    [...session.keys.values()].map((t) => [t.objective.id, JSON.stringify(referenceDesign(t))]),
  );
  const { graded } = await gradeObjectives(session, answers);

  const clean = computeScore(session, graded, 30);
  assert.equal(clean.passed, true);
  assert.equal(clean.total, 3 * 130 + 100);

  session.hintsUsed.add("a");
  session.calls = 12;
  const penalised = computeScore(session, graded, 30);
  assert.equal(penalised.hintPenalty, 25);
  assert.equal(penalised.efficiencyPenalty, 20);
  assert.equal(penalised.total, clean.total - 45);

  const slow = computeScore(session, graded, 5000);
  assert.equal(slow.timeBonus, 0);

  const blank = sessionFor("blank");
  const empty = await gradeObjectives(blank, {});
  const blankScore = computeScore(blank, empty.graded, 1);
  assert.equal(blankScore.total, 0);
  assert.equal(blankScore.passed, false);
});

test("every mode has a pass score reachable by a perfect play", async () => {
  for (const mode of MODES) {
    const { templates } = withSeed("reach", () => startPlay(world, mode.slug));
    const max = templates.reduce((sum, t) => sum + t.objective.points, 0) + 100;
    assert.ok(mode.passScore <= max, `${mode.slug} pass score ${mode.passScore} exceeds max ${max}`);
  }
});

// ---- session token -----------------------------------------------------------------------

test("session tokens verify, expire and resist tampering", () => {
  const playId = "0b8f6a3e-6c1d-4a39-9f4c-3f1f0b1e2a77";
  const now = 1_700_000_000_000;
  const token = signPlayToken({ playId, expiresAt: now + 60_000 });
  assert.equal(verifyPlayToken(token, now), playId);
  assert.equal(verifyPlayToken(token, now + 61_000), null, "expired");
  assert.equal(verifyPlayToken(token.slice(0, -2) + "xx", now), null, "bad signature");
  const [payload, signature] = token.split(".");
  const forged = Buffer.from(JSON.stringify({ p: "11111111-1111-4111-8111-111111111111", e: 9_999_999_999 })).toString("base64url");
  assert.equal(verifyPlayToken(`${forged}.${signature}`, now), null, "payload swapped");
  assert.equal(verifyPlayToken(`${payload}.${signature}.extra`, now), null);
  assert.equal(verifyPlayToken(undefined, now), null);
  assert.throws(() => signPlayToken({ playId: "not-a-guid", expiresAt: now }), /GUID/);
});

// ---- play service ------------------------------------------------------------------------

function memoryStore() {
  const rows = new Map<string, PlayRow & { score?: number; durationSeconds?: number; entriesAwarded?: number }>();
  let counter = 0;
  const store: PlayStore & { rows: typeof rows; failNextSave: number } = {
    rows,
    failNextSave: 0,
    async create(play) {
      counter += 1;
      const id = `00000000-0000-4000-8000-${String(counter).padStart(12, "0")}`;
      rows.set(id, {
        id, etag: "1", station: play.station, modeSlug: play.modeSlug, nickname: play.nickname, seed: play.seed,
        snapshot: play.snapshot, startedAt: play.startedAt, state: play.state, submitted: false, passed: false,
        claimToken: null, claimIssued: false, resultJson: null,
      });
      return { id, etag: "1" };
    },
    async load(id) {
      const row = rows.get(id);
      return row ? structuredClone(row) : null;
    },
    async saveState(id, state: PlayState, etag) {
      const row = rows.get(id)!;
      if (store.failNextSave > 0) {
        store.failNextSave -= 1;
        row.etag = String(Number(row.etag) + 1);
        throw new ConflictError();
      }
      if (row.etag !== etag) throw new ConflictError();
      row.state = state;
      row.etag = String(Number(row.etag) + 1);
      return row.etag;
    },
    async complete(id, etag, play) {
      const row = rows.get(id)!;
      if (row.etag !== etag) throw new ConflictError();
      Object.assign(row, {
        submitted: true, passed: play.passed, claimToken: play.claimToken, resultJson: play.resultJson,
        score: play.score, entriesAwarded: play.entriesAwarded, durationSeconds: play.durationSeconds, state: play.state,
        etag: String(Number(row.etag) + 1),
      });
    },
    async markClaimIssued(id) {
      rows.get(id)!.claimIssued = true;
    },
    async leaderboard(modeSlug, limit): Promise<LeaderboardEntry[]> {
      return [...rows.values()]
        .filter((r) => r.submitted && r.modeSlug === modeSlug)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (a.durationSeconds ?? 0) - (b.durationSeconds ?? 0))
        .slice(0, limit)
        .map((r, i) => ({ rank: i + 1, nickname: r.nickname, score: r.score ?? 0, durationSeconds: r.durationSeconds ?? 0 }));
    },
    async rankOf(modeSlug, score, duration) {
      return (
        [...rows.values()].filter(
          (r) =>
            r.submitted && r.modeSlug === modeSlug &&
            ((r.score ?? 0) > score || ((r.score ?? 0) === score && (r.durationSeconds ?? 0) < duration)),
        ).length + 1
      );
    },
  };
  return store;
}

function harness(maxEntries: () => Promise<number> = async () => 3) {
  const store = memoryStore();
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
  const service = createPlayService({
    store,
    claims,
    signToken: (playId, expiresAt) => signPlayToken({ playId, expiresAt }),
    verifyToken: (token, now) => verifyPlayToken(token, now),
    activeCampaignId: async () => null,
    maxEntries,
    now: () => clock.now,
    newSeed: (() => {
      let n = 0;
      return () => `svc-seed-${(n += 1)}`;
    })(),
  });
  return { service, store, issued, clock, failClaims: (n: number) => (failClaims = n) };
}

/** Plays a mission perfectly through the public service interface. */
async function playPerfectly(h: ReturnType<typeof harness>, nickname = "TESTER") {
  const session = await h.service.start({ nickname, station: "tablet-1", mode: "fixit" });
  // Rebuild the same templates the server holds, from the seed in the row, to find the answers.
  const row = [...h.store.rows.values()].at(-1)!;
  const { templates } = withSeed(row.seed, () => startPlay(world, "fixit"));
  const answers: Record<string, string> = {};
  for (const t of templates) {
    const chosen = await h.service.choose(session.token, t.objective.id, t.build!.def.productId);
    assert.equal(chosen.correct, true);
    const design = JSON.stringify(referenceDesign(t));
    const report = await h.service.test(session.token, t.objective.id, design);
    assert.ok(report.criteria.every((c) => c.ok), `${t.objective.id} should pass its own test`);
    answers[t.objective.id] = design;
  }
  return { session, answers };
}

test("a perfect play is graded server-side, mints exactly one claim, and is idempotent", async () => {
  const h = harness();
  const { session, answers } = await playPerfectly(h);

  // The client never receives answer keys or case logic in the session payload.
  const serialized = JSON.stringify(session);
  assert.doesNotMatch(serialized, /evaluate|referenceDesign/);
  assert.ok(session.objectives.every((o) => o.kind === "build"));

  h.clock.now += 60_000;
  const result: SubmitResult = await h.service.submit(session.token, answers);
  assert.equal(result.score.passed, true);
  assert.ok(result.claimToken && /^[0-9a-f-]{36}$/.test(result.claimToken));
  assert.equal(h.issued.length, 1);
  assert.equal(h.issued[0], result.claimToken);
  assert.equal(result.rank, 1);

  // A second submit returns the same result and does not mint another claim.
  const again = await h.service.submit(session.token, {});
  assert.equal(again.claimToken, result.claimToken);
  assert.equal(h.issued.length, 1);

  // Nothing can be changed after submission.
  await assert.rejects(() => h.service.hint(session.token, Object.keys(answers)[0]), /already been submitted/);
});

test("a failed claim can be completed by submitting again, without a second claim", async () => {
  const h = harness();
  const { session, answers } = await playPerfectly(h);
  h.failClaims(1);

  await assert.rejects(
    () => h.service.submit(session.token, answers),
    (error: unknown) => error instanceof PlayError && error.code === "claim_unavailable" && error.status === 503,
  );
  assert.equal(h.issued.length, 0);

  const retried = await h.service.submit(session.token, answers);
  assert.equal(retried.score.passed, true);
  assert.equal(h.issued.length, 1);
  assert.equal(retried.claimToken, h.issued[0]);
});

test("a play that does not pass still earns a claim, worth one entry", async () => {
  const h = harness();
  const session = await h.service.start({ nickname: "TRYER", station: "tablet-1", mode: "fixit" });
  h.clock.now += 5_000;
  const result = await h.service.submit(session.token, {});
  assert.equal(result.score.passed, false);
  assert.ok(result.score.percent < 70);
  assert.deepEqual(result.entries, { tier: "base", awarded: 1 });
  assert.ok(result.claimToken);
  assert.equal(h.issued.length, 1);
  assert.equal([...h.store.rows.values()].at(-1)!.entriesAwarded, 1);
});

test("a perfect play earns the campaign maximum, and the score is out of 100", async () => {
  const h = harness();
  const { session, answers } = await playPerfectly(h);
  h.clock.now += 60_000;
  const result = await h.service.submit(session.token, answers);
  assert.ok(result.score.percent >= 90 && result.score.percent <= 100, `percent ${result.score.percent}`);
  assert.deepEqual(result.entries, { tier: "top", awarded: 3 });
  assert.equal([...h.store.rows.values()].at(-1)!.entriesAwarded, 3);
});

test("entries follow the cap read from the campaign, and fall back to one if it is unavailable", async () => {
  const big = harness(async () => 5);
  const a = await playPerfectly(big);
  big.clock.now += 60_000;
  assert.equal((await big.service.submit(a.session.token, a.answers)).entries?.awarded, 5);

  for (const cap of [async () => { throw new Error("Dataverse is down"); }, async () => 0, async () => Number.NaN]) {
    const h = harness(cap);
    const p = await playPerfectly(h);
    h.clock.now += 60_000;
    assert.equal((await h.service.submit(p.session.token, p.answers)).entries?.awarded, 1);
  }
});

test("a repeat submit returns the same entries and does not recompute them", async () => {
  let cap = 3;
  const h = harness(async () => cap);
  const { session, answers } = await playPerfectly(h);
  h.clock.now += 60_000;
  const first = await h.service.submit(session.token, answers);
  cap = 1;
  const again = await h.service.submit(session.token, answers);
  assert.deepEqual(again.entries, first.entries);
});

test("a tampered or unknown session token is rejected", async () => {
  const h = harness();
  const session = await h.service.start({ nickname: "TESTER", station: "tablet-1", mode: "fixit" });
  const bad = session.token.slice(0, -3) + "AAA";
  for (const attempt of [
    () => h.service.call(bad, "list_incidents", {}),
    () => h.service.submit(bad, {}),
    () => h.service.test("", "routing", "{}"),
  ]) {
    await assert.rejects(attempt, (e: unknown) => e instanceof PlayError && e.status === 401);
  }
});

test("starting validates the nickname, station and mission", async () => {
  const h = harness();
  const bad = (input: { nickname: unknown; station: unknown; mode: unknown }) =>
    assert.rejects(() => h.service.start(input), (e: unknown) => e instanceof PlayError && e.status === 400);
  await bad({ nickname: "ab", station: "x", mode: "fixit" });
  await bad({ nickname: "<script>", station: "x", mode: "fixit" });
  await bad({ nickname: "THIRTEEN-CHARS", station: "x", mode: "fixit" });
  await bad({ nickname: "TESTER", station: "../../etc", mode: "fixit" });
  await bad({ nickname: "TESTER", station: "x", mode: "nope" });
  const ok = await h.service.start({ nickname: "A.B-C_d 9", station: "Tablet-1", mode: undefined });
  assert.equal(ok.modeSlug, MODES[0].slug);
  assert.equal([...h.store.rows.values()][0].station, "tablet-1");
});

test("actions after the time limit are refused, but a submit is still graded", async () => {
  const h = harness();
  const session = await h.service.start({ nickname: "SLOWPOKE", station: "tablet-1", mode: "fixit" });
  const limit = session.maxSeconds;
  h.clock.now += (limit + 120) * 1000;
  await assert.rejects(
    () => h.service.call(session.token, "list_incidents", {}),
    (e: unknown) => e instanceof PlayError && e.code === "time_up",
  );
  const result = await h.service.submit(session.token, {});
  assert.equal(result.score.durationSeconds, limit, "duration is capped at the mode limit");
});

test("a concurrent write is retried once instead of losing state", async () => {
  const h = harness();
  const session = await h.service.start({ nickname: "RACER", station: "tablet-1", mode: "incident-queue" });
  h.store.failNextSave = 1;
  const result = await h.service.call(session.token, "list_incidents", { limit: 2 });
  assert.equal(result.isError, false);
  const row = [...h.store.rows.values()][0];
  assert.equal(row.state.calls, 1, "the call is counted exactly once");
});

test("the leaderboard ranks by score then time", async () => {
  const h = harness();
  const quick = await playPerfectly(h, "QUICK");
  h.clock.now += 30_000;
  await h.service.submit(quick.session.token, quick.answers);
  const slow = await playPerfectly(h, "SLOW");
  h.clock.now += 400_000;
  await h.service.submit(slow.session.token, slow.answers);

  const board = await h.service.leaderboard("fixit");
  assert.deepEqual(board.map((e) => e.nickname), ["QUICK", "SLOW"]);
  assert.ok(board[0].score >= board[1].score);
  assert.deepEqual(await h.service.leaderboard("not-a-mode"), await h.service.leaderboard("fixit"));
});

// ---- contract with the exported Dataverse solution -------------------------------------------
// The Function App writes columns by name. These tests read the exported MCPQuest solution,
// so a rename or a wrong assumption fails here instead of as a 400 from Dataverse at an event.

const repoRoot = join(__dirname, "..", "..", "..", "..", "..");
const exportRoot = join(repoRoot, "solutions", "MCPQuest");
const entityXmlPath = join(exportRoot, "Entities", "andy_MCPQuestPlay", "Entity.xml");
const haveExport = existsSync(entityXmlPath);

function exportedColumns(): Map<string, { type: string; maxLength: number | null }> {
  const xml = readFileSync(entityXmlPath, "utf8");
  const columns = new Map<string, { type: string; maxLength: number | null }>();
  for (const match of xml.matchAll(/<attribute PhysicalName="[^"]+">([\s\S]*?)<\/attribute>/g)) {
    const block = match[1];
    const logical = block.match(/<LogicalName>([^<]+)<\/LogicalName>/)?.[1];
    const type = block.match(/<Type>([^<]+)<\/Type>/)?.[1];
    const max = block.match(/<MaxLength>(\d+)<\/MaxLength>/)?.[1];
    if (logical && type) columns.set(logical, { type, maxLength: max ? Number(max) : null });
  }
  return columns;
}

test("every column the store uses exists in the exported MCPQuest solution", { skip: !haveExport }, () => {
  const columns = exportedColumns();
  const missing = Object.values(PLAY_COLUMNS).filter((name) => !columns.has(name));
  assert.deepEqual(missing, [], `columns missing from the export: ${missing.join(", ")}`);
});

test("the entity set and lookup navigation names match the export", { skip: !haveExport }, () => {
  const entity = readFileSync(entityXmlPath, "utf8");
  assert.equal(entity.match(/<EntitySetName>([^<]+)<\/EntitySetName>/)?.[1], PLAYS_SET_DEFAULT);

  // A single-valued navigation property is the lookup attribute's schema name, case included.
  const relationships = ["andy_prizeclaim.xml", "andy_ContestCampaign.xml"]
    .map((f) => readFileSync(join(exportRoot, "Other", "Relationships", f), "utf8"))
    .join("\n");
  for (const nav of [PRIZE_CLAIM_NAV_DEFAULT, CAMPAIGN_NAV_DEFAULT]) {
    assert.match(relationships, new RegExp(`<ReferencingAttributeName>${nav}</ReferencingAttributeName>`));
  }
});

test("the payloads only write columns that exist", { skip: !haveExport }, () => {
  const columns = exportedColumns();
  const state: PlayState = { v: 1, cases: {}, hints: [], calls: 0 };
  const written = [
    ...Object.keys(
      buildCreatePayload({
        station: "s", modeSlug: "fixit", nickname: "N", seed: "x", snapshot: "v", startedAt: 0, state, campaignId: null,
      }),
    ),
    ...Object.keys(
      buildCompletePayload({
        passed: true, score: 1, entriesAwarded: 1, durationSeconds: 1, callCount: 0, hintsUsed: 0, testCount: 0,
        claimToken: null, resultJson: "{}", submittedAt: 0, state,
      }),
    ),
  ].filter((key) => !key.includes("@odata"));
  assert.deepEqual(written.filter((key) => !columns.has(key)), []);
});

// The JSON columns hold a play's state and result, which run to a few hundred characters
// and a few thousand. Dataverse rejects a write that does not fit, so the columns must be
// Multiline text (or a text area of at least 4000).
test(
  "the State JSON and Result JSON columns can hold a play",
  { skip: !haveExport },
  () => {
    const columns = exportedColumns();
    for (const name of [PLAY_COLUMNS.stateJson, PLAY_COLUMNS.resultJson]) {
      const column = columns.get(name)!;
      assert.ok(
        column.type === "ntext" || (column.maxLength ?? 0) >= 4000,
        `${name} is ${column.type}(${column.maxLength}) which is too small`,
      );
    }
  },
);

test("a stored play row round-trips through the parser", () => {
  const row = parsePlayRow({
    "@odata.etag": 'W/"1"',
    [PLAY_COLUMNS.id]: "11111111-1111-4111-8111-111111111111",
    [PLAY_COLUMNS.station]: "tablet-1",
    [PLAY_COLUMNS.mission]: "fixit",
    [PLAY_COLUMNS.nickname]: "ADA",
    [PLAY_COLUMNS.seed]: "abc",
    [PLAY_COLUMNS.snapshotVersion]: "it-ticketing",
    [PLAY_COLUMNS.startedTime]: "2026-10-09T10:00:00Z",
    [PLAY_COLUMNS.stateJson]: JSON.stringify({ v: 1, cases: { routing: { picked: true, misses: 1, tests: 2 } }, hints: ["a"], calls: 3 }),
    [PLAY_COLUMNS.isSubmitted]: false,
    [PLAY_COLUMNS.isPassed]: false,
    [PLAY_COLUMNS.isClaimIssued]: false,
  });
  assert.equal(row.modeSlug, "fixit");
  assert.equal(row.startedAt, Date.parse("2026-10-09T10:00:00Z"));
  assert.equal(row.state.cases.routing.misses, 1);
  assert.equal(row.state.calls, 3);
  assert.equal(row.submitted, false);
});
