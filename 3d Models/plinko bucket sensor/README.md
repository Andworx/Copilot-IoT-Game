# Plinko bucket sensor insert (IR break beam)

Issue #128. One printed insert per Plinko bucket. It detects a puck resting in the
bucket with an IR break beam. The insert has no LEDs: the chase lights run on the
Plinko display page (Power Pages).

**Board:** 24 × 48 in with 6 buckets, each 4 in wide, roughly 5 in tall, and 0.5 in from
acrylic to backboard.

**Pucks:** 1.5 in in diameter and lighter than an AA battery. That is too light to
reliably press a micro switch, so a beam detects the puck instead.

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
| **Body** | PLA | Sits on the bucket floor. Two M3 screws from behind the backboard go into heat-set inserts in the rear face. Each end has a tower holding one half of an Adafruit 2167 IR break-beam pair (emitter left, receiver right). The tower tops slope so a puck landing on one rolls into the bucket. |
| **Cover** | PLA, multi-colour | Swappable, held by four pairs of 6 × 2 mm disc magnets and located by two pins. One cover per logo (below); the logo is a 0.6 mm colour inlay in the face. |

- **IR pockets:** they open to the rear face. Slide the emitter and receiver in from
  behind; the backboard holds them, and their wires go straight out the back. The
  receiver looks through a 5 mm-long, 2.5 mm aperture that rejects IR reflected off
  the acrylic and backboard.
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

Status: **concept / unverified.** The bucket numbers are rough, and the IR housing
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
| Emitter wires | 3.1 | 33 |
| Receiver wires | 98.5 | 33 |
| M3 screws | 4.65 and 96.95 | 12.5 |

## Hardware per bucket

- 1 × Adafruit 2167 IR break-beam pair (3 mm)
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
