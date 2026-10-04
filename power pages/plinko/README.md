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

## Develop

```powershell
cd "power pages\plinko"
npm install
npm run dev   # http://localhost:5175 — press 1-5 to simulate a landing, Esc to clear
npm run build
```

`VITE_API_BASE_URL`, `VITE_PRIZE_WHEEL_URL`, and `VITE_PLINKO_STATION` override the
defaults in `src/lib/apiConfig.ts`.

## Status

Nothing emits `plinkoResult` until the #128 backend handler ships. The Code Site
deploys through `.github/workflows/deploy-apps.yml` after changes merge to `main`,
provided the `POWER_PLINKO_WEBSITE_ID` deployment variable points at the activated
Plinko website. For explicit manual recovery/bootstrap only, use
`pac pages upload-code-site --rootPath "."` and never `pac pages upload` -- see
`../AGENTS.md` and `../../PAC_COMMANDS.md`.
