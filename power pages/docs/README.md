# Power Pages / Game — Docs

Architecture, UI, and prize-engine documentation for the Copilot IoT Game (kiosk +
prize/claim flow). Split into active references and a dated archive so it's clear at a
glance what to build against versus what's historical.

## Active references

| Doc | Covers |
|---|---|
| [`GAME_MODE_PLAN.md`](GAME_MODE_PLAN.md) | Overall architecture, Dataverse schema, software-defined mode control, win/claim flow, phased build plan. The master design doc — start here. |
| [`KIOSK_UI_SPEC.md`](KIOSK_UI_SPEC.md) | Visual/interaction spec for every kiosk screen — layouts, device roster content, spin/win screen behavior. |
| [`SHARED_CONTEST_ENTRY_MODEL.md`](SHARED_CONTEST_ENTRY_MODEL.md) | Shared contest/campaign, Contact identity, source caps, and grand-prize entry design for epic #121 / issue #123. |
| [`PLINKO_GAME_PLAN.md`](PLINKO_GAME_PLAN.md) | Plinko rules, `Plinko` solution schema, Pi landing contract, booth display, and operational views for epic #119 (#124/#127/#128). |

`GAME_MODE_PLAN.md`'s own prize-schema section (§5) is superseded by the current live
schema — see the archive below, specifically `PRIZE_DATA_MODEL_MIGRATION_STATUS.md`, for
what `andy_gamewin`/`andy_PrizeTypes`/`andy_Prizes` actually look like today.

## Archive (`archive/`)

Completed migrations and superseded specs, kept for historical reference only — **do not
build against anything in this folder**. Each file carries its own "ARCHIVED" banner
explaining what superseded it and where to look instead.

| Doc | Status | Superseded/completed by |
|---|---|---|
| [`archive/PRIZE_ENGINE_SPEC.md`](archive/PRIZE_ENGINE_SPEC.md) | Superseded 2026-09-09 | Original single-table `andy_prize` design (weight/remaining decrement). Replaced by the `andy_PrizeTypes`/`andy_Prizes` split below. |
| [`archive/PRIZE_DATA_MODEL_MIGRATION.md`](archive/PRIZE_DATA_MODEL_MIGRATION.md) | Done 2026-09-09 | The Dataverse-side migration plan (schema, seed data, decommission). |
| [`archive/PRIZE_DATA_MODEL_MIGRATION_STATUS.md`](archive/PRIZE_DATA_MODEL_MIGRATION_STATUS.md) | Done 2026-09-09 | Phase-by-phase status/checklist tracking the migration above to completion, including the Phase 6 decommission of `andy_prize`/`andy_prizecategory` and the `andy_PrizeEngine` solution split. This is the most detailed record of the final live state. |
| [`archive/PRIZE_CODE_MIGRATION.md`](archive/PRIZE_CODE_MIGRATION.md) | Done 2026-09-09 | The Azure Functions (`azure/src/lib/dataverse.ts`) backend rewrite against the new schema, deployed and smoke-tested live. |

## Why archive instead of delete

These docs record real decisions (why the schema looks the way it does, why a design was
replaced) that are useful context for anyone touching Prize-related code later, even
though they no longer describe the live system. Deleting them would lose that history;
leaving them un-flagged in the main folder risked someone building against a stale spec.
