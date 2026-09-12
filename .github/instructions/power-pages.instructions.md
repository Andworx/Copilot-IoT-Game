---
description: "Use when editing power pages files — the Copilot IoT Game Code Site (React + Vite SPA) under power pages/copilotiotgame, or its design docs. Covers PAC CLI code-site deployment and app conventions. This is NOT a classic Liquid portal — there is no web-templates/, web-pages/, or website.yml here."
applyTo: "power pages/**"
---
# power pages Conventions (Power Pages Code Site)

`power pages/copilotiotgame` is a **Power Pages Code Site** — a React 19 + Vite SPA, not
a classic Liquid portal. Do not introduce Liquid templates, `.webpage.yml`, or
`web-templates/`-style files here; there is no such structure in this project.
`power pages/restore-and-spin` was the original prototype for this site and has been
retired — everything it did (kiosk device pages, Game Mode, the win QR, the phone-facing
spin flow) has a superseding implementation in `copilotiotgame` (and the standalone
`power pages/prize wheel` app for the spin flow). Do not resurrect it or treat it as a
reference implementation.

## GitHub Actions releases

Use [the CI/CD workflow](../../docs/CI_CD.md) for routine Function App and
`copilotiotgame` releases: PR build checks, then automatic deployment after
relevant changes merge to `main`. Workflow: `.github/workflows/deploy-apps.yml`.
Local publishing commands are for explicitly requested recovery/bootstrap work.
Other Power Platform components retain their existing PAC workflows.

## Deployment (PAC CLI)

- Full reference: `PAC_COMMANDS.md` at the repo root
- Build first: `npm run build` from inside `power pages/copilotiotgame`
- Upload: `pac pages upload-code-site --rootPath "."`, run from that same folder
- **Never** use `pac pages upload` or `pac pages download` on this site — those target
  classic portal-studio sites and will corrupt code-site metadata
- Site name and build-output path are in `copilotiotgame/powerpages.config.json`, not
  passed as CLI flags

## App conventions

- Routes live in `src/App.tsx`: `/kiosk/info`, `/kiosk/:deviceSlug`, `/play-spin`
- `/kiosk/:deviceSlug` is **one component** (`KioskDevicePage.tsx`) rendering 11
  data-driven devices from `src/data/deviceProfiles.ts` — keyed by slug at the route level
  so React remounts cleanly on device change
- There are exactly **5 reusable control-panel layouts** (`src/components/layouts/`). A
  new device is a data row assigned to one of these five, not a new layout component —
  see `docs/KIOSK_UI_SPEC.md` §2.6 for the positional convention each layout expects
  (`switches[i]` / `lamps[i]` by array position, not by hardcoded key name)
- Semantic lamp colors (green/amber/red = good/caution/bad) are never reskinned per
  device; only background, accent hue, font, and motif vary — see `docs/KIOSK_UI_SPEC.md` §1.2
- The Help-Fix pattern (`HelpFixBar.tsx`) matches the existing `AgentButton.tsx` from the
  sibling `iot-panel-dashboard` app: collapsed by default, shows only a numbered list on
  tap, never a persistent chat

## Design/architecture docs

Read before making non-trivial changes under `power pages/`. Active references live in
`power pages/docs/`; completed migrations and superseded specs are archived under
`power pages/docs/archive/` — see `power pages/docs/README.md` for the full index.

- `power pages/docs/GAME_MODE_PLAN.md` — architecture, Dataverse schema, dial/win flow
- `power pages/docs/KIOSK_UI_SPEC.md` — visual/interaction spec for every screen
- `power pages/docs/archive/PRIZE_DATA_MODEL_MIGRATION_STATUS.md` — current live prize
  schema (`andy_PrizeTypes`/`andy_Prizes`) and migration history; the current source of
  truth for prize data, superseding `PRIZE_ENGINE_SPEC.md`'s original single-table design
- `power pages/copilotiotgame/README.md` — routes, Game Mode behavior, and what's stubbed

## Table Permissions

- Table permissions must be configured through the **power pages admin center**, not via
  the Dataverse API or PAC CLI.
- Do not create, update, or delete table permission records programmatically.
