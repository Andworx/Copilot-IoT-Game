# `andy_kioskstate`

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
| `andy_name` | Single line of text | Primary name column. Fixed value, e.g. `"Current State"` |
| `andy_activedeviceprofile` | Lookup → `andy_deviceprofile` | The active device. Leave null for demo/info (dial position 1) |
| `andy_setby` | Single line of text | Optional — which control surface/staff account set it last |
| `andy_settime` | Date and Time | Optional — when it was last changed |

## Building this in the maker portal

1. **Prerequisite:** `andy_deviceprofile` must already exist in the environment — the
   lookup column below can't be created until it does.
2. `make.powerapps.com` → your environment → your project's solution → **+ New → Table**.
3. Display name `Kiosk State`, plural `Kiosk States`. Confirm the schema name resolves to
   `andy_kioskstate` (publisher prefix `andy_`).
4. **Ownership: Organization** (not User/Team-owned — this is shared config, not per-user
   data).
5. The primary column `andy_name` is created automatically — no changes needed beyond
   confirming it's a single line of text.
6. Add columns:
   - `andy_activedeviceprofile` — **Lookup**, related table `andy_deviceprofile`, Optional.
     When prompted for relationship behavior, set delete behavior to **Restrict** (matches
     this project's convention — never cascade-delete).
   - `andy_setby` — **Single line of text**, Optional.
   - `andy_settime` — **Date and Time**, Optional.
7. Save the table.
8. **Don't add this table to Power Pages Table Permissions** — it should never be reachable
   from anonymous portal Web API calls. Only the Function App's application user needs a
   security role granting Create/Read/Write on it.
9. Manually create the one and only row once the table exists (`andy_name = "Current
   State"`, leave `andy_activedeviceprofile` null to start in demo/info mode).
10. Export the solution when ready — same process as the rest of this project's Dataverse
    schema.

## Automation note

`tables/andy_kioskstate/definition.json` in this folder documents the same schema in the
format `scripts/Import-Tables.ps1` consumes, for whenever this project's schema moves to
the scripted deployment path instead of a manual UI build + solution export. The
relationship is also recorded in `tables/relationships/`.
