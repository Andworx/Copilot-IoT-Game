# YOUR_PROJECT_NAME — Project Plan

Track implementation status in this file as work is added, deployed, and verified.

**Status legend:** `✅ Done`, `⬜ Verify`, `⬜ TODO`, `Future`

## Summary Scorecard

| Area | ✅ Done | ⬜ Verify | ⬜ TODO | Future | Total |
|---|---:|---:|---:|---:|---:|
| Dataverse | 0 | 0 | 1 | 0 | 1 |
| Flows | 0 | 0 | 1 | 0 | 1 |
| Agents | 6 | 0 | 0 | 0 | 6 |
| Power Pages | 0 | 0 | 1 | 0 | 1 |
| Plugins | 0 | 0 | 1 | 0 | 1 |
| Reports | 0 | 0 | 1 | 0 | 1 |
| Totals | 6 | 0 | 5 | 0 | 11 |

## Dataverse

| Item | Type | Status | Notes |
|---|---|---|---|
| YOUR_DATAVERSE_ITEM | Table / choice / relationship | ⬜ TODO | Replace with the first Dataverse requirement for `YOUR_PROJECT_NAME` |

## Flows

| Item | Type | Status | Notes |
|---|---|---|---|
| YOUR_FLOW_ITEM | Cloud flow | ⬜ TODO | Replace with the first Power Automate requirement |

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

## Power Pages

| Item | Type | Status | Notes |
|---|---|---|---|
| Restore & Spin SPA | Portal page / SPA | ⬜ TODO | Full-page SPA scaffold created under `power pages/restore-and-spin/`. Requires `YOUR_WEBSITE_ID` token and table permissions configured in Power Pages admin centre before upload. |

## Plugins

| Item | Type | Status | Notes |
|---|---|---|---|
| YOUR_PLUGIN_ITEM | Dataverse plugin / step | ⬜ TODO | Replace with the first plugin requirement |

## Reports

| Item | Type | Status | Notes |
|---|---|---|---|
| YOUR_REPORT_ITEM | Power BI report / model | ⬜ TODO | Replace with the first reporting requirement |
