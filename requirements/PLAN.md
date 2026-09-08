# YOUR_PROJECT_NAME — Project Plan

Track implementation status in this file as work is added, deployed, and verified.

**Status legend:** `✅ Done`, `⬜ Verify`, `⬜ TODO`, `Future`

Game/kiosk work below tracks `power pages/GAME_MODE_PLAN.md` §10's phased build plan —
that document is the source of truth for scope/design; this file mirrors its status.

## Summary Scorecard

| Area | ✅ Done | ⬜ Verify | ⬜ TODO | Future | Total |
|---|---:|---:|---:|---:|---:|
| Dataverse | 0 | 2 | 1 | 0 | 3 |
| Flows | 0 | 0 | 1 | 0 | 1 |
| Agents | 6 | 0 | 1 | 0 | 7 |
| Power Pages | 3 | 0 | 1 | 0 | 4 |
| Plugins | 0 | 0 | 1 | 0 | 1 |
| Reports | 0 | 0 | 0 | 1 | 1 |
| Hardware | 1 | 0 | 1 | 1 | 3 |
| Integration (Azure Functions) | 0 | 0 | 2 | 0 | 2 |
| Power Apps | 0 | 0 | 1 | 0 | 1 |
| Testing | 0 | 0 | 1 | 0 | 1 |
| Totals | 10 | 2 | 10 | 2 | 24 |

## Dataverse

| Item | Type | Status | Notes |
|---|---|---|---|
| `andy_deviceprofile` + `andy_layout` choice | Table + choice | ⬜ Verify | GAME_MODE_PLAN.md §5, Phase 1 — built in the maker portal and unpacked into `solutions/CopilotIoTGame/` 2026-09-08; the 12 real device rows and end-to-end use aren't populated/exercised yet |
| `andy_gamewin`, `andy_prize` + choices/relationships | Tables | ⬜ TODO | GAME_MODE_PLAN.md §5, Phase 1 |
| `andy_gameboxstate` — singleton row tracking the active device | Table | ⬜ Verify | GAME_MODE_PLAN.md §5, Phase 2a — new as of 2026-09-08 (§4a); built and unpacked, not yet exercised by the Function endpoints below |

## Flows

| Item | Type | Status | Notes |
|---|---|---|---|
| Win-recording action from Copilot Studio resolved-topic | Cloud flow or native Copilot Studio action (TBD) | ⬜ TODO | GAME_MODE_PLAN.md §7/§8, bundled into Phase 4 — whether this is a Power Automate flow or a Copilot Studio native action is still open |

## Agents

| Item | Type | Status | Notes |
|---|---|---|---|
| Onboarding startup guardrail for Copilot/Claude workflows | Guardrail / onboarding workflow | ✅ Done | Added deterministic completion checker (`scripts/Test-OnboardingCompletion.ps1`), startup warning guidance, and bypass/audit contract (Issue #58). |
| GitHub auth preflight coverage by onboarding mode | Guardrail / onboarding workflow | ✅ Done | Expanded `Start-Onboarding.ps1` GitHub preflight behavior to be mode-aware (`local-only` advisory vs strict in `github-hosted` preflight), added token scope guidance/remediation, and documented strict hosted preflight examples in onboarding docs (Issue #63). |
| Onboarding success metrics and feedback loop | Governance / onboarding analytics | ✅ Done | Defined TTFS metric, standardized failure categories, established issue/discussion feedback intake, and documented weekly/monthly review ownership in `requirements/onboarding-input-contract.md`, `.github/PROJECT_BOARD_GUIDE.md`, and `.github/ISSUE_TEMPLATE/tracked-work.md` (Issue #56). |
| Template-origin defect reporting workflow for downstream repos | Governance / issue intake | ✅ Done | Added a dedicated issue template (`.github/ISSUE_TEMPLATE/template-origin-defect.md`), decision rule, and in-scope examples for onboarding/scripts/docs/folder mapping in `.github/PROJECT_BOARD_GUIDE.md` (Issue #68). |
| Onboarding quickstart docs for copy-template flow | Documentation / onboarding UX | ✅ Done | Added first-run quickstart, local-only vs github-hosted decision guide, preflight/completion troubleshooting, and manual-path migration notes across `README.md` and `PROJECT.md` (Issue #54). |
| Legacy script-doc cleanup and path normalization | Documentation / onboarding UX | ✅ Done | Audited older manual script guidance, moved `scripts/DEPLOYMENT_GUIDE.md` to onboarding-first quickstart with manual fallback, and normalized repo-root command paths in `scripts/QUICK_REFERENCE.md` (Issue #69). |
| Onboarding regression validation and maintenance checks | Validation / onboarding workflow | ✅ Done | Added repeatable onboarding regression script (`scripts/Test-OnboardingRegression.ps1`), artifact contract and compatibility checks, maintenance checklist (`scripts/ONBOARDING_MAINTENANCE_CHECKLIST.md`), and linked docs updates for quickstart/deployment guidance (Issue #55). |
| Copilot Studio: parametrize troubleshooting agent by `deviceSlug`, wire resolved-topic → win-creation action | Copilot Studio agent | ⬜ TODO | GAME_MODE_PLAN.md §8, Phase 4 — being built separately |

## Power Pages

| Item | Type | Status | Notes |
|---|---|---|---|
| `restore-and-spin`: `KioskInfoPage` + `KioskDevicePage`, all 11 devices, 10s reset timer (800×480 viewport) | Code Site pages | ✅ Done | GAME_MODE_PLAN.md §6, Phase 3 |
| `restore-and-spin`: `/play-spin` page, QR generation on kiosk win, wheel animation | Code Site page | ✅ Done | GAME_MODE_PLAN.md §7, Phase 6 — except real QR encoding (placeholder pattern) and the real claim call (depends on the Integration claim endpoint below) |
| `restore-and-spin`: all 11 device pages + content | Code Site content | ✅ Done | GAME_MODE_PLAN.md §11, Phase 7 |
| `restore-and-spin`: extend root `SignalRContext` to fetch current state on load and navigate on `deviceChanged` | Code Site — SPA change | ⬜ TODO | GAME_MODE_PLAN.md §4a, Phase 2c — new as of 2026-09-08 |

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
| `POST /api/set-mode`, `GET /api/kiosk-state`, `POST /api/negotiate` | Azure Function endpoints (`azure/`) | ⬜ TODO | GAME_MODE_PLAN.md §4a, Phase 2a — code written and compiles clean 2026-09-08, not yet deployed to a real Function App or exercised against live Dataverse/SignalR resources |
| Prize claim endpoint (validate token → weighted-pick → atomic decrement → mark claimed) | Azure Function endpoint | ⬜ TODO | GAME_MODE_PLAN.md §7/PRIZE_ENGINE_SPEC.md, Phase 5 — `PlaySpinPage` currently picks client-side as a stand-in |

## Power Apps

| Item | Type | Status | Notes |
|---|---|---|---|
| Staff control app — 12-tile device picker, Entra ID sign-in, calls `/api/set-mode` | Canvas app | ⬜ TODO | GAME_MODE_PLAN.md §4a, Phase 2d — new as of 2026-09-08 |

## Testing

| Item | Type | Status | Notes |
|---|---|---|---|
| Playwright e2e: mode-switch navigation (incl. mid-session reset), win → QR → claim → no-double-claim regression | E2E tests | ⬜ TODO | GAME_MODE_PLAN.md §10, Phase 8 |
