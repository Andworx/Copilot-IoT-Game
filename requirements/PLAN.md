# YOUR_PROJECT_NAME — Project Plan

Track implementation status in this file as work is added, deployed, and verified.

**Status legend:** `✅ Done`, `⬜ Verify`, `⬜ TODO`, `Future`

Game/kiosk work below tracks `power pages/docs/GAME_MODE_PLAN.md` §10's phased build plan —
that document is the source of truth for scope/design; this file mirrors its status.

## Summary Scorecard

| Area | ✅ Done | ⬜ Verify | ⬜ TODO | Future | Total |
|---|---:|---:|---:|---:|---:|
| Dataverse | 5 | 5 | 3 | 0 | 13 |
| Flows | 0 | 0 | 1 | 0 | 1 |
| Agents | 0 | 0 | 1 | 0 | 1 |
| Power Pages | 4 | 13 | 1 | 0 | 18 |
| Plugins | 0 | 0 | 1 | 0 | 1 |
| Reports | 0 | 0 | 0 | 1 | 1 |
| Hardware | 0 | 5 | 0 | 1 | 6 |
| Integration (Azure Functions) | 11 | 5 | 4 | 0 | 20 |
| Power Apps | 2 | 7 | 0 | 0 | 9 |
| Testing | 0 | 0 | 1 | 0 | 1 |
| Network / browser API | 0 | 1 | 1 | 0 | 2 |
| Totals | 22 | 36 | 12 | 2 | 72 |

## Dataverse

| Item | Type | Status | Notes |
|---|---|---|---|
| `andy_deviceprofile` + `andy_layout` choice | Table + choice | ⬜ Verify | GAME_MODE_PLAN.md §5, Phase 1 — schema confirmed working end to end 2026-09-08 (1 real row, `smart-lock`, created and successfully driven a live kiosk navigation); 11 of 12 device rows still need authoring (§11) |
| `andy_gamewin` + choices/relationships | Table | ✅ Done | GAME_MODE_PLAN.md §5, Phase 1 — moved into unpacked solution for PAC pack/import, verified after environment import; `andy_prize` (the old singular table this row originally also tracked) is fully decommissioned as of 2026-09-09, see below |
| `andy_PrizeTypes`/`andy_Prizes` adopted from `Clawmachine` into `CopilotIoTGame`; `andy_gamewin`/`andy_Prizes` lookups; retire `andy_prize`/`andy_prizecategory` | Tables + columns + relationships | ✅ Done | `power pages/docs/archive/PRIZE_DATA_MODEL_MIGRATION.md` — tables added, new lookup/boolean columns hand-authored in unpacked XML and imported (2026-09-09); seed data entered and re-exported; icons fixed to real Fluent-icon web resources; `PRIZE_CODE_MIGRATION.md` backend cutover deployed and smoke-tested live; **Phase 6 decommission complete (2026-09-09)**: `andy_gamewin.andy_Prize` and (newly discovered) `andy_SessionPrizeWin.andy_PrizeName` lookup columns deleted, then `andy_prize`/`andy_prizecategory` tables deleted live, confirmed gone from both `CopilotIoTGame` and `Clawmachine` after fresh re-export |
| `andy_PrizeEngine` solution — new dedicated solution owning the shared `andy_PrizeTypes`/`andy_Prizes` tables + `Update Prize Type` flow, so `CopilotIoTGame` and `Clawmachine` reference (not co-own) them | Solution | ✅ Done | `/power-platform-architect` consolidation plan (2026-09-09) — removed duplicate `RootComponent` entries and two leftover Attribute/Entity Image Config "ghost" components from `Clawmachine`; `andy_SessionPrizeWin` (Clawmachine) also given proper `andy_PrizeType`/`andy_PrizeInstance` lookups (was still pointing at the old `andy_Prize` table, a gap not covered by the original migration doc) |
| `andy_gameboxstate` — singleton row tracking the active device | Table | ✅ Done | GAME_MODE_PLAN.md §5, Phase 2a — confirmed end to end 2026-09-08 by both `GET /api/kiosk-state` and a real `set-mode` write |
| `andy_deviceprofile.andy_isenabled` + `andy_gameboxstate.andy_gamemodeenabled` — per-mode disable + master Game Mode toggle | Boolean columns | ✅ Done | `/power-platform-architect` mode-control plan (2026-09-09) — created via Web API (`BooleanAttributeMetadata`), both default `true`/backfilled `true` on all existing rows so behavior was unaffected until explicitly toggled; confirmed live via `GET /api/device-profiles`/`kiosk-state` |
| `andy_iottelemetryevent` generic event log (name, device id, event type, value, JSON payload) | Table | ⬜ Verify | Created in `andy_PrizeEngine` (shared) and `CopilotIoTGame`, organization-owned; `Copilot IoT Game Security Role` has Create and Read only. Verified: the game function writes a row per state change or win. Still to do: `pac solution export` + unpack `CopilotIoTGame` into `solutions/`. Spec: `azure/functions/game/README.md`. |
| Shared contest/campaign, Contact identity, source caps, and grand-prize entry model | Design | ⬜ Verify | Issue #123 / epic #121 — implemented as relationship-first PrizeEngine metadata in `solutions/PrizeEngine`: Campaigns, Source Caps, Grand Prize Entries, Contact references, app navigation, and table icons. Packed/imported once; current check-in-field import is in progress. |
| Shared Prize Claim table and IoT Game Win rollout | Table + rollout | ⬜ Verify | Issue #149 / epic #121 — PrizeEngine-owned `andy_prizeclaim` and CopilotIoTGame-owned `andy_iotgamewin` created live with the correct preferred solution context; both solutions exported/unpacked, packed, imported, and published. `andy_iotgamewin` is intentionally minimal: Prize Claim + Device Profile only, and now has the imported `andy_iotgamewin_icon` SVG webresource bound in the CopilotIoTGame sitemap. Stage 3 backend cutover is coded and local tests pass; CopilotIoTGame role privileges for both new tables were packed/imported/published. Prize Claim redemption columns were removed after deciding `Claimed` is fulfillment for instant prizes, and notes are enabled for booth/operator context. Current phase moved Grand Prize Entry source traceability from legacy Game Win to Prize Claim, generates check-in codes at entry creation, and removed the legacy `andy_gamewin` table, relationships, choices, and icon from live/source after export and unpack. Historical `andy_gamewin` rows did not require migration. |
| Plinko solution unpack | Solution | ⬜ Verify | Issue #124 — Plinko solution was created in Power Apps with `andy_plinkoprofile`, `andy_plinkoplay`, and the Plinko model-driven app, then exported/unpacked under `solutions/Plinko/`. Table icons are bound through Plinko SVG web resources. Needs pack/import/publish and live maker validation. |
| Campaign-owned entry cap and Source Cap cleanup | Columns + form | ⬜ TODO | Issue #146 / epic #121 — keep `Max Entries Per Contact` as a global Campaign setting; remove Source Cap `Max Entries Per Contact` and `Max Entries Per Day`; add a Campaign quick view to the Source Cap form so makers can see the effective global cap without duplicating rule fields. |
| Source catalog lookup for Contest Source Cap | Table + lookup | ⬜ TODO | Issue #147 / epic #121 — replace free-text `Source Identifier` entry with a source catalog lookup so makers select `IoT`, `Plinko`, etc.; backend should resolve the selected source's stable key such as `iot`. |
| Contest Source Cap generated setting name | Form script | ⬜ TODO | Issue #148 / epic #121 — add model-driven form JavaScript that sets `Setting Name` from the selected Campaign and Source, using a format like `<Campaign Event Name> - <Source Name>`. |
| Game Win form contestant-field cleanup | Model-driven form | ✅ Done | Issue #123 / epic #121 staged push 1 — superseded by the approved deletion of the legacy `andy_gamewin` table after Prize Claim and IoT Game Win took over the live flow. |
| `andy_gamewin.andy_contact` Contact lookup | Lookup relationship | ✅ Done | Issue #123 / epic #121 staged push 2 — superseded by `andy_prizeclaim.andy_contact`; the old lookup was removed with the legacy `andy_gamewin` table after live deletion/export/unpack. |
| Grand Prize Entry check-in fields | Columns + form | ⬜ Verify | Issue #145 / epic #121 — keep structured `andy_checkincode`, `andy_checkinstatus`, and `andy_checkintime`; use Dataverse notes/timeline for freeform check-in context instead of `andy_checkinnotes`. Activities are enabled on the table after the 2026-09-27 export, so #134 code and reminder emails can be Dataverse Email activities regarding the Grand Prize Entry. |
| Instant-win and grand-prize entry decoupling contract | Design | ⬜ Verify | Issue #126 / epic #121 — new writes use Prize Claim as the shared source anchor; Grand Prize Entry now relates to Campaign, Source Cap, Contact, and Prize Claim rather than legacy Game Win. Local Azure tests pass; live claim validation pending. |

## Flows

| Item | Type | Status | Notes |
|---|---|---|---|
| Win-recording action from Copilot Studio resolved-topic | Cloud flow or native Copilot Studio action (TBD) | ⬜ TODO | GAME_MODE_PLAN.md §7/§8, bundled into Phase 4 — whether this is a Power Automate flow or a Copilot Studio native action is still open |

## Agents

| Item | Type | Status | Notes |
|---|---|---|---|
| Copilot Studio: parametrize troubleshooting agent by `deviceSlug`, wire resolved-topic → win-creation action | Copilot Studio agent | ⬜ TODO | GAME_MODE_PLAN.md §8, Phase 4 — being built separately; Issue #59 updates Multi Function Hardware Agent for one-shot Power Pages prompts grounded in `RESTORE-MODES-MANUAL.pdf`, returning only repair steps |

## Power Pages

| Item | Type | Status | Notes |
|---|---|---|---|
| Physical control/visual contracts across twelve modes (#75) | Code Site | ⬜ Verify | Six switches and four sockets available in gear setup; domain-only instruments. Contract checks cover 12,288 states, exact cable recipes, and any-order Help Fix wording. Surface checks cover all twelve modes and their setup/help recipes. Live Pi/page validation pending. |
| Typed read-only surface registry and shared primitives (#76) | Code Site | ✅ Done | Closed via #89/#90/#135. All twelve dedicated surfaces use semantic keys; legacy layouts, helper widgets, profile metadata and CSS removed. Architecture guidance reflects registry ownership. 60 surface fixtures, completion/reset flow, 12,288 configurations and required builds passed locally, and #135's deploy-apps.yml run succeeded on main. |
| Dedicated thermostat instrument pilot (#77) | Code Site | ⬜ Verify | Circular heat/cool face, state-driven fan, eco lockout, and physical mappings. No inferred temperatures. Local browser checks pass; live validation pending. |
| `copilotiotgame`: `KioskInfoPage` + `KioskDevicePage`, all 12 playable modes, 10s reset timer (800×480 viewport) | Code Site pages | ⬜ Verify | Issues #43/#44 — mode cards now mirror the 12 Pi restore sequences and expose ordered restore steps. Verify with local build and live page after deployment. |
| `copilotiotgame`: `/play-spin` page, QR generation on kiosk win, wheel animation | Code Site page | ✅ Done | GAME_MODE_PLAN.md §7, Phase 6 — except real QR encoding (placeholder pattern) and the real claim call (depends on the Integration claim endpoint below) |
| `copilotiotgame`: all 12 playable device pages + content | Code Site content | ⬜ Verify | Issue #43 — added `industrial-robot-arm` and synchronized unique restore sequences across page data and Pi logic maps. |
| `copilotiotgame`: root `SignalRContext` + `useDeviceSync` — fetch current state on load, navigate on `deviceChanged` | Code Site — SPA change | ⬜ Verify | GAME_MODE_PLAN.md §4a, Phase 2c — confirmed 2026-09-08: a live tab moved from `/kiosk/info` to `/kiosk/smart-lock` via an external `set-mode` call, no reload. Issue #245 adds a 5-second `/api/kiosk-state` refresh fallback so the kiosk follows staff-selected modes if the SignalR `deviceChanged` event is missed; local Code Site build passes, needs production deployment and live kiosk validation. |
| `copilotiotgame`: Game Mode OFF branch on `KioskDevicePage` + new `SuccessPopup` component; same-mode reset after every completion (both Game Mode states) | Code Site — SPA change (`power pages/copilotiotgame`) | ⬜ Verify | `/power-platform-architect` mode-control plan (2026-09-09), updated 2026-09-29 for issues #173/#175 and 2026-10-05 for issue #253 — Game Mode ON keeps today's QR/phone-spin/claim flow unchanged; OFF skips `create-win` entirely (no `andy_gamewin` row, per decision to leave OFF completions unlogged) and shows a client-only success popup instead. Completion now clears the overlay and remains on the current mode so players can review what happened; `andy_deviceprofile.andy_wintext` supplies the Game Mode ON overlay message when populated, while OFF now prefers `andy_deviceprofile.andy_wintextinnongamemode`, then falls back to `andy_wintext`, then `deviceProfiles.ts`. Intro copy and Copilot topic metadata are not used by the runtime flow. The shared device-profiles API now retries without optional win text columns when the target environment schema lags the Function deployment, so Game Box Control mode loading is not blocked by optional copy metadata. |
| `copilotiotgame`: unique completion visuals and DV-only win text for all kiosk modes | Code Site — SPA change (`power pages/copilotiotgame`) | ⬜ Verify | Issue #218 — preserves the existing Drone Ground Control takeoff visual, adds unique success visuals for the other 11 demos, and removes restored switch/cable action text from both Game Mode ON and OFF completion overlays. Local Code Site contract check and build pass; production/live kiosk validation follows the normal PR deployment. |
| Retire `restore-and-spin`; repoint `deploy-apps.yml` to build/deploy `copilotiotgame` | Code Site — CI/CD fix | ⬜ Verify | 2026-09-12 — `deploy-apps.yml` had never been repointed after `copilotiotgame` replaced `restore-and-spin` (2026-09-10), so every merge touching the old app's path re-deployed it over the live `CopilotIoTGame` site, silently reverting Game Mode support and the real QR to the old no-Game-Mode/fake-QR prototype. Fixed the workflow, deleted `power pages/restore-and-spin/`, updated docs/instructions referencing it. Verify: after the next deploy, confirm the live site actually serves `copilotiotgame`'s bundle and both Game Mode states behave correctly against the real backend 2026-09-19 — live site confirmed serving `copilotiotgame`'s UI after the deploy-target fix below; Game Mode ON/OFF behaviour against the real backend still to check |
| CI deploys the Power Pages code site to the **live** website (pinned `POWER_PAGES_WEBSITE_ID`, live metadata via `pac pages download-code-site`, post-upload ID check); document platform-generated CSP console messages | Code Site — CI/CD fix | ✅ Done | Issues #48 / PR #50 — every deploy had been creating a new "CopilotIoTGame" website (six orphans) while the live one was never updated; deploy run 35441457949 updated site `4938f099-…` ("Deleted 4 bundle directories", verify step passed, one CopilotIoTGame site remains) and the portal serves the new build (a stale browser cache showed the platform error until cleared; private window OK). Inline-script CSP console errors are Power Pages' own private-site banner/wrapper, not repo output |
| `copilotiotgame`: live panel state from `SendTelemetryUpdate` (controls, cables, link status) and Help Fix over Direct Line with static-steps fallback | Code Site — SPA change | ⬜ Verify | Issue #60 — Help Fix now only appears while the active mode is unresolved/broken, sends one mode/state prompt to the agent, and displays only repair steps or static fallback steps. Previously verified in a browser against a mock SignalR/Direct Line backend; needs verification against the real pipeline after deployment. |
| `copilotiotgame`: physical-panel-only kiosk controls, connection status in gear menu, no top restore/status strips, Help Fix hides after activation | Code Site — SPA change | ⬜ Verify | Issues #65/#67/#68/#69 — local build passes and browser preview confirms first mode has disabled on-screen controls, gear-based IoT/Azure status, no restore order panel, and Help Fix fallback sheet with the button removed while open. Needs deployment and live Pi/SignalR validation. |
| `copilotiotgame`: full secure networking solution diagram page | Code Site page | ⬜ Verify | Issue #194 — added `/kiosk/solution` as a large-screen demo architecture view reachable from the bottom-right gear menu, covering edge clients/devices, Azure Functions/Event Hub/IoT Hub/SignalR, Dataverse, Copilot Studio, deployment, public claim paths, and private telemetry paths. Needs production deployment and live demo validation. |
| `prize wheel`: Explore this solution entry point | Code Site page | ⬜ Verify | Issue #195 — added a responsive `Explore this solution` action that opens the shared `/kiosk/solution` diagram from the phone-facing prize flow. Needs live mobile validation after both Code Sites deploy. |
| `prize wheel`: GitHub Actions Code Site deployment and claim reachability | Code Site + CI/CD | ⬜ Verify | Issues #196/#197 — `deploy-apps.yml` now builds `power pages/prize wheel`, uploads it through live-site metadata, and injects the current Function App URL so the deployed claim flow no longer depends on stale checked-in site metadata. Needs a production Actions run plus real QR claim smoke test. |
| `plinko`: player-facing display Code Site and event-day operations UI | Code Site + model-driven views | ⬜ Verify | Issue #127 — `power pages/plinko` now builds as a standalone display with idle how-it-works flow, on-screen chase lights, `plinkoResult` win celebration, QR scan/skip flow, and Plinko-specific prize-wheel handoff copy. The Plinko solution now includes named event-day saved views. Needs Power Pages site creation/activation, `POWER_PLINKO_WEBSITE_ID` configuration, production deploy, and live SignalR/player-flow validation. |
| `copilotiotgame`: review each kiosk mode UI one by one | Code Site review | ⬜ TODO | Issue #70 — use the local preview/device routes to review all 12 modes individually and track any mode-specific fixes separately. |

## Plugins

| Item | Type | Status | Notes |
|---|---|---|---|
| YOUR_PLUGIN_ITEM | Dataverse plugin / step | ⬜ TODO | No plugin requirement identified for the game yet — replace when one is |

## Reports

| Item | Type | Status | Notes |
|---|---|---|---|
| Low-stock/restock reporting over `andy_prize.andy_remaining` | Power BI report or admin view | Future | GAME_MODE_PLAN.md §9 — deliberately deferred, no design blocker |

## Hardware

| Item | Type | Status | Notes |
|---|---|---|---|
| Panel Pi (`hardware/raspberry-pi/`): switches, LEDs, connector jacks, all 12 playable `logic_maps/<slug>.json` files, Azure IoT Hub telemetry publisher | Raspberry Pi firmware | ⬜ Verify | Issues #41/#42 — controller now reads all six switches and four sockets, selects mode from Power App/Page state (`kiosk-state` URL, state file, or env fallback), and mirrors the page restore sequences. Verify on the Pi after deployment. |
| Panel Pi: deploy 12-mode firmware update to hardware | Raspberry Pi firmware | ⬜ Verify | Issue #42 — cable-matrix firmware, 12 logic maps, telemetry reconnect, `diagnose_cables.py` and `check_iot_connection.py` copied to `pi@iotcase` (`.env` untouched); unit tests pass on the Pi and the hub accepts its credential. Found: the Pi has no battery clock, so the service started ~13 h behind real time and IoT Hub refused the time-based token; it never retried. `telemetry.py` now retries with backoff and the unit waits for time sync. Still to do on the Pi (needs sudo): install the updated unit, `systemctl enable systemd-time-wait-sync.service`, restart the service; then run `diagnose_cables.py --watch` against real cables and check each mode against the printed panel. |
| Physical rotary dial or mux mode input | Raspberry Pi hardware | Future | Removed from the active demo path; the Power App/Page controls active modes for this build. |
| Panel Pi cable matrix: RJ-45 ports labeled LAN 1-LAN 4, one active pin per port, `cable_matrix.py` scan/decode, links in telemetry | Raspberry Pi firmware + wiring | ⬜ Verify | Issues #112/#142 — supersedes the earlier custom connector plan after field faults on S3. Each LAN port wires RJ-45 pin 4 only: LAN 1/S1 to GPIO4, LAN 2/S2 to GPIO25, LAN 3/S3 to GPIO2, LAN 4/S4 to GPIO3. Cable identity no longer matters; standard straight-through RJ-45 patch cables create socket-pair links. Needs physical rewire/deploy, then `diagnose_cables.py --watch` bench testing of every LAN pair. Diagram/README/manual/PDF updated; Pi unit tests and Code Site build pass locally. |
| Plinko Pi switch/beam smoke verifier | Raspberry Pi firmware | ⬜ Verify | Issue #128 — `hardware/plinko-pi/` reads one active-low switch or IR break-beam receiver, debounces a stable blocked state, emits the planned `plinkoLanding` envelope, and logs offline when IoT credentials are not yet configured. Local unit tests and syntax check pass; deploy/run on `iotplinko` is pending physical switch/beam validation. |
| Restore manual and agent socket labels: printed socket references use LAN 1-LAN 4 labels, with internal S1-S4 mapping retained in firmware | Hardware docs + Power Pages + Azure telemetry + Copilot Studio agent | ⬜ Verify | Issue #139 — source data, logic maps, app contracts, Azure telemetry examples, generated manual PDF, wiring docs, and agent knowledge/instructions updated locally. Needs PR review, deployment/push-publish of the Copilot Studio agent, and live Help Fix validation. |
| Cold-chain, drone, and traffic-signal modes changed from 3 to 2 required sockets | Logic maps + `deviceProfiles.ts` + manual/PDF | ⬜ Verify | A cable only reads when both ends are plugged in, so required-connected sockets must be even; a test in `test_cable_matrix.py` now enforces this for all 12 modes. Needs the Code Site redeploy alongside the Pi update. |

## Integration (Azure Functions)

| Item | Type | Status | Notes |
|---|---|---|---|
| `GET /api/kiosk-state`, `GET /api/device-profiles` | Azure Function endpoints (`azure/functions/game/`) | ✅ Done | GAME_MODE_PLAN.md §4a, Phase 2a — confirmed 2026-09-08 end to end against live Dataverse on `func-aw-azcom-copilot-iot-game` (Node 22, `restore-and-spin-function` as a Dataverse Application User) |
| `POST /api/set-mode`, `POST /api/negotiate` | Azure Function endpoints (`azure/functions/game/`) | ✅ Done | GAME_MODE_PLAN.md §4a, Phase 2a — confirmed 2026-09-08: a real `set-mode` call (from Game Box Control) wrote `andy_gameboxstate` and broadcast over `negotiate`'s SignalR hub to a live kiosk tab, which navigated with no reload |
| `POST /api/prizes`, `POST /api/create-win`, `POST /api/claim-prize` (validate token → weighted-pick prize **type** → atomic-claim a prize **instance**, falling back to the designated fallback type → mark claimed) | Azure Function endpoints (`azure/functions/game/`) | ⬜ Verify | `power pages/docs/archive/PRIZE_CODE_MIGRATION.md` — rewritten against the new `andy_PrizeTypes`/`andy_Prizes` split (was the old single-row `andy_prize` decrement), deployed to `func-aw-azcom-copilot-iot-game` and smoke-tested live 2026-09-09 (all 3 endpoints + a real claim verified against `andy_gamewin`'s binds); fixed a live-only OData `in`-operator rejection along the way. Issue #134 local update: when the QR/info claim path creates a Grand Prize Entry, `claim-prize` now reuses any existing Contact/campaign check-in code or generates a unique campaign code, initializes `andy_checkinstatus = Not Checked In`, creates/sends a Dataverse Email activity regarding the Grand Prize Entry, and queues a reminder Email activity from campaign `andy_drawingtime` minus campaign `andy_reminder_lead_minutes`. Contest Campaign now owns booth/check-in location, reminder lead minutes, and preference URL. Needs `⬜ Verify`: live claim validation after deployment, sender mailbox app setting, and seeded Prize Type data still has only 1 active non-fallback type (`Trick or Treat Candy`) with zero instance stock, so every real claim currently falls through to the fallback (`Pin or Sticker`) — see `power pages/docs/archive/PRIZE_DATA_MODEL_MIGRATION_STATUS.md` for the maker-portal decision needed (add instance stock and/or reactivate the other 3 seeded types) |
| Contact upsert during prize claim | Azure Function endpoint (`azure/functions/game/`) | ⬜ Verify | Issue #125 / epic #121 — `claim-prize` now creates or reuses standard Dataverse `contact` by normalized email only when `sharedInfo` is true and contact email is supplied, then binds `andy_prizeclaim.andy_contact` when a Contact exists. Contact consent/preference fields are not overwritten. Local `npm test` passes; live Dataverse claim validation pending. |
| `POST /api/toggle-device`, `POST /api/set-game-mode`, `POST /api/pick-random-mode` | Azure Function endpoints (`azure/functions/game/`) | ✅ Done | `/power-platform-architect` mode-control plan (2026-09-09) — `toggle-device`/`set-game-mode` are function-key gated like `set-mode`; `pick-random-mode` is anonymous like `create-win`/`claim-prize` (kiosk-triggered, no staff auth available) and reuses the existing `setActiveDeviceProfile` write + `deviceChanged` SignalR broadcast. Deployed and smoke-tested live: confirmed a disabled device is never picked, `kiosk-state`/`device-profiles` correctly surface the new flags |
| Consolidated Azure deployment target | Azure Function App + GitHub Actions | ⬜ Verify | Issue #13 — new Node 22 Flex Consumption Function App `func-aw-azcom-iot-game` created in `rg-aw-azcom-iot-copilot` with dedicated storage `stawazcomiotgamefn`, shared Serverless SignalR `signalr-aw-iot-copilot`, app settings, CORS, GitHub variable update, and Website Contributor RBAC for the GitHub OIDC identity. Needs `⬜ Verify`: full GitHub deployment from `main`, Power Pages build using the new API base URL, and end-to-end Function/SignalR smoke test before deleting the old resource group. |
| Event Hub trigger `iot-telemetry`: panel Pi telemetry → SignalR `SendTelemetryUpdate`/`TriggerAgentHelp` (gamebox hub) + `andy_iottelemetryevent` row | Azure Function (`azure/functions/game/`) | ✅ Done | Verified live 2026-09-19: the trigger runs on every Pi heartbeat (30 s) with identity-based access, the SignalR broadcast is flowing (hundreds of messages), and after a real switch change a row landed in `andy_iottelemetryevent` with the `restore-and-spin/v1` payload (mode, controls, sockets, cables, lamps, timestamp). Only `state_change` and `win` are logged. |
| `GET /api/directline-token` | Azure Function (`azure/functions/game/`) | ⬜ Verify | Issue #66 — token generation now binds to the same stable `dl_kiosk_user` sender id used by the SPA, and the kiosk suppresses the raw Copilot Studio access-denied reply in favor of fallback steps. Local Azure/SPA builds pass; needs deployment plus a live Help Fix conversation check against the configured agent/channel. |
| `azure/infrastructure/`: Bicep for the Event Hub namespace/hub/consumer groups, SignalR, and Function App read access; `deploy-infra.yml` (what-if, drift, gated deploy) | Infrastructure as code | ✅ Done | Verified 2026-09-19 through the workflow on `main`: `what-if` showed one Create (`gamefunc`), `deploy` created it, gave the game Function App a managed identity with Event Hubs Data Receiver on the hub only, and merged the three telemetry settings (all existing settings intact); `drift` then passed clean. The IoT Hub route and all Tier 3 resources were untouched. See `docs/CI_CD.md`. |
| Adopt the game storage blob private endpoint and DNS zone group into `main.bicep` | Infrastructure as code | ✅ Done | Issue #207 / PR #229 — existing live endpoint configuration is represented in the template; post-merge reconciliation passed after IAM bootstrap update; full E2E validation passed 2026-10-02. |
| Adopt the IoT Hub private endpoint and dual DNS zone group into `main.bicep` | Infrastructure as code | ✅ Done | Issue #208 — preserved `iot-demo-iothub-pe`, NIC `iot-demo-iothub-pe-nic`, primary IP `10.20.1.4`, auxiliary IPs `10.20.1.5-.7`, and Azure Devices plus Service Bus private DNS records; post-merge reconciliation and E2E validation passed 2026-10-03. |
| Adopt the game Function App host, Flex Consumption plan, storage account, and package container into `main.bicep` | Infrastructure as code | ✅ Done | Issue #209 — preserved `func-aw-azcom-iot-game`, plan `ASP-rgawazcomiotcopilot-ec55`, storage `stawazcomiotgamefn`, package container `app-package-funcawazcomiotgame-0968767`, managed identity, deployment storage, VNet integration, CORS, TLS/FTPS settings, and app setting names without recording secret values. Post-merge reconciliation and E2E validation passed 2026-10-03. |
| Consolidate staff Function infrastructure ownership | Infrastructure as code | ✅ Done | Issue #210 — `staff-api.bicep` remains the single owner for `func-aw-azcom-iot-staff`, its plan, storage, package container, VNet integration, monitoring inheritance, and staff auth settings. Guardrails prevent these resources from being co-owned by `main.bicep`/reference snapshots while preserving automatic staff deployment bootstrap and authenticated Code App calls. PR #233 merged; main Infrastructure and Build/deploy apps workflows passed; authenticated staff/API E2E validation passed 2026-10-03. |
| Adopt monitoring, diagnostics, and alerts | Infrastructure as code | ✅ Done | Issue #212 — active game Application Insights `func-aw-azcom-iot-game`, local Smart Detection action group `application insights smart detection`, and `Failure Anomalies - func-aw-azcom-iot-game` Smart Detector alert are adopted into `main.bicep`. The shared default Log Analytics workspace is referenced but not owned; retired legacy App Insights/alerting and the old `rg-aw-azcom-demo` action group dependency are excluded from target state. PRs #237/#238 merged and deployed; final reconciliation passed 2026-10-03, live monitoring guard passed, and E2E was user-confirmed 2026-10-03. |
| Destination subscription VPN bootstrap | Network infrastructure + GitHub workflow | ⬜ Verify | Issue #259 - PR #260 merged; destination subscription `9e8c862e-9bba-4363-a21b-c45cabe8b637`, `rg-aw-azcom-iot-copilot` in `eastus` deployed successfully on 2026-10-06 through GitHub run `37514823460`, SHA `d441e3c11c2f12903194f32193a37a29dc6a0038`. VNet/four subnets, zone-redundant Standard public IP `48.217.22.117`, and VpnGw1AZ Generation1 gateway are Succeeded. Live SKU/generation, BGP ASN 65515, client pool `172.27.240.0/24` and public root certificate match; workflow validates OpenVPN/certificate auth. Source gateway remains Succeeded with its original Generation2 configuration; router/releases are unchanged. Owner deferred the real VPN test until after remaining infrastructure migration on 2026-10-06; it remains pending before Done/cutover/source retirement. |
| Remaining subscription migration: destination DNS and service move preflight | Network infrastructure + GitHub workflow | ⬜ TODO | Issue #261 - isolated destination DNS template/workflow references the existing VNet and creates five private zones/links plus resolver inbound `10.20.3.4`. Validation-only move manifest lists 13 live service resources; minimal source role grants validateMoveResources only. Local Bicep, YAML/PowerShell, scope checks and eight simulated boundary cases pass. DNS cloud preview/deploy, validator IAM grant and live ARM move validation are pending; actual source detach/move, RBAC restoration, identity replacement and source retirement require separate reviewed stages and outage acceptance. |
| Adopt IoT Hub configuration and managed-identity routing | Infrastructure as code | ⬜ TODO | Issue #213 / epic #216 — begin from the live `iothub-aw-iot-copilot` reference snapshot, then add a guarded deployable IoT Hub module only after IAM bootstrap can manage the existing hub and recreate the Event Hubs Data Sender assignment. Preserve SKU, device-facing behavior, built-in endpoint, route `route-iotpanel`, fallback route, enrichments, cloud-to-device settings, and the identity-based `endpoint-iotpanel` custom endpoint. Device identities, twins, DPS enrollments, router keys, and sibling-project ownership remain separate migration/documentation work. |
| Adopt DPS and document device enrollment migration | Infrastructure as code | ⬜ TODO | Issue #214 / epic #216 — document the live `dps-aw-iot-copilot` S1/Hashed configuration, the preferred `iot-game-fleet` symmetric-key enrollment group, the legacy `iotpanel-fleet` rollback source, secret-safe export/recreation steps, simple panel device registration, rollback/cutover sequencing, and test-device provisioning validation. Keep DPS group keys, derived device keys, IoT Hub connection strings and SAS tokens outside git; `iotdisplay` remains display-only and unregistered. |
| Retire legacy `rg-aw-azcom-demo` resource group | Azure resource cleanup | ⬜ TODO | Issue #236 — after #212 deploy moves Smart Detection to the local action group in `rg-aw-azcom-iot-copilot`, inventory remaining resources and dependencies in the old demo resource group, migrate or retire anything still live, then delete or archive the group only after owner-approved validation. |
| Tier 3 reference snapshots + drift check for IoT Hub, DPS, Function Apps, plans, and storage | Infrastructure reference | ✅ Done | Verified in CI: the read-only reader identity's `snapshots` job passes against live, and the deploy job's post-check caught the one intended change (the Function App's new identity). App Insights moved into deployable monitoring ownership under #212. |
| Remove retired Azure and Logic App resources | Azure resource cleanup | ⬜ Verify | Issue #215 / epic #216 — rollback records captured under `output/azure-cleanup/issue-215-20261004/`, then deleted the retired `func-aw-iot-copilot` Function App, `EastUSPlan`, `stfuncawiotcopilot`, legacy App Insights component, legacy smart detector alert, obsolete `eventhubs` API connection in `rg-aw-azcom-iot-copilot`, and old Logic App/API connection leftovers in `rg-aw-azcom-iot-demo`. Shared Log Analytics workspace preserved. Needs final e2e/live validation before Done. |
| `POST /api/grand-prize/check-in` | Azure Function endpoint (`azure/functions/game/`) | ⬜ TODO | Issue #131 / epic #120 — validate active campaign, Contact, emailed check-in code, current check-in status, and eligibility; mark matching Grand Prize Entry rows checked in with `andy_checkinstatus = Checked In` and `andy_checkintime`; return clear staff-facing statuses for invalid, expired, already-used, invalidated, and ineligible codes. |

## Power Apps

| Item | Type | Status | Notes |
|---|---|---|---|
| Game Box Control — device picker, calls `/api/set-mode` | Power Apps Code App (`power apps/game-box-control`) | ⬜ Verify | GAME_MODE_PLAN.md §4a, Phase 2d — built as a Code App (not Canvas) for a normal React dev loop; app logic confirmed 2026-09-08 driving a live kiosk navigation via `npm run dev`, but `pac code init`/`pac code push` (PAC_COMMANDS.md) haven't run yet — not yet actually published as a governed Power App with real Entra ID gating |
| Game Box Control CI/CD deployment | GitHub Actions + PAC Code App push | ⬜ Verify | Issue #17 — PR builds validate `power apps/game-box-control`; main deploy rebuilds it with protected function-key secrets and runs `pac code push --environment ... --solutionName CopilotIoTGame`. Verify after merge by checking the Actions run and live authorized control app. |
| "Copilot Iot Game Backend" model-driven app renamed to **Game Backend**; Prize Management nav repointed at `andy_prizetypes`/`andy_prizes` | Model-driven app (`andy_CopilotIotGameBackend`) | ⬜ Verify | `power pages/docs/archive/PRIZE_DATA_MODEL_MIGRATION.md` Phase 4 — `AppModule.xml`/`AppModuleSiteMap.xml`/security role edits packed and imported successfully into `andworx-development` (2026-09-09) alongside the new Prize Types/Prizes schema; needs a live check that the app displays the renamed title and the Prize Management nav resolves correctly |
| Bulk Add Prizes — genpage in Game Backend to bulk-create `andy_Prizes` rows from a Prize Type + quantity | Generative page (`power apps/bulk-add-prizes/bulk-add-prizes.tsx`) | ✅ Done | Deployed live via `pac model genpage upload` (page-id `2b55fe56-e580-40df-9ac6-b7a10ee8517f`), added to the app sitemap and to the `CopilotIoTGame` solution; user confirmed working in the browser (2026-09-09) |
| Game Box Control — master "Game Mode" switch + per-tile enable/disable toggle | Power Apps Code App (`power apps/game-box-control`) | ✅ Done | `/power-platform-architect` mode-control plan (2026-09-09) — calls the new `toggle-device`/`set-game-mode` endpoints; disabled tiles are visually distinct and non-selectable for manual mode-setting too. Built clean (`npm run build`); not yet published as a governed Power App (`pac code push`), same as the base device picker below |
| Game Box Control — Prize Management section, bulk-creates `andy_Prizes` rows via new `/api/bulk-create-prizes` + `/api/prize-types` endpoints | Power Apps Code App (`power apps/game-box-control`, `PrizeManagement.tsx`) | ⬜ Verify | Navigation refresh (2026-09-26): persistent Games, Testing, and Prize control menu; Game Box selector and grouped controls implemented, pending live verification. Brings the Bulk Add Prizes genpage's capability into Game Box Control so staff don't have to leave it; the genpage itself (row above) is left running as a redundant alternate entry point, untouched. Prize Claim smoke-test screen now exercises `create-win`/`claim-prize` with a configurable contest source key defaulting to `demo`. Needs live verification and `pac code push` after merge. |
| Game Box Control — issue #134 claim-flow email preview in Testing | Power Apps Code App (`power apps/game-box-control`, `SmokeTest.tsx`) | ⬜ Verify | The app does not expose code generation or email sending as an operator workflow. The Testing workspace now previews the check-in email only after the simulated player path reaches `claim-prize` with shared contact info, matching the real QR/info claim flow. Build passes locally; live verification depends on the Function returning `grandPrizeEntry.checkInCode`, `emailActivity`, and `reminderActivity` after deployment. |
| Game Box Control — Grand Prize Check-in workspace | Power Apps Code App (`power apps/game-box-control`, `GrandPrizeCheckIn.tsx`) | ⬜ Verify | Issue #131 / epic #120 — staff can type or scan an emailed check-in code and submit it to the planned `POST /api/grand-prize/check-in` Function. The client normalizes entry, keeps PrizeEngine writes server-side, and renders success, already checked in, invalid, expired, invalidated, and ineligible outcomes. UI build passes with the planned endpoint contract; real validation remains pending the Azure Function endpoint and live Code App deployment. |
| Game Box Control — Grand Prize Drawing workspace and weighted wheel shell | Power Apps Code App (`power apps/game-box-control`, `GrandPrizeDrawing.tsx`) | ⬜ Verify | Issue #130 / epic #120 — staff-operated grand-prize workspace added with a weighted canvas wheel, checked-in lineup loader targeting `GET /api/grand-prize/drawing-slices`, and final draw action targeting `POST /api/grand-prize/draw`. Presentation mode is now read-only: run/preview controls are hidden, the display connects to the existing `gamebox` SignalR hub, and it listens for the planned `grandPrizeDrawn` broadcast so an operator device can trigger the draw from a separate staff session. UI build passes with preview data; real draw remains pending the Azure Function endpoints, `GET /api/grand-prize/drawing-state` recovery endpoint, SignalR broadcast, and PrizeEngine draw-result audit storage. |

## Testing

| Item | Type | Status | Notes |
|---|---|---|---|
| Playwright e2e: mode-switch navigation (incl. mid-session reset), win → QR → claim → no-double-claim regression | E2E tests | ⬜ TODO | GAME_MODE_PLAN.md §10, Phase 8 |

### Kiosk setup presentation follow-up (epic #73)

Verify: replace the persistent physical-panel rail with the shared gear-menu switch/cable setup dialog for every mode. Required positions derive from the existing restore contract. Local browser validation passes; production validation awaits release. Demo / Info System Map redesign is tracked separately in #91.

### Demo / Info System Map (#91)

Verify: interactive three-layer architecture map, component details, keyboard/touch access, concise How to Play and read-only return to the latest active mode. Browser validation covers 800x480 and narrow layouts plus mode changes during exploration. Production release and live validation remain pending.

### Smart Lock instrument (#78)

Verify: dedicated door/frame and sliding-deadbolt surface with independent alarm, auto-lock and keyed-control feedback. Required setup stays in the gear popup. Existing Pi win contract is unchanged; live validation follows the PR deployment pipeline.

### Retail Payment Kiosk instrument (#86)

Verify: dedicated payment terminal with independently recovering reader, network and printer, plus an explicitly simulated receipt on complete restoration. Setup remains in the gear popup and Pi contracts are unchanged. Production/live validation follows the PR deployment pipeline.

### Traffic Signal Controller instrument (#84)

Verify: top-down intersection and controller status panel with explicitly simulated signal cycling. Named power/controller/timing/manual controls gate the preview; stale data and reduced motion stop cycling. Shared gear setup and Pi win contract remain unchanged. Production/live validation follows the PR pipeline.

### Field Radio instrument (#81)

Verify: dedicated rugged transceiver with independent channel-hop, encryption and transmit control indicators. RF strength is explicitly unmeasured; physical setup remains in the gear popup. Existing Pi contracts are unchanged. Production/live validation follows the PR pipeline.

### Device-facing label cleanup (#100)

Verify: all mode instruments use domain labels/current state, with no physical identifiers or target-position hints. Hardware mappings remain in opt-in gear setup and Help Fix. Epic and child issue acceptance plus repository guidance carry this requirement for future modes. Live validation follows the PR deployment pipeline.


### Drone Ground Control instrument (#87) - Verify
- Dedicated navigation scope and independent GPS, telemetry and uplink status with domain-only labels.
- Simulated takeoff on Game Mode ON/OFF completion; reduced-motion static airborne state, existing QR and reset preserved.
- No device contract or Pi firmware changes. Production/Pi display verification remains pending normal PR deployment.


### Industrial Robot Arm (#88) - Verify
- Guarded robot-cell schematic, articulated arm and read-only teach pendant with explicit interlocks.
- Simulated motion only after full restoration; no measured joints or physical machine commands.
- Local validation precedes normal PR deployment; live Pi checks remain under #70.

### Elevator (#83) - Verify
- Dedicated tall shaft, independent door/brake/inspection indicators and key states.
- Full-restoration-gated simulated travel, with no measured floor or position; static on stale/reduced motion.
- Production/Pi validation remains under #70 after normal deployment.

### EV Charger (#82) - Verify
- Charger/vehicle/cable schematic and vertical readiness chain with accurate semantic control bindings.
- Simulated energy animation gated by full restoration; no invented battery/rate or actual charging claim.
- Live Pi verification remains under #70 after normal deployment.

### Cold-Chain Sensor (#79) - Verify
- Dedicated logger with probe, threshold rails, unmeasured temperature and independent cloud-sync status.
- Explicit semantic keys; no fake temperature/history or storage-stability claims. Physical mappings remain opt-in.
- Live validation remains under #70 after normal deployment.

### Patient Monitor pilot (#85) - Verify
- Dual simulated waveform channels, independent leads/SpO2 status, prominent audible-alarm strip.
- Disconnected/stale/unpowered channels show unavailable without waveform or invented vital readings.
- Win copy describes restored controls; reduced motion is static. Live Pi validation remains under #70.

### Water Pump pilot (#80) - Verify
- Tank/relief/pump/outlet schematic with independent control status and simulated pressure/flow.
- Full restoration gates process animation; stale data, interlocks and reduced motion stop motion.
- Retain live Pi validation in #70 after normal PR deployment.

## Network / browser API

| Item | Type | Status | Notes |
|---|---|---|---|
| Private-network browser API boundary and diagnostics | Design/tooling | ⬜ Verify | Owner confirmed hosted Code App and game controls working. The network baseline is captured; Event Hub private-only configuration is prepared with trusted IoT Hub delivery and the VNet-integrated `gamefunc` reader. Deployment and live Pi-to-kiosk validation remain pending. |
| Entra staff authorization and client credential removal | Security | ⬜ TODO | Selected separate staff API + per-user Entra connector. Token validation, route separation and client migration implemented on feature branch; Entra registrations and consent recorded; automated staff provisioning added to app CI. IAM bootstrap, connector setup, generated bindings and live cutover remain pending. See docs/STAFF_API_WIRING.md. See docs/STAFF_API_SETUP.md and #177. |
