# Power Pages — Restore & Spin

This folder contains **`restore-and-spin`**, a **Power Pages Code Site** (React 19 + Vite
SPA) — not a classic Liquid portal. There's no `web-templates/`, `web-pages/`, or
`website.yml` here; the whole site is the React app under `restore-and-spin/src/`.

## Structure

```
power pages/
├── GAME_MODE_PLAN.md      # architecture, Dataverse schema, dial/win flow
├── KIOSK_UI_SPEC.md       # visual/interaction spec for every screen
├── PRIZE_ENGINE_SPEC.md   # prize weighting, schema, claim/redemption workflow
└── restore-and-spin/      # the Code Site itself
    ├── powerpages.config.json   # site name + build output path, read by PAC
    ├── src/                     # React app source
    └── README.md                # app-specific dev notes, what's stubbed
```

## PAC CLI Commands

See `PAC_COMMANDS.md` at the repo root for the full reference. Quick version:

```powershell
cd "power pages\restore-and-spin"
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
- Site name and build path live in `restore-and-spin/powerpages.config.json`, not CLI flags
- A new device is a data row in `src/data/deviceProfiles.ts` assigned to one of the 5
  existing layouts (`KIOSK_UI_SPEC.md` §2.6) — not new component code
