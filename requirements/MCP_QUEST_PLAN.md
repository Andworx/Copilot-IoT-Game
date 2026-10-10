# MCP Quest — Plan

Working name for a new single-player game that runs on its own device, separate from the
Game Box kiosk and from Plinko, and reuses the shared prize engine. Rename freely; the
contest source key `mcpquest` is the only identifier that needs to be settled before
Dataverse work starts.

**Status:** design only. Nothing is built. Track items in [PLAN.md](PLAN.md) under
"MCP Quest".

## Decisions already made

| Question | Decision |
|---|---|
| Who calls the tools? | The **player**, not an agent. In Fix it, they reach MCP through what they build: flow actions and report data, exercised by test runs. The Investigate warm-up keeps a raw tool picker and response viewer. |
| Where does it run? | Its **own dedicated device** (tablet or small PC in a kiosk browser). It does not use `andy_gameboxstate`, `set-mode`, or the Game Box SignalR hub. |
| Play model | **Single play per session**, scored, with a **high-score** leaderboard. |
| Prize engine | Reused as is: `andy_contestsource` / Source Cap, `create-win`, `claim-prize`, Contact upsert, Grand Prize Entry, check-in. |
| Authoring | Each game mode is **hand-built in the repo** (`modes.ts`, `cases.ts`, the designers) and ships with the Code Site. No generated or declarative scenario packs, and no agent that writes modes. Decided 2026-10-09. A new MCP server means a new mode written here. |

## Concept

Each game *mode* is one mock MCP server (generated in MCP Station or equivalent), a pool
of objectives, and a server-side rubric. The player is given a scenario ("the nightly
incident queue is on fire") and must use the server's tools to find the answers. The
score rewards correct answers, speed, and efficient tool use.

New modes should be a prompt, a dataset and a rubric, not a code change.

## Fix-it mode: building in the Power Platform

The first version asked questions about the data, which was only a lookup quiz. The mode now
makes the player *build* something, which is what the Power Platform is for.

- **Choose, build, test.** For each business problem the player chooses the right product,
  builds the fix in a small designer, and tests it against the live service desk.
- **MCP is the connector.** The IT Ticketing server's tools are the flow's actions and the
  report's data source. The player never sees a raw tool form in this mission: the server is
  reached through the designers and their test runs, so it reads as the connector it is.
- **Outcome-based checking.** Flows are executed against sample incidents and judged on what
  they did (a P1 asked for approval, a routine ticket did not, the update came after the
  approval), not on how the design looks. Acceptance criteria are shown up front in plain
  language without giving away the answer.
- **One designer per product.** Flow (Power Automate), report (Power BI), canvas app
  (Power Apps), site studio (Power Pages), table and security-role editors (Dataverse) and
  agent editor (Copilot Studio). Thirteen cases cover all six products, and each play draws
  three from different products.
- **Run, or judge the design.** Flows, apps, sites and agents are executed against scenarios
  drawn from the live data and judged on what happened. Reports, tables and security roles
  are configuration, so they are judged on the design itself.
- **Server side later.** `choose`, `test` and `submit` are API methods, so the case keys,
  scenarios and criteria move behind the Function App with the rest of the judge. A design
  is a JSON string, so the contract does not change.
- **Writes are simulated.** The public MCP server accepts write calls and discards them, so
  a test run produces a real tool call and a truthful "simulated" response, not a state
  change. A repo-owned snapshot would let state actually change between steps.

## Constraints that shape the design

- MCP Station writes are "simulated, not persisted", so scoring **cannot** depend on
  state changes. Objectives must be **read-and-reason questions with deterministic
  answers** over a fixed dataset.
- MCP Station is mock-data only. Never connect it to contacts, claims, or prizes.
- Public mock servers have no authentication. The endpoint URL is not a secret and
  must never be shown to the player page directly; all calls go through our Function.
- The service is a third-party runtime dependency. Treat it as an **authoring tool** and
  snapshot each mode (dataset, tool schemas, rubric) into the repo so a trivial
  self-hosted mock MCP can replace it.
- Still unconfirmed after the spike (all need an MCP Station account): Pro limits and
  pricing, whether a generated server can be made private, and the authoring-side data
  export. See "Spike results".

## Spike results (2026-10-09, unauthenticated, read-only against public servers)

Probed the public catalog and the `it-ticketing` server from the command line. No account
was created and nothing was written to MCP Station.

| Question | Finding |
|---|---|
| Catalog | `GET https://www.mcpstation.io/api/catalog` returns JSON for 15 public servers: slug, description, endpoint, `call_count`, and each tool's name, type, summary fields and `readOnlyHint`. |
| Endpoint | `POST https://www.mcpstation.io/mcp/<slug>`, JSON-RPC 2.0 over plain HTTP. Responses are `application/json`, not SSE. |
| Session | Stateless in practice: `tools/call` worked without sending the `mcp-session-id` that `initialize` returns. |
| Protocol | `initialize` reports protocol `2025-03-26`, capabilities `{tools:{}}` only (no resources or prompts). |
| Tools | `tools/list` returns standard `inputSchema`s plus annotations. `it-ticketing` has 11 tools: 6 read-only, 5 create/update. |
| Result shape | `result.content[0].text` is a JSON **string** that must be parsed. Unknown tool returns JSON-RPC error `-32601`; an unknown record returns `{"error":"Record not found"}` inside a normal result. |
| Determinism | Two identical `list_incidents` calls returned byte-identical output. Reads are stable, so fixed answer keys are viable. |
| Writes | `update_incident` returns success with `_mock: true` and "No data was actually modified"; a follow-up `get_incident` still showed the old state. Confirms writes are no-ops. |
| Rate limit | `ratelimit-policy: 1000;w=60` (1000 requests per minute). Not confirmed whether it is per IP; a Function proxy would share one egress IP, so assume one shared budget across all stations. |
| CORS | `access-control-allow-origin: *`, so a browser could call it directly. We still proxy it (see Architecture). |
| Data quality dial | Read tools take `data_quality` = `clean_only` (default) / `dirty_only` / `all`. Usable as a **difficulty setting** per mode. |
| Auth | None for public servers. |

### What this changes in the design

- **Expose read-only tools only** in mode 1. Write tools succeed but change nothing, which
  would confuse a player and cannot be graded. Filter on `annotations.readOnlyHint`.
- **Self-hosting is cheap.** The protocol surface is `initialize`, `tools/list` and
  `tools/call` returning a JSON text blob. A snapshot of one server's tool list and
  records can be replayed from the Function App with a small handler, so MCP Station can
  stay an authoring and prototyping tool.
- **Answer keys can be derived by script** from the snapshotted records rather than
  maintained by hand, which keeps rubrics honest when data changes.
- **Rate budget is shared.** One event with several stations proxied through one egress
  is fine at 1000/min, but add per-session call caps (already planned) and consider
  caching identical read calls in the Function.
- **Call counts are public** in the catalog (`call_count`), so avoid using a public
  server that you would not want to see traffic spikes on; prefer your own snapshot.
- **Dependency risk is real:** servers are community-run on a third-party host with no
  published SLA. For an event, run from the snapshot.

## Architecture

Full detail, routes, configuration and the owner runbook: [docs/MCP_QUEST_ENGINE.md](../docs/MCP_QUEST_ENGINE.md).

```
Station device ──► player page (Code Site, ?station=<slug>)
                       │  designers, test runs, results
                       ▼
              Game Function App (public surface): /api/mcpquest/*
                       │  start · call · hint · choose · test · submit · leaderboard
                       │
        ┌──────────────┼───────────────────────────┐
        ▼              ▼                           ▼
  judge (same code   repo snapshot of        Dataverse: andy_mcpquestplay
  as the browser)    the MCP server          (session store + leaderboard)
                                                   │ on pass
                                                   ▼
                              Prize Claim, source `mcpquest` (shared engine)
                                                   ▼
                       existing claim-prize → Contact → Grand Prize Entry → email
```

### Why the Function runs the judge

- The answer keys and case logic never reach the browser in a live build.
- `create-win` trusts its caller; only the judge may mint a win for this source.
- State lives in the play row, so the Functions stay stateless and a play survives a restart.
- The snapshot makes every play reproducible from its seed and independent of a third party.

## Session and anti-cheat rules

- `start` returns an HMAC-signed session token (mode, objective set, issued-at, expiry).
  Only one `submit` is accepted per session; replays return the original result.
- Each session draws its objectives from a **question pool** per mode, so repeat
  players cannot memorise a single answer sheet.
- Rate limit `call` per session and per station; cap total calls and session length.
- Server-clock timing only. The client timer is cosmetic.
- No hint text in tool descriptions or sample records that gives away an answer.

## Scoring

Computed server-side from the transcript. Starting proposal, tune with playtests:

| Component | Rule |
|---|---|
| Correct objective | fixed points each; partial credit only where the rubric defines it |
| Time bonus | linear decay from a per-mode par time to zero; never negative |
| Efficiency | small penalty per tool call beyond the mode's par call count |
| Hints | fixed deduction per hint used |
| Pass threshold | minimum score and all required objectives correct to mint a win |

High score is the displayed score, tie-broken by earlier completion time.

## Leaderboard and privacy

- Leaderboard shows a **nickname only** (short, filtered) and score. Contact details are
  collected only by the existing claim flow, after a pass.
- Play rows carry no email. A player who shares contact info on the claim page is linked
  through the existing `andy_prizeclaim` → Contact path, not stored on the play row.
- Align leaderboard retention with the existing consent-maintenance schedule.
- Scope boards per campaign and mode, with a reset that does not delete prize claims.

## Dataverse additions

| Item | Purpose |
|---|---|
| `andy_contestsource` row `mcpquest` + Source Cap per campaign | Reuse; data only, no schema change |
| `andy_mcpquestplay` | One row per play: session store, leaderboard source, audit record, link to the Prize Claim. Spec in `tables/andy_mcpquestplay/`. |

There is no mission table: missions are hand-built in the repo (see Decisions). Rubrics and
answer keys live in source control and never in a table the player-facing app can read.

## Build order

1. **Spike** ✅ MCP Station behaviour confirmed; see "Spike results".
2. **Player page** ✅ Seven designers, 13 cases, uploaded to Development (not activated).
3. **Server-side judge and routes** ✅ Built and tested in the Function App (18 tests).
   Not deployed.
4. **Dataverse solution** ⬜ Table spec and relationships written; the owner creates the
   `MCPQuest` solution and table in the maker portal (runbook in the engine doc).
5. **Engine data** ⬜ Contest Source `mcpquest` and a Source Cap per campaign.
6. **Deploy and verify** ⬜ App settings, CORS, deploy-apps wiring, then the verification
   checklist in the engine doc.
7. **Playtest and tune** ⬜ On the real station device.
8. **Operations app** ⬜ Views for plays and passes without a claim.

## Open items

- Final game name and station device choice (tablet, mini PC, or Pi with kiosk browser).
- Leaderboard display: on the player device only, or also a spectator screen.
- Whether a pass should map to one instant prize tier or to score-based tiers.
- Nickname moderation approach for an event audience.
- Whether to host the mock MCP ourselves from day one (spike outcome).
