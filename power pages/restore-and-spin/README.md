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
npm run dev
```

Since there's no real dial hardware to drive navigation yet, switch devices directly by
URL during development, e.g. `http://localhost:5173/kiosk/smart-lock`.

## What's stubbed, and where the real wiring goes

- **Copilot Studio / Help-Fix.** `HelpFixBar` renders each device's static `steps` array.
  The real Direct Line integration (matching the existing `AgentButton.tsx`/`useAgentChat.ts`
  pattern) is being built separately — see `GAME_MODE_PLAN.md` §8.
- **Prize claim.** `PlaySpinPage`/`PrizeWheel` pick a prize client-side from
  `src/data/prizes.ts`. The real claim endpoint (weighted pick, atomic decrement,
  redemption code) is `PRIZE_ENGINE_SPEC.md` §1 — an Azure Function, not built here yet.
- **Dial-driven navigation.** Devices are switched today by the gear button in the
  bottom-right corner of every kiosk screen (`DemoGearMenu.tsx`) — a dev stand-in that
  jumps straight to any of the 12 dial positions. The local-WebSocket + SignalR listener
  described in `GAME_MODE_PLAN.md` §4 — the piece that makes the physical dial actually
  change the screen — isn't built yet; there's no hardware to test it against. **Worth a
  decision before this ships to the actual booth:** hide or gate the gear button so
  attendees can't self-serve past the physical dial once real hardware exists.
- **QR code.** `WinOverlay` renders a visually-plausible placeholder pattern, not a real
  encoded QR. Swap in a real QR generator once `/play-spin?token=…` is a real claim token.

## Structure

```
src/
├── data/deviceProfiles.ts   # the 11 devices — content ported from KIOSK_UI_SPEC.md §2
├── data/prizes.ts           # temporary client-side prize pool (see above)
├── types/game.ts
├── components/
│   ├── LampDot.tsx, TactileButton.tsx, DialTicks.tsx   # shared primitives
│   ├── HelpFixBar.tsx, WinOverlay.tsx, PrizeWheel.tsx
│   └── layouts/             # the 5 distinct control-panel layouts (KIOSK_UI_SPEC.md §2)
├── pages/
│   ├── KioskInfoPage.tsx, KioskDevicePage.tsx, PlaySpinPage.tsx
└── styles/theme.css          # shared tokens + all 5 skins
```
