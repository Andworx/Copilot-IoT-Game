#!/usr/bin/env node
/**
 * A local MCP Quest backend for trying the page end to end. It serves the same /api/mcpquest/*
 * routes as the Function App and runs the same code (catalog, generator, job runner, rate
 * limit, play service, judge), but keeps all state in memory and issues no real prize claims.
 *
 *   cd azure/functions/game && npm ci && npm run build
 *   az login
 *   FOUNDRY_ENDPOINT=https://<resource>.openai.azure.com/openai/v1 FOUNDRY_MODEL=<deployment> \
 *     node scripts/dev-server.mjs [--port 7071] [--seed stored-spec.json ...] [--stage-delay 1200]
 *
 * Then run the page with VITE_API_BASE_URL=http://localhost:7071 and ?api=live.
 *
 *   --seed         preload a stored spec (from generate-spec.mjs): building that server is then a
 *                  cache hit, which is quick and free.
 *   --stage-delay  pause this long (ms) at each build stage so the build screen can be watched.
 *   --fake-model   do not call Foundry: a build of an unseeded server fails like an outage.
 *
 * Needs the machine's address to be allowed by the Foundry resource's network rules when a
 * server is built for real. Not for production: no auth, in-memory state, one process.
 */
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

process.env.MCPQUEST_TOKEN_SECRET ??= "dev-secret-dev-secret-dev-secret-0123456789";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const port = Number(value("port", "7071"));
const stageDelay = Number(value("stage-delay", "0"));
const seeds = args.flatMap((a, i) => (a === "--seed" && args[i + 1] ? [args[i + 1]] : []));

const load = (rel) => import(pathToFileURL(resolve("dist/src", rel)).href);
let mods;
try {
  mods = {
    service: await load("mcpquest/service.js"),
    token: await load("lib/mcpquestToken.js"),
    jobs: await load("mcpquest/generate/jobs.js"),
    gen: await load("mcpquest/generate/service.js"),
    catalog: await load("mcpquest/generate/catalog.js"),
    foundry: await load("mcpquest/generate/foundry.js"),
    http: await load("mcpquest/generate/http.js"),
    judge: await load("mcpquest/specJudge.js"),
    store: await load("mcpquest/store.js"),
  };
} catch {
  console.error("Build first: npm ci && npm run build (in azure/functions/game).");
  process.exit(2);
}
const { service: S, token: T, jobs: J, gen: G, catalog: C, foundry: F, http: H, judge: JD, store: ST } = mods;

// ---- in-memory state -------------------------------------------------------------------------

const docs = new Map();
const blobs = {
  async get(path) {
    const d = docs.get(path);
    return d ? { value: JSON.parse(JSON.stringify(d.value)), etag: String(d.etag) } : null;
  },
  async put(path, value, c) {
    const d = docs.get(path);
    if ("create" in c && d) return false;
    if ("etag" in c && (!d || String(d.etag) !== c.etag)) return false;
    docs.set(path, { value: JSON.parse(JSON.stringify(value)), etag: (d?.etag ?? 0) + 1 });
    return true;
  },
};

const byId = new Map();
const byHash = new Map();
const specStore = {
  async get(slug, hash) {
    return byHash.get(`${slug}:${hash}`) ?? null;
  },
  async put(slug, stored) {
    byId.set(stored.specId, stored);
    byHash.set(`${slug}:${stored.toolsHash}`, stored);
  },
  async getById(id) {
    return byId.get(id) ?? null;
  },
};
for (const file of seeds) {
  const stored = JSON.parse(readFileSync(file, "utf8"));
  await specStore.put(stored.spec.server.id, { samples: [], ...stored, validated: true });
  console.log(`[seed] ${stored.spec.server.id}: ${stored.spec.title} (${stored.specId})`);
}

const rows = new Map();
const playStore = {
  async create(play) {
    const id = randomUUID();
    rows.set(id, {
      id, etag: "1", station: play.station, modeSlug: play.modeSlug, nickname: play.nickname, seed: play.seed,
      snapshot: play.snapshot, startedAt: play.startedAt, state: play.state, submitted: false, passed: false,
      claimToken: null, claimIssued: false, resultJson: null, score: 0, durationSeconds: 0,
    });
    return { id, etag: "1" };
  },
  async load(id) {
    const r = rows.get(id);
    return r ? { ...r, state: JSON.parse(JSON.stringify(r.state)) } : null;
  },
  async saveState(id, state, etag) {
    const r = rows.get(id);
    if (r.etag !== etag) throw new ST.ConflictError();
    r.state = state;
    r.etag = String(Number(r.etag) + 1);
    return r.etag;
  },
  async complete(id, etag, play) {
    const r = rows.get(id);
    if (r.etag !== etag) throw new ST.ConflictError();
    Object.assign(r, {
      submitted: true, passed: play.passed, claimToken: play.claimToken, resultJson: play.resultJson,
      score: play.score, durationSeconds: play.durationSeconds, state: play.state, etag: String(Number(r.etag) + 1),
    });
  },
  async markClaimIssued(id) {
    rows.get(id).claimIssued = true;
  },
  async leaderboard(mode, limit) {
    return [...rows.values()]
      .filter((r) => r.submitted && r.modeSlug === mode)
      .sort((a, b) => b.score - a.score || a.durationSeconds - b.durationSeconds)
      .slice(0, limit)
      .map((r, i) => ({ rank: i + 1, nickname: r.nickname, score: r.score, durationSeconds: r.durationSeconds }));
  },
  async rankOf(mode, score, duration) {
    return [...rows.values()].filter((r) => r.submitted && r.modeSlug === mode && (r.score > score || (r.score === score && r.durationSeconds < duration))).length + 1;
  },
};

const play = S.createPlayService({
  store: playStore,
  specs: specStore,
  claims: { issue: async () => ({ prizeClaimId: randomUUID() }) },
  maxEntries: async () => 3,
  signToken: (id, exp) => T.signPlayToken({ playId: id, expiresAt: exp }),
  verifyToken: (t, now) => T.verifyPlayToken(t, now),
  activeCampaignId: async () => null,
});

// ---- generation ----------------------------------------------------------------------------------

const endpoint = process.env.FOUNDRY_ENDPOINT;
const fakeModel = flag("fake-model") || !endpoint || !process.env.FOUNDRY_MODEL;
const az = process.platform === "win32" ? "az.cmd" : "az";
const model = fakeModel
  ? { generate: async () => { throw new Error("no model configured (--fake-model or FOUNDRY_* unset)"); } }
  : F.createFoundryModel({
      projectEndpoint: endpoint,
      model: process.env.FOUNDRY_MODEL,
      timeoutMs: 180_000,
      getToken: async () =>
        execFileSync(az, ["account", "get-access-token", "--resource", F.foundryAudience(endpoint), "--query", "accessToken", "-o", "tsv"], {
          encoding: "utf8",
          shell: process.platform === "win32",
        }).trim(),
    });

const catalog = C.createCatalogClient();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const runnerDeps = {
  jobs: J.blobJobStore(blobs),
  locks: J.blobGenerateLock(blobs),
  limiter: J.blobRateLimiter(blobs, {
    perClientPerHour: Number(process.env.MCPQUEST_GENERATE_PER_CLIENT_HOUR ?? 10),
    globalPerHour: Number(process.env.MCPQUEST_GENERATE_GLOBAL_HOUR ?? 40),
  }),
  isKnownServer: (slug) => catalog.has(slug),
  generate: (slug, hooks) =>
    G.generateGameSpec(slug, {
      model,
      store: specStore,
      fetchFn: fetch,
      prove: async (spec, digest) => JD.proveSpec(spec, digest.tools, digest.samples),
      onStage: async (stage) => {
        await hooks.onStage(stage);
        if (stageDelay) await sleep(stageDelay);
      },
      admit: hooks.admit,
    }),
};

// ---- http ---------------------------------------------------------------------------------------

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    throw new S.PlayError("bad_request", "Invalid JSON body");
  }
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Expose-Headers": "Retry-After",
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const send = (status, body, headers = {}) => {
    res.writeHead(status, { "Content-Type": "application/json", ...CORS, ...headers });
    res.end(JSON.stringify(body));
  };
  if (req.method === "OPTIONS") return send(204, {});
  const route = url.pathname.replace(/^\/api\/mcpquest\//, "");
  if (route === url.pathname) return send(404, { error: "Not found" });

  try {
    if (req.method === "GET" && route === "servers") return send(200, { servers: await catalog.list() });
    // Dev only: lets a test read back what was generated (the real route never exposes this).
    const devSpec = /^dev\/spec\/([0-9a-f]{16})$/.exec(route);
    if (req.method === "GET" && devSpec) {
      const stored = await specStore.getById(devSpec[1]);
      return stored ? send(200, stored) : send(404, { error: "No such spec" });
    }
    // Dev only: the most recently built game, so a test does not need to know its id.
    if (req.method === "GET" && route === "dev/latest") {
      const latest = [...byId.values()].at(-1);
      return latest ? send(200, latest) : send(404, { error: "Nothing built yet" });
    }
    if (req.method === "GET" && route === "leaderboard") return send(200, { entries: await play.leaderboard(url.searchParams.get("mode")) });
    if (req.method === "GET" && route === "generate/status") {
      const job = url.searchParams.get("job");
      if (!J.isJobId(job)) return send(400, { error: "job must be a GUID.", code: "bad_request" });
      const status = await runnerDeps.jobs.get(job);
      return status ? send(200, H.statusBody(status)) : send(404, { error: "No such job.", code: "not_found" });
    }

    const body = req.method === "POST" ? await readBody(req) : {};
    if (req.method === "POST" && route === "generate") {
      const input = H.parseGenerateRequest(body);
      if ("error" in input) return send(400, { error: input.error, code: "bad_request" });
      const salt = process.env.MCPQUEST_TOKEN_SECRET;
      const clientKey = H.clientKeyFrom({ get: (n) => req.headers[n.toLowerCase()] ?? null }, salt);
      const answer = H.answerFor(await J.runGenerateJob({ ...input, clientKey }, runnerDeps));
      return send(answer.status, answer.body, answer.headers);
    }

    const handlers = {
      start: () => play.start({ nickname: body.nickname, station: body.station, mode: body.mode, spec: body.spec }),
      call: () => play.call(body.sessionToken, body.tool, body.arguments),
      hint: async () => ({ hint: await play.hint(body.sessionToken, body.objectiveId) }),
      choose: () => play.choose(body.sessionToken, body.objectiveId, body.productId),
      test: () => play.test(body.sessionToken, body.objectiveId, body.design),
      submit: () => play.submit(body.sessionToken, body.answers),
    };
    if (req.method === "POST" && handlers[route]) return send(200, await handlers[route]());
    return send(404, { error: "Not found" });
  } catch (error) {
    if (error instanceof S.PlayError) return send(error.status, { error: error.message, code: error.code });
    console.error(`${req.method} ${route} failed`, error);
    return send(500, { error: "Something went wrong. Please try again." });
  }
});

server.listen(port, () => {
  console.log(`MCP Quest dev backend on http://localhost:${port}`);
  console.log(`  model: ${fakeModel ? "none (seeded specs only)" : `${process.env.FOUNDRY_MODEL} via ${endpoint}`}`);
  if (stageDelay) console.log(`  build stages slowed by ${stageDelay} ms each`);
});
