# Prize Claim Rollout Plan

## Intent

Create a PrizeEngine-owned `Prize Claim` table for the shared prize claim and redemption lifecycle across IoT, Plinko, Claw Machine, and future games. Keep each game solution responsible only for game-specific win detail records.

This avoids turning the existing IoT `andy_gamewin` table into a cross-game table with a misleading name and too many nullable game-specific columns. Because `andy_gamewin` cannot be renamed cleanly, the transition should introduce a new `IoT Game Win` table for new writes and retire the old Game Win table after code and app dependencies are removed.

## Target Model

## Implementation Notes

- GitHub tracking issue: `https://github.com/Andworx/Copilot-IoT-Game/issues/149`.
- The Dataverse MCP `create_table` path created `cr552_prizeclaim` because it uses the environment default publisher prefix. Do not use MCP table creation for repo-owned `andy_` schema unless prefix control is available.
- The accidental `cr552_prizeclaim` table deletion was submitted after user approval.
- After the preferred solution was set to `andy_PrizeEngine`, MCP table creation produced the correct `andy_prizeclaim` table. The updated PrizeEngine solution was exported, unpacked into `solutions/PrizeEngine`, packed, imported, and published successfully.
- Prize Claim appears in the PrizeEngine MDA and uses the default table icon for now. Add a dedicated icon in a later polish pass.
- After the preferred solution was set to `CopilotIoTGame`, MCP table creation produced the correct `andy_iotgamewin` table. The updated CopilotIoTGame solution was exported, unpacked into `solutions/CopilotIoTGame`, packed, imported, and published successfully.
- IoT Game Win is intentionally minimal for Stage 2: generated name, required Prize Claim lookup, and optional Device Profile lookup only.
- IoT Game Win now has a dedicated SVG table icon: `andy_iotgamewin_icon` is imported as a vector webresource, `andy_iotgamewin` references it through `IconVectorName`, and the CopilotIoTGame MDA sitemap uses it for the IoT Game Win subarea.

### PrizeEngine: Prize Claim

Shared parent claim record for all games.

Recommended columns:

| Column | Purpose |
|---|---|
| Claim Name | Primary display name, generated from campaign/source/date or claim token. |
| Campaign | Lookup to Contest Campaign. |
| Contest Source | Lookup to Contest Source. |
| Contact | Lookup to Contact, populated when the player shares contact info. |
| Prize Instance | Lookup to Prizes. Prize Type is inferred from this record. |
| Claim Token | Shared QR/bearer claim token. |
| Claim Status | Shared digital claim lifecycle, such as Unclaimed, Claimed, Expired. |
| Claimed Time | Timestamp when the claim is completed. |
| Redemption Code | Staff-visible code for prize handoff. |
| Redemption Status | Shared fulfillment lifecycle, such as Not Redeemed or Redeemed. |
| Redeemed By | Staff/user lookup for handoff. |
| Redeemed Time | Timestamp when the prize is handed off. |
| Win Time | Timestamp when the source game created the win. |

### Game Solutions: Game-Specific Win Detail

Each game keeps its own detail table and links to Prize Claim.

For IoT, create a new `IoT Game Win` table in the CopilotIoTGame solution. This replaces the legacy `andy_gamewin` table as the IoT-specific detail/source record.

Recommended IoT-specific columns to keep there:

| Column | Purpose |
|---|---|
| Prize Claim | Lookup to the parent Prize Claim. |
| Device Profile | IoT device or exhibit that produced the win. |
| Telemetry/session context | IoT-specific event context, if needed. |
| Hardware diagnostics | Device-specific troubleshooting data, if needed. |

Columns to move off legacy `andy_gamewin` over time:

| Current Column | Target |
|---|---|
| Claim Token | Prize Claim |
| Status | Prize Claim Claim Status |
| Claimed Time | Prize Claim |
| Prize Instance | Prize Claim |
| Prize Type | Remove; infer from Prize Instance. |
| Redemption Code | Prize Claim |
| Redemption Status | Prize Claim |
| Redeemed By | Prize Claim |
| Redeemed Time | Prize Claim |
| Contact | Prize Claim |
| Shared Info | Remove after Contact-driven flow is verified. |

Legacy `andy_gamewin` should remain read-only or hidden during transition, then be removed from forms, views, app navigation, code, and finally the solution after dependencies are gone. Existing legacy records do not need to be migrated.

## Staged Rollout

### Stage 1: Add Shared Prize Claim Table

Create the new Prize Claim table in PrizeEngine with the shared claim, prize, contact, campaign, source, and redemption fields.

Add forms, views, and PrizeEngine MDA navigation. A dedicated icon can follow in a later polish pass.

Do not remove any `andy_gamewin` columns yet.

Validation:

- PrizeEngine solution packs and imports cleanly.
- Prize Claim records can be created manually.
- Prize Claim appears in the PrizeEngine MDA.

### Stage 2: Add New IoT Game Win Table

Add a new `IoT Game Win` table in the CopilotIoTGame solution.

Add a required or recommended `Prize Claim` lookup to the new IoT Game Win table.

Move only IoT-specific fields to the new table, such as Device Profile and telemetry or hardware context. Do not add claim token, claim status, prize instance, redemption fields, contact, or shared-info fields to the new IoT table.

Keep legacy `andy_gamewin` unchanged during this transition.

Validation:

- CopilotIoTGame solution packs and imports cleanly. Completed 2026-09-25.
- Existing legacy Game Win records remain usable.
- New IoT Game Win records can be linked to Prize Claim records. Live metadata confirms the Prize Claim lookup.
- The CopilotIoTGame MDA clearly distinguishes legacy Game Win from new IoT Game Win during transition. User confirmed the table appears, and live sitemap metadata now binds `subarea_iotgamewin` to `$webresource:andy_iotgamewin_icon`.

### Stage 3: Update Function App Write Path

Update the Azure Function App so new wins create or update the shared Prize Claim record and then create/link the new IoT Game Win detail row.

Expected changes:

- `create-win` creates the Prize Claim parent when an IoT win is created.
- `claim-prize` reads and updates Prize Claim for claim token, claim status, contact, prize instance, and redemption fields.
- IoT-specific data is written to the new IoT Game Win table.
- Grand Prize Entry creation links to Contact, Campaign, Contest Source Cap or Source, Prize Claim, and IoT Game Win detail as needed.
- Legacy `andy_gamewin` writes are kept only behind a temporary compatibility path if needed for rollback.

Validation:

- Azure unit tests cover Prize Claim payloads, new IoT Game Win payloads, and any temporary legacy compatibility path.
- Local Function App smoke tests pass for create-win and claim-prize.
- Existing QR claim flow still works.

### Stage 4: Move Users to New IoT Game Win Surfaces

After the Function App is writing Prize Claim and new IoT Game Win records, update forms, views, dashboards, and app navigation to use Prize Claim and IoT Game Win.

Remove legacy `andy_gamewin` from primary app navigation or relabel it as legacy/read-only if it must remain temporarily visible.

Do not delete legacy schema columns or the legacy table in this stage.

Validation:

- New IoT Game Win forms focus on IoT detail only.
- Prize Claim forms show shared claim and redemption lifecycle.
- CopilotIoTGame solution packs and imports cleanly.

### Stage 5: Retire Legacy Game Win Table

After forms, views, code, and reports no longer depend on legacy Game Win, retire the legacy `andy_gamewin` table. Do not migrate historical rows.

Retirement order:

1. Remove legacy `andy_gamewin` from forms, views, dashboards, and app navigation.
2. Remove code references from the Function App and tests.
3. Remove relationships that point to legacy `andy_gamewin`, after replacement relationships point to Prize Claim or new IoT Game Win.
4. Delete the legacy table from Dataverse only after export/unpack confirms no remaining dependencies.

Validation:

- No source references remain to legacy `andy_gamewin`.
- CopilotIoTGame solution packs and imports cleanly.
- Azure Function tests pass after legacy Game Win usage is removed.

## Open Decisions

1. Whether Prize Claim should allow a null Prize Instance for games that determine a prize after initial win creation. Current source definition keeps it optional.
2. Whether Grand Prize Entry should link to Prize Claim directly, IoT Game Win directly, or both during transition.
3. Whether Claim Token should be required immediately on Prize Claim or optional until a QR-capable source creates it. Current source definition keeps it optional.
4. Final logical name for the new IoT table, likely `andy_iotgamewin`.

## Working Rule

Forms and views are always updated before schema or table deletion. Function App writes move only after the new table and relationships are deployed. Legacy schema columns or tables are deleted only after Dataverse export/unpack confirms no remaining form, view, code, or relationship dependencies.