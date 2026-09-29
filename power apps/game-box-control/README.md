# Game Box Control

Staff control device for the `copilotiotgame` kiosk — a **Power Apps Code App**, not a
Canvas app (chosen for a normal React/Vite dev loop instead of the low-code designer; see
`power pages/docs/GAME_MODE_PLAN.md` §4a for why a control app exists at all instead of a
physical dial). Picking a tile calls `POST /api/set-mode` on the `azure/` Function App,
which writes `andy_gameboxstate` and broadcasts the change to every open kiosk screen over
SignalR.

**Confirmed working end to end, 2026-09-08:** with both this app and the kiosk Code Site
(`restore-and-spin` at the time, since superseded by `copilotiotgame`) open in separate
browser tabs, clicking "Smart Lock & Security Panel" here moved the kiosk tab from
`/kiosk/info` to `/kiosk/smart-lock` live, no reload.

Also owns a master "Game Mode" switch, per-tile device enable/disable, and a Prize
Management section that bulk-creates `andy_Prizes` rows (`POST /api/bulk-create-prizes`)
-- the same capability as the "Bulk Add Prizes" genpage in the Game Backend model-driven
app, so staff can stock prizes without leaving this control app. That genpage is still
there too, as a redundant alternate entry point.

The app also includes the final drawing Check-in workspace for issue #131. Staff can type
or scan an emailed check-in code, then submit it to the planned
`POST /api/grand-prize/check-in` Function. The client does not write PrizeEngine rows
directly; the Function is responsible for validating the active campaign, Contact, code,
current check-in status, eligibility, and audit metadata before marking the matching Grand
Prize Entry rows checked in.

It now includes a Grand Prize workspace for issue #130. The workspace hosts the
staff-operated weighted wheel UI, automatically refreshes registered and checked-in
counts from the planned `GET /api/grand-prize/drawing-slices` Function, and animates
only to the committed winner returned by the planned `POST /api/grand-prize/draw`
Function. Until those Functions are deployed, the screen shows clearly labeled preview
counts so the visual wheel can be reviewed without exposing participant names or writing
draw results.

The staff presentation screen polls authenticated drawing state every five seconds through the Power Apps connector. It never connects directly to the private SignalR endpoint. Kiosk mode updates still use SignalR.

It also includes a Prize Claim smoke-test screen for the shared Prize Claim rollout. The
screen calls authenticated staff copies of the `POST /api/create-win` and `POST /api/claim-prize` endpoints,
defaults the contest source key to `demo`, and shows the raw JSON responses so a staff user
can verify the new Prize Claim, IoT Game Win, Contact, and Grand Prize Entry path quickly.
For issue #134, this screen also shows a sample of the grand-prize check-in email after
the QR/info path creates a Grand Prize Entry. Code generation and email delivery are not
operator actions in this app; they belong to the server-side claim flow that runs after a
player scans the QR code and shares contact info.

## Why a Code App instead of a Canvas app

Near-zero build time for what's really a 12-tile picker, but the real reason: Power Apps
gives Code Apps **Microsoft Entra ID sign-in for free** — staff sign in with their real org
account to even open it, no PIN system to build or manage, and it's genuine per-user auth
rather than a shared secret. `DemoGearMenu.tsx` in `copilotiotgame` stays a dev-only
shortcut, never the production control surface.

## Authentication and setup

All staff operations use the Entra-authenticated custom connector described in
[STAFF_API_SETUP.md](../../docs/STAFF_API_SETUP.md). The backend requires a valid
access token, Staff.Access scope, Game.Operator role and the configured connector
client. Power Apps sharing alone does not grant API access. Each operator creates
their own OAuth connection; no Function keys are embedded in this app.

## Local development

Run `npm ci` and `npm run dev`, then use the Power Apps development host with the
configured connector. Bare Vite cannot supply the hosted connector context.
Run `node scripts/verify-staff-binding.mjs` before deploying. Missing bindings
produce a setup error; there is no direct-fetch or anonymous fallback.

## Deploying as a Power Apps Code App

Use `.github/workflows/deploy-apps.yml`; staff API, public API, Code App and Code
Site deploy in that order. Preserve the existing app ID and generated connection
metadata. Never reinitialize the Code App to add a connector. See the setup runbook
for manual Azure/Power Platform prerequisites and coordinated cutover tests.

## Structure

```
power apps/game-box-control/
├── index.html, vite.config.ts, tsconfig.json, package.json
├── .env.example              # no frontend secrets
└── src/
    ├── main.tsx
    ├── App.tsx                # workspace navigation + game controls, renders tools
    ├── GrandPrizeCheckIn.tsx  # staff check-in form for emailed grand-prize codes
    ├── GrandPrizeDrawing.tsx  # weighted wheel, operator controls, authenticated presentation polling
    ├── PrizeManagement.tsx    # bulk-create-prizes UI (Prize Management section)
    ├── SmokeTest.tsx          # create-win + claim-prize smoke-test UI, including #134 email preview
    └── apiConfig.ts           # authenticated connector adapter
```

## Staff workspace navigation

The persistent left menu has Games, Testing, Prize control, Check in, and Grand prize workspaces.
On narrow screens it becomes a compact navigation row. Games opens a game selector
(currently Game Box only), with the master Game Mode switch and individual device mode
controls. The selector represents the existing global kiosk; additional games require
their own backend targeting before they can be added as selectable options.

Testing, Prize control, Check in, and Grand prize retain their form state while switching
workspaces during the session. Each tool loads on its first visit. Refresh state reloads
the game box status without changing the live kiosk. Existing command endpoints are
unchanged; the Check in workspace depends on the issue #131 Function endpoint before it
can validate real codes, and the Grand prize workspace depends on the issue #130 Function
endpoints before it can run a real final draw.

`src/App.tsx` owns navigation and game controls; `src/App.css` styles the responsive
workspace shell. Update this README when navigation, supported games, or workflows change.
