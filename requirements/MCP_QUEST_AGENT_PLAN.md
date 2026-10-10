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
5. **Prizes are earned only on validated or approved specs.**

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

Verify before building the route: Foundry and the chosen model are available in the cloud
this deployment runs in (commercial, GCC or GCC High).

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

## Security and abuse

| Risk | Control |
|---|---|
| Arbitrary MCP URL (SSRF, data exfiltration) | Allowlisted catalog only; the page sends a server id, never a URL |
| Prompt injection via tool descriptions or data | Agent is read-only and has no other tools; output is validated data, not instructions; judge never takes scoring input from the agent at run time |
| Rigged or trivial game | Validation loop; unvalidated specs are playable but not prize-eligible; optional operator approval flag |
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
| 4. Console UI | Catalog picker, cave build screen (see above) with staged progress, designers driven by spec | Walk-up flow works at 800×480 |
| 5. Hardening | Rate limit, approval flag, retention, deploy wiring, playtest | Docs updated; plan items to Verify, then Done after live checks |

## Open questions

1. **Cloud.** Which cloud does the deployment run in? Foundry/model availability differs in GCC
   and GCC High.
2. **Prize eligibility.** Validated-only, or operator-approved-only?
3. **Latency.** Is a 20–60 s build screen acceptable (the cave scene is designed for it), or pre-generate specs per catalog server?
4. **Selection.** Fixed catalog (this plan assumes it) or any URL (needs much more hardening)?
5. **Write tools.** Specs may reference write tools in flow predicates (they are simulated).
   Confirm that is acceptable for servers whose writes are not simulated, or restrict
   spec games to servers we proxy from a snapshot.
6. **Judge reuse.** Re-express the 13 hand-built cases as GameSpecs (single judge) or keep two
   judges side by side?
