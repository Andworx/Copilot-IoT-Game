# Copilot IoT Game — Kiosk Code Site

Power Pages Code Site (React 19 + Vite SPA) for the Copilot IoT Game kiosk — see
[`../docs/GAME_MODE_PLAN.md`](../docs/GAME_MODE_PLAN.md) and
[`../docs/KIOSK_UI_SPEC.md`](../docs/KIOSK_UI_SPEC.md) for the full design.

Supersedes the earlier `power pages/restore-and-spin` prototype, which has been removed —
this app adds Game Mode (win completion behaves differently depending on
`andy_gamemodeenabled` on the `andy_gameboxstate` singleton) and a real, scannable win QR.

## Routes

| Route | Renders | Notes |
|---|---|---|
| `/kiosk/info` | `KioskInfoPage` | Dial position 1 — demo/info, not a game device |
| `/kiosk/:deviceSlug` | `KioskDevicePage` | One component, 11 data-driven instances (`src/data/deviceProfiles.ts`) |
| `/play-spin` | `PlaySpinPage` | Placeholder, not built — the phone-facing spin flow lives in the standalone `power pages/prize wheel` app instead; the win QR links out there directly |

## Local development

```powershell
npm install
cp .env.example .env.local   # optional -- override VITE_API_BASE_URL to point at `func start` locally
npm run dev
```

Every device page can still be opened directly by URL for isolated testing, e.g.
`http://localhost:5173/kiosk/smart-lock` — `useDeviceSync` only auto-navigates on load when
the tab starts on the landing route (`/` or `/kiosk/info`); a deep link is left alone on
load, but still follows live mode changes afterwards like every other route.

**CORS:** the Function App only allows specific origins (`az functionapp cors add`, not a
wildcard). `http://localhost:5173` is already allowed; add any other dev port/origin the
same way, and add the real production URL once this site is deployed.

## Game Mode

Read once per device mount from `GET /api/kiosk-state` (`gameModeEnabled`, defaulting to
`true` while loading or on a failed fetch, so a slow/dead backend never silently drops a
real win into the wrong path):

- **ON** — a win creates an `andy_gamewin` row (`POST /api/create-win`) and shows
  `WinOverlay`: a real QR (the `qrcode` package) pointing at
  `${VITE_PRIZE_WHEEL_URL}/?token=<claimToken>` — the standalone `power pages/prize wheel`
  Code Site, which calls the real `/api/prizes` and `/api/claim-prize` endpoints.
- **OFF** — no Dataverse write at all; `SuccessPopup` shows a simple client-side
  congratulations screen instead.

Both states auto-rotate to a new random *enabled* device (`POST /api/pick-random-mode`)
after the reset timer elapses.

## Live panel state

The panel Pi's readings reach the page as `SendTelemetryUpdate` on the same SignalR hub as
`deviceChanged` (Pi → IoT Hub → Event Hub → the Function App's `iot-telemetry` trigger →
SignalR; see `azure/README.md`). `hooks/usePanelTelemetry.ts` keeps the latest reading
for the current device:

- **Live** (a reading for this mode in the last 45 s; the Pi heartbeats every 30 s): the
  on-screen controls mirror the Pi's `controls` (same keys as `deviceProfiles.ts`), taps
  are ignored, the header shows the real "last update" age, and the footer lists the
  cables the Pi sees (`#4 J1↔J2`).
- **No signal:** the controls stay tappable so the kiosk still works as a standalone demo.

Help Fix appears only while the current mode is unresolved, then sends the agent one
structured prompt (`lib/quickFixPrompt.ts`): the active mode, each control's current vs.
target state, the cables plugged in, and "reply with only a numbered list".

## What's stubbed, and where the real wiring goes

- **Copilot Studio agent.** Help Fix already talks to the agent over Direct Line
  (`hooks/useAgentChat.ts`, ported from the sibling `iot-panel-dashboard`), via
  `GET /api/directline-token`. Until `DIRECTLINE_SECRET` is set on the Function App the
  token call returns 503 and the bar falls back to the device's static `steps`. The
  agent's own topics are built separately — see `GAME_MODE_PLAN.md` §8.
- **`/play-spin`.** Unbuilt placeholder — see the Routes table above.

**Done, no longer stubbed (vs. the old `restore-and-spin` prototype):** the win QR is a
real encoded code, not a placeholder pattern; prize claiming happens against real Dataverse
data (`andy_PrizeTypes`/`andy_Prizes`) via the standalone prize wheel app, not a client-side
random pick; and Game Mode gates all of the above.

## Structure

```
src/
├── data/deviceProfiles.ts   # the 11 devices — content ported from KIOSK_UI_SPEC.md §2
├── types/game.ts
├── context/SignalRContext.tsx  # one SignalR connection for the whole app (GAME_MODE_PLAN.md §4a)
├── hooks/useDeviceSync.ts      # fetch-on-load + navigate-on-broadcast (GAME_MODE_PLAN.md §4a)
├── hooks/usePanelTelemetry.ts  # live panel state from SendTelemetryUpdate
├── hooks/useAgentChat.ts       # Direct Line quick-fix request/reply
├── lib/apiConfig.ts            # azure/ Functions base URL + prize wheel app URL
├── lib/quickFixPrompt.ts       # the structured prompt Help Fix sends
├── types/telemetry.ts          # the Pi payload as relayed by the Function App
├── components/
│   ├── LampDot.tsx, TactileButton.tsx, DialTicks.tsx   # shared primitives
│   ├── HelpFixBar.tsx, WinOverlay.tsx, SuccessPopup.tsx, DemoGearMenu.tsx
│   └── layouts/             # the 5 distinct control-panel layouts (KIOSK_UI_SPEC.md §2)
├── pages/
│   ├── KioskInfoPage.tsx, KioskDevicePage.tsx, PlaySpinPage.tsx (placeholder)
└── styles/theme.css          # shared tokens + all 5 skins
```

## Deployment

Releases go through GitHub Actions (`.github/workflows/deploy-apps.yml`); see
`docs/CI_CD.md`. The pipeline pins the live Power Pages website, downloads its
`.powerpages-site/` metadata, uploads the build and verifies the site ID.

`.powerpages-site/` is generated state owned by the live site, so it is **not tracked
in git** (it is git-ignored) and should never be committed, hand-edited or reused
from an old download. For a manual recovery upload, follow the steps in
`PAC_COMMANDS.md`, which fetch it fresh with `pac pages download-code-site`.
