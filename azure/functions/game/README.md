# Copilot IoT Game â€” Azure Functions

Backend for mode selection: the Power App control device calls `POST /api/set-mode`, which
writes `andy_gameboxstate` and broadcasts the change over SignalR; the kiosk SPA calls
`GET /api/kiosk-state` once on load and `POST /api/negotiate` to open its SignalR
connection. Full design: `power pages/docs/GAME_MODE_PLAN.md` Â§4a.

This is a fresh Node.js/TypeScript Function App (v4 programming model) â€” `GAME_MODE_PLAN.md`
describes an "existing Function App" from a sibling project (`copilot-iot-service`) that
isn't actually built yet, so this lives here instead, in this repo.

## API separation

During parallel subscription migration, destination apps use `MIGRATION_STAGING=true`.
HTTP route/auth boundaries remain unchanged, but neither `iot-telemetry` nor
`consent-maintenance` is registered. This prevents a second Event Hub reader and duplicate
email/retention work while the source apps stay active. Missing/false retains the normal
behavior; any other value fails closed. Azure's per-function Disabled settings cannot be
used for these hyphenated function names on Linux. Enable background registrations only
as part of a reviewed consumer/timer cutover, not during staging.

The same artifact runs with `API_SURFACE=public` on the existing app and `API_SURFACE=staff` on the new app. Staff-only routes are not registered on the public app. Every staff request, including shared read/test operations, passes Entra validation before its handler runs. Only the public app registers the telemetry trigger. See [manual setup and rollout](../../../docs/STAFF_API_SETUP.md). This source change is not yet a live cutover.

## Endpoints

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/negotiate` | POST | anonymous | SignalR connection bootstrap for the kiosk SPA |
| `/api/kiosk-state` | GET | anonymous | Current active device, for a freshly-loaded page |
| `/api/set-mode` | POST | staff Entra | Sets the active device, broadcasts `deviceChanged` |
| `/api/directline-token` | GET | anonymous | Exchanges the server-side `DIRECTLINE_SECRET` for a short-lived Direct Line token (503 until the secret is set) |
| `/api/claim-prize` | POST | anonymous | Validates a QR claim token, claims the instant prize, creates/reuses Contact, creates the Grand Prize Entry, and generates/reuses the campaign check-in code when contact info is shared |
| `/api/preferences` | GET, POST | anonymous (signed token) | Preference center (#133): GET reads the contact's state; POST opts in (double opt-in), confirms, opts out, requests removal or a data copy. Public app only. `claim-prize` also accepts `marketingOptIn` to start double opt-in. |
| `/api/grand-prize/check-in` | POST | staff Entra | Validates an emailed check-in code, marks eligible PrizeEngine Grand Prize Entry rows checked in, and returns a staff-facing status |
| `/api/grand-prize/drawing-slices` | GET | staff Entra | Returns the active campaign, registered/checked-in counts, and weighted checked-in wheel slices for the staff display |
| `/api/grand-prize/drawing-state` | GET | staff Entra | Returns the latest committed drawing state/result so a presentation screen can recover after reload or a missed SignalR event |
| `/api/grand-prize/draw` | POST | staff Entra | Atomically selects one checked-in winner, writes the PrizeEngine result/audit record, and returns the committed result to staff |
| `/api/mcpquest/start` | POST | anonymous | MCP Quest: creates a play and returns the session (no answer keys). See `docs/MCP_QUEST_ENGINE.md` |
| `/api/mcpquest/call` | POST | anonymous (session token) | MCP Quest: one direct tool call, counted against the play |
| `/api/mcpquest/hint` | POST | anonymous (session token) | MCP Quest: returns a hint and records the penalty |
| `/api/mcpquest/choose` | POST | anonymous (session token) | MCP Quest: checks a Power Platform product choice |
| `/api/mcpquest/test` | POST | anonymous (session token) | MCP Quest: runs a design against the case's scenarios |
| `/api/mcpquest/submit` | POST | anonymous (session token) | MCP Quest: grades the play, records it, and mints a Prize Claim for source `mcpquest` when it passed |
| `/api/mcpquest/leaderboard` | GET | anonymous | MCP Quest: top scores for a mission, scoped to the active campaign |
| `iot-telemetry` | Event Hub trigger | â€” | Panel Pi telemetry â†’ SignalR `SendTelemetryUpdate` / `TriggerAgentHelp` (gamebox hub) + an `andy_iottelemetryevent` row |

`/api/claim-prize` also performs the Contact and grand-prize entry flow for epic #121:
when `sharedInfo` is true and `contestantEmail` is supplied, it normalizes the email,
finds or creates a standard Dataverse `contact`, links the `andy_prizeclaim` row to that
Contact, and creates an `andy_grandprizeentry` row linked to the active Contest Campaign,
Contact, Source Cap, and Prize Claim when campaign configuration exists. Existing Contact
consent/preference fields are left untouched. Legacy `andy_gamewin` rows are no longer
used for new prize claims.

Deploy order matters: ship the Dataverse solution push that adds the Prize Claim,
IoT Game Win, and Grand Prize Entry relationships before this Function version is deployed,
because claims with contact info bind `andy_Contact@odata.bind` on Prize Claim and create
`andy_grandprizeentries` rows linked back through `andy_PrizeClaim@odata.bind`.

## Grand prize check-in code email pipeline

Issue #134 starts at the public player claim path, not as a separate staff action. After a
player wins, scans the QR code, and shares contact info, `POST /api/claim-prize` should:

1. Create or reuse the Contact by normalized email.
2. Resolve the active Contest Campaign from the Prize Claim.
3. Reuse any existing check-in code for that Contact/campaign, or generate a unique code
  using the campaign's `andy_checkincodeprefix`.
4. Create the Grand Prize Entry with `andy_checkincode` and `andy_checkinstatus = Not Checked In`.
5. Create and send a Dataverse Email activity regarding the Grand Prize Entry. The Email
   activity uses the `regardingobjectid_andy_grandprizeentry@odata.bind` navigation property,
   so the sent message appears on the Grand Prize Entry timeline.
6. Create a reminder Email activity regarding the same Grand Prize Entry, using campaign
  `andy_drawingtime` minus campaign `andy_reminder_lead_minutes` as the delayed send time.
7. Return the Grand Prize Entry result to the claim page/test UI, including `checkInCode`
  for test preview only.

Campaign columns used by activity-based email delivery:

| Campaign column | Purpose |
|---|---|
| `andy_check_in_location` | Booth/check-in location shown in the code and reminder emails. Defaults to `the booth` when blank. |
| `andy_reminder_lead_minutes` | Minutes before `andy_drawingtime` to schedule the reminder Email activity. Defaults to `30` when blank. |
| `andy_preference_url` | Optional preference/removal URL included in the first code email. |

Required app setting for activity-based email delivery:

| Setting | Purpose |
|---|---|
| `GRAND_PRIZE_EMAIL_FROM_SYSTEM_USER_ID` | Dataverse systemuser GUID for the sender mailbox used in Email activity parties. If omitted, the claim still succeeds and returns `emailActivity.status = not_configured`. |
| `MCPQUEST_TOKEN_SECRET` | Random secret (32+ characters) that signs MCP Quest session tokens. Required on the public app; rotating it ends plays in progress. Optional overrides `MCPQUEST_PLAYS_SET`, `MCPQUEST_PRIZE_CLAIM_NAV` and `MCPQUEST_CAMPAIGN_NAV` are described in `docs/MCP_QUEST_ENGINE.md`. |
| `PREFERENCE_TOKEN_SECRET` | Random secret (32+ characters) that signs preference-center links. Required on both the public and staff apps; rotating it revokes every outstanding link. |
| `MARKETING_SENDER_ADDRESS` | Physical sender address printed on marketing content. If unset, the follow-up email is always the neutral thank-you. |
| `FOLLOW_UP_MARKETING_HTML` | HTML block added to the follow-up email for contacts with a confirmed marketing opt-in. If unset, the follow-up is always the neutral thank-you. |

The imported PrizeEngine solution must keep activities enabled for `andy_grandprizeentry`.
The fresh 2026-09-27 unpack confirms `HasRelatedActivities=True`, and live Dataverse
schema confirms Email `regardingobjectid` supports `andy_grandprizeentry`.

The Game Box Control Code App does not expose a normal operator command for generating or
sending codes. Its Testing workspace can show a sample of the email after the simulated
QR/info claim path creates a Grand Prize Entry.

## Grand prize check-in pipeline

Issue #131 keeps final drawing check-in inside the staff-only Game Box Control Code App.
The client submits one normalized code to `POST /api/grand-prize/check-in` and never writes
PrizeEngine Dataverse rows directly. The Function should:

1. Normalize and validate the submitted check-in code.
2. Resolve the active campaign and matching Grand Prize Entry/Contact records in
  PrizeEngine Dataverse.
3. Reject missing, expired, invalidated, already-used, inactive-campaign, or ineligible
  codes with a clear status/message for the Code App.
4. Mark every matching eligible Grand Prize Entry for that code/contact/campaign checked in
  by setting `andy_checkinstatus = Checked In` and `andy_checkintime = utcNow`.
5. Return the staff-facing confirmation payload:

```json
{
  "status": "checked_in",
  "participantName": "<display name>",
  "participantCode": "<check-in code>",
  "checkedInEntryCount": 3,
  "totalEntryCount": 3,
  "checkedInAt": "2026-09-27T19:00:00.000Z",
  "campaignName": "<campaign>"
}
```

The Code App also handles `already_checked_in`, `invalid`, `expired`, `invalidated`, and
`ineligible` responses so staff get a clear instruction without seeing the grand-prize
wheel or direct Dataverse data.

## Grand prize drawing pipeline

The staff connector loads drawing slices/state and submits the draw. The Function
commits the server-selected winner and returns the result; presentation screens
poll authenticated drawing-state every five seconds. Winner details are no longer
broadcast on the publicly negotiable kiosk SignalR hub. Kiosk mode/telemetry
broadcasts remain unchanged.

Staff endpoints validate signature, issuer, audience, expiry, tenant, delegated
Staff.Access scope, Game.Operator role and connector client ID using JOSE. Missing
configuration fails closed. Function keys and client identity headers are not
alternatives to bearer validation. See `src/lib/staffAuth.ts` and its tests.

**Known simplification:** `set-mode`'s caller passes `deviceSlug` directly rather than the
Function looking it up from `deviceProfileId` server-side. The Power App already has both
values from its data source, so this avoids an extra Dataverse round-trip, but it does mean
a buggy/malicious caller could send a mismatched slug. Staff authorization does not validate this relationship;
revisit if `set-mode` ever gets a less trusted caller.

## Panel telemetry pipeline

```
panel Pi â†’ IoT Hub â†’ built-in Event Hub endpoint â†’ iot-telemetry (this app)
                                                    â”œâ†’ SignalR "gamebox" hub â†’ kiosk page
                                                    â””â†’ Dataverse andy_iottelemetryevent
```

The payload is what `hardware/raspberry-pi/panel_controller.py` publishes (`deviceSlug`,
`controls`, `rawSwitches`, `rawConnectors`, `cables`, `lamps`, `win`, `eventType`).
`lib/telemetry.ts` holds the mapping and is unit-tested (`npm test`):

- **`SendTelemetryUpdate`** â€” every reading, relayed unchanged as `data`.
- **`TriggerAgentHelp`** â€” also sent while the panel isn't restored (`win === false`, not
  for `mode_change` events). Nothing on the kiosk consumes it yet; it's there for the
  troubleshooting agent / dispatch flow.
- **Dataverse** â€” a row per real event (`state_change` and `win`; heartbeats and mode changes
  are not logged) in the generic `andy_iottelemetryevent` event log, described below. A
  failed write is logged and never blocks the SignalR broadcast.

App settings for this pipeline. **Deployed environments get these from the Infrastructure
workflow** (`azure/infrastructure/README.md`): it creates the `gamefunc` consumer group, gives the Function App a
managed identity with Event Hubs Data Receiver on the hub, and merges the settings below. No Event Hub key
is stored. Run that workflow (`deploy`) before this change ships, or the trigger has nothing to read.

| Setting | Deployed value | Local dev (`local.settings.json`) |
|---|---|---|
| `IoTHubEventHubConnectionString__fullyQualifiedNamespace` | `evhns-aw-iot-copilot.servicebus.windows.net` (identity-based) | not used |
| `IoTHubEventHubConnectionString` | not set | Event Hub connection string with `EntityPath`, since local runs have no managed identity |
| `IOT_EVENTHUB_NAME` | `iot-telemetry` | your hub |
| `IOT_EVENTHUB_CONSUMER_GROUP` | `gamefunc` (dedicated to this app; never `funcapp` or `$Default`) | a group of your own |
| `DIRECTLINE_SECRET` | the Copilot Studio agent's secret, set by hand once the agent is ready. Until then `/api/directline-token` returns 503 and the kiosk shows the static steps | optional |

No new SignalR setting is required for the grand-prize display path; it reuses
`AzureSignalRConnectionString` and the `gamebox` hub.

### The `andy_iottelemetryevent` table

A generic event log for any "thing" (this panel, a claw machine, a future device). Four short,
filterable columns plus a JSON payload with everything specific to that thing, so a new kind of
thing is a new payload shape, never a new column. Organization-owned. Create it in the shared
**`andy_PrizeEngine`** solution (the one the claw machine and this game both build on, where
`andy_prizes` and `andy_prizetypes` live) so other projects can reuse it, and also add it to
`CopilotIoTGame` so this repo's `pac solution export` captures the schema. Permissions are granted
per project, on each project's own security role.

| Display name | Logical name | Type | Meaning |
|---|---|---|---|
| Name (primary) | `andy_name` | Text, 200 | `{deviceId} {timestamp}` |
| Device ID | `andy_deviceid` | Text, 100 | which thing, e.g. `copilotiotpanel` |
| Event type | `andy_eventtype` | Text, 100 | `state_change`, `win`, or a future thing's own |
| Value | `andy_value` | Text, 100 | short summary; this panel: `RESTORED`, `UNRESTORED` or `UNKNOWN` |
| Payload | `andy_payload` | Multiline text, 10,000 | JSON of the thing's own attributes |

The payload carries a `schema` key so readers can tell its shape; for this panel it is
`restore-and-spin/v1` and holds the mode, `win`, `controls`, `rawSwitches`, `rawConnectors`,
`cables`, `lamps` and the Pi's `timestamp`. Only the four scalar columns and `createdon` can be
filtered in Dataverse, not fields inside the payload; add a column if that is ever needed. A payload
over 10,000 characters is replaced by a short record with `"truncated": true` instead of failing.

The Function App's Dataverse application user needs **Create** and **Read** on this table
(organization scope), granted on `Copilot IoT Game Security Role`. Until the table exists in the
environment the write fails with a 404 that is logged as a warning and otherwise ignored.

## Prerequisites

1. **An Azure SignalR Service resource**, in **Serverless** mode (not Default â€” Serverless
   is what supports Functions-based negotiate/broadcast). Grab its connection string.
2. **An Entra ID app registration** for this Function App to authenticate to Dataverse as
   an application user (client-credentials flow) â€” create it, generate a client secret, and
   add it as an **Application User** in the Dataverse environment with a security role
   granting at least Create/Read/Write on `andy_gameboxstate` and Read on
   `andy_deviceprofile`.
3. **Node.js 22** and the **Azure Functions Core Tools v4** (`npm i -g azure-functions-core-tools@4`) for local runs. Node 20 is refused at creation (EOL 2026-04-30); **Node 24 was tried first and didn't work** â€” the deployed app got stuck with "Runtime version: Error" in the portal and 503'd on every route, including Kudu itself, even after a restart. Node 22 (LTS) fixed it immediately. Worth retrying Node 24 in the future once it's had more time to bake on Linux Consumption specifically.

### Destination resources (updated 2026-10-08)

The source resource group has been retired. Destination resources are in
`rg-aw-azcom-iot-copilot` in subscription `9e8c862e-9bba-4363-a21b-c45cabe8b637`:

| Resource | Name |
|---|---|
| Public Function App | `func-aw-iot-game-v2` (`func-aw-iot-game-v2.azurewebsites.net`) |
| Staff Function App | `func-aw-iot-staff-v2` (`func-aw-iot-staff-v2.azurewebsites.net`) |
| Function storage accounts | `stawazcomiotgamev2`, `stawazcomiotstaffv2` |
| SignalR Service | `signalr-aw-iot-copilot` (Standard S1, Serverless, shared with the IoT Copilot environment) |
| Entra app registration | `restore-and-spin-function`, App ID `8eb31f00-6f72-4663-8de9-e5290d2a2aa7`, tenant `7cea0515-a5e4-4e8a-8f2a-6d1ad5d6b9f8` â€” added as a Dataverse Application User (client secret was generated and set directly as the Function App's `DATAVERSE_CLIENT_SECRET` setting, not committed anywhere) |

The public app's protected Dataverse, SignalR, and Direct Line settings are preserved during
infrastructure reconciliation. Both apps use Node 22 on Flex Consumption. The destination
apps remain `MIGRATION_STAGING=true` until the coordinated GitHub Actions release activates
the public telemetry trigger and staff maintenance timer. See the Node version note under
Prerequisites before ever trying Node 24 again.

**CORS:** production kiosk, PrizeWheel, Plinko, local development, and Power Platform
origins are declared in `main.prod.bicepparam`; no wildcard is used.

**Confirmed working end to end (2026-09-08):** `GET /api/kiosk-state` returns real
Dataverse data, and a live browser tab running the kiosk Code Site (`restore-and-spin` at
the time, since superseded by `copilotiotgame`) navigated automatically in response to an
external `POST /api/set-mode` call, via the SignalR broadcast â€” no reload, no polling. See
`power pages/copilotiotgame/README.md`.

## Local setup

```bash
cd azure
npm install
cp local.settings.json.example local.settings.json
# fill in DATAVERSE_URL / DATAVERSE_TENANT_ID / DATAVERSE_CLIENT_ID /
# DATAVERSE_CLIENT_SECRET / AzureSignalRConnectionString in local.settings.json
npm start
```

`local.settings.json` is gitignored â€” never commit it, matching this project's "secrets via
environment variables only" convention.

Public mode can serve `kiosk-state` locally without a bearer token. Staff mode requires the Entra settings in the setup runbook and an actual delegated staff access token; there is no development authentication bypass.

## GitHub Actions releases

Use [the CI/CD workflow](../../../docs/CI_CD.md) for routine Function App and
`copilotiotgame` releases: PR build checks, then automatic deployment after
relevant changes merge to `main`. Workflow: `.github/workflows/deploy-apps.yml`.
Local publishing commands are for explicitly requested recovery/bootstrap work.
Other Power Platform components retain their existing PAC workflows.

## Deploying

GitHub Actions builds the shared package with Node 22 and deploys it to the destination
public and staff apps using Flex Consumption package deployment. The public app's telemetry
trigger and staff app's maintenance timer remain disabled until the coordinated release
passes its staff-auth check and all frontend deployments; the final workflow job then enables
the destination workers. Do not publish the package manually with Core Tools or include
`local.settings.json` in a release.

## Structure

```
azure/functions/game/
â”œâ”€â”€ host.json                        # Functions host config, SignalR extension bundle
â”œâ”€â”€ package.json / tsconfig.json
â”œâ”€â”€ local.settings.json.example      # copy to local.settings.json, fill in, never commit
â””â”€â”€ src/
    â”œâ”€â”€ index.ts                     # imports every function file so app.http(...) registers
    â”œâ”€â”€ functions/
    â”‚   â”œâ”€â”€ negotiate.ts
    â”‚   â”œâ”€â”€ kioskState.ts
    â”‚   â”œâ”€â”€ setMode.ts
    â”‚   â”œâ”€â”€ telemetry.ts             # Event Hub trigger â†’ SignalR + Dataverse
    â”‚   â””â”€â”€ directlineToken.ts
    â”œâ”€â”€ lib/
    â”‚   â”œâ”€â”€ dataverse.ts             # MSAL client-credentials auth + Web API helpers
    â”‚   â””â”€â”€ telemetry.ts             # pure payload â†’ SignalR/Dataverse mapping (unit-tested)
    â””â”€â”€ ../test/telemetry.test.ts    # node:test; run with `npm test`
```

## Device Profile availability

Device Profile uses built-in Status, not the removed `andy_isenabled` column.
`statecode=0` (Active) maps to API `isEnabled=true`; inactive/unknown states map to
false. The list includes inactive rows so staff can reactivate them. Toggle writes
both fields using the solution's pairs: Active `(statecode=0,statuscode=1)` and
Inactive `(statecode=1,statuscode=2)`. Random mode selection continues to use
`isEnabled`, excluding inactive profiles. `andy_isgamedevice` remains a separate
classification flag. No new column or connector schema change is required.

## Daily consent job

`consent-maintenance` (timer, 14:00 UTC, staff app only) sends the post-event follow-up emails (checked-in entries, from the campaign's `andy_followupsendtime` for 3 days) and erases game-created contacts with no confirmed marketing opt-in 90 days after the drawing. See `docs/PREFERENCE_CENTER_DESIGN.md`.
