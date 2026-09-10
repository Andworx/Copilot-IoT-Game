# Prize Data Model Migration — Execution Plan

> **✅ ARCHIVED — completed 2026-09-09.** This migration shipped and was verified live
> (schema, seed data, icons, and the Phase 6 decommission of `andy_prize`/
> `andy_prizecategory` are all done — see
> [`PRIZE_DATA_MODEL_MIGRATION_STATUS.md`](PRIZE_DATA_MODEL_MIGRATION_STATUS.md) for the
> final state). Kept for historical reference only — do not use as a live task list.

Companion to [`PRIZE_ENGINE_SPEC.md`](PRIZE_ENGINE_SPEC.md) (the original design) and
[`PRIZE_CODE_MIGRATION.md`](PRIZE_CODE_MIGRATION.md) (the backend/frontend side of this
same change). This document is the **data-model side only** — everything you do by hand
in the maker portal, in the order it has to happen. Nothing in this document is code;
it's the schema and Dataverse work that the code migration depends on.

## Why this migration exists

The prize engine was originally built against a single `andy_prize` table with a plain
`andy_remaining` counter, cloned from an older, simpler design. Partway through building
it, two things changed the plan:

1. You'd already solved this exact problem better once before — the **Clawmachine**
   solution (`solutions/Clawmachine`) has a `andy_PrizeTypes` + `andy_Prizes` pair: a
   catalog table (type, with rarity) and an individual-instance table (one row per
   physical unit, each markable as taken). That's a real inventory model instead of a
   counter that has to be kept in sync by hand.
2. You want this to run **year over year** — last year's claw machine, this year's box
   game, next year's whatever-comes-next — without rebuilding the prize system each
   time. Dataverse tables aren't exclusive to one solution: the same live table can be a
   component of multiple solutions. So instead of cloning the claw machine's design
   again, the plan is to literally **add the existing `andy_PrizeTypes`/`andy_Prizes`
   tables to the `CopilotIoTGame` solution** and build this year's game on top of the
   same catalog, retiring last year's prize types and adding this year's as you go —
   one continuously-evolving catalog, not a per-year rebuild (confirmed decision — no
   separate Event/Season table).

The `andy_prize`/`andy_prizecategory` tables that got built earlier this session
(cloned from an even older single-table design) become dead weight once this lands.
This document's back half covers decommissioning them cleanly — removing every
reference to them *before* deleting them, in dependency order, so nothing breaks along
the way.

## Current state (as of this plan)

- **`andy_prize`** (in `CopilotIoTGame`) — the table built earlier this session. Has
  `andy_prizename`, `andy_weight`, `andy_remaining` (recently converted to a Power Fx
  formula column), `andy_isfallback`, `andy_categoryname` (lookup → `andy_prizecategory`),
  `andy_imageurl`, `andy_totalawarded`, `andy_quantityavailable`. Five real seed rows
  exist (Bluetooth Speaker, Amazon Gift Card, Action Figure, Teddy Bear, Mini Robot) but
  are missing `andy_weight`/`andy_isfallback` values — never finished being wired up.
  `andy_value`/`andy_isactive` were already removed.
- **`andy_prizecategory`** (in `CopilotIoTGame`) — only referenced by `andy_prize`'s
  category lookup. Nothing else uses it.
- **`andy_gamewin`** (in `CopilotIoTGame`) — has a lookup `andy_Prize` → `andy_prize`
  (relationship `andy_gamewin_prize`), set by the claim endpoint on a successful claim.
- **`andy_PrizeTypes`**, **`andy_Prizes`** (in `Clawmachine`, not yet in
  `CopilotIoTGame`) — the tables this migration adopts. `andy_Prizes.andy_PrizeWinner`
  is currently plain text, not a lookup.
- **"Copilot Iot Game Backend"** model-driven app (`andy_CopilotIotGameBackend`) — has a
  Prize Management nav area pointing at `andy_prize`/`andy_gamewin`, built in an earlier
  commit (`295d971`).

## Phase 0 — Pre-flight

Do this before touching anything, so there's a rollback point and a clear "before"
snapshot.

1. Confirm you're in the `andworx-development` environment, `CopilotIoTGame` solution
   context (not the default/unmanaged root).
2. `pac solution export` + `pac solution unpack` the current state of `CopilotIoTGame`
   into `solutions/CopilotIoTGame` (if you have local edits not yet exported, export now
   so there's a clean baseline commit before this migration starts).
3. Confirm the export is committed to git (or at least staged) so there's a real
   rollback point if something in the phases below goes wrong.

## Phase 1 — Bring the shared tables into this solution

1. `make.powerapps.com` → your environment → open the **CopilotIoTGame** solution.
2. **Objects → + Add existing → Table.**
3. Search for and add:
   - **Prize Types** (`andy_PrizeTypes`)
   - **Prizes** (`andy_Prizes`)
4. When prompted about including related metadata (forms, views, charts), include
   everything — you want this solution to fully own displaying these tables, not just
   reference them.
5. Save.

At this point `CopilotIoTGame` and `Clawmachine` both reference the same live
`andy_PrizeTypes`/`andy_Prizes` tables and share the same data. That's intentional —
it's the whole point.

## Phase 2 — Extend the schema for this game's claim flow

The claw machine's schema doesn't have a concept of "which game win claimed this prize
instance" — it didn't need one, a claw machine doesn't have a separate win-detection
step. This game does (`andy_gamewin`), so two new columns are needed.

1. **On `andy_Prizes`**, add a new column:
   - Display name: **Game Win**
   - Schema name: `andy_gamewin`
   - Type: **Lookup** → `andy_gamewin`
   - Required: Optional (null until claimed)
   - Delete behavior when prompted: **Restrict** (this project's convention — never
     cascade-delete, see `tables/CLAUDE.md`'s equivalent guidance, now folded into this
     document since `tables/` itself is retired)
   - Leave the existing `andy_PrizeWinner` (plain text) column in place, just unused
     going forward. Dataverse can't retype a column in place, and deleting it isn't
     worth the churn for a field nothing will write to anymore.

2. **On `andy_gamewin`**, add two new columns:
   - **Prize Type** — schema name `andy_prizetype`, Lookup → `andy_PrizeTypes`,
     Optional, delete behavior Restrict. This is what most reporting will actually want
     ("what kind of prize did this win get") without needing to join through the
     instance row.
   - **Prize Instance** — schema name `andy_prizeinstance`, Lookup → `andy_Prizes`,
     Optional, delete behavior Restrict. This is the specific physical/awardable unit
     that got claimed.
   - Leave the existing `andy_Prize` lookup (→ the old `andy_prize` table) in place for
     now, unused. It gets removed in Phase 6, not here — removing it now would break the
     currently-deployed claim endpoint before the code migration has cut over (see
     `PRIZE_CODE_MIGRATION.md`).

3. Save both tables.

## Phase 3 — Seed data

1. **Prize Types** — create one row per real prize, migrating the intent from the old
   `andy_prize` rows:

   | `andy_prizetypename` | `andy_weight` (odds) | `andy_rarity` | Notes |
   |---|---:|---:|---|
   | Bluetooth Speaker | 10 | *(your call)* | |
   | Amazon Gift Card | 5 | | |
   | Action Figure | 25 | | |
   | Teddy Bear | 30 | | |
   | Mini Robot | 20 | | |
   | Sticker | — | — | The fallback type (see below) |

   `andy_weight` is what actually drives odds now, replacing the old `andy_value`
   field's role — higher weight, more common. `andy_PrizeTypes` doesn't have an
   `andy_isfallback` column today (the claw machine never needed a fallback concept) —
   **add one**: Yes/No, required, default No, same meaning as the old `andy_prize`
   column (exactly one row should be Yes, the empty-pool safety valve).

2. **Prizes (instances)** — for every *non-fallback* type, create one row per physical
   unit, each with `andy_prizetype` pointing at its type and `andy_prizetaken = No`:
   - Bluetooth Speaker × 8
   - Amazon Gift Card × 5
   - Action Figure × 10
   - Teddy Bear × 20
   - Mini Robot × 15

   **Do not create instance rows for the Sticker (fallback) type.** The fallback is
   designed to be exempt from instance-tracking entirely — the claim logic treats it as
   always claimable when the real pool is empty, so there's no "run out of stickers"
   failure mode and no need to seed thousands of rows for effectively-unlimited stock.

## Phase 4 — Update the staff-facing app

The "Copilot Iot Game Backend" model-driven app currently has a Prize Management nav
area pointing at the old `andy_prize`/`andy_gamewin`. Update it to point at the real
tables instead of the retired ones:

1. Open the **Copilot Iot Game Backend** app in app designer (or edit its sitemap
   directly).
2. In the Prize Management area, replace the `andy_prize` entity reference with
   **Prize Types** and **Prizes**.
3. Leave the `andy_gamewin` reference as-is — that table isn't changing, only what it
   links to.
4. Save and publish the app.
5. Update the **security role** ("Copilot IoT Game Security Role") to grant the
   Function App's service principal (and any staff users) access to `Prize Types` and
   `Prizes` — Create/Read/Write as appropriate. The old `andy_prize`/`andy_prizecategory`
   privileges can stay for now; they get cleaned up in Phase 6 alongside the tables
   themselves.

## Phase 5 — Cutover checkpoint

**Stop here and export.** `pac solution export` + `pac solution unpack` into
`solutions/CopilotIoTGame`, commit it. This gives the code migration
(`PRIZE_CODE_MIGRATION.md`) real, current field and navigation-property names to build
against — the same "verify against the actual export before writing code" discipline
that caught the `andy_ActiveDeviceProfile` and `andy_prizename` naming surprises earlier
in this project. Do not start Phase 6 until the code migration is deployed and confirmed
working end to end against `Prize Types`/`Prizes` — Phase 6 removes the fallback the old
code path depends on.

## Phase 6 — Decommission the old tables

Only do this after `PRIZE_CODE_MIGRATION.md` is fully deployed and a real claim has been
tested successfully against the new tables. This phase deletes things; there's no undo
once a table is gone.

Dataverse enforces dependency order on deletion — it will refuse to delete a table or
column that's still referenced by a relationship, an app component, or a security role
privilege that hasn't been cleaned up. The order below exists because of that, not just
for tidiness: each step removes exactly the thing that would otherwise block the next
one.

1. **Remove `andy_Prize` from the Copilot Iot Game Backend app's sitemap**, if you
   didn't already fully remove it (rather than just adding the new tables alongside it)
   in Phase 4. Save and publish.
2. **Remove `andy_prize`/`andy_prizecategory` privileges from the security role.** Not
   strictly required before table deletion, but do it now so the role doesn't reference
   entities that are about to stop existing.
3. **Delete the `andy_Prize` lookup column on `andy_gamewin`** (the one added back when
   this table was first built, pointing at the old `andy_prize` table). This removes the
   `andy_gamewin_prize` relationship as a side effect — you delete the *column*, not the
   relationship directly; Dataverse tears down the relationship for you.
   - Confirm first that nothing still reads or writes this column — check
     `PRIZE_CODE_MIGRATION.md`'s cutover confirmed the new `andy_prizetype`/
     `andy_prizeinstance` columns are what the deployed code actually uses.
4. **Delete the `andy_prize` table.** This is the referencing side of the
   `andy_Prize_andy_CategoryName_andy_PrizeCategory` relationship, so deleting it also
   tears down that relationship — `andy_prizecategory` becomes unreferenced as a result,
   which is what makes step 5 possible.
5. **Delete the `andy_prizecategory` table.** Nothing references it anymore once step 4
   is done.
6. **Remove the now-orphaned choice, if applicable.** `andy_gamewinstatus` and
   `andy_redemptionstatus` are **not** part of this cleanup — they belong to
   `andy_gamewin` directly and aren't touched by any of this. Nothing from the prize-type
   migration orphans a global choice; skip this step, it's listed only so you don't
   accidentally delete something still in use while cleaning up.
7. **Export and commit.** `pac solution export` + `pac solution unpack`, verify the diff
   shows `andy_prize`/`andy_prizecategory` fully removed from
   `solutions/CopilotIoTGame`, commit.

## After this migration

- Update `requirements/PLAN.md`'s prize-engine scorecard row to reflect the new table
  names and ✅/⬜ status once Phase 6 is confirmed.
- `tables/andy_prize/` and `tables/andy_gamewin/` markdown docs were already retired
  project-wide in favor of the solution export as the schema source of truth (commit
  `2fac63d`) — no doc cleanup needed there, they're already gone.
- Next year's game: repeat Phase 3 (retire this year's now-irrelevant Prize Types by
  setting them Inactive, add next year's, seed new instance rows) — Phases 1/2 don't
  need repeating, the tables are already shared infrastructure at that point.
