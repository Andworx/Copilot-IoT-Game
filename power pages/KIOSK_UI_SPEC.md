# Kiosk & Player UI Spec

Companion to [`GAME_MODE_PLAN.md`](GAME_MODE_PLAN.md), which covers architecture, data model,
and the win/claim flow. This document is the **visual and interaction spec** for the
`/kiosk/:deviceSlug` screens and the `/play-spin` phone screen — what an engineer builds
the real React components against.

**Live reference:** [Restore & Spin prototype](https://claude.ai/code/artifact/0ef2e0ac-8487-4ef1-945a-86d3d7b01e42)
— a clickable mockup implementing everything in this doc. When this spec and the prototype
disagree, treat it as a bug to reconcile, not a tiebreaker either way.

Target hardware: **official Raspberry Pi 7" touchscreen, 800×480, landscape** (see
`GAME_MODE_PLAN.md` §3a). Every kiosk measurement below assumes that viewport.

## 1. Shared foundation (constant across all 11 devices)

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
- **Every switch/button press** gets immediate tactile feedback: `transform: scale(0.94)`
  + a brightness dip on `:active`, plus a short-lived ripple — a semi-transparent circle
  that expands from the exact touch point and fades over ~0.5s (`rippleFx`). This is
  layered on top of whatever the widget's own on/off animation is, not a replacement
  for it.
- **Needles and pointers** (thermostat fan dial, field-radio channel dial, water-pump
  gauge needle) ease with a slight overshoot (`cubic-bezier(.34,1.56,.64,1)`) rather than
  linear or ease-out — they "snap into place" the way a physical needle settles, instead
  of drifting to a stop.
- **Surfaces have depth**, not flat fills: buttons, keypads, DIP switches, and dial faces
  all carry a paired shadow (`box-shadow`: an outer soft drop shadow + an inset highlight
  near the top edge) and a subtle gradient instead of a solid color, so they read as
  physically raised/beveled rather than drawn.
- Respect `prefers-reduced-motion` throughout (§5) — the breathing pulse, ripple, and
  needle overshoot should all fall back to instant/static rather than forcing motion.

## 2. Per-device design

Five distinct identities, one shared skeleton (§1.4). `--device-accent` is set via
`document.documentElement.style.setProperty('--device-accent', …)` (or its real-build
equivalent) so the outer dial-position UI matches whichever device is active, not just the
panel itself.

### 2.1 Thermostat — Home — `andy_dialposition = 2`

| Token | Value |
|---|---|
| Background family | `#1c1510` / `#241b13` / `#2b2117` / `#332819` |
| Text (muted / base / bright) | `#6b5c47` / `#cbb89e` / `#f0e2cf` |
| Border | `#2f2417` / `#3d301f` |
| Device accent | `#d98b4a` (warm copper), glow `rgba(217,139,74,0.30)` |
| Display font | `Baloo 2` (rounded, friendly — the one device that isn't monospace-headed and isn't shouting in caps: header keeps normal case, `letter-spacing: 0.01em`) |
| Motif | Soft warm radial glow (two overlapping ellipses), **no grid texture** — deliberately the calmest, least "technical-instrument" screen of the five |
| Shape | Panel corner radius bumped to **10px** (the only device that isn't sharp-cornered) |

**Control layout — "dial + arc":**
- One big rotary dial (`Fan`) centered, ~78px circle, ringed by a 9-tick scale (spanning
  −75° to +75°, drawn as an SVG `dial-ticks` ring in `--color-text-muted` at 70% opacity —
  see the shared `tickRingSVG` helper, reused by the field-radio dial too) so it reads as a
  real gauge face, not a bare knob. A pointer line rotates from −55° (off) to +55° (on) on
  toggle, with the label "FAN" beneath it.
- Three pill-shaped buttons below the dial: Power, Eco, Heat/Cool — rounded (16px radius),
  muted by default, tinted with `--device-accent` at 18% + accent-colored border/text when
  pressed.
- Four small lamp dots arranged in an arc **above** the dial (like a gauge scale) rather
  than a row: Power, Heating, Cooling, Fault.

### 2.2 Smart Lock & Security Panel — Home/Security — `andy_dialposition = 3`

| Token | Value |
|---|---|
| Background family | `#0b0e12` / `#10151b` / `#151b23` / `#1b232c` |
| Text (muted / base / bright) | `#4d5a67` / `#b9c3cf` / `#e7edf3` |
| Border | `#1a222b` / `#232e3a` |
| Device accent | `#4c8dff` (cool blue), glow `rgba(76,141,255,0.28)` |
| Display font | `IBM Plex Mono` (same as the data layer — reads as a digital keypad/LCD, not a separate typeface) |
| Motif | Fine dot grid (1.2px dots, 14px pitch) **plus** an animated horizontal scan-line sweep (`scanSweep`, 4s linear loop, top to bottom) — a security-camera-scan cue |

**Control layout — "keypad":**
- An LCD-style readout above the keypad — small caps text, red with a text-shadow glow
  reading "ALERT" while faulted, switching to green "SECURE" once restored. Recessed
  background (inset shadow) so it reads as a tiny embedded display, not a label.
- 2×2 grid of square keypad buttons, 62×54px each: PWR / BOLT / AUTO / ALARM.
- A vertical LED column to the right of the keypad — one row per lamp (Locked / Ajar /
  Battery / Tamper), each a small square dot with its label to the right — mirrors a real
  alarm panel's side status strip rather than a row underneath.

### 2.3 Cold-Chain Warehouse Sensor — Enterprise/Industrial — `andy_dialposition = 4`

| Token | Value |
|---|---|
| Background family | `#0a1014` / `#0e161b` / `#121d23` / `#17242b` |
| Text (muted / base / bright) | `#4a6167` / `#a9c8cf` / `#dff5f7` |
| Border | `#17252b` / `#203540` |
| Device accent | `#2dd4c7` (cyan/teal), glow `rgba(45,212,199,0.28)` |
| Display font | `Chakra Petch` (technical/angular) |
| Motif | Cyan-tinted blueprint grid (1px lines, 24px pitch) + open corner crosshair register marks top-left/bottom-right — a deliberate callback to the engineering-drawing look already used in `.github/skills/andworx-style-diagram-generator` |

**Control layout — "DIP-switch bank":**
- A tight row of 4 small (30×44px) DIP-style flip switches along the top: PWR / CAL / THR /
  SYNC — a sliding internal bar moves from top (off) to bottom-third (on, accent-colored
  with a glow), mimicking a PCB switch bank rather than a toggle.
- A fake digital numeric readout centered below the switches (e.g. `−18.4°C ⚠` while
  faulted, `2.1°C ✓` once restored) in the display font, accent-colored — the one device
  with a literal data readout as a design element.
- A small **live sparkline** (SVG polyline, 92×28) directly beside the readout — a rolling
  16-point trend line that re-draws roughly every 900ms, drifting toward the top of the
  chart while faulted and settling low/flat once resolved. This is the one instrument that
  animates continuously rather than only on interaction, and the only sparkline among the
  11 devices — appropriate for the one device whose whole premise is a sensor logging a
  reading over time.
- A row of 4 small square LEDs along the bottom: In-Range / Alert-High / Alert-Low / Link.

### 2.4 Water Pump Station Controller — Public Sector/Utility — `andy_dialposition = 5`

| Token | Value |
|---|---|
| Background family | `#0a1420` / `#0e1a28` / `#13212f` / `#182838` |
| Text (muted / base / bright) | `#55637a` / `#b7c4d6` / `#e6edf7` |
| Border | `#172332` / `#223144` |
| Device accent | `#f2c230` (safety yellow), glow `rgba(242,194,48,0.28)` |
| Display font | `Fjalla One` (bold condensed — civic/signage feel) |
| Motif | An **opaque** yellow/black diagonal hazard-stripe bar, 5px tall, across the very top edge of the screen — plus a faint (5% opacity) diagonal pinstripe wash across the whole background. Keep the hazard bar opaque and thin; a full-screen diagonal stripe fill at higher opacity was tried and was overpowering — don't repeat that. |

**Control layout — "paired columns":**
- A **real pressure gauge** centered above the columns — an SVG semicircle dial (110×66)
  with 3 colored zones (red/amber/green, matching the global semantic colors, never
  re-hued) and a needle that swings from deep in the red zone (fault — pressure not
  relieved) to deep in the green zone (restored), with the overshoot-eased transition from
  §1.7. This is the centerpiece instrument for the one device whose whole premise is a
  pressure reading.
- 4 vertical columns spread across the panel width, each column = one large (26px) lamp
  directly above one large (48×30px) chunky rocker switch, with a label beneath: Power /
  Pump / Relief / Remote. Reads like breaker-panel switches, each with its own indicator
  light, rather than two separate switch/lamp rows.

### 2.5 Tactical Field Radio — Military/Defense — `andy_dialposition = 6`

| Token | Value |
|---|---|
| Background family | `#12160f` / `#171c13` / `#1c2216` / `#222a1a` |
| Text (muted / base / bright) | `#5c5f47` / `#c2c2a0` / `#e8e8c8` |
| Border | `#1f2618` / `#2a331f` |
| Device accent | `#8a9a4a` (muted olive), glow `rgba(138,154,74,0.28)` |
| Display font | `Black Ops One` (stencil — literally how real field-gear ID plates are lettered) |
| Motif | Woven canvas/cross-hatch texture (two overlapping diagonal hairline patterns) + 4 small rivet dots in the screen corners |

**Control layout — "radio cluster":**
- Left: a vertical column of 2 **guarded** toggle switches (PWR, TX) — each has a hinged
  "flap" that lifts (scales down to 18% height) when engaged, like a protected tactical
  switch.
- Center: one large (74px) circular channel-tuning dial (`channelhop`), also ringed by a
  10-tick scale (the same `tickRingSVG` helper as the thermostat, but spanning a much wider
  −50° to 230° arc) — pointer swings from −40° to 220° on toggle, reading as a full tuning
  rotation rather than a small flip.
- Right: a square Encryption button, a tight 2×2 cluster of 4 small square lamps
  (Signal / Encrypted / Battery / Interference), and a **signal-strength waveform** — 7
  thin bars with staggered animation delays. Idle (no signal lock) they sit low and muted;
  once `signal` reads green they turn accent-colored and animate to full height, like a
  handset's live signal meter.

Kept to comms/sensor/logistics-flavored gear rather than weapons, per
`GAME_MODE_PLAN.md` §11 — reads as "cool tactical tech," not out of place at a booth.

### 2.6 Devices 6–11 — the dial-count correction (12 positions, not 6)

Six more devices, added once the real dial turned out to have 12 positions
(`GAME_MODE_PLAN.md` §0). No new control-widget behavior — each reuses one of the 5
layouts from §2.1–§2.5 exactly as built, with its own palette/font/motif. This is the
`andy_layout` field (§5's schema note) doing its job: a new device is a data row plus a
skin, not a new component.

| Device | Sector | Layout reused | Accent | Font | Motif |
|---|---|---|---|---|---|
| Smart EV Charger | Home | Paired columns (§2.4) | `#4ade80` green | Sora | Soft green radial glow (same technique as §2.1, re-tinted) |
| Elevator Control Panel | Enterprise/Facilities | Keypad (§2.2) | `#8a9aa8` steel gray | Rajdhani | Fine dot grid (same technique as §2.2, no scan-sweep) |
| Traffic Signal Controller | Public Sector/Transportation | DIP-strip (§2.3) | `#ff7a33` orange | Oswald | Faint horizontal dashed lane-line pattern |
| Hospital Patient Monitor | Healthcare | Dial + arc (§2.1) | `#5ec8f2` cyan-blue | Public Sans | Soft blue radial glow |
| Retail Payment Kiosk | Commercial/Retail | Keypad (§2.2), 2nd reuse | `#ff6f91` coral-pink | Manrope | Fine dot grid, coral-tinted |
| Drone Ground Control | Aerospace/Defense | Radio cluster (§2.5), 2nd reuse | `#7c6ff2` indigo | Orbitron | Sparse starfield dots |

**Positional convention, not hardcoded keys.** The 5 layout components take a `device`
prop and read `device.switches[i]` / `device.lamps[i]` by array position — they do not
reference any device's actual switch/lamp key names. That's what makes reuse across
completely different switch/lamp vocabularies (e.g. Field Radio's `channelhop` vs. Drone's
`rthoverride` both landing on "the big dial") work without touching the layout component
itself. The convention per layout, so a new device assigned to it lands in the right slot:

- **Dial + arc** (§2.1): `switches[2]` → the dial; `switches[0,1,3]` → the 3 buttons, in
  that order; `lamps[0..3]` → the arc, in order.
- **Keypad** (§2.2): `switches[0..3]` → the 2×2 grid, in order; `lamps[0..3]` → the LED
  column, in order.
- **DIP-strip** (§2.3): `switches[0..3]` → the DIP row, in order; `lamps[0..3]` → the LED
  row, in order; `device.readout`, if present, drives the digital readout.
- **Paired columns** (§2.4): `switches[i]` pairs with `lamps[i]` for each column;
  `switches[2]` also drives the gauge needle (green zone when that switch is on).
- **Radio cluster** (§2.5): `switches[0,3]` → the two guarded toggles; `switches[2]` → the
  big dial; `switches[1]` → the square button; `lamps[0..3]` → the cluster; the waveform
  activates when `lamps[0]` reads green.

When authoring a 12th+ device: **order its `switches`/`lamps` arrays to match the
convention above for whichever layout it uses** — the "resolved" indicator needs to land
at the position that layout treats as meaningful (e.g. index 2 for paired-columns' gauge),
not just wherever it falls naturally out of the device's own narrative.

## 3. Data contract

Every device is one config object — this is the shape the real build should read from
`andy_deviceprofile` (plus a bit of hardcoded per-layout presentation logic; see the schema
note below):

```js
{
  label, sector, position, unit,       // header/status-bar text
  switches: [{ key, label }, ...],     // 4 entries — used for the win-preview button
                                        // and as the source of truth for control keys
  lamps:    [{ key, label }, ...],     // 4 entries
  fault:    { switchKey: boolean, ... }, // initial (faulted) switch state
  checkWin: (state) => boolean,        // pure function of switch state
  computeLamps: (state, win) => { lampKey: "green"|"amber"|"red"|"off", ... },
  faultText, okText,                   // HTML strings for the status banner
  steps: [string, ...],                // Help-Fix numbered list (3 short imperative lines)
  winMessage,                          // win overlay headline
  restoreItems: [string, ...],         // win overlay checklist (4 short lines)
  readout: { fault, ok } | undefined   // only the cold-chain sensor uses this
}
```

`checkWin` / `computeLamps` are logic, not content — they stay in code (or a small rules
engine) rather than Dataverse. Everything else above is plausible as `andy_deviceprofile`
columns (§5 of `GAME_MODE_PLAN.md` already has most of these; `faultText`/`okText`/`steps`/
`winMessage`/`restoreItems` map onto `andy_introcopy`-style fields once that table is fleshed
out for real content).

**Schema addition to flag:** `andy_deviceprofile` doesn't yet have a column for *which
control-panel layout* a device uses (dial-arc / keypad / dip-strip / paired-columns /
radio-cluster from §2). Recommend adding `andy_layout` (Choice, one option per layout) so a
6th device added later picks an existing layout via data rather than needing a code branch
by slug. The 5 layout **implementations** themselves (the actual widget markup/CSS) are
still one component each in code — only the *selection* of which one renders should be
data-driven.

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
