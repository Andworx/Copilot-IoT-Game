# Power Pages Conventions (Code Site)

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
- **Never drop `copilotiotgame/.powerpages-site/` from a deploy artifact or a local
  upload.** It carries the per-environment manifest `pac pages upload-code-site` needs to
  recognize the site's existing records; without it, uploads run blind and the live site
  can keep serving stale content indefinitely no matter how many times a deploy "succeeds"
  — see `docs/CI_CD.md`'s Power Pages manifest note for the full incident. After any local
  `pac pages upload-code-site` or `download-code-site`, commit the resulting
  `.powerpages-site/` changes in the same change set. CI does this automatically by
  pushing a `chore(power-pages): sync uploaded code site manifest` commit straight to
  `main` after each deploy (this org disables Actions creating PRs, so it can't open one
  instead) — no action needed unless that step fails.

## App structure

See `copilotiotgame/README.md` for the full breakdown. Briefly:

- `src/App.tsx` — routes: `/kiosk/info`, `/kiosk/:deviceSlug`, `/play-spin`
- `src/data/deviceProfiles.ts` — the 11 devices (content spec: `docs/GAME_MODE_PLAN.md` /
  `docs/KIOSK_UI_SPEC.md`)
- `src/components/layouts/` — the 5 reusable control-panel layouts; a new device is a data
  row assigned to one of these, not new component code (see `docs/KIOSK_UI_SPEC.md` §2.6)
- `src/styles/theme.css` — shared design tokens + all 11 device skins

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
