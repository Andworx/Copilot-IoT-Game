---
description: "Use when editing power pages files — the Restore & Spin Code Site (React + Vite SPA) under power pages/restore-and-spin, or its design docs. Covers PAC CLI code-site deployment and app conventions. This is NOT a classic Liquid portal — there is no web-templates/, web-pages/, or website.yml here."
applyTo: "power pages/**"
---
# power pages Conventions (Power Pages Code Site)

`power pages/restore-and-spin` is a **Power Pages Code Site** — a React 19 + Vite SPA, not
a classic Liquid portal. Do not introduce Liquid templates, `.webpage.yml`, or
`web-templates/`-style files here; there is no such structure in this project.

## Deployment (PAC CLI)

- Full reference: `PAC_COMMANDS.md` at the repo root
- Build first: `npm run build` from inside `power pages/restore-and-spin`
- Upload: `pac pages upload-code-site --rootPath "."`, run from that same folder
- **Never** use `pac pages upload` or `pac pages download` on this site — those target
  classic portal-studio sites and will corrupt code-site metadata
- Site name and build-output path are in `restore-and-spin/powerpages.config.json`, not
  passed as CLI flags

## App conventions

- Routes live in `src/App.tsx`: `/kiosk/info`, `/kiosk/:deviceSlug`, `/play-spin`
- `/kiosk/:deviceSlug` is **one component** (`KioskDevicePage.tsx`) rendering 11
  data-driven devices from `src/data/deviceProfiles.ts` — keyed by slug at the route level
  so React remounts cleanly on device change
- There are exactly **5 reusable control-panel layouts** (`src/components/layouts/`). A
  new device is a data row assigned to one of these five, not a new layout component —
  see `KIOSK_UI_SPEC.md` §2.6 for the positional convention each layout expects
  (`switches[i]` / `lamps[i]` by array position, not by hardcoded key name)
- Semantic lamp colors (green/amber/red = good/caution/bad) are never reskinned per
  device; only background, accent hue, font, and motif vary — see `KIOSK_UI_SPEC.md` §1.2
- The Help-Fix pattern (`HelpFixBar.tsx`) matches the existing `AgentButton.tsx` from the
  sibling `iot-panel-dashboard` app: collapsed by default, shows only a numbered list on
  tap, never a persistent chat

## Design/architecture docs

Read before making non-trivial changes under `power pages/`:

- `power pages/GAME_MODE_PLAN.md` — architecture, Dataverse schema, dial/win flow
- `power pages/KIOSK_UI_SPEC.md` — visual/interaction spec for every screen
- `power pages/PRIZE_ENGINE_SPEC.md` — prize weighting, schema, claim/redemption workflow
- `power pages/restore-and-spin/README.md` — what's stubbed and where the real wiring goes
  (Copilot Studio integration, the real prize-claim endpoint, dial-driven navigation)

## Table Permissions

- Table permissions must be configured through the **power pages admin center**, not via
  the Dataverse API or PAC CLI.
- Do not create, update, or delete table permission records programmatically.
