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

**Grand-prize entries by score** (`src/mcpquest/entryTier.ts`, tested):

| Score | Tier | Grand-prize entries |
|---|---|---|
| 90-100 | top | the most the campaign allows |
| 70-89 | mid | one fewer than the most |
| 0-69 | base | one |

"The most the campaign allows" is the campaign's `andy_maxentriespercontact`. With a cap of 1
every tier is 1; with a cap of 2 the tiers are 2 / 1 / 1. A contact's existing entries count
against the cap, so a repeat player can be capped below their tier.

**What has to change in the engine** (a shared-engine change, not MCP Quest-only):

1. Today one claim creates exactly one Grand Prize Entry (`createGrandPrizeEntryForClaim`).
   It must create N entries for a claim, still stopping at the per-contact cap, and still one
   check-in code per contact.
2. The claim must carry N. Add an entry-count column on Prize Claim (the engine doc currently
   says MCP Quest never adds columns to Prize Claim; that rule needs an owner exception, or the
   count lives on the play row and `claim-prize` reads it through the play).
3. The campaign must have a cap set. If `andy_maxentriespercontact` is empty there is no
   "most allowed"; require it for the active campaign (or add a separate per-game maximum).
4. The score used is the server-side judged score, never anything the page sends.
5. The existing pass-only claim minting and `passScore` do not apply to generated games.

Interpretation to confirm: the tiers are grand-prize **entries**, not different prize types.
If you meant different Grand Prize types per tier, items 1-3 change to "claim carries a tier".

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
| 1. Spike | `generate` route calling Foundry for `it-ticketing` and one differently shaped catalog server; measure latency, cost, and how often the first output validates | ≥ 80% of first attempts validate (or after one repair), and the validation loop catches deliberately broken specs |
| 2. Judge | GameSpec interpreter: build outcomes from the call log, evaluate predicates; generic tool-call-log runners replace the incident-specific `Outcome` for spec games | The hand-built cases re-expressed as GameSpecs score identically to today's judge |
| 3. Storage and start | Spec blob store, `specId` on the play row, `start { specId }`, cache by `toolsHash` | A play survives a Function restart; a repeat pick is a cache hit |
| 3b. Engine tiers | `entryTier.ts` ✅ (tested). Multi-entry claims in `claim-prize`, entry count on the claim, cap required on the campaign, 100-point scoring in the judge | A 95 play on a cap-5 campaign yields 5 entries and one wheel spin; a 75 yields 4; a 40 yields 1 |
| 4. Console UI | Catalog picker, cave build screen (see above) with staged progress, designers driven by spec | Walk-up flow works at 800×480 |
| 5. Hardening | Rate limit, retention, deploy wiring, playtest | Docs updated; plan items to Verify, then Done after live checks |

## Decided

| Question | Answer |
|---|---|
| Cloud | Commercial |
| Prizes | From the game engine by score out of 100: 90-100 the most entries allowed, 70-89 one fewer, under 70 one entry; Prize Wheel via QR as in the other games |
| MCP source | MCP Station only |
| Catalog or any URL | MCP Station catalog slugs only |
| Write tools | Safe: MCP Station writes are simulated |

## Open questions

1. **Entries vs prize types.** Are the score tiers grand-prize entries (this plan) or different
   Grand Prize types?
2. **Campaign cap.** What is `andy_maxentriespercontact` for the event? It defines "the most
   allowed", and the tiers collapse at 1 or 2.
3. **Latency.** Is a 20-60 s build screen acceptable (the cave scene is designed for it), or
   pre-generate specs for each MCP Station server before the event?
4. **Judge reuse.** Re-express the 13 hand-built cases as GameSpecs (single judge) or keep two
   judges side by side?
5. **Hand-built mode prizes.** Keep the existing pass-gated mint for the hand-built mode, or
   move it to the same score tiers?
