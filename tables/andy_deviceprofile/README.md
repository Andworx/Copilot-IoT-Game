# `andy_deviceprofile`

One row per kiosk mode — 12 total: 1 demo/info row + 11 real troubleshooting devices (the
roster in `power pages/GAME_MODE_PLAN.md` §11). This is the "what a mode *is*" table —
display name, URL slug, which layout renders it, which Copilot Studio topic it invokes.
`andy_gameboxstate.andy_activedeviceprofile` is the separate, much smaller table that
tracks *which one* of these rows is live right now.

## Columns

| Column | Type | Notes |
|---|---|---|
| `andy_name` | Single line of text (primary) | Display name, e.g. "Smart Lock" |
| `andy_deviceslug` | Single line of text | URL slug — matches `/kiosk/<slug>` and telemetry |
| `andy_isgamedevice` | Yes/No | `No` for the demo/info row |
| `andy_introcopy` | Multiple lines of text | Optional |
| `andy_copilottopic` | Single line of text | Null for the demo page |
| `andy_layout` | Choice (`andy_layout`, global) | `dial-arc` / `keypad` / `dip-strip` / `paired-columns` / `radio-cluster` — see `tables/choices/andy_layout.json` |

No `andy_isactive` — Dataverse's built-in Status/Status Reason (`statecode`/`statuscode`)
already covers "is this row active or retired," so a duplicate Yes/No column would be
redundant. No `andy_dialposition` either — that only ever mapped a physical rotary contact
to a row, and selection is software-defined now (§4a); a Whole Number column can come back
in a minute if the dial ever returns as a third input.

## Building this in the maker portal

1. Create the `andy_layout` global choice first (`tables/choices/andy_layout.json`) — the
   `andy_layout` column below needs it to exist.
2. `make.powerapps.com` → your environment → the `CopilotIoTGame` solution → **+ New →
   Table**, built *inside* the solution's context.
3. Display name `Device Profile`, plural `Device Profiles`. Confirm the schema name
   resolves to `andy_deviceprofile`.
4. **Ownership: Organization.**
5. Add the 5 non-primary columns above.
6. Save the table, then build `andy_gameboxstate` next — its lookup depends on this table
   existing first.
7. Author the 12 rows (content spec: `KIOSK_UI_SPEC.md` §2, roster: `GAME_MODE_PLAN.md`
   §11) — not part of this schema build, tracked separately.

## Automation note

`tables/andy_deviceprofile/definition.json` documents the same schema in the format
`scripts/Import-Tables.ps1` consumes, for whenever this project's schema moves to the
scripted deployment path instead of a manual UI build + solution export/pack.
