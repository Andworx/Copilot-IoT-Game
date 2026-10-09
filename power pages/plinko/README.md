# Plinko Display Code Site

Power Pages Code Site for the event-facing Plinko board display. This is a React + Vite SPA that listens for Plinko result broadcasts, shows the idle how-it-works flow, runs the on-screen bonus-bucket chase lights, and presents a prize-wheel QR after a landing.

## Structure

```
power pages/plinko/
├── powerpages.config.json  # Code Site name and compiled output path
├── src/
│   ├── App.tsx             # Display state, SignalR result handling, QR flow
│   ├── components/         # Reusable Plinko display components
│   ├── config.ts           # API and prize-wheel URL configuration
│   └── styles.css          # Kiosk display styling
└── vite.config.ts          # Local dev server configuration
```

## Usage

```powershell
cd "power pages\plinko"
npm install
npm run dev
npm run build
```

Use `?station=<slug>` to bind the display to a specific board. In local Vite development, number keys `1` through `6` simulate a landing for quick visual checks.

## Runtime Configuration

- `VITE_API_BASE_URL` points to the Functions backend. Defaults to `https://func-aw-iot-game-v2.azurewebsites.net`.
- `VITE_PRIZE_WHEEL_URL` points to the player phone Prize Wheel Code Site. Defaults to `https://andworxprizewheel.powerappsportals.com`.

The display listens for `plinkoResult` messages on the existing SignalR endpoint at `/api` and ignores events for other stations when the event includes `station` or `stationSlug`.

## Deployment

Routine deployment is handled by `.github/workflows/deploy-apps.yml` after the Power Pages site has been created and activated. Set the GitHub variable `POWER_PLINKO_WEBSITE_ID` to the activated Plinko website id before enabling production deployment.

Manual recovery uses the same Code Site command pattern:

```powershell
cd "power pages\plinko"
npm run build
pac pages upload-code-site --rootPath "."
```

Never commit `.powerpages-site/`; it is environment-owned generated metadata.

## Updating This README

Update this README when routes, runtime events, environment variables, deployment behavior, or the display flow changes.
