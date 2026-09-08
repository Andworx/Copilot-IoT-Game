# Restore & Spin

Power Pages Code Site (React 19 + Vite SPA) for the Copilot IoT Game — see
[`../GAME_MODE_PLAN.md`](../GAME_MODE_PLAN.md), [`../KIOSK_UI_SPEC.md`](../KIOSK_UI_SPEC.md),
and [`../PRIZE_ENGINE_SPEC.md`](../PRIZE_ENGINE_SPEC.md) for the full design.

Built fresh for this game rather than extending the sibling `iot-panel-dashboard` app —
that app was reference only (its `AgentButton`/`useAgentChat` pattern, `theme.css` tokens,
and 800×480 kiosk conventions informed this one, but the routes/pages here are new).

## Routes

| Route | Renders | Notes |
|---|---|---|
| `/kiosk/info` | `KioskInfoPage` | Dial position 1 — demo/info, not a game device |
| `/kiosk/:deviceSlug` | `KioskDevicePage` | One component, 11 data-driven instances (`src/data/deviceProfiles.ts`) |
| `/play-spin` | `PlaySpinPage` | Phone-facing: optional share → wheel → result |

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

## What's stubbed, and where the real wiring goes

- **Copilot Studio / Help-Fix.** `HelpFixBar` renders each device's static `steps` array.
  The real Direct Line integration (matching the existing `AgentButton.tsx`/`useAgentChat.ts`
  pattern) is being built separately — see `GAME_MODE_PLAN.md` §8.
- **Prize claim.** `PlaySpinPage`/`PrizeWheel` pick a prize client-side from
  `src/data/prizes.ts`. The real claim endpoint (weighted pick, atomic decrement,
  redemption code) is `PRIZE_ENGINE_SPEC.md` §1 — an Azure Function, not built here yet.
- **QR code.** `WinOverlay` renders a visually-plausible placeholder pattern, not a real
  encoded QR. Swap in a real QR generator once `/play-spin?token=…` is a real claim token.

**Done, no longer stubbed:** mode selection. `SignalRContext` opens one connection for the
whole app at the root (`main.tsx`); `useDeviceSync` (called once, in `App.tsx`) fetches
`GET /api/kiosk-state` on load to place a freshly-opened tab on the right device
immediately, then navigates on every live `deviceChanged` broadcast after that — confirmed
end to end 2026-09-08 against the real deployed Function App (`azure/`), including a live
test where an external `POST /api/set-mode` call pushed an open browser tab from
`/kiosk/info` to `/kiosk/smart-lock` with no reload. `DemoGearMenu.tsx`'s gear button is
still a dev-only shortcut, now redundant with the real control app
(`GAME_MODE_PLAN.md` §4a) rather than a stand-in for the physical dial — same "hide/gate
before the booth" note applies, now for a different reason.

## Structure

```
src/
├── data/deviceProfiles.ts   # the 11 devices — content ported from KIOSK_UI_SPEC.md §2
├── data/prizes.ts           # temporary client-side prize pool (see above)
├── types/game.ts
├── context/SignalRContext.tsx  # one SignalR connection for the whole app (GAME_MODE_PLAN.md §4a)
├── hooks/useDeviceSync.ts      # fetch-on-load + navigate-on-broadcast (GAME_MODE_PLAN.md §4a)
├── lib/apiConfig.ts            # azure/ Functions base URL
├── components/
│   ├── LampDot.tsx, TactileButton.tsx, DialTicks.tsx   # shared primitives
│   ├── HelpFixBar.tsx, WinOverlay.tsx, PrizeWheel.tsx
│   └── layouts/             # the 5 distinct control-panel layouts (KIOSK_UI_SPEC.md §2)
├── pages/
│   ├── KioskInfoPage.tsx, KioskDevicePage.tsx, PlaySpinPage.tsx
└── styles/theme.css          # shared tokens + all 5 skins
```
