# YOUR_PROJECT_NAME — Project Plan

Track implementation status in this file as work is added, deployed, and verified.

**Status legend:** `✅ Done`, `⬜ Verify`, `⬜ TODO`, `Future`

Game/kiosk work below tracks `power pages/docs/GAME_MODE_PLAN.md` §10's phased build plan —
that document is the source of truth for scope/design; this file mirrors its status.

## Summary Scorecard

| Area | ✅ Done | ⬜ Verify | ⬜ TODO | Future | Total |
|---|---:|---:|---:|---:|---:|
| Dataverse | 5 | 1 | 0 | 0 | 6 |
| Flows | 0 | 0 | 1 | 0 | 1 |
| Agents | 6 | 0 | 1 | 0 | 7 |
| Power Pages | 5 | 0 | 0 | 0 | 5 |
| Plugins | 0 | 0 | 1 | 0 | 1 |
| Reports | 0 | 0 | 0 | 1 | 1 |
| Hardware | 1 | 0 | 1 | 1 | 3 |
| Integration (Azure Functions) | 3 | 2 | 0 | 0 | 5 |
| Power Apps | 2 | 2 | 0 | 0 | 4 |
| Testing | 0 | 0 | 1 | 0 | 1 |
| Totals | 22 | 5 | 5 | 2 | 34 |

## Dataverse

| Item | Type | Status | Notes |
|---|---|---|---|
| `andy_deviceprofile` + `andy_layout` choice | Table + choice | ⬜ Verify | GAME_MODE_PLAN.md §5, Phase 1 — schema confirmed working end to end 2026-09-08 (1 real row, `smart-lock`, created and successfully driven a live kiosk navigation); 11 of 12 device rows still need authoring (§11) |
| `andy_gamewin` + choices/relationships | Table | ✅ Done | GAME_MODE_PLAN.md §5, Phase 1 — moved into unpacked solution for PAC pack/import, verified after environment import; `andy_prize` (the old singular table this row originally also tracked) is fully decommissioned as of 2026-09-09, see below |
| `andy_PrizeTypes`/`andy_Prizes` adopted from `Clawmachine` into `CopilotIoTGame`; `andy_gamewin`/`andy_Prizes` lookups; retire `andy_prize`/`andy_prizecategory` | Tables + columns + relationships | ✅ Done | `power pages/docs/archive/PRIZE_DATA_MODEL_MIGRATION.md` — tables added, new lookup/boolean columns hand-authored in unpacked XML and imported (2026-09-09); seed data entered and re-exported; icons fixed to real Fluent-icon web resources; `PRIZE_CODE_MIGRATION.md` backend cutover deployed and smoke-tested live; **Phase 6 decommission complete (2026-09-09)**: `andy_gamewin.andy_Prize` and (newly discovered) `andy_SessionPrizeWin.andy_PrizeName` lookup columns deleted, then `andy_prize`/`andy_prizecategory` tables deleted live, confirmed gone from both `CopilotIoTGame` and `Clawmachine` after fresh re-export |
| `andy_PrizeEngine` solution — new dedicated solution owning the shared `andy_PrizeTypes`/`andy_Prizes` tables + `Update Prize Type` flow, so `CopilotIoTGame` and `Clawmachine` reference (not co-own) them | Solution | ✅ Done | `/power-platform-architect` consolidation plan (2026-09-09) — removed duplicate `RootComponent` entries and two leftover Attribute/Entity Image Config "ghost" components from `Clawmachine`; `andy_SessionPrizeWin` (Clawmachine) also given proper `andy_PrizeType`/`andy_PrizeInstance` lookups (was still pointing at the old `andy_Prize` table, a gap not covered by the original migration doc) |
| `andy_gameboxstate` — singleton row tracking the active device | Table | ✅ Done | GAME_MODE_PLAN.md §5, Phase 2a — confirmed end to end 2026-09-08 by both `GET /api/kiosk-state` and a real `set-mode` write |
| `andy_deviceprofile.andy_isenabled` + `andy_gameboxstate.andy_gamemodeenabled` — per-mode disable + master Game Mode toggle | Boolean columns | ✅ Done | `/power-platform-architect` mode-control plan (2026-09-09) — created via Web API (`BooleanAttributeMetadata`), both default `true`/backfilled `true` on all existing rows so behavior was unaffected until explicitly toggled; confirmed live via `GET /api/device-profiles`/`kiosk-state` |

## Flows

| Item | Type | Status | Notes |
|---|---|---|---|
| Win-recording action from Copilot Studio resolved-topic | Cloud flow or native Copilot Studio action (TBD) | ⬜ TODO | GAME_MODE_PLAN.md §7/§8, bundled into Phase 4 — whether this is a Power Automate flow or a Copilot Studio native action is still open |

## Agents

| Item | Type | Status | Notes |
|---|---|---|---|
| Copilot Studio: parametrize troubleshooting agent by `deviceSlug`, wire resolved-topic → win-creation action | Copilot Studio agent | ⬜ TODO | GAME_MODE_PLAN.md §8, Phase 4 — being built separately |

## Power Pages

| Item | Type | Status | Notes |
|---|---|---|---|
| `restore-and-spin`: `KioskInfoPage` + `KioskDevicePage`, all 11 devices, 10s reset timer (800×480 viewport) | Code Site pages | ✅ Done | GAME_MODE_PLAN.md §6, Phase 3 |
| `restore-and-spin`: `/play-spin` page, QR generation on kiosk win, wheel animation | Code Site page | ✅ Done | GAME_MODE_PLAN.md §7, Phase 6 — except real QR encoding (placeholder pattern) and the real claim call (depends on the Integration claim endpoint below) |
| `restore-and-spin`: all 11 device pages + content | Code Site content | ✅ Done | GAME_MODE_PLAN.md §11, Phase 7 |
| `restore-and-spin`: root `SignalRContext` + `useDeviceSync` — fetch current state on load, navigate on `deviceChanged` | Code Site — SPA change | ✅ Done | GAME_MODE_PLAN.md §4a, Phase 2c — confirmed 2026-09-08: a live tab moved from `/kiosk/info` to `/kiosk/smart-lock` via an external `set-mode` call, no reload |
| `copilotiotgame`: Game Mode OFF branch on `KioskDevicePage` + new `SuccessPopup` component; auto-rotate to a random enabled mode via `pick-random-mode` after every completion (both Game Mode states) | Code Site — SPA change (`power pages/copilotiotgame`) | ✅ Done | `/power-platform-architect` mode-control plan (2026-09-09) — Game Mode ON keeps today's QR/phone-spin/claim flow unchanged; OFF skips `create-win` entirely (no `andy_gamewin` row, per decision to leave OFF completions unlogged) and shows a client-only success popup instead; both states call `POST /api/pick-random-mode` on completion instead of resetting to the same device. Built clean and deployed via `pac pages upload-code-site` |

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
| Panel Pi (`hardware/raspberry-pi/`): switches, LEDs, connector jacks, rotary mux scanner, all 12 `logic_maps/<slug>.json` files, Azure IoT Hub telemetry publisher | Raspberry Pi firmware | ✅ Done | Verified against real hardware 2026-09-07/08; see README.md's wiring diagram and design notes |
| Panel Pi: add IoT Hub cloud-to-device receive-loop to `panel_controller.py` | Raspberry Pi firmware | ⬜ TODO | GAME_MODE_PLAN.md §4a, Phase 2b — replaces local dial read with an externally-set mode |
| Physical rotary dial as a third `/api/set-mode` input, once the spare CD74HC4067 is soldered and verified | Raspberry Pi hardware | Future | GAME_MODE_PLAN.md §4a — the first mux chip was confirmed defective during bring-up; not scheduled, the Power App control alone unblocks the demo |

## Integration (Azure Functions)

| Item | Type | Status | Notes |
|---|---|---|---|
| `GET /api/kiosk-state`, `GET /api/device-profiles` | Azure Function endpoints (`azure/`) | ✅ Done | GAME_MODE_PLAN.md §4a, Phase 2a — confirmed 2026-09-08 end to end against live Dataverse on `func-aw-azcom-copilot-iot-game` (Node 22, `restore-and-spin-function` as a Dataverse Application User) |
| `POST /api/set-mode`, `POST /api/negotiate` | Azure Function endpoints (`azure/`) | ✅ Done | GAME_MODE_PLAN.md §4a, Phase 2a — confirmed 2026-09-08: a real `set-mode` call (from Game Box Control) wrote `andy_gameboxstate` and broadcast over `negotiate`'s SignalR hub to a live kiosk tab, which navigated with no reload |
| `POST /api/prizes`, `POST /api/create-win`, `POST /api/claim-prize` (validate token → weighted-pick prize **type** → atomic-claim a prize **instance**, falling back to the designated fallback type → mark claimed) | Azure Function endpoints (`azure/`) | ⬜ Verify | `power pages/docs/archive/PRIZE_CODE_MIGRATION.md` — rewritten against the new `andy_PrizeTypes`/`andy_Prizes` split (was the old single-row `andy_prize` decrement), deployed to `func-aw-azcom-copilot-iot-game` and smoke-tested live 2026-09-09 (all 3 endpoints + a real claim verified against `andy_gamewin`'s binds); fixed a live-only OData `in`-operator rejection along the way. Needs `⬜ Verify`: seeded Prize Type data has only 1 active non-fallback type (`Trick or Treat Candy`) with zero instance stock, so every real claim currently falls through to the fallback (`Pin or Sticker`) — see `power pages/docs/archive/PRIZE_DATA_MODEL_MIGRATION_STATUS.md` for the maker-portal decision needed (add instance stock and/or reactivate the other 3 seeded types) |
| `POST /api/toggle-device`, `POST /api/set-game-mode`, `POST /api/pick-random-mode` | Azure Function endpoints (`azure/`) | ✅ Done | `/power-platform-architect` mode-control plan (2026-09-09) — `toggle-device`/`set-game-mode` are function-key gated like `set-mode`; `pick-random-mode` is anonymous like `create-win`/`claim-prize` (kiosk-triggered, no staff auth available) and reuses the existing `setActiveDeviceProfile` write + `deviceChanged` SignalR broadcast. Deployed and smoke-tested live: confirmed a disabled device is never picked, `kiosk-state`/`device-profiles` correctly surface the new flags |
| Consolidated Azure deployment target | Azure Function App + GitHub Actions | ⬜ Verify | Issue #13 — new Node 22 Flex Consumption Function App `func-aw-azcom-iot-game` created in `rg-aw-azcom-iot-copilot` with dedicated storage `stawazcomiotgamefn`, shared Serverless SignalR `signalr-aw-iot-copilot`, app settings, CORS, GitHub variable update, and Website Contributor RBAC for the GitHub OIDC identity. Needs `⬜ Verify`: full GitHub deployment from `main`, Power Pages build using the new API base URL, and end-to-end Function/SignalR smoke test before deleting the old resource group. |

## Power Apps

| Item | Type | Status | Notes |
|---|---|---|---|
| Game Box Control — device picker, calls `/api/set-mode` | Power Apps Code App (`power apps/game-box-control`) | ⬜ Verify | GAME_MODE_PLAN.md §4a, Phase 2d — built as a Code App (not Canvas) for a normal React dev loop; app logic confirmed 2026-09-08 driving a live kiosk navigation via `npm run dev`, but `pac code init`/`pac code push` (PAC_COMMANDS.md) haven't run yet — not yet actually published as a governed Power App with real Entra ID gating |
| Game Box Control CI/CD deployment | GitHub Actions + PAC Code App push | ⬜ Verify | Issue #17 — PR builds validate `power apps/game-box-control`; main deploy rebuilds it with protected function-key secrets and runs `pac code push --environment ... --solutionName CopilotIoTGame`. Verify after merge by checking the Actions run and live authorized control app. |
| "Copilot Iot Game Backend" model-driven app renamed to **Game Backend**; Prize Management nav repointed at `andy_prizetypes`/`andy_prizes` | Model-driven app (`andy_CopilotIotGameBackend`) | ⬜ Verify | `power pages/docs/archive/PRIZE_DATA_MODEL_MIGRATION.md` Phase 4 — `AppModule.xml`/`AppModuleSiteMap.xml`/security role edits packed and imported successfully into `andworx-development` (2026-09-09) alongside the new Prize Types/Prizes schema; needs a live check that the app displays the renamed title and the Prize Management nav resolves correctly |
| Bulk Add Prizes — genpage in Game Backend to bulk-create `andy_Prizes` rows from a Prize Type + quantity | Generative page (`power apps/bulk-add-prizes/bulk-add-prizes.tsx`) | ✅ Done | Deployed live via `pac model genpage upload` (page-id `2b55fe56-e580-40df-9ac6-b7a10ee8517f`), added to the app sitemap and to the `CopilotIoTGame` solution; user confirmed working in the browser (2026-09-09) |
| Game Box Control — master "Game Mode" switch + per-tile enable/disable toggle | Power Apps Code App (`power apps/game-box-control`) | ✅ Done | `/power-platform-architect` mode-control plan (2026-09-09) — calls the new `toggle-device`/`set-game-mode` endpoints; disabled tiles are visually distinct and non-selectable for manual mode-setting too. Built clean (`npm run build`); not yet published as a governed Power App (`pac code push`), same as the base device picker below |
| Game Box Control — Prize Management section, bulk-creates `andy_Prizes` rows via new `/api/bulk-create-prizes` + `/api/prize-types` endpoints | Power Apps Code App (`power apps/game-box-control`, `PrizeManagement.tsx`) | ⬜ Verify | Brings the Bulk Add Prizes genpage's capability into Game Box Control so staff don't have to leave it; the genpage itself (row above) is left running as a redundant alternate entry point, untouched. Needs `npm run dev`/`npm run build` verification end to end against a live environment, same as the other two Game Box Control rows above — not yet `pac code push`ed either |

## Testing

| Item | Type | Status | Notes |
|---|---|---|---|
| Playwright e2e: mode-switch navigation (incl. mid-session reset), win → QR → claim → no-double-claim regression | E2E tests | ⬜ TODO | GAME_MODE_PLAN.md §10, Phase 8 |
