# Prize Claim

## Purpose

`andy_prizeclaim` is the shared PrizeEngine parent record for prize claim data. Game-specific tables, such as IoT Game Win, should link to this record instead of duplicating claim token, contact, or prize fields. For instant prizes, a `Claimed` row represents booth fulfillment; later redemption/check-in lifecycle belongs on Grand Prize Entry.

Notes are enabled on this table for booth or operator context that does not justify another structured column.

## Structure

| File | Purpose |
|---|---|
| `definition.json` | Table and scalar column definition for `andy_prizeclaim`. |
| `../choices/andy_prizeclaim_claimstatus.json` | Shared claim lifecycle choice. |
| `../relationships/definitions.json` | Lookup relationships from Prize Claim to Campaign, Contest Source, Contact, and Prize Instance. |

## Workflow

1. Create or update choices with `Import-Choices`.
2. Create or update the table scalar columns with `Import-Tables`.
3. Create lookup columns through `Import-Relationships`.
4. Export and unpack the `andy_PrizeEngine` solution so managed solution XML reflects the live schema.
5. Keep notes enabled when exporting/unpacking PrizeEngine metadata.

## Updating This README

Update this file whenever Prize Claim columns, relationships, forms, views, app navigation, icon, or ownership responsibilities change.