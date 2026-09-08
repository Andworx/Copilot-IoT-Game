# `andy_gamewin`

One row per resolved device fault — created the moment Copilot Studio's resolved-topic
action detects a fix, carried through claim and physical redemption. Full design:
`power pages/PRIZE_ENGINE_SPEC.md` §2.2/§3.

## Why `andy_claimtoken` is the primary name column

The spec doesn't define a natural display name for this table (unlike
`andy_deviceprofile`'s `andy_name` or `andy_gameboxstate`'s fixed label) — a gamewin row
is a system-generated event record, not something staff browse by name. `andy_claimtoken`
is the least-bad choice: it's required, unique per row, and already the value everything
else in the workflow keys off. Don't read anything into a GUID showing up in list views;
staff should be searching by `andy_redemptioncode` instead (§3, step 6), which has its own
column.

## Columns

| Column | Type | Notes |
|---|---|---|
| `andy_claimtoken` | Single line of text (primary) | GUID encoded in the kiosk QR; single-use; what the prize wheel site's `?token=` reads |
| `andy_deviceprofile` | Lookup → `andy_deviceprofile` | Which item was fixed |
| `andy_status` | Choice (`andy_gamewinstatus`) | Digital claim lifecycle |
| `andy_redemptionstatus` | Choice (`andy_redemptionstatus`) | Physical handoff lifecycle — **separate** from `andy_status`, see §2.3 |
| `andy_redemptioncode` | Single line of text | `GW-XXXXXX`, generated server-side at claim time. Null until claimed |
| `andy_wontime` | Date and time | When the fix was detected |
| `andy_prize` | Lookup → `andy_prize` | Null until claimed |
| `andy_claimedtime` | Date and time | Null until claimed |
| `andy_redeemedtime` | Date and time | Null until a staff member fulfills it |
| `andy_redeemedby` | Lookup → `andy_technician` (existing table) | Which staff member handed over the prize |
| `andy_contestantname` | Single line of text | Optional — null if the player skips sharing |
| `andy_contestantemail` | Single line of text | Optional — null if the player skips sharing |
| `andy_sharedinfo` | Yes/No | Whether the player opted in — never gates the spin/prize |

## Who reads/writes this

- **Created by:** Copilot Studio's resolved-topic action, on win detection — `andy_status =
  Unclaimed`, `andy_redemptionstatus = NotRedeemed`, `andy_claimtoken = new GUID`. This
  action isn't built yet (tracked separately, Copilot Studio topic work).
- **Updated by:** the claim endpoint (a new Azure Function, not yet built) — validates the
  token is `Unclaimed`, runs the weighted pick + atomic decrement against `andy_prize`
  (`PRIZE_ENGINE_SPEC.md` §1.2/§1.3), generates `andy_redemptioncode`, sets `andy_status =
  Claimed`.
- **Updated by staff:** manually, via a Dataverse view/model-driven app screen filtered to
  `andy_status = Claimed AND andy_redemptionstatus = NotRedeemed` — sets
  `andy_redemptionstatus = Redeemed`, `andy_redeemedtime`, `andy_redeemedby` (§3, step 6).
  **Deliberately no custom staff app for v1** — start with the out-of-the-box view.

## What's deliberately out of scope for v1

Auto-expiry/restocking of claimed-but-never-redeemed wins — `andy_status = Expired` exists
in the choice for this reason but nothing sets it yet. See `PRIZE_ENGINE_SPEC.md` §3.1.

## Building this in the maker portal

1. **Prerequisites:** `andy_deviceprofile`, `andy_prize`, and the `andy_gamewinstatus`/
   `andy_redemptionstatus` choices must already exist — the lookup/choice columns below
   can't be created until they do. `andy_technician` already exists from an earlier
   project phase.
2. `make.powerapps.com` → your environment → the `CopilotIoTGame` solution → **+ New →
   Table**, built *inside* the solution's context.
3. Display name `Game Win`, plural `Game Wins`. Confirm the schema name resolves to
   `andy_gamewin`.
4. **Ownership: Organization.**
5. Rename the auto-created primary column to `andy_claimtoken` (single line of text,
   Required) — see the note above on why this is the primary column.
6. Add the remaining 12 columns above. For the 3 lookups (`andy_deviceprofile`,
   `andy_prize`, `andy_redeemedby`), set delete behavior to **Restrict** when prompted
   (matches this project's convention — never cascade-delete).
7. Save the table.
8. Build the staff redemption view: filter `andy_status = Claimed AND
   andy_redemptionstatus = NotRedeemed`, sort by `andy_claimedtime`, make
   `andy_redemptioncode` a visible/searchable column.

## Automation note

`tables/andy_gamewin/definition.json` documents the same schema in the format
`scripts/Import-Tables.ps1` consumes, for whenever this project's schema moves to the
scripted deployment path instead of a manual UI build + solution export/pack. The 3
relationships are recorded in `tables/relationships/`.
