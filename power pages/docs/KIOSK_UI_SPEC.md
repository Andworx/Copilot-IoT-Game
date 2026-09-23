# Kiosk & Player UI Spec

> **Architecture (#73/#76):** All twelve modes use dedicated read-only surfaces selected
> by a typed registry. The five positional layouts and migration adapters have been
> removed. See [KIOSK_MODE_UI_REDESIGN.md](KIOSK_MODE_UI_REDESIGN.md) for mode designs.

Companion to [`GAME_MODE_PLAN.md`](GAME_MODE_PLAN.md), which covers architecture, data model,
and the win/claim flow. This document is the **visual and interaction spec** for the
`/kiosk/:deviceSlug` screens and the `/play-spin` phone screen — what an engineer builds
the real React components against.

**Live reference:** [Restore & Spin prototype](https://claude.ai/code/artifact/0ef2e0ac-8487-4ef1-945a-86d3d7b01e42)
— a clickable mockup implementing everything in this doc. When this spec and the prototype
disagree, treat it as a bug to reconcile, not a tiebreaker either way.

Target hardware: **official Raspberry Pi 7" touchscreen, 800×480, landscape** (see
`GAME_MODE_PLAN.md` §3a). Every kiosk measurement below assumes that viewport.

## 1. Shared foundation (constant across all twelve devices)

These never change per device — they're what makes all 11 screens read as "the same real
hardware" despite looking different everywhere else.

### 1.1 Fonts

| Role | Face | Weights |
|---|---|---|
| Every data readout — switch labels, lamp labels, status bar, telemetry footer, fault/status line | `IBM Plex Mono` | 400, 500, 600, 700 |
| Device header title (`<h2>`) — **the one thing that changes per device**, see §2 | varies per device | varies |

Loaded via Google Fonts in one request:
```
https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Baloo+2:wght@600;700&family=Chakra+Petch:wght@600;700&family=Fjalla+One&family=Black+Ops+One&display=swap
```

### 1.2 Semantic colors — never reskinned per device

Real safety instrumentation doesn't recolor its warning lights to match a theme, so neither
does this UI. These four values are identical on every device screen:

| Token | Value | Meaning |
|---|---|---|
| `--color-accent` | `#22c55e` | Lamp state: good / restored |
| `--color-primary` | `#f59e0b` | Lamp state: caution / amber; also the phone UI's CTA color |
| `--color-primary-hover` | `#d97706` | Pressed state of the above |
| `--color-danger` | `#ef4444` | Lamp state: fault / bad; also the Help-Fix alert border/text |
| `--color-accent-glow` | `rgba(34,197,94,0.24)` | Glow shadow paired with `--color-accent` |
| `--color-amber-glow` | `rgba(245,158,11,0.28)` | Glow shadow paired with `--color-primary` — also drives the Help-Fix pulse (see §1.5) |
| `--color-danger-glow` | `rgba(239,68,68,0.26)` | Glow shadow paired with `--color-danger` |

Spacing/radius scale used throughout: `--sp-1..4` = 4/8/12/16px, `--radius-sm` = 2px,
`--radius-md` = 3px (thermostat overrides its own panel corner radius to 10px — the one
deliberate shape exception, see §2.1).

### 1.3 Per-device tokens (everything else)

Each device sets its own values for: `--color-bg`, `--color-surface` (×3 steps),
`--color-text` (×3 steps: muted/base/bright), `--color-border` (×2 steps), `--device-accent`
+ `--device-accent-glow` (structural/branding hue — borders, focus rings, header accent bar,
active tab — **never** used for lamp state), and `--display-font` (the header typeface).
Exact values are in §2.

### 1.4 Shared screen chrome (identical structure on every `/kiosk/:deviceSlug`)

Top to bottom, same on all 11:

1. **Status bar** — live-connection dot + "PANEL LINK: CONNECTED" (left), a rolling
   "LAST UPDATE Ns AGO" telemetry clock (right).
2. **Header** — sector eyebrow (e.g. "HOME / SECURITY") + device title in the device's
   display font, with a left accent bar in `--device-accent`; a dial-position badge
   ("DIAL 2 / 12") on the right, also in `--device-accent`.
3. **Fault/status line** — one-line banner, red-bordered with fault copy while unresolved,
   green-bordered with the "nominal" copy once restored. Text comes from the device's
   `faultText` / `okText` (§3).
4. **Control panel body** — the one region that's genuinely different per device. See §2.
5. **Help-Fix bar** — see §1.5.
6. **Telemetry footer** — tiny "PANEL_LINK: CONNECTED" / unit-id strip.

Plus two overlays that can appear on top of all of the above:

- **Fix sheet** — see §1.5.
- **Win overlay** — see §1.6.

### 1.5 Help-Fix pattern (matches the existing `AgentButton.tsx` — do not build a chat UI)

- Renders as a slim bar with a rule on each side, collapsed by default: just the label
  "Help Fix", muted gray, no icon animation.
- While the device is unresolved, it gets an `is-alert` state: border and text switch to
  `--color-danger`, background tints red, and it pulses via an `amberPulse` animation whose
  **glow color is `--color-amber-glow`, not danger-glow** — this red-frame/amber-glow
  combination is deliberate (matches the existing component) and should be reproduced
  exactly, not simplified to a single color.
- Tapping it does **not** open a chat. It slides up a bottom-sheet ("fix sheet") anchored
  just above the bar, showing a **numbered list only** — no chat bubbles, no free-text
  input, no persistent transcript. Tapping again closes it.
- The fix sheet is absolutely positioned over the lower part of the panel body (it overlays,
  it does not push layout) — there is no spare vertical budget on an 800×480 screen to
  reserve permanent space for it.
- Content comes from the device's `steps` array (§3) — in the real build this is where the
  Copilot Studio quick-fix response lands (see `GAME_MODE_PLAN.md` §8), not static text.

### 1.6 Win overlay

Full-viewport takeover (`position: absolute; inset: 0`) over the kiosk screen, in all 11
devices:

- Win message in the device's display font, `--color-accent` colored with an accent glow
  text-shadow.
- A restore checklist — 2-column grid of short "✓ …" lines, content from `restoreItems`
  (§3).
- A QR block pointing at the claim URL (mocked as a static-looking pattern in the prototype;
  real build generates one from the actual `andy_gamewin.andy_claimtoken`, per
  `GAME_MODE_PLAN.md` §7).
- A countdown, "Resets in Ns" — **10 seconds**, per the locked decision in
  `GAME_MODE_PLAN.md` §0. Controls are disabled while this overlay is shown; it also closes
  the fix sheet if it happened to be open.

### 1.7 Motion & materials (applies to every control, every device)

Deliberately upgraded from flat/static to feel like real physical instruments:

- **Lamps** aren't flat dots — each has a small glass-highlight overlay (an off-center
  soft white ellipse) that fades in only when lit, plus an inset shadow on the base so the
  dome reads as slightly recessed. Lit lamps get a slow "breathing" brightness pulse
  (`lampBreathe`, 2.6s ease-in-out) — **red lamps breathe faster** (1.15s) than
  green/amber, so a fault state feels more urgent even before the player reads any text.
- **Instrument interaction is read-only.** Physical telemetry drives visible changes.
  Reserve clickable controls for navigation, opt-in setup/help, and player flows;
  do not recreate the retired mutable switches, dials, or ripple helpers.
- **Needles and pointers** (thermostat fan dial, field-radio channel dial, water-pump
  gauge needle) ease with a slight overshoot (`cubic-bezier(.34,1.56,.64,1)`) rather than
  linear or ease-out — they "snap into place" the way a physical needle settles, instead
  of drifting to a stop.
- **Surfaces have depth**, not flat fills: buttons, keypads, DIP switches, and dial faces
  all carry a paired shadow (`box-shadow`: an outer soft drop shadow + an inset highlight
  near the top edge) and a subtle gradient instead of a solid color, so they read as
  physically raised/beveled rather than drawn.
- Respect `prefers-reduced-motion` throughout (§5) — the breathing pulse and
  needle overshoot should all fall back to instant/static rather than forcing motion.

## 2. Mode-specific surfaces

`DeviceProfile.surfaceKind` selects one of twelve dedicated React components through
`src/components/surfaces/registry.tsx`. Each surface owns its geometry and interprets
explicit semantic telemetry keys. Never infer meaning from switch/lamp array positions.
There are no positional layout adapters or `layout`/`instruments` profile fields.

`PanelSurfaceProps` supplies the device profile, Boolean state, semantic lamp colors,
completion, connection freshness, and physical control mappings. It exposes no mutation
callback. `PanelSurface` shares the connection banner and labeled status indicators;
mode-specific SVGs and qualitative readouts remain in their own components.

`KioskDevicePage` owns routing, telemetry subscriptions, Help Fix, completion, prize
requests, and mode changes. The physical panel is the source of control changes.
Normal instruments display domain names and current state only. Physical identifiers,
required switch positions, and cable recipes belong only in opt-in gear setup or Help Fix.
The gear dialog exposes all six switch and four socket mappings; do not add a bottom rail.

Follow [the active mode designs](KIOSK_MODE_UI_REDESIGN.md) for each surface's geometry.
All modes must fit 800x480, label semantic statuses, show unavailable data as unknown,
stop activity when stale, and respect reduced motion. Do not infer measured quantities
from Boolean controls; omit them or clearly label illustrative/simulated content.

## 3. Data contract

The authoritative frontend type is `src/types/game.ts:DeviceProfile`, with profiles in
`src/data/deviceProfiles.ts`. These are code-owned definitions; this cleanup does not
change Dataverse schemas. Relevant fields are:

- `slug`, `label`, `sector`, `modeIndex`, `dialPosition`: identity and header metadata.
- `surfaceKind`: typed registry selection, independent of array order.
- `restoreSequence`: all ten physical mappings, semantic keys, labels, and target values.
- `requiredCables`: cable identities and socket pairs.
- `lamps`, `fault`, `computeLamps`: semantic indicators and Boolean fixture state.
- `checkWin(state, cables)`: final configuration validation, not temporal action order.
- `faultText`, `okText`, `steps`, `winMessage`, `restoreItems`: status and help/completion copy.

Pi logic maps remain the source for physical contracts. Run `npm test` for exhaustive
configuration and exact cable-recipe checks. The surface fixtures guard actual telemetry
key reads against `restoreSequence`; browser checks cover all twelve modes in fault,
partial, restored, stale, and waiting states, plus setup/help. The kiosk-flow suite checks
Game Mode ON/OFF completion and mode-change reset. See the app README for commands.

## 4. Player phone (`/play-spin`)

Not hardware-constrained the same way — renders on the player's own phone, so it's built
responsive rather than to a fixed pixel size, but shares the same token system and fonts as
the kiosk (this is one product, not two).

Three steps, one screen at a time (no back/forward chrome beyond an explicit button):

1. **Share (optional)** — name + email fields, both clearly optional, with a "Skip — just
   spin" button styled identically to the "Share & continue" button (no visual penalty for
   skipping, matching the §0 decision that sharing never gates or affects the outcome).
2. **Wheel** — a canvas-drawn prize wheel. Segments are weighted by `andy_weight` (see
   `GAME_MODE_PLAN.md` §5/§7); prototype segment colors (`#3a4a5c`, `#4c8dff`, `#2f6e64`,
   `#c9a227`, `#d9573b`) are decorative and deliberately distinct from the kiosk's
   green/amber/red lamp semantics — don't reuse those three hues on the wheel, they'd read
   as status colors instead of prize colors. The spin animation is theater — see
   `GAME_MODE_PLAN.md` §7 for why the actual prize is decided server-side before the wheel
   ever turns.
3. **Result** — prize name + a claim code, plus a note that the kiosk is resetting for the
   next player.

## 5. Accessibility & touch

- No hover-dependent affordances anywhere inside the kiosk frame — it's a touchscreen.
  Pressed/active states carry the feedback instead.
- Every switch widget's clickable hit area should meet a ~44×44px minimum even where the
  drawn widget is smaller (the cold-chain DIP switches and field-radio guards are the
  tightest fits — pad their hit targets, don't shrink below the drawn size).
- Keyboard focus gets a visible outline (`--device-accent`-colored, 2px, 2px offset) on
  every interactive element — useful for testing even though the kiosk itself is touch-only.
- Respect `prefers-reduced-motion`: the scan-line sweep, dial transitions, and wheel spin
  should all shorten/disable rather than force motion on a reduced-motion device.
