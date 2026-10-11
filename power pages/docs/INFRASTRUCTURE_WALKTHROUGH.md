# Infrastructure guided walkthrough (#258, #256)

The System Map at `/kiosk/info` doubles as a conference presentation. **Start
walkthrough** steps through the architecture in a fixed order, emphasizing the
components and connections being discussed and dimming the rest. The diagram stays
fully usable (hover, focus, click for details) with or without a walkthrough.

A **Standard / Advanced** selector swaps the architecture dataset and its walkthrough
in place (no reload). **Standard** is the game dataflow; **Advanced** is the deeper
secure-networking path (travel-router VPN, private Azure endpoints, the staff Entra API
boundary, public attendee flow). `/kiosk/info?view=advanced` deep-links the Advanced
view, and the old `/kiosk/solution` route redirects to it.

## Pieces

| File | Role |
|---|---|
| `src/data/systemMap.ts` | Architecture datasets (`MapNode` / `MapLink`). Content only. |
| `src/data/walkthrough.ts` | `WalkthroughStep` / `Walkthrough` types, `linkKey()`, and the `STANDARD_WALKTHROUGH` / `ADVANCED_WALKTHROUGH` sequences. Content only. |
| `src/pages/KioskInfoPage.tsx` | Standard/Advanced selector (synced to `?view=`); picks the dataset + walkthrough. |
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

## Current vs planned infrastructure

`MapNode.status` marks deployment state. Omitting it (the default) means **current /
deployed**; `status: "planned"` renders the node as a dashed target with a "PLANNED"
badge so a presentation never implies planned infrastructure already exists. As of the
destination cutover, every Advanced-view node is deployed, so none is flagged planned;
flag future target nodes with `status: "planned"` when they are added.

## Adding another dataset

1. Add nodes/links to `systemMap.ts` (optionally with `status`).
2. Export a `Walkthrough` from `walkthrough.ts` and add it to the `datasets` list in
   `scripts/check-device-contracts.mjs`.
3. Add it to the `VIEWS` map in `KioskInfoPage.tsx` (or pass
   `useWalkthrough(dataset.steps)` and `<SystemMap step={...} nodes links />` directly).
   The hook resets when the steps array changes.
