# Game Box Control

Staff control device for the `restore-and-spin` kiosk — a **Power Apps Code App**, not a
Canvas app (chosen for a normal React/Vite dev loop instead of the low-code designer; see
`power pages/docs/GAME_MODE_PLAN.md` §4a for why a control app exists at all instead of a
physical dial). Picking a tile calls `POST /api/set-mode` on the `azure/` Function App,
which writes `andy_gameboxstate` and broadcasts the change to every open kiosk screen over
SignalR.

**Confirmed working end to end, 2026-09-08:** with both this app and `restore-and-spin`
open in separate browser tabs, clicking "Smart Lock & Security Panel" here moved the kiosk
tab from `/kiosk/info` to `/kiosk/smart-lock` live, no reload.

Also owns a master "Game Mode" switch, per-tile device enable/disable, and a Prize
Management section that bulk-creates `andy_Prizes` rows (`POST /api/bulk-create-prizes`)
-- the same capability as the "Bulk Add Prizes" genpage in the Game Backend model-driven
app, so staff can stock prizes without leaving this control app. That genpage is still
there too, as a redundant alternate entry point.

## Why a Code App instead of a Canvas app

Near-zero build time for what's really a 12-tile picker, but the real reason: Power Apps
gives Code Apps **Microsoft Entra ID sign-in for free** — staff sign in with their real org
account to even open it, no PIN system to build or manage, and it's genuine per-user auth
rather than a shared secret. `DemoGearMenu.tsx` in `restore-and-spin` stays a dev-only
shortcut, never the production control surface.

## Local development

```powershell
npm install
cp .env.example .env.local   # fill in VITE_SET_MODE_FUNCTION_KEY (az functionapp function keys list --function-name set-mode)
npm run dev
```

Runs on port 5174 (5173 is `restore-and-spin`'s, so both can run side by side). Needs
`http://localhost:5174` in the Function App's CORS allowed origins
(`az functionapp cors add` — already added for this dev port).

## Known simplification

`set-mode`'s function key ends up in this app's built client bundle (env vars only keep it
out of source control, not out of shipped JS). Accepted for now because the app itself is
gated behind Entra ID sign-in once it's a real Code App — the people who can even open it
are already authorized. The real fix (validating an Entra ID token on the Function side
instead of a function key) is tracked in `azure/README.md`, not done yet.

## Deploying as a Power Apps Code App

This folder is a plain Vite/React/TS app on purpose — `pac code init` and `pac code push`
add whatever Power Platform-specific config/auth wrapping is needed on top, so there's
nothing Power-Platform-specific to hand-write here. Exact commands: `PAC_COMMANDS.md` at
the repo root.

## Structure

```
power apps/game-box-control/
├── index.html, vite.config.ts, tsconfig.json, package.json
├── .env.example              # copy to .env.local, fill in the function key
└── src/
    ├── main.tsx
    ├── App.tsx                # device picker + mode controls, renders PrizeManagement
    ├── PrizeManagement.tsx    # bulk-create-prizes UI (Prize Management section)
    └── apiConfig.ts           # azure/ Functions base URL + function keys
```
