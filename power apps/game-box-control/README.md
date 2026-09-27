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

The production drawing flow is built for two devices: an operator device and a display
device. Normal operator mode keeps the `Run final draw` and `Preview animation` controls
available to staff. Presentation mode hides those controls entirely and connects to the
existing Azure SignalR `gamebox` hub through `POST /api/negotiate`; when the Function
broadcasts `grandPrizeDrawn`, the display spins to the committed winner and opens the
winner reveal. The display still refreshes the eligible lineup/counts from
`GET /api/grand-prize/drawing-slices`, so reloads and missed SignalR messages recover from
server state instead of relying on browser-to-browser communication.

It also includes a Prize Claim smoke-test screen for the shared Prize Claim rollout. The
screen calls the anonymous `POST /api/create-win` and `POST /api/claim-prize` endpoints,
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

## Local development

```powershell
npm install
cp .env.example .env.local   # fill in VITE_SET_MODE_FUNCTION_KEY (az functionapp function keys list --function-name set-mode)
npm run dev
```

Runs on port 5174 (5173 is `copilotiotgame`'s, so both can run side by side). Needs
`http://localhost:5174` in the Function App's CORS allowed origins
(`az functionapp cors add` — already added for this dev port).

For grand-prize display testing, open the Grand prize workspace and click **Hide menu**.
That switches the app into presentation mode: the side menu collapses to the gear button,
operator controls disappear from the display, and the screen listens for the
`grandPrizeDrawn` SignalR event. Click the gear to return to operator mode and access the
manual draw/preview controls.

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
    ├── App.tsx                # workspace navigation + game controls, renders tools
    ├── GrandPrizeCheckIn.tsx  # staff check-in form for emailed grand-prize codes
    ├── GrandPrizeDrawing.tsx  # weighted wheel, operator controls, SignalR display listener for issue #130
    ├── PrizeManagement.tsx    # bulk-create-prizes UI (Prize Management section)
    ├── SmokeTest.tsx          # create-win + claim-prize smoke-test UI, including #134 email preview
    └── apiConfig.ts           # azure/ Functions base URL + function keys
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
