# APACHE 2800 Case — 45° Display Stand

A presentation accessory that props the whole APACHE 2800 case up at a
45° angle so people can reach the control panel (touchscreen and
switches) without it sliding or tipping. It cradles the **outside** of
the case, so it is independent of the electronics chassis revisions
tracked elsewhere in this repository.

**This is not part of the chassis production release (RP08) and is
not governed by the RPNN release workflow in `MODELING_GIT_PLAN.md`.**
That process is scoped to the electronics chassis inside the case.
Fold this into that workflow later if you want, but nothing here
currently depends on it.

## What it is

Two mirrored end cradles (near the case's left and right edges) tied
together by a connecting rail and a screwed center-splice plate, so
the two cradles cannot creep apart or let the case slip out sideways —
call it a "secure" fit rather than a friction fit. Each cradle is a
ramp inclined at 45° with a raised **cleat** (a hard mechanical stop,
not just friction) that the case's front-bottom edge sits against,
plus a side **fin** that keeps the case from sliding off sideways. The
case's own weight is carried in compression against the cleat and the
ramp — pressing on the touchscreen pushes the case *into* the stand,
not out of it.

Each end cradle prints as **two parts** instead of one: a flat, wide
`base_foot` (the full-length foot + rail, only `foot_thickness` tall)
and a tall, narrow `riser` (the ramp + cleat + fin, cropped to a
compact footprint) that screws down onto it. This exists because the
X1 Carbon is a CoreXY printer — its gantry needs clearance near the
build-plate corners, so the usable footprint shrinks for taller
prints. A single-piece cradle (236.9 x 221.5mm footprint, 128.6mm
tall) was both near-full-bed-width *and* tall at once, which Bambu
Studio flagged as out of bounds. Splitting decouples the two failure
modes: `base_foot` is wide but only 14mm tall (safe anywhere on the
bed), and `riser` is tall but only ~132 x 48mm footprint (safe because
it's compact) — same assembled geometry, just two prints joined by 2
M3 screws per side instead of one oversized print.

The design deliberately anchors the case's front-bottom edge at the
cleat and lets the rest of the case cantilever up and back, away from
the table — never down toward it. An earlier draft of this file did
the opposite (supported the middle of the case, let the front
overhang) and that let the front corner project *below* table height,
which would mean the case's leading edge collides with the table
instead of resting on the stand. See the comments above `case_ghost()`
and the `cog_margin` assert in the `.scad` file for the load-bearing
math.

## MEASURE_BEFORE_PRINT — verify before printing full size

Every case dimension below is the manufacturer catalogue value already
recorded in [`../DESIGN_DOCUMENT.md`](../DESIGN_DOCUMENT.md) ("Case
catalogue exterior" row), marked there as **reference only** — not a
physical measurement of your actual case. Confirm each one on the
real, empty APACHE 2800 before printing the full-size brackets:

| Parameter | Current value | What to check |
|---|---:|---|
| `case_width` | 419.1 mm | Case exterior width, left-right |
| `case_depth` | 330.2 mm | Case exterior depth, front-back (closed) |
| `case_corner_radius` | 24.0 mm | Reused from the chassis `corner_radius`; the case's own rounded-corner radius may differ — check it clears the bracket's `inset_from_corner` |

Also assumed, not measured:

- **Loaded weight ≈ 7 kg (15 lb)** conservative estimate (empty case
  ~2.5–3 kg + Pi/display/switches/wiring + margin). If you have a
  scale, weigh the actual loaded case and sanity-check against the
  print settings below before trusting it with people leaning on it.
- **Case position during use**: this stand assumes the case's control
  panel faces the viewer at 45° — i.e. the lid is open/folded back
  (matching the "lid fully open" operating mode noted in
  `../DESIGN_DOCUMENT.md`). The stand's low-profile rail (nothing
  taller than `foot_thickness` behind the ramp peak) deliberately
  stays clear of the hinge/lid-swing zone so the lid can fold open
  behind it, but this hasn't been checked against the real hinge
  location — verify the open lid doesn't hit anything once you have
  the physical case in hand.

## Print a coupon first

Before committing to the full brackets, print `coupon_cleat.stl` (a
small ~50 x 47 x 88 mm chunk of just the toe/cleat region) and
test-fit the case's actual bottom-front corner against it. Confirm:

1. The corner seats fully against the cleat with no rocking.
2. The case's corner radius clears the bracket without binding.
3. The 45° face reads correctly against the case's bottom face (no
   visible gap when the case corner is pressed into the cleat pocket).

This mirrors the fit-test-before-full-print approach already used for
the chassis (`length-fit-test/`, `final-fit-test/`) — cheap to print,
catches a wrong measurement before you commit ~1 kg of filament to the
full brackets.

## Printable parts

| File | What it is | Bounding box (X x Y x Z) |
|---|---|---:|
| `base_foot_right.stl` | Right foot: full-length flat slab + its half of the connecting rail | 236.9 x 215.5 x 14.0 mm |
| `base_foot_left.stl` | Left foot (mirrored) | 236.9 x 215.5 x 14.0 mm |
| `riser_right.stl` | Right ramp + cleat + fin, screws onto `base_foot_right` | 131.9 x 48.0 x 128.6 mm |
| `riser_left.stl` | Left ramp + cleat + fin (mirrored), screws onto `base_foot_left` | 131.9 x 48.0 x 128.6 mm |
| `center_joiner.stl` | Splice plate that screws across the rail seam | 171.9 x 44.0 x 6.0 mm |
| `coupon_cleat.stl` | Small toe/cleat test coupon (print this first) | 50.0 x 47.0 x 88.5 mm |

All six fit the configured 256 x 256 x 256 mm X1 Carbon build volume
with comfortable margin, not just barely under the nominal limit
(`validate_stl_bounds.py`, copied from `../validate_stl_bounds.py`,
confirms this — rerun it after any parameter change). None of them
pairs a near-full-bed footprint with significant height, which is what
tripped Bambu Studio's clearance check on the original one-piece
bracket design.

## Print settings

PETG, 0.4 mm nozzle, 4 perimeters, 5 top/bottom layers, 30–35% gyroid
infill, 0.2 mm layers — matching this project's own baseline in
`../README.md`. This is a load-bearing, safety-relevant fixture (it's
holding up an expensive demo unit that people will press on), so don't
drop below that infill. Every part prints flat-side-down with no
overhangs past 45°, so no supports are needed anywhere in the set.

## Assembly

1. Install M3 heat-set inserts (4.0 mm pilot) into each `base_foot`:
   2 pilot holes near the inner end of the rail (for the center
   joiner, ~6 mm depth) and 2 more under where the riser sits (for the
   riser attachment, also ~6 mm depth) — 4 inserts per foot.
2. Screw each `riser` down onto its matching `base_foot` from above,
   2 M3 screws each (3.4 mm clearance holes already modeled in the
   riser's flange).
3. Butt the two base_foot halves together at the center seam.
4. Screw `center_joiner.stl` across the seam from the top with 4 M3
   screws (3.4 mm clearance holes already modeled in the plate).
5. Set the assembled stand on a flat, stable surface. Rest the case's
   front-bottom edge in the two cleats, back sloping up and away from
   you.

## Regenerating / editing

`case_display_stand.scad` is the parametric source, following this
project's OpenSCAD convention (not the newer CadQuery default some
tooling suggests — kept consistent with `../apache_2800_chassis.scad`
and `../model_params.scad`). Re-export after any parameter change:

```powershell
$OSCAD = "C:\Program Files\OpenSCAD\openscad.com"
$parts = "base_foot_right","base_foot_left","riser_right","riser_left","center_joiner","coupon_cleat"
foreach ($p in $parts) {
    & $OSCAD -D "part=`"$p`"" -o "exports\stl\$p.stl" case_display_stand.scad
}
py validate_stl_bounds.py
```

Key structural parameters (see the `.scad` file for the full list and
comments):

| Parameter | Value | Meaning |
|---|---:|---|
| `tilt_angle` | 45° | Display angle from horizontal |
| `ramp_slope_len` | 130 mm | Case-bearing contact length on each ramp |
| `front_margin` / `rear_margin` | 55 / 90 mm | Flat foot ahead of / behind the ramp; `rear_margin` is sized so the case's cantilevered center of mass still lands ~65 mm inside the stand's rear foot edge (see the `cog_margin` assert) |
| `cleat_height` | 18 mm | Positive stop height at the toe |
| `fin_height` | 35 mm | Side-guide height against sideways sliding |
| `riser_margin` | 20 mm | How far the riser's footprint extends beyond the wedge on each side; smaller = more compact riser but less screw-mounting room |

**Important implementation note if you extend this file**: every 2D
profile here is authored as `(depth, height)`, meant to be read as the
XZ plane and extruded along Y so it lines up with the plain
`cube()`-based rail/joiner geometry. `linear_extrude()` always
extrudes along Z, not Y, so raw `linear_extrude()` calls on these
profiles land 90° out of alignment with the rest of the model (this
shipped as a real bug during development — the ramp, cleat, and fin
unioned into a disconnected second body until it was caught via
`trimesh`'s watertight/body-count check, not by inspecting the OpenSCAD
preview, which looked plausible even when broken). Always extrude
these profiles through the `extrude_profile_along_y()` wrapper, never
`linear_extrude()` directly.
