# Prize Code Migration — Execution Plan

> **✅ ARCHIVED — completed and deployed 2026-09-09.** The `azure/src/lib/dataverse.ts`
> rewrite described here shipped to `func-aw-azcom-copilot-iot-game` and was smoke-tested
> live end to end (see
> [`PRIZE_DATA_MODEL_MIGRATION_STATUS.md`](PRIZE_DATA_MODEL_MIGRATION_STATUS.md) for the
> verified outcome, including a live-only OData `in`-operator bug found and fixed along the
> way). Kept for historical reference only.

Companion to [`PRIZE_DATA_MODEL_MIGRATION.md`](PRIZE_DATA_MODEL_MIGRATION.md) (the
schema/Dataverse side of this same change) and
[`PRIZE_ENGINE_SPEC.md`](PRIZE_ENGINE_SPEC.md) (the original design this supersedes).
This document is the **code side only** — what changes in `azure/` (the Functions
backend) and what, if anything, changes in the two Power Pages SPAs
(`power pages/copilotiotgame`, `power pages/prize wheel`).

## Do not start this until

`PRIZE_DATA_MODEL_MIGRATION.md` Phase 5 is done: `Prize Types`/`Prizes` are in the
`CopilotIoTGame` solution, the new lookup columns exist, seed data is entered, and the
solution has been re-exported into `solutions/CopilotIoTGame`. This document depends on
real field and navigation-property names from that export — guessing them ahead of time
is exactly the mistake this project already made twice (`andy_ActiveDeviceProfile` vs the
lowercase attribute name; `andy_prizename` vs the assumed `andy_name`). Confirm before
writing code, not after.

## What's confirmed already (existing tables, checked directly)

These two tables already exist (from the Clawmachine solution) and their names are
verified against the real export, not guessed:

| Table | Entity Set Name (for OData URLs) | Notes |
|---|---|---|
| `andy_PrizeTypes` | `andy_prizetypeses` | Yes, double-pluralized — Dataverse's naive `+s` on a logical name that already ends in `s`. Confirmed in `solutions/Clawmachine/Entities/andy_PrizeTypes/Entity.xml`, not assumed. |
| `andy_Prizes` | `andy_prizeses` | Same pattern. |

Key columns on `andy_PrizeTypes` (logical names): `andy_prizetypename` (primary),
`andy_rarity` (int), `andy_color`, `andy_prizeimage`/`andy_prizeimagefile`/
`andy_prizeimagesvg`/`andy_prizetypeimage`. Per
`PRIZE_DATA_MODEL_MIGRATION.md` Phase 3, a new `andy_isfallback` (Yes/No) column and
`andy_weight` semantics get added here — **verify the exact logical name Dataverse
assigns** (`andy_isfallback`/`andy_weight` are the intended schema names, matching the
retiring `andy_prize` table's convention, but confirm against the export).

Key columns on `andy_Prizes` (logical names): `andy_prizename` (primary),
`andy_prizetaken` (bit), `andy_prizetype` (lookup → `andy_PrizeTypes`),
`andy_prizewinner` (plain text, unused going forward), `andy_prizeinfo`. Per Phase 2, a
new `andy_gamewin` lookup column gets added here.

## What's NOT confirmed yet (verify against the Phase 5 export before writing this code)

- The exact navigation property names for the three *new* lookup columns
  (`Prizes.andy_gamewin`, `andy_gamewin.andy_prizetype`, `andy_gamewin.andy_prizeinstance`)
  don't exist yet as of this writing — they're created in Data Model Migration Phase 2.
  Every lookup relationship built so far in this project has had a navigation property
  that PascalCases the attribute logical name (`andy_deviceprofile` → `andy_DeviceProfile`,
  `andy_prize` → `andy_Prize`), so the anticipated navigation properties are
  `andy_GameWin`, `andy_PrizeType`, `andy_PrizeInstance` — **but check
  `solutions/CopilotIoTGame/Other/Relationships/` after the Phase 5 export before trusting
  that.** This has been consistently true so far, not consistently guaranteed.
- The final `andy_isfallback` schema name on `andy_PrizeTypes` — confirm it landed as
  `andy_isfallback` and not something Dataverse auto-adjusted.

## Changes in `azure/src/lib/dataverse.ts`

### Remove

- `listActivePrizes()` (queried the old `andy_prizes` collection)
- `fetchEligiblePrizes()`, `fetchFallbackPrize()`, `toPrizeRow()`, `PRIZE_SELECT`,
  `tryClaimPrizeRow()` — all built around decrementing `andy_remaining` on a single
  `andy_prize` row. None of this concept survives the migration; stock is now "count of
  untaken instance rows," and a claim is "mark one instance row taken," not a decrement.

### Add

```typescript
// Verify these constants against the real Phase 5 export before deploying.
const PRIZE_INSTANCE_TYPE_NAV = "andy_PrizeType";       // on andy_Prizes
const GAMEWIN_PRIZETYPE_NAV = "andy_PrizeType";          // on andy_gamewin
const GAMEWIN_PRIZEINSTANCE_NAV = "andy_PrizeInstance";  // on andy_gamewin

interface PrizeTypeRow {
  id: string;
  name: string;
  weight: number;
  isFallback: boolean;
}

/** Active prize types for the wheel's own rendering -- GET /api/prizes.
 * Excludes the fallback type, same reasoning as before: it's not a normal option, it's
 * the empty-pool safety valve. */
export async function listActivePrizeTypes(): Promise<Array<{ name: string }>> {
  const response = await dataverseFetch(
    "andy_prizetypeses?$select=andy_prizetypename" +
      "&$filter=statecode eq 0 and andy_isfallback eq false" +
      "&$orderby=andy_prizetypename"
  );
  const body = (await response.json()) as { value: Array<{ andy_prizetypename: string }> };
  return body.value.map((row) => ({ name: row.andy_prizetypename }));
}

/** One untaken instance row per eligible type, picked at random by weight among types
 * that actually have stock -- then the specific instance is claimed atomically. */
async function fetchEligibleTypesWithStock(): Promise<PrizeTypeRow[]> {
  // Types with >=1 untaken instance. This needs either a per-type count query or
  // fetching untaken instances directly and grouping client-side -- for the expected
  // scale here (a few dozen prize types, a few hundred instances at most), fetching
  // untaken instances directly and grouping in code is simpler and avoids trusting any
  // cross-table aggregate. See the fetchUntakenInstancesByType() approach below.
}
```

The concrete algorithm (replaces `selectAndClaimPrize`):

1. `GET andy_prizeses?$filter=andy_prizetaken eq false&$select=andy_prizeid,andy_prizetype,@odata.etag&$expand=andy_PrizeType($select=andy_prizetypeid,andy_prizetypename,andy_weight;$filter=statecode eq 0 and andy_isfallback eq false)` —
   fetch all untaken instances with their type's weight in one call, filtering out
   instances whose type isn't active/isn't eligible. (If `$expand` with a `$filter` on
   the expanded side isn't supported the way this is written, fall back to two
   queries: fetch eligible types first, then fetch untaken instances `$filter=andy_prizetype eq {id}` per type or with an `in` filter.)
2. Group the results by type, compute each type's weight (already have it from the
   expand).
3. If the group is empty (no untaken instances across any eligible type): look up the
   `andy_isfallback eq true` type directly (no instance query needed — the fallback
   doesn't track instances) and use it, skipping straight to step 6.
4. Weighted-pick a *type* from the grouped set (same `pickWeighted` logic as before, now
   operating on types instead of individual prize rows).
5. Pick one instance row belonging to the chosen type (any of them — order doesn't
   matter, they're interchangeable within a type).
6. Try to atomically claim it: `PATCH andy_prizeses(id)` with `If-Match: <etag>`, body
   `{ andy_prizetaken: true, "andy_GameWin@odata.bind": "/andy_gamewins({gameWinId})" }`.
   `412` means someone else claimed that exact instance between read and write — retry
   from step 1 (the whole selection, not just this one instance, since the eligible set
   may have changed). Skip the `If-Match`/retry dance entirely for the fallback path —
   nothing to race over when the type isn't instance-tracked.
7. On success, update the `andy_gamewin` row: `andy_PrizeType@odata.bind` to the chosen
   type, `andy_PrizeInstance@odata.bind` to the claimed instance (omit this bind for a
   fallback claim, since there is no instance), plus the existing
   `andy_status`/`andy_redemptioncode`/`andy_claimedtime`/contestant fields exactly as
   before -- that part of `claimGameWin()` doesn't change.

`generateRedemptionCode()`, `ClaimError`, `createGameWin()`, `isGuidLike()`, the GUID
validation, and the `andy_gamewin` status-transition logic are all unaffected by this
migration -- only the prize-selection half changes.

## Changes in `azure/src/functions/`

- **`prizes.ts`** — swap `listActivePrizes` for `listActivePrizeTypes`. Response shape
  (`{ prizes: [{ name }] }`) stays identical, so nothing downstream needs to know the
  underlying table changed.
- **`claimPrize.ts`** — no changes needed. It already just calls `claimGameWin()` and
  returns `{ prizeName, redemptionCode }`; the rewrite is entirely inside
  `dataverse.ts`.
- **`createWin.ts`** — no changes needed. Win creation doesn't touch prizes at all.

## What does NOT change: the frontend

Neither `power pages/copilotiotgame` nor `power pages/prize wheel` needs any code
changes. The public contract both endpoints already expose is preserved on purpose:

- `GET /api/prizes` still returns `{ prizes: [{ name: string }] }`
- `POST /api/claim-prize` still returns `{ prizeName: string, redemptionCode: string }`
  on success, and the same `ClaimError` codes/HTTP statuses on failure

This is the payoff of keeping the type/instance split entirely inside the data layer —
the SPAs never knew or cared whether "remaining" was a counter or a count of instance
rows, so this migration is invisible to them. If you find yourself wanting to change
either response shape as part of this work, that's scope creep on this migration, not a
requirement of it -- do it as a separate change.

## Deployment & verification sequence

1. Confirm `PRIZE_DATA_MODEL_MIGRATION.md` Phase 5 is done and
   `solutions/CopilotIoTGame` has been re-exported with the new tables/columns.
2. Check the real navigation property names (see "What's NOT confirmed yet" above)
   against `solutions/CopilotIoTGame/Other/Relationships/`.
3. Rewrite `azure/src/lib/dataverse.ts` per the algorithm above, using the *confirmed*
   navigation property names, not the anticipated ones.
4. `npm run build` in `azure/` -- must compile clean before deploying.
5. `func azure functionapp publish func-aw-azcom-copilot-iot-game --typescript`.
6. Smoke test directly, same pattern used throughout this project:
   - `curl https://func-aw-azcom-copilot-iot-game.azurewebsites.net/api/prizes` -- should
     return the seeded prize type names, not an empty array.
   - `POST /api/create-win` with a real `deviceSlug` to get a fresh claim token.
   - `POST /api/claim-prize` with that token -- should return a real `prizeName` +
     `redemptionCode`, not `no_prizes_available`.
   - Query the claimed `andy_Prizes` instance row directly (a temporary debug endpoint,
     same pattern used earlier in this project, deleted after use) to confirm
     `andy_prizetaken` flipped to `true` and the `andy_GameWin`/`andy_PrizeType` binds
     landed correctly.
7. Only after step 6 passes: proceed to `PRIZE_DATA_MODEL_MIGRATION.md` Phase 6
   (decommissioning the old tables). Deploying this code and confirming it works is
   what makes Phase 6 safe -- deleting the old tables before this code is live and
   verified would break prize claiming entirely, with no fallback.

## Rollback

If something in this migration doesn't work as expected after deployment, the old
`andy_prize`-based code is still recoverable from git history (the commit before this
migration's `dataverse.ts` rewrite) as long as `PRIZE_DATA_MODEL_MIGRATION.md` Phase 6
hasn't run yet -- the old table and its data are still intact until that phase actually
deletes them. This is the reason Phase 6 is gated on this document's step 7 and not run
in parallel with the code changes.
