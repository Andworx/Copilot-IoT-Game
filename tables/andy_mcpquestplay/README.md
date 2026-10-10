# MCP Quest Play

## Purpose

`andy_mcpquestplay` holds one row per MCP Quest play. It is the Function App's session store
(seed and in-progress state), the leaderboard source, and the audit record. A passing play
links to the shared PrizeEngine `andy_prizeclaim`; claim, contact and prize data stays there.

## Structure

| File | Purpose |
|---|---|
| `definition.json` | Table definition: columns, types and descriptions. |
| `../relationships/definitions.json` | Lookups to Prize Claim and Contest Campaign. |
| `../../docs/MCP_QUEST_ENGINE.md` | How the table is used, request flow and the owner runbook. |

## Deployed state

The table was created in the **MCPQuest** solution in Development and exported to
`solutions/MCPQuest/`. `definition.json` mirrors that export (it is documentation, not the
source of the deployed schema). The Function App reads and writes columns by their logical
names, defined in `azure/functions/game/src/lib/mcpquestStore.ts` (`PLAY_COLUMNS`) and checked
against the export by a test.

| Detail | Value |
|---|---|
| Entity set name | `andy_mcpquestplaies` |
| Ownership | Organisation |
| Primary column | `andy_playname` |
| Lookups (navigation property) | `andy_PrizeClaim`, `andy_Campaign` (case matters) |
| Names that differ from the original plan | `andy_mission` (was `andy_mode`), `andy_issubmitted`, `andy_ispassed`, `andy_isclaimissued`, `andy_toolcalls`, `andy_testruns` |
| Known typo | `andy_snaphotversion` ("snaphot"), kept as deployed |

## Column sizes

`andy_statejson` and `andy_resultjson` are Multiline text (max 20000). A play's state is a few
hundred characters and its result a few thousand; a single-line column would reject every
write, and a test fails if either column is made too small.

## Workflow

1. Change the schema in the maker portal, with **MCPQuest** as the preferred solution.
2. Export and unpack `MCPQuest`, then update `PLAY_COLUMNS` if a name changed. The contract
   test fails if the code and the export disagree.
3. Do not add claim, prize or contact columns that duplicate Prize Claim. `andy_claimtoken`
   exists only so a failed claim can be completed by resubmitting.
4. Keep State JSON and Result JSON off any form or view players might see. They hold the
   play's internal state.

## Updating This README

Update this file whenever columns, relationships, forms, views, app navigation or ownership
responsibilities change.
