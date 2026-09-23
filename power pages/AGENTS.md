# Power Pages Conventions (Code Site)

Instructions for AI coding agents (Codex, Claude Code, Copilot) working under `power pages/`.
This is the single source of truth; `CLAUDE.md` in this folder only points here.

Applies to `power pages/copilotiotgame` — a **Power Pages Code Site** (React 19 + Vite
SPA), not a classic Liquid portal. There is no `web-pages/`, `web-templates/`, or Liquid
content in this project; all UI is React components under `copilotiotgame/src/`.
`power pages/restore-and-spin` was the original prototype for this site and has been
retired (no Game Mode support, a fake placeholder QR) — everything it did has a superseding
implementation in `copilotiotgame` and the standalone `power pages/prize wheel` app.

## GitHub Actions releases

Use [the CI/CD workflow](../docs/CI_CD.md) for routine Function App and
`copilotiotgame` releases: PR build checks, then automatic deployment after
relevant changes merge to `main`. Workflow: `.github/workflows/deploy-apps.yml`.
Local publishing commands are for explicitly requested recovery/bootstrap work.
Other Power Platform components retain their existing PAC workflows.

## Deployment

- Full command reference: `PAC_COMMANDS.md` at the repo root
- Always build (`npm run build`) before uploading
- Upload with `pac pages upload-code-site --rootPath "."`, run from inside
  `power pages/copilotiotgame` — **never** `pac pages upload`, which targets classic
  portal-studio sites and will corrupt code site metadata
- Site name and build-output path live in `copilotiotgame/powerpages.config.json`, not
  passed as CLI flags
- **`pac pages upload-code-site` updates whichever site its `.powerpages-site/` folder
  points at, and creates a new website if it matches none.** CI downloads the live
  site's metadata (`pac pages download-code-site --webSiteId <POWER_PAGES_WEBSITE_ID>`)
  into the deploy artifact before uploading and fails if the uploaded website ID differs
  — see `docs/CI_CD.md`. Find the live site with `pac pages list` (only one is bound to
  `copilotiotgame.powerappsportals.com`).
- **`.powerpages-site/` is generated, git-ignored state — never commit it.** It belongs
  to the live site, is not in the repo (it used to be, and its drifting IDs caused a
  duplicate-website incident), and CI downloads a fresh copy on every deploy. For a
  manual recovery upload, download it with `download-code-site` (steps in
  `PAC_COMMANDS.md`), upload right away, and leave it uncommitted. Never hand-edit it,
  copy it between environments, or reuse an old download. If unsure, delete it.
- The portal's browser console shows `Executing inline script violates the following
  Content Security Policy directive ...` errors at `(index):30/53/59`. These come from
  Power Pages' own private-site banner and page wrapper (the hashes change per load);
  the build emits only external module scripts. They are not a bug to fix in source
  — see `docs/CI_CD.md`.

## App structure

See `copilotiotgame/README.md` for the full breakdown. Briefly:

- `src/App.tsx` — routes: `/kiosk/info`, `/kiosk/:deviceSlug`, `/play-spin`
- `src/data/deviceProfiles.ts` — the 12 playable devices (content spec: `docs/GAME_MODE_PLAN.md` /
  `docs/KIOSK_UI_SPEC.md`)
- `src/components/surfaces/`: typed per-mode registry and shared read-only primitives.
  All twelve modes use dedicated read-only surfaces; positional layouts and migration
  fields have been removed. See `docs/KIOSK_MODE_UI_REDESIGN.md` (epic #73).
- `src/styles/theme.css` — shared design tokens + device skins

## Design/architecture docs

Active references live in [`docs/`](docs/):

- [`docs/GAME_MODE_PLAN.md`](docs/GAME_MODE_PLAN.md) — architecture, Dataverse schema, dial/win flow
- [`docs/KIOSK_UI_SPEC.md`](docs/KIOSK_UI_SPEC.md) — visual/interaction spec for every screen

Completed migrations and superseded specs are kept in [`docs/archive/`](docs/archive/) for
historical reference only — do not build against them:

- [`docs/archive/PRIZE_ENGINE_SPEC.md`](docs/archive/PRIZE_ENGINE_SPEC.md) — original single-table `andy_prize` design (superseded)
- [`docs/archive/PRIZE_DATA_MODEL_MIGRATION.md`](docs/archive/PRIZE_DATA_MODEL_MIGRATION.md) — Dataverse migration plan (done 2026-09-09)
- [`docs/archive/PRIZE_DATA_MODEL_MIGRATION_STATUS.md`](docs/archive/PRIZE_DATA_MODEL_MIGRATION_STATUS.md) — migration status/checklist (done)
- [`docs/archive/PRIZE_CODE_MIGRATION.md`](docs/archive/PRIZE_CODE_MIGRATION.md) — Azure Functions backend migration (done)

## Table permissions

Unchanged from the platform-wide convention: configure table permissions in the **Power
Pages admin center**, not via the Dataverse API or PAC CLI. Do not create, update, or
delete table permission records programmatically.

## Device-facing labels (#100)

Normal instrument surfaces show domain names and current state only (Power, Auto-Lock,
Fan, Encryption). Never display SW1-SW6, J1-J4, GPIO/pin identifiers, physical switch
mappings or target positions on the device, including accessible labels/tooltips.
Keep mappings and required actions inside the explicitly opened gear setup popup and
Help Fix. Do not add the bottom physical-input rail. Preserve semantic telemetry keys
and restore contracts internally. Apply this to every surface.
