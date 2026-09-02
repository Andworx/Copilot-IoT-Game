# Power Pages Conventions (Code Site)

Applies to `power pages/restore-and-spin` — a **Power Pages Code Site** (React 19 + Vite
SPA), not a classic Liquid portal. There is no `web-pages/`, `web-templates/`, or Liquid
content in this project; all UI is React components under `restore-and-spin/src/`.

## Deployment

- Full command reference: `PAC_COMMANDS.md` at the repo root
- Always build (`npm run build`) before uploading
- Upload with `pac pages upload-code-site --rootPath "."`, run from inside
  `power pages/restore-and-spin` — **never** `pac pages upload`, which targets classic
  portal-studio sites and will corrupt code site metadata
- Site name and build-output path live in `restore-and-spin/powerpages.config.json`, not
  passed as CLI flags

## App structure

See `restore-and-spin/README.md` for the full breakdown. Briefly:

- `src/App.tsx` — routes: `/kiosk/info`, `/kiosk/:deviceSlug`, `/play-spin`
- `src/data/deviceProfiles.ts` — the 11 devices (content spec: `GAME_MODE_PLAN.md` /
  `KIOSK_UI_SPEC.md` in this folder)
- `src/components/layouts/` — the 5 reusable control-panel layouts; a new device is a data
  row assigned to one of these, not new component code (see `KIOSK_UI_SPEC.md` §2.6)
- `src/styles/theme.css` — shared design tokens + all 11 device skins

## Design/architecture docs (this folder)

- [`GAME_MODE_PLAN.md`](GAME_MODE_PLAN.md) — architecture, Dataverse schema, dial/win flow
- [`KIOSK_UI_SPEC.md`](KIOSK_UI_SPEC.md) — visual/interaction spec for every screen
- [`PRIZE_ENGINE_SPEC.md`](PRIZE_ENGINE_SPEC.md) — prize weighting, schema, claim/redemption workflow

## Table permissions

Unchanged from the platform-wide convention: configure table permissions in the **Power
Pages admin center**, not via the Dataverse API or PAC CLI. Do not create, update, or
delete table permission records programmatically.
