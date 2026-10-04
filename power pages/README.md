# Power Pages — Copilot IoT Game

This folder contains **`copilotiotgame`**, the kiosk **Power Pages Code Site** (React 19 +
Vite SPA) — not a classic Liquid portal. There's no `web-templates/`, `web-pages/`, or
`website.yml` here; the whole site is the React app under `copilotiotgame/src/`. The
standalone phone-facing spin flow lives in the sibling `prize wheel` Code Site.

`restore-and-spin` was the original prototype for the kiosk site and has been retired —
it had no Game Mode support and only a fake placeholder QR. Everything it did has a
superseding implementation in `copilotiotgame` and `prize wheel`; don't resurrect it.

## Structure

```
power pages/
├── docs/                        # architecture, UI, and (historical) prize-engine specs
│   ├── GAME_MODE_PLAN.md        # architecture, Dataverse schema, dial/win flow
│   ├── KIOSK_UI_SPEC.md         # visual/interaction spec for every screen
│   └── archive/                 # completed migrations + superseded specs — historical only
│       ├── PRIZE_ENGINE_SPEC.md              # original single-table prize design (superseded)
│       ├── PRIZE_DATA_MODEL_MIGRATION.md     # Dataverse migration plan (done 2026-09-09)
│       ├── PRIZE_DATA_MODEL_MIGRATION_STATUS.md  # migration status/checklist (done)
│       └── PRIZE_CODE_MIGRATION.md           # Azure Functions backend migration (done)
├── copilotiotgame/         # the kiosk Code Site — deployed via deploy-apps.yml
│   ├── powerpages.config.json   # site name + build output path, read by PAC
│   ├── src/                     # React app source
│   └── README.md                # app-specific dev notes, Game Mode behavior, what's stubbed
├── prize wheel/            # standalone phone-facing spin Code Site (separate site/domain)
│   ├── powerpages.config.json
│   └── src/
└── plinko/                 # Plinko booth display Code Site (site `Plinko`, not yet in CI)
```

See `docs/README.md` for what's still an active reference vs. archived.

## GitHub Actions releases

Use [the CI/CD workflow](../docs/CI_CD.md) for routine Function App and
`copilotiotgame` releases: PR build checks, then automatic deployment after
relevant changes merge to `main`. Workflow: `.github/workflows/deploy-apps.yml`.
Local publishing commands are for explicitly requested recovery/bootstrap work.
`prize wheel` is not yet wired into that workflow and is deployed manually.

## PAC CLI Commands

See `PAC_COMMANDS.md` at the repo root for the full reference. Quick version:

```powershell
cd "power pages\copilotiotgame"
npm run build
pac pages upload-code-site --rootPath "."
```

**Never** use `pac pages upload` / `pac pages download` here — those target classic
portal-studio sites and will corrupt this site's code-site metadata.

## Table Permissions

Configure table permissions in the **power pages admin center** — not via PAC CLI or the
Dataverse API. See `.github/instructions/power-pages.instructions.md` for details.

## Key Conventions

- Build (`npm run build`) before every upload — PAC uploads the compiled `dist/` output
- Site name and build path live in `copilotiotgame/powerpages.config.json`, not CLI flags
- A new device is a data row in `src/data/deviceProfiles.ts` assigned to one of the 5
  existing layouts (`docs/KIOSK_UI_SPEC.md` §2.6) — not new component code
