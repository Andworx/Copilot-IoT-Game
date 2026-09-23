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
| `/kiosk/info` | `KioskInfoPage` | Interactive System Map and How to Play; not a game device |
| `/kiosk/:deviceSlug` | `KioskDevicePage` | One component, 12 data-driven instances (`src/data/deviceProfiles.ts`) |
| `/play-spin` | `PlaySpinPage` | Placeholder, not built — the phone-facing spin flow lives in the standalone `power pages/prize wheel` app instead; the win QR links out there directly |

## Local development

```powershell
npm install
cp .env.example .env.local   # optional -- override VITE_API_BASE_URL to point at `func start` locally
npm run dev
```

Live kiosk URLs follow the panel's selected mode on startup, reconnect, and browser
resume. Opening `/kiosk/thermostat` while the box is on Cold-Chain Sensor navigates to
Cold-Chain Sensor instead of waiting for thermostat telemetry that cannot arrive.
Use `/tests/surface-preview.html?mode=thermostat&state=partial` for an isolated visual
preview during development; it is not included in the deployed site.

**CORS:** the Function App only allows specific origins (`az functionapp cors add`, not a
wildcard). `http://localhost:5173` is already allowed; add any other dev port/origin the
same way, and add the real production URL once this site is deployed.

## Game Mode

Read on device mount and connection recovery from `GET /api/kiosk-state` (`gameModeEnabled`, defaulting to
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
- **No signal:** controls remain read-only, the instrument shows unavailable/stale status,
  physical values show Unknown, and activity animations stop.

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
├── data/deviceProfiles.ts   # the 12 devices — content ported from KIOSK_UI_SPEC.md §2
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

## Instrument surfaces and validation

See [the active redesign notes](../docs/KIOSK_MODE_UI_REDESIGN.md). Mode surfaces use
`surfaceKind` and explicit instrument bindings. All ten physical inputs are available
in the gear setup dialog; instruments show domain names and current state only. `npm test` exhaustively validates the frontend
contract against the Pi logic maps and runs automatically before `npm run build`.
The ordered repair guidance does not impose temporal order on win detection.
For isolated visual fixtures, run Vite and open
`/tests/surface-preview.html?mode=thermostat&state=partial` (fault, partial, restored,
stale, waiting). This entry is not included in the production build.
With Vite running on port 5183, run `node tests/check-surfaces.mjs` from this app
folder (requires Playwright; see the redesign notes for browser setup). Override
`KIOSK_TEST_URL` for another port and `PLAYWRIGHT_CHROMIUM_EXECUTABLE` for an installed
browser. The suite checks 60 fixtures, all ten setup mappings and exact cable
recipes against Pi definitions, plus Help Fix fallback actions for all twelve modes.
`npm test` also checks that the Help Fix prompt describes final configuration and
allows actions in any order. Live Pi/page verification remains a separate release check.

## Connection recovery

The SignalR provider retries failed initial negotiation with capped backoff and keeps
retrying interrupted connections beyond the SDK's default four attempts. Browser online,
pageshow, and visible-tab events recheck connection/server state. No browser setting or
Pi restart is needed for a transient browser network suspension.
The connection indicator uses actual transport state; panel values require a fresh reading
after recovery. The mode snapshot refresh retries failures and cannot overwrite a newer
mode broadcast. The Game Mode flag also refreshes after recovery.

`node "power pages/copilotiotgame/tests/check-connection-recovery.mjs"` from the repository
root tests startup failure, online recovery, a long outage, mode/flag resync, and fresh
telemetry using mocked HTTP/WebSockets and a controlled browser clock. See the instrument
notes for the test browser setup. Production mode changes remain in Game Box Control;
the gear menu's display-only mode shortcuts are limited to local development.

The gear menu exposes **Switch positions & cables** for the active mode. Its read-only setup dialog lists the required final switch positions and socket connections, even while telemetry is unavailable. Mode surfaces omit the bottom physical-panel rail; keep this convention for future mode redesigns.

## System Map (#91)

`/kiosk/info` shows the architecture across Edge, Azure / Cloud and Power Platform.
Hover or focus a component to highlight its links; click, tap or press Enter for its
role and interfaces. Narrow screens use a card grid; connection details remain available.
The live-feed indicator reports only this browser SignalR connection. Diagram lines
are architectural connections, not measurements of service health.

Opening Info from the gear menu keeps the map open while staff change modes. Return
follows the latest server-selected mode without issuing a mode write. A direct home/info
load stays on the map during state snapshots; staff mode broadcasts still move a normal
idle kiosk into a game. Device deep links retain server-mode synchronization.

The node and connection definitions live in `src/data/systemMap.ts`. Reference icons
are from `Andworx/copilot-iot-service`; their MIT notice is retained with the assets.
No Power Automate runtime is depicted: this implementation uses Function APIs for
win creation, claims and automatic rotation.

For isolated previews open `/tests/system-map-preview.html` with Vite running.
Run `node tests/check-system-map.mjs` against port 5183 for navigation, accessibility,
responsive layout and touch coverage. Production builds exclude this fixture.
