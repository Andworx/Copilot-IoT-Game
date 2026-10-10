# Infrastructure guided walkthrough (#258)

The System Map at `/kiosk/info` doubles as a conference presentation. **Start
walkthrough** steps through the architecture in a fixed order, emphasizing the
components and connections being discussed and dimming the rest. The diagram stays
fully usable (hover, focus, click for details) with or without a walkthrough.

## Pieces

| File | Role |
|---|---|
| `src/data/systemMap.ts` | Architecture datasets (`MapNode` / `MapLink`). Content only. |
| `src/data/walkthrough.ts` | `WalkthroughStep` / `Walkthrough` types, `linkKey()`, and the Standard sequence. Content only. |
| `src/hooks/useWalkthrough.ts` | Shared engine: step index, auto-play timer, cleanup. No architecture knowledge. |
| `src/components/WalkthroughPanel.tsx` | Presenter controls and talking point. |
| `src/components/SystemMap.tsx` | Applies a step as `data-emphasis="on" | "dim"` on nodes/links. |
| `src/styles/system-map.css` | Emphasis, dimming, and the `flow` animation. |

## Defining steps

```ts
{
  title: "Azure IoT ingestion",
  description: "Presenter-facing talking point.",
  nodes: ["pi", "hub", "events"],      // node ids to emphasize
  links: ["pi>hub", "hub>events"],     // link keys: "<from>><to>"
  dim: { nodes: [...], links: [...] }, // optional; default = dim everything not emphasized
  animation: "flow",                   // optional; animates emphasized links
}
```

Steps never contain rendering code. A step may cite only ids that exist in the
dataset it describes; `npm test` (run by `npm run build`) fails on an unknown node,
unknown link key, duplicate link key, or empty step.

## Controls

Start / Restart, Previous, Next, Auto-play / Pause (advances every 9 s and stops on the
last step), and Exit. Buttons are at least 44 px high for the touch kiosk. Auto-play
transitions respect `prefers-reduced-motion`.

## Lifecycle and Demo Mode

The walkthrough introduces **no Demo Mode state**. Infrastructure is the `/kiosk/info`
route; mode selection is unchanged (Function `set-mode` → SignalR `deviceChanged` →
`useDeviceSync`). Walkthrough state lives in `KioskInfoPage`, so:

- When staff select a device and the kiosk navigates away, the page unmounts and the
  timer, step and highlighting are discarded.
- Leaving through the gear menu does the same; returning starts inactive.
- Exit resets the diagram to its normal state.
- A presenter who opened Info from the gear menu is *exploring*; `useDeviceSync`
  deliberately keeps that page local while staff change modes (existing behaviour),
  so the walkthrough continues until the presenter exits or navigates.

## Adding another dataset

1. Add nodes/links to `systemMap.ts`.
2. Export a `Walkthrough` from `walkthrough.ts` and add it to the `datasets` list in
   `scripts/check-device-contracts.mjs`.
3. Pass `useWalkthrough(dataset.steps)` and `<SystemMap step={...} nodes links />`.
   The hook resets when the steps array changes.

The Advanced networking view and Standard/Advanced selector are issue #256.
