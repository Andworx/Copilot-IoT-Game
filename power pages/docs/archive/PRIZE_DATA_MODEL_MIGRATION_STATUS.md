# Prize Data Model Migration — Status & Remaining Manual Steps

> **✅ ARCHIVED — migration complete as of 2026-09-09.** All phases (1–6, including the
> Phase 6 decommission of `andy_prize`/`andy_prizecategory` and the Prize Engine solution
> split) are done and verified live. Kept for historical reference — the only open item is
> the live Prize Type data gap noted near the bottom (not a code/schema task).

Companion to [`PRIZE_DATA_MODEL_MIGRATION.md`](PRIZE_DATA_MODEL_MIGRATION.md), which is
the authoritative phase-by-phase plan. This file tracks what's actually been done in the
repo vs. what still requires hands-on work in the live `andworx-development` environment,
and gives the maker-portal work a precise spec to build against.

## Repo-side changes completed (2026-09-09)

- **App renamed**: "Copilot Iot Game Backend" → **"Game Backend"** in both
  `solutions/CopilotIoTGame/AppModules/andy_CopilotIotGameBackend/AppModule.xml` and
  `AppModuleSiteMaps/andy_CopilotIotGameBackend/AppModuleSiteMap.xml` (`LocalizedNames`).
  The app's unique/schema name (`andy_CopilotIotGameBackend`) was kept as-is — only the
  display name changed, since the unique name isn't user-facing and renaming it would be
  a needless breaking change to the AppModule's identity.
- **Sitemap cleaned up**: the sitemap previously had a duplicate/leftover "Prize
  Management" `Area` (one nested under "Game Management", one a top-level sibling both
  pointing at `andy_prize`/`andy_gamewin`) — consolidated to a single Prize Management
  group under "Game Management", with new `SubArea` entries added for `andy_prizetypes`
  and `andy_prizes` alongside the still-present `andy_prize` (kept until Phase 6 per the
  migration doc's own cutover sequencing).
- **AppModule components**: added `andy_prizetypes`/`andy_prizes` as
  `AppModuleComponent` entries in `AppModule.xml`, `andy_prize` retained for now.
- **Security role**: added matching `prv{Append,AppendTo,Assign,Create,Delete,Read,
  Share,Write}andy_PrizeTypes` / `...andy_Prizes` Global-level privileges to
  `Copilot IoT Game Security Role.xml`, mirroring the existing `andy_Prize` pattern.
  `andy_prize`/`andy_prizecategory` privileges retained for now (removed in Phase 6).
- **`requirements/PLAN.md`** updated: new Dataverse row tracking this migration
  end-to-end, new Power Apps row tracking the app rename/repoint, scorecard totals
  updated.

## ✅ Imported successfully (2026-09-09)

Phase 1 (existing `andy_PrizeTypes`/`andy_Prizes` tables added to the solution) and Phase 2
(new lookup/boolean columns below) were done by the user adding the tables live, exporting
+ unpacking, then hand-authoring the Phase 2 schema directly in the unpacked XML (rather
than round-tripping through the maker portal for each column) — packed and imported back
into `andworx-development`, **and the import succeeded**:

- `andy_Prizes.andy_GameWin` (lookup → `andy_GameWin`, optional)
- `andy_GameWin.andy_PrizeType` (lookup → `andy_PrizeTypes`, optional)
- `andy_GameWin.andy_PrizeInstance` (lookup → `andy_Prizes`, optional)
- `andy_PrizeTypes.andy_IsFallback` (Yes/No, required, default No)

New relationships: `andy_prizes_GameWin_andy_gamewin`, `andy_gamewin_PrizeType_andy_prizetypes`,
`andy_gamewin_PrizeInstance_andy_prizes`.

Phase 3 (seed data) is done live — see "✅ Seed data + genpage + icons" below.

## ✅ Seed data + genpage + icons (2026-09-09)

- **Phase 3 (seed data)**: Prize Types and Prizes seeded live per the spec below by the
  user, and the solution was re-exported (`pac solution export` + `unpack`) into
  `solutions/CopilotIoTGame` — matches the schema already imported.
- **Bulk Add Prizes genpage**: built and deployed live to the **Game Backend** app
  (`andy_CopilotIotGameBackend`, app-id `b3e4d83d-ccab-f111-aaac-7ced8dd8cdea`) via
  `pac model genpage upload`. Page ID `2b55fe56-e580-40df-9ac6-b7a10ee8517f`, added to the
  app's sitemap. Lets a maker pick a Prize Type + quantity and bulk-create that many
  `andy_Prizes` rows (auto-filling the required Name/Info from the Prize Type). Source at
  `power apps/bulk-add-prizes/bulk-add-prizes.tsx`. Also added to the `CopilotIoTGame`
  solution (`appmodule` type 80 + `uxagentproject`/genpage — this org's real
  `ObjectTypeCode` is **11296**, not the generic tooling default of 10372).
- **Table icons fixed** (repo-only so far — **needs pack + import**, see below):
  - `andy_Prizes.IconVectorName`: was `andy_mdiprize` (broken/nonexistent web resource) →
    now `andy_prize_icon`, which already existed in `WebResources/` with the correct
    Fluent "Gift" SVG (same one the old `andy_Prize` singular table already used) — just
    wasn't wired up on the new plural table yet.
  - `andy_PrizeTypes.IconVectorName`: was `andy_gameiconstargetprize` (broken/nonexistent)
    → now `andy_prizetype_icon`, a **new** web resource added at
    `WebResources/andy_prizetype_icon(.data.xml)` using the Fluent "Tag" icon (same
    Iconify Fluent Regular style as `andy_gamewin_icon`'s trophy and `andy_prize_icon`'s
    gift), registered as a `type="61"` `RootComponent` in `Other/Solution.xml`.
  - **Action needed**: `pac solution pack` + `pac solution import` to push these icon
    changes live (the genpage above is already live — only the icon fix is pending
    import).

## Why the rest can't be done as repo file edits

Phase 3 of the migration doc is fundamentally a live-Dataverse operation:

- **Phase 3** (seed data) is live data entry, not solution metadata at all.

The precise specs below are what to build in the maker portal.

## Maker-portal checklist (Phase 3 — do this next)

### ~~Phase 1 — Add existing tables~~ ✅ Done
### ~~Phase 2 — New columns~~ ✅ Done — imported successfully (see above)
**Prize Types** (one row per real prize; exactly one row, Sticker, must have
`andy_isfallback = Yes`):

| `andy_prizetypename` | `andy_weight` | `andy_isfallback` |
|---|---:|---|
| Bluetooth Speaker | 10 | No |
| Amazon Gift Card | 5 | No |
| Action Figure | 25 | No |
| Teddy Bear | 30 | No |
| Mini Robot | 20 | No |
| Sticker | — | **Yes** |

**Prizes (instances)** — one row per physical unit for every non-fallback type, each
with `andy_prizetype` set and `andy_prizetaken = No`. **Do not** create instance rows for
Sticker.

| Type | Instance count |
|---|---:|
| Bluetooth Speaker | 8 |
| Amazon Gift Card | 5 |
| Action Figure | 10 |
| Teddy Bear | 20 |
| Mini Robot | 15 |

### After Phase 3 (seed data) is done live
1. `pac solution export` + `pac solution unpack` into `solutions/CopilotIoTGame`, commit
   (confirms the file-level state matches the already-imported schema; seed data itself
   isn't solution metadata so there's nothing new to unpack for that part).
2. Proceed to `PRIZE_CODE_MIGRATION.md` for the backend/frontend cutover.
3. Only after that cutover is deployed and a real claim tested successfully against
   `Prize Types`/`Prizes`, apply the Phase 6 decommission edits described below.

## ✅ Prize code migration cutover (2026-09-09)

`PRIZE_CODE_MIGRATION.md` is done and deployed live:

- Rewrote `azure/src/lib/dataverse.ts`: removed the old single-row `andy_prize`
  functions (`listActivePrizes`, `fetchEligiblePrizes`, `fetchFallbackPrize`,
  `tryClaimPrizeRow`, `pickWeighted`, etc.) and added `listActivePrizeTypes()` +
  a weighted-**type**-pick + atomic-**instance**-claim algorithm against
  `andy_prizetypeses`/`andy_prizeses` (confirmed entity set names — both
  double-pluralize since the logical names already end in "s"). `claimGameWin()` now
  binds `andy_gamewin.andy_PrizeType`/`andy_PrizeInstance` instead of the old
  `andy_gamewin.andy_Prize`.
- **Weight column correction**: `PRIZE_CODE_MIGRATION.md` assumed a `andy_weight`
  column on `andy_PrizeTypes` — that column doesn't exist. Confirmed live schema only
  has `andy_rarity` (int); used directly as the pick weight per user decision (higher
  rarity number = more likely).
- **Bug found + fixed during smoke test**: the untaken-instances query used the OData
  `in` operator (`_andy_prizetype_value in (...)`), which this environment's Dataverse
  rejects (`"The query node In is not supported"`, HTTP 501). Rewrote as an OR-chain
  filter (`_andy_prizetype_value eq guid1 or ... `), confirmed working.
- Updated `azure/src/functions/prizes.ts` to call `listActivePrizeTypes`. No changes
  needed to `claimPrize.ts`/`createWin.ts`, or either Power Pages SPA (per the doc's
  own scoping — the public API contract is unchanged).
- `npm run build` compiled clean; deployed via
  `func azure functionapp publish func-aw-azcom-copilot-iot-game --typescript`.
- **Smoke-tested end to end** against the live env: `GET /api/prizes`,
  `POST /api/create-win`, `POST /api/claim-prize` all succeeded; verified the claimed
  `andy_gamewin` row's `_andy_prizetype_value`/`_andy_prizeinstance_value` binds
  directly via the Web API.

### ⚠️ Live data gaps found during smoke testing (not code bugs — need a decision)

- **`andy_isfallback` was `null` on every seeded Prize Type row** (not explicit
  `true`/`false`), so `eq false`/`eq true` filters matched nothing and `/api/prizes`
  came back empty. **Fixed live**: `Pin or Sticker` → Is Fallback = Yes, the other 4
  types → Is Fallback = No.
- Of the 5 seeded Prize Types, only **`Trick or Treat Candy`** and **`Pin or Sticker`**
  (the fallback) are `statecode = 0` (Active); `Coffee Gift Card`, `JBL Speaker`, and
  `Ring Pop` are Inactive. **`Trick or Treat Candy` currently has zero untaken
  `andy_Prizes` instance rows**, so every real claim right now falls straight through
  to the fallback (`Pin or Sticker`) — this is the code working as designed, but means
  the wheel effectively only awards the fallback until either `Trick or Treat Candy`
  gets instance stock (use the Bulk Add Prizes genpage) or the other 3 types are
  intentionally reactivated. **Needs a maker-portal decision, not a code change.**

## ✅ Prize Engine solution split + Wins cleanup + old-table decommission (2026-09-09)

`/power-platform-architect`'s consolidation plan is done and deployed live:

### Phase A — New `andy_PrizeEngine` solution
- Created `andy_PrizeEngine` ("Prize Engine"), publisher `Andworx` (prefix `andy`).
- Added `andy_PrizeTypes`, `andy_Prizes`, and the `Update Prize Type` cloud flow as its
  components — the single owner of the shared Prize tables going forward.
- Removed `andy_PrizeTypes`/`andy_Prizes` as duplicate `RootComponent`s from both
  `Clawmachine` and `CopilotIoTGame` (they'd been redundantly co-owned by up to 3
  solutions). Also removed two leftover "ghost" components from `Clawmachine`
  (Attribute/Entity Image Config, types 431/432, tied to `andy_PrizeTypes.andy_prizeimage`)
  and the duplicate `Update Prize Type` flow registration. The tables/flow remain fully
  usable by both apps — solution ownership and app usability are independent; only the
  redundant co-ownership was removed.
- All three solutions re-exported/unpacked to confirm the split landed cleanly.

### Phase B — Fixed both "prize wins" tables
- **`andy_GameWin` (CopilotIoTGame)**: added `andy_PrizeType`/`andy_PrizeInstance`
  controls to the main form; removed the old `andy_Prize` control. Imported live.
- **`andy_SessionPrizeWin` (Clawmachine)** — new finding, not in the original migration
  doc: was still lookup-bound to the **old** `andy_Prize` table
  (`andy_SessionPrizeWin_andy_PrizeName_andy_Prize`). Added new
  `andy_PrizeType`/`andy_PrizeInstance` lookup columns (new relationship files under
  `Clawmachine/Other/Relationships/andy_PrizeTypes.xml`/`andy_Prizes.xml`), added them to
  the main form and the default "Active Session Prize Wins" view, removed the old
  `andy_PrizeName` control from both. Imported live; verified the new columns are
  queryable via the Web API.
- **`Update Prize Type` flow**: verified its logic already targets the current schema
  (`andy_prizeses`/`andy_prizetypeses`, filtering `andy_prizetaken`/`andy_prizetype`) —
  no changes needed. It's a complementary auto-retire-when-sold-out mechanism,
  independent of the Azure Functions prize-pick logic.

### Phase C — Old tables fully decommissioned
1. Deleted `andy_gamewin.andy_Prize` lookup column live.
2. Deleted `andy_SessionPrizeWin.andy_PrizeName` lookup column live (new finding from
   Phase B — not in the original migration doc's decommission list).
3. Confirmed CopilotIoTGame's sitemap/AppModule already had no `andy_prize` entries
   (already clean from earlier work). Removed the 8 `prv*andy_Prize` security-role
   privileges from `Roles/Copilot IoT Game Security Role.xml` — Dataverse had in fact
   already auto-removed them from the live role the moment the table was deleted, so this
   local edit just matches reality.
4. Deleted `andy_Prize` table, then `andy_PrizeCategory` table, live (only
   system-standard relationships — sync errors, duplicate detection, async operations,
   etc. — remained pointing at either table; no custom lookups left after Phase B/step 1-2).
5. Re-exported/unpacked both `Clawmachine` and `CopilotIoTGame` fresh from the
   post-deletion live state — confirmed `Entities/andy_Prize/`, `Entities/andy_PrizeCategory/`,
   and their relationship files are gone from both, and neither `Solution.xml` lists them.

### ⚠️ Cross-solution dependency — resolved, not stale
The earlier note below (`andy_sessionprizewin` depending on `andy_prize`) turned out to be
a **real, live dependency**, not stale metadata as originally suspected — confirmed by the
live `andy_SessionPrizeWin.andy_PrizeName` lookup found during Phase B. It's now resolved
(see Phase B/C above) and no longer blocks anything.

### ⚠️ Live data gaps found during earlier smoke testing (not code bugs — still need a decision)

- **`andy_isfallback` was `null` on every seeded Prize Type row** (not explicit
  `true`/`false`), so `eq false`/`eq true` filters matched nothing and `/api/prizes`
  came back empty. **Fixed live**: `Pin or Sticker` → Is Fallback = Yes, the other 4
  types → Is Fallback = No.
- Of the 5 seeded Prize Types, only **`Trick or Treat Candy`** and **`Pin or Sticker`**
  (the fallback) are `statecode = 0` (Active); `Coffee Gift Card`, `JBL Speaker`, and
  `Ring Pop` are Inactive. **`Trick or Treat Candy` currently has zero untaken
  `andy_Prizes` instance rows**, so every real claim right now falls straight through
  to the fallback (`Pin or Sticker`) — this is the code working as designed, but means
  the wheel effectively only awards the fallback until either `Trick or Treat Candy`
  gets instance stock (use the Bulk Add Prizes genpage) or the other 3 types are
  intentionally reactivated. **Needs a maker-portal decision, not a code change.**

