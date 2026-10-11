# MCP Quest — Agent-Generated Games

Plan for letting a visitor pick an MCP server at the console and have a Foundry-hosted agent
read it and build the game at run time: the scenario, the Power Platform cases and the
acceptance criteria. Extends [MCP_QUEST_PLAN.md](MCP_QUEST_PLAN.md); engine and routes are in
[docs/MCP_QUEST_ENGINE.md](../docs/MCP_QUEST_ENGINE.md).

**Status:** analysis done, GameSpec schema and validator built and tested. Nothing else is
built. Track items in [PLAN.md](PLAN.md) under "MCP Quest".

## Decision this reverses

[MCP_QUEST_PLAN.md](MCP_QUEST_PLAN.md) decided on 2026-10-09: *"Each game mode is hand-built in
the repo. No generated or declarative scenario packs, and no agent that writes modes."*

That decision is superseded for **new** servers by this plan. The 13 hand-built cases stay as
the curated, prize-eligible mode and the quality bar the generator is measured against.

## Goal

A visitor walks up to the console, picks an MCP server, and a few seconds later gets a game
about solving a business problem with the Power Platform using that server's tools. No
developer writes a new mode.

## Principles

1. **The agent writes the game; it never judges it.** The agent produces a declarative
   `GameSpec`. A fixed judge in the Function App interprets it. A bad or hostile spec can make
   an unwinnable or trivial game, never run code or inflate a score.
2. **Validate, then prove solvable, before a player sees it.** Schema and tool-list checks
   first; then run the agent's own reference solution and a deliberately broken one through
   the judge.
3. **Same server, same game.** Specs are cached by the hash of the server's tool list, so every
   player on a server gets the same game and a leaderboard means something.
4. **Untrusted input end to end.** Tool descriptions and record data are prompt-injection
   surface. The agent gets read-only tools, an allowlisted catalog, and no route to Dataverse
   or the prize engine.
5. **Prizes come from the shared prize engine, based on a score out of 100.** The agent has no
   say in points, tiers or prizes (see "Scoring and prizes").
6. **MCP Station only.** The page and the agent name a catalog slug; the endpoint is built in
   code from a fixed host.

## Options considered

### What generates the game

| Option | What it is | Verdict |
|---|---|---|
| **A. Spec-driven (chosen)** | Agent emits a schema-validated GameSpec; existing designers render it; fixed judge scores it | Deterministic, server-side scoring, keeps the prize engine and CI/CD as they are |
| B. Agent-written UI | Agent emits React/HTML run in a sandboxed iframe | Most open-ended; unpredictable quality and kiosk fit, untestable. Possible later "wow" mode on top of A |
| C. Game-master agent | Agent narrates, converses and judges live | Non-deterministic, slower, costlier, unfair for a leaderboard. Use for hints and story inside A only |

### Where the player UI runs

| Host | Verdict |
|---|---|
| **Power Pages Code Site (chosen)** | A static SPA. The work happens in the Function and Foundry, so nothing forces a move. Keeps the pipeline, `deploy-apps.yml`, and the existing station setup |
| Web app (Static Web Apps / Container Apps) | Only if we need same-origin streaming of generation progress, our own auth, or outgrow Power Pages. Adds a second deploy path |
| Power Apps code app | Avoid for a walk-up console. To verify: code apps run in the Power Apps player for signed-in, licensed tenant users |

### Where the agent runs

| Option | Verdict |
|---|---|
| **Foundry prompt agent with the MCP tool + structured output (chosen)** | Least code. Output shaped by `GAME_SPEC_JSON_SCHEMA` |
| Foundry hosted (container) agent | More control and more to maintain. Revisit if the loop needs custom tools |
| Call a model directly from the Function | Possible fallback if Foundry is unavailable in the target cloud |

Cloud: **commercial** (decided). Confirm the chosen Foundry model is deployable in the
target region before Phase 1.

## Architecture

```
Console ──pick server──► Code Site ──POST /api/mcpquest/generate──► Function App (public)
                                                                        │
                       cache hit (toolsHash) ◄──── spec store (blob) ◄──┤
                                                                        │ miss
                                  ┌─────────────────────────────────────┘
                                  ▼
                 1. read tools/list + sample data (read-only, our proxy, allowlisted server)
                 2. Foundry agent (MCP tool, structured output) ──► GameSpec JSON
                 3. validateGameSpec(spec, tools)          ── errors fed back, one repair try
                 4. validation loop: judge(reference.pass) must pass all requirements,
                                     judge(reference.fail) must fail at least one
                 5. store spec by specId; mark `validated`
                                  │
                                  ▼
        /api/mcpquest/start { specId } ──► play row stores specId; cases rebuilt from the
        stored spec + snapshot, same as today ──► existing choose / test / submit / claim
```

Unchanged: the signed session token, ETag play row, idempotent submit, leaderboard, Prize
Claim and `claim-prize`. The judge gains a second front end (GameSpec interpreter) next to the
hand-built cases.

## GameSpec

Implemented in `azure/functions/game/src/mcpquest/gamespec.ts` (types, `validateGameSpec`,
hashing) and `gamespecSchema.ts` (JSON Schema for the agent's structured output).

```
GameSpec
├─ server { id, name, toolsHash }      binds the spec to the exact tool list
├─ title, scenario
└─ cases[1..4]
   ├─ id, title, brief, hint
   ├─ designer   flow | report | app | site | table | security | agent
   ├─ judging    "run" (execute design against scenarios) | "design" (inspect the JSON)
   ├─ scenarios[0..6]  { name, trigger, input{scalar} }
   ├─ requirements[1..6]  { id, text (shown up front), scenario?, check: Predicate }
   └─ reference? { pass, fail }        designs used by the validation loop
```

A `Predicate` is data, not code:

| op | Meaning |
|---|---|
| `called` / `not-called` | A call to `tool` whose arguments match (`equals`, `oneOf`, or `fromInput` = the scenario's input value) appears (min/max times) or does not |
| `before` | Some call matching `first` precedes some call matching `then` (approval before update) |
| `all` / `any` / `not` | Combinators; depth ≤ 4, ≤ 30 nodes per requirement |
| `design` | `path` into the design JSON `equals` / `contains` (for configuration-only products) |

What the validator enforces beyond shape: no unknown fields, length and control-character
limits, unique ids, scenario names resolve, `fromInput` keys exist in every targeted scenario,
every tool, argument name and enum value exists on the real server, `design` paths use a
restricted grammar, design-judged cases cannot use call predicates, and the spec's `toolsHash`
can be required to match the live tool list. `requireReference` demands pass and fail designs
on every case (required before a spec may mint prizes).

The tool-list hash covers tool names and input schemas only, so a reworded description does
not invalidate a cached spec but a changed parameter does.

## Build screen: "It's dangerous to go alone!"

Generation takes 20-60 s, so the wait is part of the game. The build screen is a Zelda-style
cave scene: an old sage by a fire hands the player the Power Platform.

- The sage says a line of our own in the spirit of "It's dangerous to go alone! Take this."
  (for example, "Dangerous to go alone. Take the Platform.") over a pixel-art cave.
- The six products (Power Automate, Power BI, Power Apps, Power Pages, Dataverse, Copilot
  Studio) appear one at a time as pickup items with the item-get pose and chime. The player
  starts the game holding the products the generated spec uses.
- Items double as honest progress. Each lands when its stage completes: reading the server's
  tools, drafting the mission, validating it, proving it solvable. If the spec is a cache hit
  the screen is skipped or plays a short version.
- The mission's server name and first line of scenario show on the sage's "dialogue" as the
  agent finishes, so the wait ends with the brief rather than a spinner.
- Failure is in character: "The sage is out of ideas. Try another cave." with a retry, and a
  fallback to a hand-built mode.
- All art, sound and wording are original homage. No Nintendo assets, names or exact text.
- Needs a progress signal from `generate`: stream stages (SSE) or poll a job id. The Code Site
  can poll, which keeps the static-host choice.

## Scoring and prizes

Decided 2026-10-10. Prizes come from the existing engine; the game only supplies a score.

**Points.** Every generated game is scored out of **100**, set by the engine, not the agent.
The 100 is split evenly across the spec's cases, and each case splits between choosing the
right product and the build that passes its requirements (the hand-built weighting today is
30 and 100 per case; the exact split is tuned in playtest). Time and hint penalties come off
the total and the score is clamped to 0-100 and rounded.

**Who gets a prize.** Everyone who submits. Gating on a pass no longer applies to generated
games: a score under 70 still earns one entry. Each submitted play mints a Prize Claim with
source `mcpquest`, and the player scans the QR to the **Prize Wheel**, exactly as in IoT,
Plinko and the hand-built MCP Quest. `claim-prize` is unchanged for the wheel and instant prize.

**Grand-prize entries by score** (with today's cap of 3: 3 / 2 / 1) (`src/mcpquest/entryTier.ts`, tested):

| Score | Tier | Grand-prize entries |
|---|---|---|
| 90-100 | top | the most the campaign allows |
| 70-89 | mid | one fewer than the most |
| 0-69 | base | one |

**Who owns what** (decided 2026-10-10). The game owns the rules; the engine only owns the
maximum.

| | Owns |
|---|---|
| Game (`entryTier.ts`, judge) | The score, the tiers, and the math: it takes the engine's maximum and returns the entries this play is worth |
| Engine | "The most allowed" (the campaign's `andy_maxentriespercontact`) and enforcing it. It knows nothing about scores or tiers, so it stays game-agnostic for other games |

"The most allowed" is the campaign cap. With a cap of 1 every tier is 1; with a cap of 2 the
tiers are 2 / 1 / 1. The cap is per contact across all plays and games: however many times
someone plays, they can never hold more than the cap. That is how the engine already behaves
(it counts the contact's existing entries and stops at the cap), so replays need no game logic.
A repeat player's later plays simply top up to the cap and no further.

**One gap to settle.** The game works out N entries at submit time, but entries are created
later, when the player claims at the Prize Wheel, and today `claim-prize` always creates exactly
one. Something has to carry N across without the game doing the engine's job. Options:

| Option | Engine change | Notes |
|---|---|---|
| **A. The game's win table holds N (`andy_entriesawarded`, as on Plinko Play); the claim reads it (recommended)** | One small, generic hook in `claim-prize`: after resolving the claim, ask the claim's contest source for "entries requested" (default 1), clamped to the cap minus the contact's existing entries. No tier logic, no new Prize Claim column | Same pattern as IoT and Plinko: the game's own table (`andy_mcpquestplay`, already linked to Prize Claim) stores the result, here the entry count next to the score. Other games keep today's behaviour |
| B. Game reads the cap and writes extra entries itself after the claim | None | The Prize Wheel calls `claim-prize` directly, so the game never sees the claim; it would need to poll or hook a Dataverse event. Fragile |
| C. One Prize Claim per entry | None | One QR and one wheel spin per claim, so the player would scan several times. Not workable |

Plinko already works this way on paper: `PLINKO_GAME_PLAN.md` gives Plinko Play an
`andy_entriesawarded` column and says `claim-prize` should create that many entries, each checked
against the cap. That `claim-prize` change is now **built generically** (2026-10-10, `lib/dataverse.ts`): it reads
`andy_entriesawarded` from the claim's Plinko or MCP Quest play row, defaults to 1, and clamps to
the cap. Not yet live-tested. MCP Quest
adds the same column (`tables/andy_mcpquestplay/definition.json`, not yet deployed).

A is the smallest change that keeps the engine multi-game. If you want zero engine change,
the realistic fallback is every player gets one entry and the tiers apply to something else
(for example which instant prizes the wheel may pick), so say if you prefer that.

Also needed either way: the campaign has `andy_maxentriespercontact` set, the judge scores out
of 100, and the pass-only claim minting and `passScore` do not apply to generated games.

Interpretation to confirm: tiers are grand-prize **entries**, not different prize types.

## MCP Station only

The visitor picks from MCP Station's public catalog (`GET https://www.mcpstation.io/api/catalog`,
15 servers at the 2026-10-09 spike). Nothing else is reachable.

- `src/mcpquest/mcpstation.ts` builds `https://www.mcpstation.io/mcp/<slug>` from a validated
  slug and rejects any other host, scheme, port, credentials, query or path (tested).
- The Foundry agent's MCP tool is configured with that endpoint only, per request.
- **Snapshot at generation.** The generate step captures the server's tool list and read-tool
  data (the existing `capture-mcp-snapshot` logic) and stores it with the spec. Plays replay
  the snapshot, so a play never depends on MCP Station being up, and the data matches what the
  spec's requirements were validated against. Refresh by regenerating, which gives a new `specId`.
- MCP Station writes are simulated and discarded, so write tools in predicates are safe to
  reference (they only appear in test runs of a player's design).
- Rate budget: 1000 requests/min is shared across all stations (spike). Generation reads a
  bounded number of records, and plays use the snapshot, so event load does not hit MCP Station.

## Foundry integration (built, not yet run live)

Code: `azure/functions/game/src/mcpquest/generate/` (`digest.ts`, `prompt.ts`, `foundry.ts`,
`service.ts`), 13 tests with fakes. Nothing calls it from an HTTP route yet.

**Design change: the generator is given the server's data, not an MCP tool.** The Function reads
MCP Station itself (`digest.ts`: `initialize`, `tools/list`, and a few capped read-only samples
from `https://www.mcpstation.io/mcp/<slug>` only) and puts the result in the prompt, fenced as
untrusted data. The Foundry agent has no tools, so a hostile tool description cannot make it call
anything. It also means the spec is validated against exactly the data the agent saw, and the
same capture can become the play snapshot. A Foundry prompt agent can still be used (it only
needs the instructions and a structured-output model).

**Flow** (`generateGameSpec(slug)`):
1. Reject anything that is not a plain MCP Station slug.
2. Read the digest; hash the tool list; return the cached spec if one exists (no model call).
3. Ask Foundry for JSON matching `GAME_SPEC_JSON_SCHEMA` (strict structured output).
4. `validateGameSpec` against the real tools, bound to the tool-list hash, reference designs
   required. On errors, one repair call with the validator's complaints; then fail with them.
5. Optional `prove` step (Phase 2, the judge) runs the reference designs; until it exists specs
   are stored with `validated: false` and cannot mint prizes.
6. Store by `(slug, toolsHash)`.

**Foundry client** (`foundry.ts`): `POST {projectEndpoint}/openai/v1/responses` with either
`agent_reference` (a named prompt agent) or `model` + `instructions`, `text.format` =
`json_schema` strict, `store: false`. Token from the Function App's managed identity
(`IDENTITY_ENDPOINT`, audience `https://ai.azure.com`) or `FOUNDRY_ACCESS_TOKEN` for local runs.
No keys. Error messages never include response bodies.

**Verified 2026-10-10 (owner, from a home IP allowed by the resource firewall):** endpoint
`https://foundry-aw--ed-azcomm-eastus2.openai.azure.com/openai/v1`, model deployment `gpt-6-sol`,
`POST <endpoint>/responses` with a bearer token for audience `https://cognitiveservices.azure.com`
and strict `json_schema` output returned HTTP 200 in 1.5 s with valid JSON. Roles tried: Azure AI
Administrator and Owner (control plane only, denied), Cognitive Services OpenAI Contributor
(denied), **Foundry User** (needed for the data plane). The resource is network-restricted, so
the Function App needs a private endpoint and DNS before it can call it (owner to add later).
**First live generation, 2026-10-10 (`scripts/generate-spec.mjs it-ticketing`, run from VS Code on
the allowed IP):** a real MCP Station read and a real `gpt-6-sol` call produced a valid GameSpec
in 43 s. The first answer failed validation and the single repair attempt fixed it (2 model
calls at roughly 18-25 s each), so plan for about a minute and for the repair path being normal,
not rare. The result was two run-judged cases (a flow and an agent), grounded in real incident
and group ids, with pass and fail reference designs that behave as intended on paper.
What the live service taught us about strict structured output: every schema node needs a
`type` (a bare `const` was rejected with HTTP 400), objects need fixed properties, and
open-ended maps are not allowed. The wire schema therefore spells scenario inputs and argument
matchers as key/value arrays and reference designs as JSON text, and `fromWireSpec` rebuilds
the internal shape before `validateGameSpec`.
**Second-server and repeat runs (same day).** Before hardening, 6 runs on `it-ticketing` and
`freight-tracking` gave 3 first-call passes, 2 invalid-after-repair and 1 transient `az`
token error. The failures were all strict-output side effects: both `equals` and `contains`
filled on a report check (once with garbled filler text), a skipped reference, an empty hint.
After changing report checks to `mode` + `value`, requiring the reference, and tightening
the prompt: **6 of 6 passed on the first model call, 21-30 s each**, across `it-ticketing`,
`freight-tracking` and `expense-reporting`, and most specs now include a report-style
design-judged case. Sample is small and the same prompt tuned on the same servers, so treat
the rate as promising, not measured.

**With samples, the discoverability rule and the argument-syntax prompt (same day):** 6 of 6
`it-ticketing` / `freight-tracking` / `expense-reporting` runs passed on the first model call, 21-48 s,
with the full proof (reference designs plus discoverability) in the loop. A run just before the
prompt documented `{{key}}` needed one repair, so the prompt and the alias matter.

Still unverified: whether the reference designs actually pass and fail when run (needs the
Phase 2 judge), variety across servers (only `it-ticketing` tried; both cases were run-judged,
none were report/table/security), and a second MCP Station server.
Note the repair rate is unknown: the script does not yet save the failed first attempt on
success. Worth logging before tuning the prompt.

**Earlier caveat (kept for the rest).** The build environment cannot reach Azure or Microsoft docs, so the request
shape comes from search summaries of Microsoft's Foundry docs, not from a live call. Check on
the first real run: the endpoint path and any required `api-version`, whether structured
output is honoured when `agent_reference` is used (if not, use `model` mode), the exact token
audience, and the role the managed identity needs.

**Owner runbook** (commercial cloud):
1. Create a Foundry project and deploy a model that supports structured outputs. Infra in this
   repo is Bicep-only (see CLAUDE.md), so either add it to `azure/infrastructure/` through the
   infra workflow or create it by hand and record it.
2. Optional: create a prompt agent from `GENERATOR_INSTRUCTIONS` (`prompt.ts`).
3. Grant the public Function App's managed identity access to the project (expected role:
   Azure AI User; confirm in the portal).
4. App settings on the public Function App: `FOUNDRY_ENDPOINT`
   (the project endpoint, or the resource's OpenAI-style `https://<resource>.openai.azure.com/openai/v1`,
   which is what this deployment uses), and one of `FOUNDRY_AGENT_NAME` (project endpoint only)
   or `FOUNDRY_MODEL`. Token audience is `https://cognitiveservices.azure.com` for the OpenAI-style
   endpoint and `https://ai.azure.com` for the project endpoint.
5. Network: the Function App must reach `www.mcpstation.io` and the Foundry endpoint. The infra
   uses private networking, so check egress rules.

**Still to build for Phase 1:** a blob-backed `SpecStore`; the `/api/mcpquest/generate` route
(slug from the catalog only, with a per-IP and global rate limit before it is exposed, since it
costs money); the live spike against two MCP Station servers.

## Spec judge (built, offline-tested)

Code: `azure/functions/game/src/mcpquest/specJudge.ts`, 12 tests. It is the fixed interpreter for a
GameSpec: no model, no network, deterministic.

- **Design formats.** Run cases: `{trigger, steps:[{id, tool, args}]}` where an arg is a literal
  or `{fromInput: key}`. Design cases: any JSON object read by `design` paths.
- **Running a design** builds the log of tool calls it makes in a scenario without contacting
  any server. A design whose trigger differs from the scenario's does not fire. Calls to tools or
  arguments that do not exist, bad enum values and missing required arguments are reported as
  problems and never counted. At most 40 steps.
- **Checks** (`called` min/max, `not-called`, `before`, `all`/`any`/`not`, `design`) read that
  log. Strings compare trimmed and case-insensitively; paths cannot reach prototypes.
- **`proveSpec`** per case: the reference pass design meets every requirement, the reference
  fail design misses at least one, and a do-nothing design also misses at least one. The
  generator runs it after validation and feeds any problems back to the model for its one
  repair attempt; a spec that still fails is not stored.
- **Result:** all 8 specs generated so far (3 servers) prove clean. Caveat: the model wrote both
  the checks and the reference designs, so this shows the specs are internally consistent and
  use only real tools, not that they are fun or fair to a human.

## Playing a generated game (built, tested server-side)

Code: `specPlay.ts` (rules and grading), `service.ts` (dispatch), `lib/mcpquestSpecStore.ts`
(blob store), 15 tests in `mcpquestSpecPlay.test.ts`.

- **Start.** `POST /api/mcpquest/start { nickname, station, spec: "<specId>" }` reads the spec from
  blob storage (`MCPQUEST_SPEC_BLOB_URL`) and creates an ordinary play row whose mission is
  `spec:<specId>`; the leaderboard is therefore per spec. The response lists each case's brief,
  designer, plain-language requirements and scenarios (facts such as incident ids), plus the
  tool list. It never includes checks or reference designs.
- **Blob store.** Plain Blob REST with the Function App's managed identity (audience
  `https://storage.azure.com/`), no new dependency. `by-id/<specId>.json` and
  `by-hash/<slug>/<toolsHash>.json`. On every read the spec is re-validated against its own
  tool list and its id is recomputed, so a hand-edited blob is refused.
- **Hint.** Returns the case's hint, costs 5 points, once per case.
- **Test.** The player's design (JSON text, at most 20 000 characters) runs through the spec
  judge; the response lists each requirement met or missed and the calls the design made.
  Six test runs per case.
- **Submit.** Each case is worth 100 / number of cases, split across its requirements, so a
  partly right design earns partial credit. Hints come off. Total is clamped to 0-100 and is the
  score. `passed` means every requirement was met and the score is at least 70.
- **Prizes.** Same rule as the hand-built mode: a claim and QR for every submit, entries by
  tier against the campaign cap (90-100 the cap, 70-89 one fewer, below 70 one), written to
  `andy_entriesawarded`. Exception: a spec that was not proven (`validated: false`) is scored
  and ranked but earns no claim and no entries.
- **Not offered.** Direct tool calls and product choice are rejected for generated games: plays
  run only on the stored tool list and never reach MCP Station.

**Played end to end, 2026-10-10.** Six real model-generated specs from three servers were
played through the service with their own reference designs: the pass designs scored 100 (top
tier, 3 entries at a cap of 3) and the deliberately flawed fail designs scored 33-58 (base tier,
1 entry).

**Data discovery (decided 2026-10-10: sampled records).** Some requirements depend on values
the player can only learn from the server's data (for example a group id), and direct calls
are not offered. So the records the generator sampled are stored with the spec
(`StoredSpec.samples`, re-read from blob storage) and sent in the session as `samples`; the
player UI shows them next to the cases. The model wrote its requirements from exactly these
records, so the values it uses are findable by construction, and the proof now enforces it:
`undiscoverableValues` flags any literal a requirement depends on that is not in the samples,
the case's scenario facts or text, or the tool's allowed values, and `proveSpec` fails the case
(the problem goes back to the model for its repair attempt). Measured on the 22 cases generated
so far: none depended on a hidden value, so the rule costs nothing today. Limits: samples are
capped at 4 read tools, 5 records, 1 500 characters each, so a game can only ask about what
fits in those; a snapshot replay (read-only calls against stored data) remains the upgrade if
playtests find that too tight.

## The generate routes (built, tested, exercised live)

Code: `functions/mcpquestGenerate.ts`, `generate/jobs.ts`, `generate/catalog.ts`,
`generate/http.ts`, `lib/mcpquestBlobJson.ts`; 16 tests in `mcpquestGenerateJobs.test.ts`.

- **`GET /api/mcpquest/servers`** lists the MCP Station catalog (15 servers today), cached 10
  minutes and served stale during a brief outage. Only catalog servers can be generated.
- **`POST /api/mcpquest/generate { server, jobId }`** runs the generator and answers in about 25
  seconds. The page chooses the job id, and `GET .../generate/status?job=` returns the current
  stage, so the cave screen can show real progress. No queue or background host: the work runs
  inside the request and status is written to blob storage at each stage.
- **Cache hits are free.** The same server with the same tool list returns the stored spec in
  well under a second and spends no allowance. Only a real model call is rate limited.
- **Rate limit.** Hourly fixed windows in blob counters, using ETags so concurrent instances
  cannot exceed it: 10 builds per client and 40 in total by default (settings above). A
  client is a salted hash of the forwarded address, never the address. A refusal is HTTP 429
  with `Retry-After`, and a client over their own allowance does not use up the shared one.
- **One build per server.** A lock per server (3 minute expiry, owner-only release) means a
  second visitor who picks the same server while it is being built gets the running job id
  (HTTP 409) and polls that, rather than starting and paying for another build.
- **Failures** answer with fixed, safe messages. Model output, validator complaints and
  internal errors go to the log only.

**Live check, 2026-10-10** (real catalog, real Foundry, in-memory blobs): unknown server refused
in 0 s; first build 22 s with stages reading, designing, checking, proving, saving, done; the
same server again 0.6 s and cached; a different server 13 s; a third build from the same client
refused with 429 and `Retry-After`.

**Owner runbook for these routes.**
1. Create a blob container for specs and state (private, no public access) and set
   `MCPQUEST_SPEC_BLOB_URL` to it. Add a lifecycle rule that deletes `jobs/`, `limits/` and
   `locks/` blobs after 1 day; keep `by-id/` and `by-hash/`.
2. Give the public Function App's managed identity **Storage Blob Data Contributor** on that
   container, and **Foundry User** on the Foundry resource (already needed for the model).
3. Set `FOUNDRY_ENDPOINT` and `FOUNDRY_MODEL` on the public Function App. Confirm
   `MCPQUEST_TOKEN_SECRET` is set (it also salts the client hash).
4. Private networking: the Function reaches Foundry through the private endpoint you created
   (pull it into `azure/infrastructure/` through the infra workflow), reaches blob storage through
   its existing private endpoint, and needs outbound access to `www.mcpstation.io`.
5. Add the public site's origin to the Function App's CORS list if it is not already there.

Two things to watch: instances share one Function App egress address, so MCP Station sees
one client; and the rate limit protects cost, not abuse of the unauthenticated catalog and
status reads, so put API Management or the front door's per-IP limit in front of the public
surface before an open event (already an open item in the engine doc).

**Still not built.** Designers that emit the run-design format, the console picker and cave
screen, and the Bicep for the private endpoint.

## Security and abuse

| Risk | Control |
|---|---|
| Arbitrary MCP URL (SSRF, data exfiltration) | MCP Station only; the page sends a catalog slug, never a URL; endpoint built in code (`mcpstation.ts`) |
| Prompt injection via tool descriptions or data | Agent is read-only and has no other tools; output is validated data, not instructions; judge never takes scoring input from the agent at run time |
| Rigged or trivial game | Validation loop before a spec is served. Prizes depend on the engine's score, so a trivially easy spec still caps at the campaign's per-contact entry limit |
| Cost and abuse of `generate` | Cache by `toolsHash`; per-IP and global rate limit (open item in the engine doc); generate is not callable without a catalog id |
| Foundry credentials | Function App managed identity; nothing in the browser or repo |
| Leaderboard fairness | Board key is `specId`; a regenerated spec starts a new board |

## Phases

| Phase | Deliverable | Exit test |
|---|---|---|
| 0. Schema ✅ | `gamespec.ts`, `gamespecSchema.ts`, 18 tests | Validator rejects bad specs, accepts a realistic one |
| 1. Spike | Generator service and Foundry client ✅ (tests with fakes). Remaining: blob spec store, `generate` route, live run. `generate` route calling Foundry for `it-ticketing` and one differently shaped catalog server; measure latency, cost, and how often the first output validates | ≥ 80% of first attempts validate (or after one repair), and the validation loop catches deliberately broken specs |
| 2. Judge ✅ (offline) | specJudge.ts interpreter and proveSpec built and tested; play-service wiring is Phase 3. GameSpec interpreter: build outcomes from the call log, evaluate predicates; generic tool-call-log runners replace the incident-specific `Outcome` for spec games | The hand-built cases re-expressed as GameSpecs score identically to today's judge |
| 3. Storage and start | Spec blob store, `specId` on the play row, `start { specId }`, cache by `toolsHash` | A play survives a Function restart; a repeat pick is a cache hit |
| 3b. Entries and scoring | `entryTier.ts` ✅ (tested, game-side). 100-point scoring in the judge; carry N to the claim (option A above, pending your call) | On a cap-5 campaign a 95 yields 5 entries and one wheel spin, a 75 yields 4, a 40 yields 1, and a contact never exceeds 5 across plays |
| 4. Console UI | Catalog picker, cave build screen (see above) with staged progress, designers driven by spec | Walk-up flow works at 800×480 |
| 5. Hardening | Rate limit, retention, deploy wiring, playtest | Docs updated; plan items to Verify, then Done after live checks |

## Decided

| Question | Answer |
|---|---|
| Cloud | Commercial |
| Prizes | Game computes entries from a score out of 100 against the engine's maximum (engine only sets and enforces the max): 90-100 the most entries allowed, 70-89 one fewer, under 70 one entry; Prize Wheel via QR as in the other games |
| MCP source | MCP Station only |
| Catalog or any URL | MCP Station catalog slugs only |
| Write tools | Safe: MCP Station writes are simulated |

## Open questions

1. **Carrying N.** Decided: option A, built.
2. **Entries vs prize types.** Are the score tiers grand-prize entries (this plan) or different
   Grand Prize types?
2. **Campaign cap.** Decided: `andy_maxentriespercontact` is currently **3**, so 90-100 earns 3
   entries, 70-89 earns 2, under 70 earns 1. The game reads the cap at submit time, so changing
   it in Dataverse changes the tiers with no code change.
3. **Latency.** Is a 20-60 s build screen acceptable (the cave scene is designed for it), or
   pre-generate specs for each MCP Station server before the event?
4. **Judge reuse.** Re-express the 13 hand-built cases as GameSpecs (single judge) or keep two
   judges side by side?
5. **Hand-built mode prizes.** Decided and built 2026-10-10: the hand-built mode uses the same
   score tiers (score scaled to 0-100, every submit earns a claim).
