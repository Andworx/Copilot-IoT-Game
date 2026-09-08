# `andy_gameboxstate`

Singleton table — **exactly one row, ever.** Tracks which device is currently active on the
`restore-and-spin` kiosk, replacing "read the physical dial" as the source of truth. Full
design: `power pages/GAME_MODE_PLAN.md` §4a (why) and §5 (schema).

## Who reads/writes this

- **Writer:** only the `POST /api/set-mode` Azure Function endpoint. Nothing else should
  ever write to this table directly — not the Power App control device, not the kiosk SPA.
  The Function looks up the existing single row and updates it; it never creates a second
  one.
- **Readers:** the `GET /api/kiosk-state` Function endpoint (called by the kiosk SPA once
  per page load) and, indirectly, the panel Pi via the IoT Hub cloud-to-device message the
  Function sends alongside the write.

## Columns

| Column | Type | Notes |
|---|---|---|
| `andy_name` | Single line of text (primary) | Fixed value, e.g. `"Current State"` |
| `andy_activedeviceprofile` | Lookup → `andy_deviceprofile` | The active device. Leave null for demo/info |

No custom audit columns — Dataverse's built-in `modifiedon` already answers "when did
this last change" for free, since the row is only ever updated, never re-created. A
built-in `modifiedby` would only ever show the Function App's service principal (it's
always the writer, not the staff member who tapped the control app), and nothing in the
design reads that back for any purpose, so it's not worth a dedicated column.

## Building this in the maker portal

1. **Prerequisite:** `andy_deviceprofile` must already exist in the environment — the
   lookup column below can't be created until it does.
2. `make.powerapps.com` → your environment → the `CopilotIoTGame` solution → **+ New →
   Table**. Build it *inside* the solution's context so it's tracked as a solution
   component when you export.
3. Display name `Game Box State`, plural `Game Box States`. Confirm the schema name
   resolves to `andy_gameboxstate` (publisher prefix `andy_`).
4. **Ownership: Organization** (not User/Team-owned — this is shared config, not per-user
   data).
5. The primary column `andy_name` is created automatically — no changes needed beyond
   confirming it's a single line of text.
6. Add the one remaining column: `andy_activedeviceprofile` — **Lookup**, related table
   `andy_deviceprofile`, Optional. When prompted for relationship behavior, set delete
   behavior to **Restrict** (matches this project's convention — never cascade-delete).
7. Save the table.
8. **Don't add this table to Power Pages Table Permissions** — it should never be reachable
   from anonymous portal Web API calls. Only the Function App's application user needs a
   security role granting Create/Read/Write on it.
9. Manually create the one and only row once the table exists (`andy_name = "Current
   State"`, leave `andy_activedeviceprofile` null to start in demo/info mode).
10. Export the solution when ready — this project uses `pac solution pack`/`pac solution
    import` to move it between environments, not `Import-Tables.ps1`, for this table.

## Automation note

`tables/andy_gameboxstate/definition.json` in this folder documents the same schema in the
format `scripts/Import-Tables.ps1` consumes, for whenever this project's schema moves to
the scripted deployment path instead of a manual UI build + solution export/pack. The
relationship is also recorded in `tables/relationships/`.
