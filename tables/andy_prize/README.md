# `andy_prize`

One row per prize the wheel can award. Odds are controlled by `andy_weight`, not
`andy_value` — the picker never reads `andy_value` (`PRIZE_ENGINE_SPEC.md` §1.1). Full
design: `power pages/PRIZE_ENGINE_SPEC.md` §1/§2.1.

## Columns

| Column | Type | Notes |
|---|---|---|
| `andy_name` | Single line of text (primary) | Prize name, shown to the player and to booth staff |
| `andy_value` | Currency | Reference value — reporting only, not read by the picker |
| `andy_weight` | Whole Number | Relative odds — the field the picker actually uses |
| `andy_remaining` | Whole Number | Finite stock, decremented atomically on claim (§1.3) |
| `andy_isactive` | Yes/No | `No` retires a prize mid-event without it looking "sold out" (distinct from `andy_remaining = 0`) |
| `andy_isfallback` | Yes/No | Exactly one row must be `Yes` — the empty-pool safety valve (§1.4) |
| `andy_totalawarded` | Whole Number | Running counter, incremented alongside the `andy_remaining` decrement. Starts at 0 |
| `andy_imageurl` | Single line of text | Optional reference image |

## Seed data

The 5 weighted prizes, matching `power pages/prize wheel/src/data/prizes.ts` (the
temporary client-side stand-in this table replaces) and the worked example in
`PRIZE_ENGINE_SPEC.md` §1.2:

| `andy_name` | `andy_weight` | `andy_remaining` | `andy_isactive` | `andy_isfallback` |
|---|---:|---:|---|---|
| Sticker Pack | 40 | *(set real stock)* | Yes | No |
| Andworx T-Shirt | 30 | *(set real stock)* | Yes | No |
| $25 Gift Card | 18 | *(set real stock)* | Yes | No |
| Wireless Earbuds | 9 | *(set real stock)* | Yes | No |
| Grand Prize: Conference Pass | 3 | *(set real stock)* | Yes | No |
| **Sticker** | 1 *(unused — excluded from weighted draw, see §1.4)* | 999999 | Yes | **Yes** |

The fallback row (`Sticker`) is a distinct row from `Sticker Pack` — it's the
unlimited-stock safety valve for when every real prize sells out, not one of the normal
weighted options. `andy_weight` on the fallback row is never read (the selection algorithm
excludes `andy_isfallback = true` rows from the normal weighted pool per §1.2), so its exact
value doesn't matter — set it to something low and move on.

`andy_totalawarded` starts at `0` on every row.

## Atomic decrement (why this can't be "read, then write")

The claim endpoint must use Dataverse optimistic concurrency — read with `@odata.etag`,
update with `If-Match: <etag>`, retry the whole selection (§1.2) on `412 Precondition
Failed`. See `PRIZE_ENGINE_SPEC.md` §1.3 for the full race-condition writeup. This is
Azure Function logic, not something this table's schema enforces on its own.

## Building this in the maker portal

1. `make.powerapps.com` → your environment → the `CopilotIoTGame` solution → **+ New →
   Table**, built *inside* the solution's context.
2. Display name `Prize`, plural `Prizes`. Confirm the schema name resolves to `andy_prize`.
3. **Ownership: Organization.**
4. Add the 7 non-primary columns above.
5. Save the table, then author the seed rows (including the `Sticker` fallback row —
   don't skip it, an empty pool with no fallback is a broken claim screen at the exact
   moment supply runs out).
6. `andy_gamewin` (built next) has lookups to this table — build this one first.

## Automation note

`tables/andy_prize/definition.json` documents the same schema in the format
`scripts/Import-Tables.ps1` consumes, for whenever this project's schema moves to the
scripted deployment path instead of a manual UI build + solution export/pack.
