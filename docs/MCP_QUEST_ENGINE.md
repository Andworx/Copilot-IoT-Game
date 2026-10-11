# MCP Quest: solution and engine integration

How MCP Quest is packaged as a Dataverse solution and how a passing play becomes a prize
through the shared engine. Game design and status live in
[requirements/MCP_QUEST_PLAN.md](../requirements/MCP_QUEST_PLAN.md); the player page is
documented in [power pages/mcpquest/README.md](../power%20pages/mcpquest/README.md).

## 1. Ownership

MCP Quest follows the same split as Plinko: the shared engine owns everything shared, and the
game owns only its own detail.

| Solution | Owns |
|---|---|
| `andy_PrizeEngine` (existing) | Prize Claim, Contest Campaign, Contest Source, Source Cap, Grand Prize Entry, Prize Types and Prizes |
| `CopilotIoTGame` (existing) | IoT Game Win, Device Profile, telemetry, Game Box State |
| `Plinko` (existing) | Plinko Station, Plinko Play |
| **`MCPQuest` (new)** | **MCP Quest Play**, and later its operations app |

Rules, as for Plinko:

- Publisher `Andworx`, prefix `andy`. Make **MCPQuest** the preferred solution *before*
  creating the table, so it does not land in the default publisher.
- `MCPQuest` depends on `andy_PrizeEngine`. It never adds columns to Prize Claim, Grand Prize
  Entry or any IoT table, and never writes IoT Game Win rows.
- Add a `mcpquest` row to Contest Source and a Source Cap per campaign, so entries are capped
  and traced separately from IoT and Plinko.
- Export and unpack into `solutions/MCPQuest/`, then pack and import like the others.

## 2. Data model

One new table, `andy_mcpquestplay`. The spec is
[tables/andy_mcpquestplay/definition.json](../tables/andy_mcpquestplay/definition.json) and the
two lookups are in [tables/relationships/definitions.json](../tables/relationships/definitions.json).

There is deliberately **no mission table and no station table**: missions are hand-built in
the repo, and a station is just a slug on the play. Add a station table only if staff need to
enable or disable devices.

```
andy_contestcampaign ◄── andy_Campaign ──┐
                                          │
andy_prizeclaim ◄── andy_PrizeClaim ── andy_mcpquestplay
   (shared)                               (this solution)
```

A play row has three jobs:

| Job | Columns |
|---|---|
| **Session store** | `andy_seed`, `andy_snaphotversion`, `andy_statejson`, `andy_startedtime`, `andy_issubmitted` |
| **Leaderboard** | `andy_nickname`, `andy_mission`, `andy_score`, `andy_durationseconds`, `andy_issubmitted`, `andy_campaign` |
| **Audit / support** | `andy_resultjson`, `andy_entriesawarded`, `andy_toolcalls`, `andy_hintsused`, `andy_testruns`, `andy_station`, `andy_ispassed` |

The row holds no contact data. A player's email only ever reaches the shared Contact through
the existing `claim-prize` flow.

## 3. Request flow

```
Player page ──start──► Function App ──creates play row (seed, empty state)──► Dataverse
     │                      │  signs a session token (play id + expiry)
     │◄── SessionInfo ──────┘  cases rebuilt from seed + repo snapshot; no answer keys sent
     │
     ├─ choose / test / call / hint ─► verify token ─► load row ─► judge ─► save state (ETag)
     │
     └─ submit ─► grade ─► mark row submitted (atomic, ETag)
                            │
                            ├─ score out of 100 + campaign cap ─► entries (90+ max, 70-89 one fewer, else 1)
                            ├─ mint claim token (every submit) ─► Prize Claim (source mcpquest) ─► link to play
                            └─ return score, entries, per-case criteria, claim token

Phone ──?token=…──► Prize Wheel ──► claim-prize (existing, unchanged)
                                        └─► Contact, prize, Grand Prize Entry, email
```

Everything after the claim token is the existing engine. `claim-prize` reads the claim's Contest Source to pick the Source Cap and now also reads
`andy_entriesawarded` from the play row (see "Entries" below).

## 4. Server design

| Concern | Decision |
|---|---|
| State | Stateless Functions. The play row is the session. |
| Cases | Rebuilt on every request from `seed` + the repo snapshot, so nothing is stored but progress. Same seed, same play. |
| Data | A repo snapshot (`src/mcpquest/snapshots/`), not the live MCP server. Deterministic, works offline, no third-party dependency during an event. |
| Tool calls | Reads replay the snapshot. Writes return the same "simulated" success the public server gives. |
| Writes by the player | Only read tools are callable directly. Write tools run only inside a test run of something the player built. |
| Concurrency | `If-Match` on the row's ETag. One automatic retry on a lost race. |
| Idempotency | A repeat `submit` returns the stored result and never mints a second claim. A failed claim is completed by submitting again. |
| Time | Server clock only. Actions after the mode's limit (plus 30 s grace) are refused; `submit` still grades, with the duration capped. |
| Limits | 40 direct tool calls and 6 test runs per case per play, enforced in the stored state. |
| Token | HMAC-signed play id and expiry, secret `MCPQUEST_TOKEN_SECRET`. Rotating it ends plays in progress. |
| Input | Nickname `^[A-Za-z0-9 _.-]{3,12}$`, station slug `^[a-z0-9][a-z0-9_-]{0,39}$`, designs capped at 20 KB and parsed defensively. |

### Where the code lives

| Path | Role |
|---|---|
| `azure/functions/game/src/mcpquest/` | The judge and shared contract: types, designs, cases, runners, scoring, snapshot world, play service |
| `azure/functions/game/src/lib/mcpquestStore.ts` | Dataverse play store and the claim issuer |
| `azure/functions/game/src/lib/mcpquestToken.ts` | Session token |
| `azure/functions/game/src/functions/mcpquest.ts` | The seven HTTP routes |
| `azure/functions/game/src/lib/dataverse.ts` | `createSourcedPrizeClaim`, `getActiveContestCampaignId` |
| `azure/functions/game/test/mcpquest.test.ts` | Judge, token and service tests (18) |

The Code Site imports the shared contract and, in non-live builds only, the judge from the
Function App through the `@mcpquest` alias, so there is one source of truth.

### Entries

Every submitted play earns a Prize Claim. The score decides the grand-prize entries:
`percent = round(total / most the play could earn * 100)`, then `entriesForScore(percent, cap)`
(`src/mcpquest/entryTier.ts`): 90-100 the cap, 70-89 one fewer, under 70 one. The cap is the
active campaign's `andy_maxentriespercontact` (1 if unset or unreadable). The result is stored
as `andy_entriesawarded` on the play; `claim-prize` creates that many entries, never exceeding
the cap across all of the contact's plays. `passed` is still recorded for display but no longer
gates the prize. A blank submit earns one entry.

## 5. Routes

All anonymous, on the **public** API surface. The session token is the only identity.

| Route | Method | Body / query | Returns |
|---|---|---|---|
| `/api/mcpquest/start` | POST | `nickname, station, mode` | `SessionInfo` (no keys) |
| `/api/mcpquest/call` | POST | `sessionToken, tool, arguments` | `CallResult` |
| `/api/mcpquest/hint` | POST | `sessionToken, objectiveId` | `{ hint }` |
| `/api/mcpquest/choose` | POST | `sessionToken, objectiveId, productId` | `ChooseResult` |
| `/api/mcpquest/test` | POST | `sessionToken, objectiveId, design` | `TestReport` |
| `/api/mcpquest/submit` | POST | `sessionToken, answers` | `SubmitResult` (claim token and entries for every submit) |
| `/api/mcpquest/leaderboard` | GET | `?mode=` (a hand-built mission or `spec:<specId>`) | `{ entries }` |
| `/api/mcpquest/servers` | GET | none | `{ servers: [{ slug, name, description, toolCount }] }`, the MCP Station catalog |
| `/api/mcpquest/generate` | POST | `server, jobId` | `{ specId, title, cached }` after about 25 s; 429 with `Retry-After` when rate limited, 409 `{ jobId }` when that server is already being built |
| `/api/mcpquest/generate/status` | GET | `?job=<jobId>` | `{ stage, specId?, title?, error? }`, stages `reading, designing, repairing, checking, proving, saving, done, failed` |

`start` also accepts `spec` (a spec id from `generate`) instead of `mode`. Generated games are described in
[requirements/MCP_QUEST_AGENT_PLAN.md](../requirements/MCP_QUEST_AGENT_PLAN.md).

Errors are `{ error, code }` with 400 `bad_request`, 401 `unauthorized`, 404 `not_found`,
409 `time_up` / `already_submitted`, and 503 `claim_unavailable` (the prize could not be set up; submit again).

## 6. Configuration

| Setting | Where | Purpose |
|---|---|---|
| `MCPQUEST_TOKEN_SECRET` | Public Function App | 32+ characters. Signs session tokens. **Required.** |
| `MCPQUEST_PLAYS_SET` | Public Function App | Entity set name of the play table. Default `andy_mcpquestplaies` (as exported). |
| `MCPQUEST_PRIZE_CLAIM_NAV` | Public Function App | Navigation property of the Prize Claim lookup. Default `andy_PrizeClaim` (case matters). |
| `MCPQUEST_CAMPAIGN_NAV` | Public Function App | Navigation property of the Campaign lookup. Default `andy_Campaign` (case matters). |
| `MCPQUEST_SPEC_BLOB_URL` | Public Function App | `https://<account>.blob.core.windows.net/<container>`. Holds generated specs, job status, locks and rate-limit counters. Needed for generated games. |
| `FOUNDRY_ENDPOINT` | Public Function App | `https://<resource>.openai.azure.com/openai/v1` (or a project endpoint). |
| `FOUNDRY_MODEL` | Public Function App | Deployment name. Or `FOUNDRY_AGENT_NAME` with a project endpoint. |
| `MCPQUEST_GENERATE_PER_CLIENT_HOUR` | Public Function App | Builds one client may start per hour. Default 10. Visitors behind one shared address share this. |
| `MCPQUEST_GENERATE_GLOBAL_HOUR` | Public Function App | Builds all clients together may start per hour. Default 40. |
| `VITE_MCPQUEST_API=live` | Code Site build | Ships no judge code and uses these routes. |
| `VITE_API_BASE_URL` | Code Site build | Public Function App base URL. |
| `VITE_PRIZE_WHEEL_URL` | Code Site build | Where the claim QR points. |

The Function App's CORS list must include the MCP Quest site's origin (as for Plinko and the
kiosk).

## 7. Owner runbook

The `MCPQuest` solution and the play table exist in Development and were exported to
`solutions/MCPQuest/`. The Function App's names were checked against that export, and a
contract test (`test/mcpquest.test.ts`) keeps them in step. The two JSON columns are
Multiline text (max 20000), which a play needs. What remains:

1. **Give the Function App's Dataverse user access.** The role behind `DATAVERSE_CLIENT_ID`
   needs Create, Read, Write on MCP Quest Play, and Append / Append To on Prize Claim and
   Contest Campaign (for the lookups). The table is organisation-owned, so these are
   organisation-level privileges.
2. **Add data.**
   - Contest Source row: name `MCP Quest`, source key `mcpquest`, active.
   - Source Cap row per campaign, for source `MCP Quest`.
3. **Set app settings** on the public Function App: `MCPQUEST_TOKEN_SECRET` (a random
   48-character value). Add the Code Site origin to CORS. No other setting is needed: the
   entity set and navigation names default to the exported values.
4. **Deploy order.** `MCPQuest` depends on `andy_PrizeEngine` (Contest Campaign, Prize Claim and
   their icons), so PrizeEngine must be in the target environment first. Then the Function
   App (public surface), then the Code Site built with `VITE_MCPQUEST_API=live`.
5. **Verify.** See the checklist below.

### Optional clean-up while the table is empty

The export has two cosmetic typos you can fix while the table is empty. Neither affects
behaviour:

| Deployed | Better | If you change it |
|---|---|---|
| `andy_snaphotversion` / "Snaphot Version" | `andy_snapshotversion` | Recreate the column, then change `snapshotVersion` in `PLAY_COLUMNS` (`lib/mcpquestStore.ts`) |
| "Nick Name" | "Nickname" | Display name only; edit in place |

### Verification checklist

- [ ] `GET /api/mcpquest/leaderboard` returns `{ "entries": [] }`.
- [ ] A play started from the site creates a row with `andy_issubmitted = false`.
- [ ] Choosing the wrong tool lowers that case's tool points.
- [ ] A flow test run reports each step and the simulated MCP write.
- [ ] A submitted play (pass or not) creates a Prize Claim with source `MCP Quest`, links it
      (`andy_isclaimissued = true`) and sets `andy_entriesawarded` (3 / 2 / 1 with a cap of 3).
- [ ] The claim QR opens the Prize Wheel and `claim-prize` succeeds once, then refuses a repeat.
- [ ] The claimed player gets `andy_entriesawarded` Grand Prize Entries (never more than the cap in total).
- [ ] Submitting twice returns the same result and creates one claim.
- [ ] The built Code Site bundle contains no case titles (`grep "Hand-sorted queue" dist/assets/*.js`).

## 8. Refreshing the snapshot

```
cd azure/functions/game
node scripts/capture-mcp-snapshot.mjs https://www.mcpstation.io/mcp/it-ticketing \
  src/mcpquest/snapshots/it-ticketing.json
```

It calls read tools only. A new snapshot changes the data cases are built from, so plays in
progress when it deploys are built from the new data: refresh between events, not during one.

## 9. Open items

- **Rate limiting.** The routes are anonymous. Per-play caps bound abuse once a play exists, but
  starting plays is unbounded. Put a per-IP limit in front (API Management or the front door).
- **Retention.** Plays carry a nickname and a score. Align retention with the consent
  maintenance schedule, or delete plays with the campaign.
- **Operations app.** A model-driven app with views (recent plays, passes without a claim,
  plays by station), as for Plinko.
- **Deploy wiring.** `POWER_MCPQUEST_WEBSITE_ID`, build and deploy steps, and a
  `PAC_COMMANDS.md` section when this moves to `main`.
