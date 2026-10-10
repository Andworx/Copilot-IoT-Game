# Plinko booth display

Power Pages **Code Site** (React 19 + Vite) for the physical Plinko board, site name
`Plinko`. Design: [`../docs/PLINKO_GAME_PLAN.md`](../docs/PLINKO_GAME_PLAN.md).

- **Idle** — `FlowInfographic`: how a drop travels from the board through Azure and
  Power Platform, with a light moving through the steps in order.
- **Win** — `WinCelebration`: Power Platform logo confetti, landed and lit bucket,
  entries awarded, and a QR to the shared prize wheel. **Skip** or a 45 s countdown
  returns to idle.

The screen listens for `plinkoResult` on the shared `gamebox` SignalR hub
(`src/types/plinko.ts`) and ignores other stations. Pick the station with
`?station=<andy_stationslug>` (default `plinko-1`).

## Structure

```
power pages/plinko/
├── powerpages.config.json  # Code Site name and compiled output path
├── src/
│   ├── App.tsx             # Display state, SignalR result handling, QR flow
│   ├── components/         # FlowInfographic (idle) and WinCelebration (win)
│   ├── context/            # SignalRContext — shared gamebox hub connection
│   ├── data/flowSteps.ts   # Idle infographic step content
│   ├── lib/apiConfig.ts    # API, prize-wheel, and station configuration
│   ├── types/plinko.ts     # plinkoResult event contract
│   └── styles/theme.css    # Booth display styling and design tokens
└── vite.config.ts          # Local dev server configuration
```

## Develop

```powershell
cd "power pages\plinko"
npm install
npm run dev   # http://localhost:5175 — press 1-5 to simulate a landing, Esc to clear
npm run build
```

`VITE_API_BASE_URL`, `VITE_PRIZE_WHEEL_URL`, and `VITE_PLINKO_STATION` override the
defaults in `src/lib/apiConfig.ts`.

## Runtime Configuration

- `VITE_API_BASE_URL` points to the Functions backend. Defaults to `https://func-aw-iot-game-v2.azurewebsites.net`.
- `VITE_PRIZE_WHEEL_URL` points to the player phone Prize Wheel Code Site. Defaults to `https://andworxprizewheel.powerappsportals.com`.
- `VITE_PLINKO_STATION` sets the default station slug when `?station=` is absent. Defaults to `plinko-1`.

The display listens for `plinkoResult` messages on the shared `gamebox` SignalR hub and ignores events for other stations when the event includes `station` or `stationSlug`.

## Deployment

Routine deployment is handled by `.github/workflows/deploy-apps.yml` after the Power Pages site has been created and activated. Set the GitHub variable `POWER_PLINKO_WEBSITE_ID` to the activated Plinko website id before enabling production deployment.

Manual recovery uses the same Code Site command pattern (never `pac pages upload`, which
corrupts code site metadata — see `../AGENTS.md` and `../../PAC_COMMANDS.md`):

```powershell
cd "power pages\plinko"
npm run build
pac pages upload-code-site --rootPath "."
```

Never commit `.powerpages-site/`; it is environment-owned generated metadata.

## Updating This README

Update this README when routes, runtime events, environment variables, deployment behavior, or the display flow changes.
