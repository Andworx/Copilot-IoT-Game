# Plinko bucket sensor insert (IR break beam)

Issue #128. One printed insert per Plinko bucket. It detects a puck resting in the
bucket with an IR break beam. The insert has no LEDs: the chase lights run on the
Plinko display page (Power Pages).

**Board (measured 2026-10-10):** 6 buckets with dividers 88.89, 80.21, 81.38, 79.38, 81.63 and
86.54 mm apart (left to right), 48.85 mm from acrylic to backboard, no pegs in the bucket zone
(the last peg row is about 88 mm above the buckets; pegs are 51.2 mm, 44 of them).

**Pucks:** 49.56 mm diameter x 9.92 mm thick, falling face-on to the board. They can land anywhere
in the 48.85 mm depth, so one flat beam would miss most of them. Each body therefore has a
**funnel**: the top slopes (47 degrees; 40 stalled on the board) down into a 20 mm groove at mid-depth, and the beam crosses
the groove. A puck lands on a slope, slides into the groove and blocks the beam. The bodies are
therefore full depth (48 mm), one per bucket width (`body_slotN.stl`).

```
   |<----------------- 4" bucket ----------------->|
   |                     ( puck )                  |
   |/TX tower\ - - - - - - beam - - - - - /RX tower\|   ← beam 8 mm above the top
   |===============================================|   ← top surface (puck rests here)
   |          insert body + magnetic cover         |
   +-----------------------------------------------+   bucket floor
```

| Part | Material | Notes |
|---|---|---|
| **Body** | PLA | Full depth (acrylic to backboard), one per bucket width. Sits on the bucket floor. Two M3 screws from behind the backboard go into heat-set inserts in the rear face. Each end has a tower holding one Adafruit 2167 housing **standing upright** (emitter left, receiver right), pushed in from the rear. The tower tops slope so a puck landing on one rolls into the bucket. |
| **Cover** | PLA, multi-colour | Swappable magnetic tile, held by six 6 × 1.74 mm disc magnets (no pins) that are sealed in during the print. One tile per logo (below); the logo is a 0.6 mm colour inlay in the face. |

- **Sensor fit (measured and test-printed 2026-10-08):** housing 7.96 (along the beam) x 9.80 x
  19.97 mm. A 3.277 mm lens hole sits 4.22 mm from the lens end; the lens tip is 10.86 mm from the
  housing's rear. A lip around the lens end, 8.97 mm from the rear, stands 1.01 mm proud on the lens
  side. The lens end points up and the wires leave the bottom; the wire end sits on the top surface,
  16 mm below the beam. The housing is pushed in from the rear: the lens runs in a slot open to the
  rear face, and the pocket reaches 1.01 mm further toward the bucket over the top `ir_lip_h` (10 mm).
  `exports/stl/fit_test.stl` (receiver end only) fit.
- **Wire raceway:** each housing's wires drop from its bottom end into a 4 × 4 mm channel in the rear
  face. The channel runs the full width to the centre, where the backboard hole is, so all five
  conductors per bucket leave in one place. The backboard closes the channel.
- **Magnets:** six sealed cavities behind the body's front face (and six in the tile) hold the tile; see "Magnets" below.
- **IR pockets:** they open to the rear face; slide the housings in from behind. The receiver looks
  through a 5 mm-long, 2.5 mm aperture that rejects IR reflected off the acrylic.
- **No moving parts.** The beam is blocked while a puck is in the bucket and clears
  when it's removed. The Pi counts a landing only after the beam has stayed blocked
  for about 150–250 ms, which filters out pucks bouncing through.
## Logo covers

![Cover set](exports/preview/cover_set.png)

| Family | Covers | Logo colours |
|---|---|---|
| Microsoft | `microsoft` | 4: red, green, blue, yellow |
| Power Platform | `power-platform`, `power-apps`, `power-automate`, `power-pages`, `dataverse`, `ai-builder`, `copilot` | 3 each |
| Azure | `azure`, `azure-functions`, `azure-iot-hub`, `azure-signalr` | 2–3 each |

Each cover exports to `exports/covers/<logo>/`: a `_cover_base.stl` plus one
`_colourN_<hex>.stl` per logo colour, where the hex is the suggested filament colour.

**Printing a cover in Bambu Studio:**
1. Drag all files from one folder in at once.
2. Answer **Yes** to "load as a single object with multiple parts".
3. Assign a filament to each part: the base in your cover colour, and each colour part
   in the closest filament to its hex.

The Microsoft cover needs 5 filaments (base + 4), so either use a second AMS or print its
base in one of the four logo colours.

**How the colours are made:** `logos/build_logo_layers.py` builds each logo from the
repo's icon SVGs (listed in `logos/logos.json`). It keeps the solid colour regions of
each Fluent icon, drops the translucent shading overlays, and merges similar colours down
to 3 per logo. Fine highlights thinner than a nozzle width are dropped.

To add a logo, add its SVG to `logos.json` and re-run `export_parts.ps1`. For a
single-colour cover, run it with `-LogoStyle cutout`: the logo is cut through and the
body colour shows in it.

Status: **sensor fit verified with `fit_test.stl`; the board numbers below are still placeholders (board not yet measured).** The bucket numbers are rough, and the IR housing
orientation is an assumption. Do not batch-print until one insert passes a fit and
detection test on the board.

## Measure / confirm before printing

| Parameter | Now | What to check |
|---|---|---|
| `slot_gap` | 12.7 (0.5 in) | Acrylic to backboard. The insert needs 10.9 mm minimum |
| `slot_w` | 101.6 (4 in) | Gap between dividers; are all 6 the same? |
| `ir_l`, `ir_h`, `ir_w` | 20 × 10 × 8 | Which way the 2167 housing's LED faces. The model assumes the LED is on a 10 × 8 end, centred, with wires out the opposite end |
| `puck_t` | 6 (unknown) | Puck thickness. A puck much thinner than the slot lets more reflected IR leak past |

## Backboard holes

Measured from the left divider (X) and the bucket floor (Z); the export prints them.

| Hole | X | Z |
|---|---|---|
| Wire exit (all sensor wires) | 50.8 | 20 |
| M3 screws | 4.65 and 96.95 | 12.5 |

## Hardware per bucket

- 1 × Adafruit 2167 IR break-beam pair (3 mm); its 5 conductors share one raceway
- 2 × M3 heat-set inserts (M3 × 5.7) + 2 × M3 screws through the backboard
- 8 × 6 × 2 mm disc magnets (4 in the body, 4 in each cover). Glue them in and keep the
  polarity consistent so every cover fits every body

Wiring: emitter and receiver red to 5 V, black to ground. Receiver white goes to a Pi
input with the internal pull-up enabled; never pull it up to 5 V. All six emitters
draw about 120 mA together.

## Export

```powershell
.\export_parts.ps1                                  # body + every cover + previews, validated, with snapshots
.\export_parts.ps1 -SkipSnapshot -Logos power-apps  # quick iteration on one cover
.\export_parts.ps1 -SkipCovers                      # body and previews only
```

The export rebuilds the logo layers, then runs `validate_covers.py`. That check
confirms every part is watertight, and that each cover's base plus its colour parts
add up exactly to a plain cover, so the parts neither overlap nor leave gaps. It
needs Python with `trimesh`.

The STLs are exported in print orientation:

- **Body:** on its back (rear face down). PLA, 3 walls, 20% infill.
- **Cover:** face down (the logo is in the first 3 layers). Use a 0.2 mm layer
  height so the 0.6 mm inlay is exactly 3 layers.

Neither part needs supports.


## Funnel, puck, drill guides and per-bucket bodies

| File | What |
|---|---|
| `exports/stl/body_slot1..6.stl` | Body per bucket (insert widths 88.1, 79.4, 80.6, 78.6, 80.8 and 85.7 mm). Engraved `B<n>  <width> mm` on the underside. The tile magnets are measured from the body's centre, so a wider body just shows a bit of body each side of the tile. |
| `exports/stl/guide_slot1..6.stl` | Marking guide per bucket (below). Labelled `B<n>  <width> mm`, `FLOOR`, `M3`, `W`. |
| `exports/stl/puck.stl` | Our puck: 48.9 x 16 mm, rounded edge, smooth faces, no decal. Two sealed magnet cavities. |
| `exports/stl/magnet_test.stl` | Fit test: four open pockets with 0.1, 0.2, 0.3 and 0.4 mm of diameter play for the 6 x 1.74 mm magnets. Print this first and pick the pocket the magnet drops into with a little play, then set `mag_fit` to that number. |
| `exports/stl/magnet_dispenser.stl`, `magnet_pusher.stl` | Keeps magnet polarity right: see "Magnets" below. |
| `exports/stl/plug.stl` | Retaining plug, **12 needed** (one per sensor, emitter and receiver alike). Pushes into the rear of the sensor pocket behind the housing so it cannot slide out; a slot along its underside lets the wires run out, and it is only lightly snug (0.1 mm crush ribs). Pull hole at the rear for a pick. Print with the slot facing up (the STL is already oriented). |
| `exports/stl/fit_test.stl` | Receiver end only, to check the housing fit (passed). |
| `exports/covers/<logo>/` | Magnetic tiles: **one size (78.58 x 38.2 mm) that fits every bucket**, so the 12 logos make up one shared set. Engraved with the logo name on the back. |

### Puck magnets

Each puck has two cavities, 18.19 mm across, each sized for **two** 17.89 x 4.92 mm discs stacked
(four magnets, about 34 g added). Print flat, **pause at Z = 13.07 mm** (the print echoes the
value), drop the magnets in with the **same polarity facing up in every puck**, and resume; the
rest of the layer bridges over them. Use `magnet_stack = 1` for half the weight. Magnets that
face each other will pull pucks together when they touch, so keep the polarity the same.

Thickness: 16 mm. The gap allows more, but the groove (`groove_w`, 20 mm) has to stay at least
the thickness plus 2 mm, and a puck that almost fills the gap will rub both faces.

### Marking guide

Per bucket. Sit it on the bucket floor between the dividers with the points toward the backboard
(the printed text faces you, `FLOOR` at the bottom) and press or tap it: three 3.5 mm points
dent the backboard at the two M3 screw positions and the wire exit. Drill from the dents. If a
printed point is too soft for your wood, set `guide_holes = true` for 2.2 mm through holes and
mark with a punch or brad nail instead. Wire exit dent only: choose your own hole size
(`wire_hole_d` suggests 8 mm).

### Notes

- Bucket 4 (79.38 mm) is the tightest: 51.9 mm of clear width between the towers for the
  49.56 mm original puck. Do not go below 78 mm without slimming the towers further.
- Not yet tested on the board: whether pucks slide off the funnel faces at 40 degrees (lower
  `funnel_angle` loses the slide, higher makes it taller), and whether the 2 mm receiver aperture
  rejects enough reflected IR.


## Magnets: sealed in during the print

The tile and the body each have six **sealed** cavities for 6 x 1.74 mm discs (two columns, three rows).
The magnets are not glued: you drop them in at a pause and the print closes a 0.6 mm skin over them.
The pockets have play (`mag_fit` 0.3 mm in diameter, `mag_play_t` 0.3 mm in depth), and the snap pins
are gone, so the magnets alone hold the tile.

| Part | Printed | Pause at Z | Notes |
|---|---|---|---|
| Body | rear face down | **44.05 mm** (varies slightly with `cover_t`; the export prints it) | The cavities are open at the top of the print. Drop 6 magnets in, **flat and fully seated**, then resume. |
| Tile | logo face down | **2.9 mm** | Drop 6 magnets in, then resume. |
| Puck | flat | **13.07 mm** | Four magnets, two stacked per cavity. |

In Bambu Studio, use *Add pause* at that layer (right-click the layer slider). Work out the layer from
your layer height (for example 44.05 / 0.2 = layer 220). Check that each magnet lies flat on the cavity
floor, with no magnet standing up, before you resume: a raised magnet will be hit by the nozzle.

### Getting the polarity right every time

The body and tile magnets must present **opposite** faces to each other, and every body and every tile
must be consistent. Use the dispenser:

1. Stack all the magnets in the dispenser tube. They only stack one way, so a flipped magnet repels
   and you notice. The stack fixes the polarity.
2. For a **body**: stand the tube on the cavity with the **BODY** end down, and push a magnet out with
   the pusher (from the TILE end).
3. For a **tile**: stand the tube on the cavity with the **TILE** end down, and push from the BODY end.
4. The two ends give opposite faces, so every tile attracts every body. When you top up the stack, add
   magnets at the TILE end only and make sure they attract (do not force a magnet that repels).
