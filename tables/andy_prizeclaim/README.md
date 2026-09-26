# Prize Claim

## Purpose

`andy_prizeclaim` is the shared PrizeEngine parent record for prize claim and redemption lifecycle data. Game-specific tables, such as the future IoT Game Win table, should link to this record instead of duplicating claim token, contact, prize, and redemption fields.

## Structure

| File | Purpose |
|---|---|
| `definition.json` | Table and scalar column definition for `andy_prizeclaim`. |
| `../choices/andy_prizeclaim_claimstatus.json` | Shared claim lifecycle choice. |
| `../choices/andy_prizeclaim_redemptionstatus.json` | Shared redemption lifecycle choice. |
| `../relationships/definitions.json` | Lookup relationships from Prize Claim to Campaign, Contest Source, Contact, Prize Instance, and Redeemed By user. |

## Workflow

1. Create or update choices with `Import-Choices`.
2. Create or update the table scalar columns with `Import-Tables`.
3. Create lookup columns through `Import-Relationships`.
4. Export and unpack the `andy_PrizeEngine` solution so managed solution XML reflects the live schema.
5. Add a dedicated table icon later; the initial import uses the default model-driven app icon.

## Updating This README

Update this file whenever Prize Claim columns, relationships, forms, views, app navigation, icon, or ownership responsibilities change.