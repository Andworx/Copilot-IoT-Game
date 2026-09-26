# IoT Game Win

## Purpose

`andy_iotgamewin` stores IoT-specific win context while shared claim, contact, prize, and redemption fields live on the PrizeEngine-owned `andy_prizeclaim` table.

## Structure

| File | Purpose |
|---|---|
| `definition.json` | Minimal table definition for the IoT detail row. |
| `icon.svg` | Table icon used in model-driven apps. |
| `../relationships/definitions.json` | Lookup relationships to Prize Claim and Device Profile. |

## Workflow

1. Keep this table minimal during the migration.
2. Add only IoT/device-specific fields here.
3. Do not add claim token, prize instance, contact, or redemption fields here; those belong on Prize Claim.
4. Keep `icon.svg` and `iconWebResourceName` synchronized when changing the table icon.
5. Export and unpack `CopilotIoTGame` after live schema changes so solution XML reflects the deployed table.

## Updating This README

Update this file whenever IoT Game Win fields, relationships, forms, views, app navigation, icon, or ownership responsibilities change.