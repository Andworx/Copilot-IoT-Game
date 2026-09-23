# APACHE 2800 Case — 45° Display Stand (Andworx branded)

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

**Current production source: [`andworx_stand_production.scad`](andworx_stand_production.scad).**
Earlier iterations (`case_display_stand.scad`, an all-printed two-piece
base; `mockup_concept.scad`, the first branded concept sketch) are
superseded but kept for reference and because the production file
still reuses `case_display_stand.scad`'s riser/cleat/fin math via
`use<>`. See [History](#history) at the bottom.

## What it is

Nine parts, all but one removable for flat-pack shipping:

| Part | Material | Qty | Removable? |
|---|---|---:|---|
| Base half | CNC-cut hardwood/plywood | 2 | Yes — 2× dowels + underside batten, 4× 1/4"-20 bolts |
| Joiner batten | 3D-printed (PETG) | 1 | Yes — 4× 1/4"-20 bolts (holds the 2 base halves together) |
| Sign block | CNC-cut hardwood/plywood | 1 | No — glued + doweled to the joined base |
| Riser | 3D-printed (PETG) | 2 | Yes — 2× 1/4"-20 bolts each |
| Lid prop | 3D-printed (PETG) | 1 | Yes — 2× 1/4"-20 bolts |
| Sign panel | 3D-printed (PETG, 2-color) | 1 | Yes — slides into the sign block's slot, no hardware |

**Cradle mechanics** (unchanged from earlier revisions): each riser is
a ramp inclined at 45° with a raised **cleat** — a hard mechanical
stop, not just friction — that the case's front-bottom edge sits
against, plus a side **fin** that stops sideways sliding. The case's
own weight is carried in compression against the cleat and the ramp —
pressing the touchscreen pushes the case *into* the stand, not out of
it. The design anchors the case's front-bottom edge at the cleat and
lets the rest of the case cantilever up and back, away from the table
— never down toward it (see the `cog_margin` assert in the `.scad`
file for the tip-back safety math, and `case_ghost()` for the
load-bearing geometry).

**Why a CNC base instead of two printed halves**: it removes the
X1 Carbon corner-clearance problem entirely, *and* it's the natural
material for a rigid, good-looking pedestal, with room for the accent
groove and all the bolt-down hardware in one clean slab.

**Why the base is still split into two halves**: even CNC beds/stock
have a size limit, and the full 473mm width doesn't fit most of them
in one piece. It splits down the center (Y=0) into two mirrored
236.9 x 236.6mm halves — 2 alignment dowels plus a removable underside
batten (4x 1/4"-20 bolts) hold them together, so the base itself packs
flat for shipping too, not just what bolts onto it. **The sign block is
a separate, un-split third piece** (271 x 55 x 30mm — comfortably
within reach of the same CNC that cuts the base halves) glued and
doweled onto the joined base: the sign slot sits centered exactly on
the Y=0 seam, and splitting a piece that small isn't worth the extra
joint anyway.

## Why there's a lid prop

The case is used with its lid open, folded back so it lies flat when
the case's *base* is flat on a table. Tilt the base to 45° on this
stand and the lid — still opened the same relative amount — no longer
lies flat on anything: it points up and back into open air, hinged
only at one edge, and can swing back down toward closed under its own
weight, right onto the control panel or someone's hands. The lid prop
is a removable post with **three stepped notch heights** (70/100/130mm
above the base) that the lid's edge rests in — test-fit against the
real case and use whichever notch holds it open at a safe, comfortable
angle. This project's records only have the closed-case catalogue
exterior (419.1 x 330.2 x 171.45mm) on file, not the hinge location or
lid depth, so the notches exist specifically to make that gap testable
rather than guessed at. See `lid_prop_notch_heights` in the `.scad`
file.

## Andworx branding

Colors (`andworx_navy` #2A3380, `andworx_yellow` #F3EB4A) and the
**real vector wordmark** — not a font placeholder — come from the
user-supplied brand assets: `Andworx-Brand-Guidelines-One-Pager.pdf`
and `Andworx Logo 2025/SVG/AndworxLogo_Blue1.svg`. Letters were
extracted from the actual bezier path data with `svgpathtools` into
`logo_letters/andworx_letters.scad` (one polygon module per glyph,
including the outer/hole pairing for A/D/O/R and the stylized
double-chevron X, built from two overlapping subpaths in the source
file) — exact letterforms and the logo's own original kerning, not a
traced approximation. Each letter is also saved standalone as
`logo_letters/<LETTER>.svg` for laser-cut/CNC software if you ever
want them cut from sheet stock instead of printed.

**The sign tilts at the same 45° `tilt_angle` as the case/ramp** — a
small echo of the case's own angle sitting right in front of it,
instead of a separate vertical nameplate wall. It's a flat panel
(blank tab at the bottom, pill-shaped background + raised letters
above) that **slides into an angled slot** cut into the sign block and
leans back, held by depth and friction rather than glue — pull it
straight out along the slot to remove or replace it. The panel is
built directly from the same `dir2`/`nrm2` direction vectors that
define the ramp's own tilt (see `sign_block()` and `sign_letters()` in
the `.scad` file), so it's mechanically guaranteed to sit parallel to
the ramp, not just visually close.

The **yellow pill / navy text** combination is one of the six
"background variations" the brand guide explicitly shows as approved
— chosen over the plain navy-on-white standard mark for maximum
contrast against the wood.

The sign prints as **one two-color part** (pill background + raised
letters), not seven separate painted letters — per direction, this
simplified an earlier plan to cut/print and hand-paint each letter
individually. Export `sign_panel_base.stl` (yellow) and
`sign_panel_letters.stl` (navy) as two objects at the same position in
Bambu Studio, assign the two AMS colors, and slice as one job — one
physical part comes off the printer.

## No sharp corners / flair

- Every riser edge someone could bump into (the ramp's peak apex, the
  cleat, the fin) is rounded via `riser_fillet` (4mm) in
  `case_display_stand.scad`'s `rounded()` helper (erode-then-dilate
  2D offset — rounds convex corners, leaves interior notches alone
  since those aren't a bump risk).
- The base plaque has generous 45mm corner fillets (`base_corner_fillet`)
  — soft, friendly silhouette rather than a plain rectangle, echoing
  the brand's pill-logo motif.
- The sign block has rounded corners too (`sign_block_fillet`, 8mm),
  and the sign panel's exposed top corners are rounded
  (`sign_panel_fillet`, 1.5mm — capped under half the panel's own
  4mm thickness, or `rounded()`'s erode step wipes the shape out
  entirely, an actual bug this file shipped: see the "hard-won
  implementation notes").
- A shallow **accent groove** (`groove_x`/`groove_width`/`groove_depth`)
  runs the full width of the base between the sign block and the
  risers — a routed reveal line you can leave as a shadow line or fill
  with paint/an inlay strip in one of the other brand accent colors
  (cyan #7AD3E1 or purple #7B53DA are already defined as `andworx_cyan`
  / `andworx_purple` in the file, just unused elsewhere) for extra pop.

## MEASURE_BEFORE_BUILD — verify before cutting/printing full size

| Item | Current value | Why it matters |
|---|---:|---|
| `case_width` | 419.1 mm | Case exterior width — catalogue value, not measured (see `../DESIGN_DOCUMENT.md`, "Case catalogue exterior") |
| `case_depth` | 330.2 mm | Case exterior depth — same source |
| `case_corner_radius` | 24.0 mm | Reused from the chassis; case's real corner radius may differ |
| Loaded weight | ~7 kg (15 lb) assumed | Empty case ~2.5–3kg + electronics + margin. Weigh the real thing if you can. |
| **Lid hinge location / lid depth** | **Not on file at all** | Drives which lid-prop notch is correct — this is the reason the prop has 3 notches instead of 1 fixed height. Do this test-fit before the booth, not during setup. |
| 1/4"-20 threaded wood insert pilot hole | 9.5 mm (~3/8") assumed | Generic value — check your actual inserts' spec sheet or test in scrap stock. Wrong pilot = split wood or a loose insert. |
| 1/4"-20 insert install depth | 13 mm (~0.5") assumed | Same caveat. |

## Print a coupon first

Before committing to the full risers, print `coupon_cleat.stl` (a
small ~45 x 47 x 88mm chunk of just the toe/cleat region) and test-fit
the case's actual bottom-front corner against it. Confirm the corner
seats fully with no rocking, the case's corner radius clears the
bracket, and the 45° face reads flush against the case's bottom face.
Cheap insurance against a wrong `case_width`/`case_corner_radius`
before printing the full parts.

## Printable parts (PETG, X1 Carbon)

| File | What it is | Bounding box (X x Y x Z) |
|---|---|---:|
| `riser_right.stl` | Right ramp + cleat + fin, bolts to the base | 131.9 x 48.0 x 126.9 mm |
| `riser_left.stl` | Left ramp + cleat + fin (mirrored) | 131.9 x 48.0 x 126.9 mm |
| `lid_prop.stl` | 3-notch adjustable lid prop post | 22.0 x 34.0 x 160.0 mm |
| `joiner_batten.stl` | Underside splice bolting the 2 base halves together | 156.9 x 90.0 x 13.0 mm |
| `sign_panel_base.stl` | Yellow pill/tab background (print in yellow) | 49.7 x 231.4 x 49.7 mm |
| `sign_panel_letters.stl` | Navy raised letters (print in navy, same position as base) | 20.6 x 201.4 x 20.6 mm |
| `coupon_cleat.stl` | Small toe/cleat test coupon — print this first | 45.0 x 47.0 x 88.5 mm |

All fit the 256 x 256 x 256mm X1 Carbon build volume with comfortable
margin (`validate_stl_bounds.py` confirms — rerun after any parameter
change; it will correctly flag `sign_block.stl` as oversize, since
that part is CNC-routed, not printed — see below). The sign panel
parts print at 45° in this bounding box (X extent = Z extent exactly —
a handy sanity check that the tilt geometry came out right) but should
be **sliced flat-side-down**: reorient in the slicer so the panel's
broad flat face sits on the bed, not printed "as modeled" standing on
its thin edge.

## CNC parts

| File | What it is | Bounding box (X x Y x Z) |
|---|---|---:|
| `base_right.stl` | Right base half | 236.9 x 236.6 x 19.1 mm |
| `base_left.stl` | Left base half (mirrored) | 236.9 x 236.6 x 19.1 mm |
| `sign_block.stl` | Compact block with the angled sign slot (not split — see above) | 55.0 x 271.4 x 30.0 mm |

STLs are provided for visual verification and for 3D-printing a
prototype at reduced infill if you want to dry-fit the assembly before
committing the real hardwood. For actual CNC toolpathing, a 2D profile
(outline + pockets + dowel/insert holes) is the more natural
deliverable than a mesh — ask if you want a DXF/SVG export of each
piece's 2D profile; the routed **top-edge roundover** (a 1/4" bearing
roundover bit around the perimeter) isn't modeled in the STLs and
should be added as a toolpath pass, not chased in OpenSCAD. The two
base halves also need 2× 8mm dowel holes bored 0.5" deep into the
mating seam edge (generic hardware-store dowel pins, not a printed
part — see `seam_dowel_reference()` in the `.scad` file for the exact
geometry).

## Print settings

PETG, 0.4mm nozzle, 4 perimeters, 5 top/bottom layers, 30–35% gyroid
infill, 0.2mm layers — this project's own baseline. This is a
load-bearing, safety-relevant fixture (holding up an expensive demo
unit people will press on), so don't drop below that infill for the
risers or lid prop. The sign panel is decorative (and thin — 4–6mm) so
15–20% infill, or even solid, is fine. The risers and lid prop print
flat-side-down with no overhangs past 45°, no supports needed; the
sign panel needs reorienting flat in the slicer (see above).

## Bill of materials (hardware)

| Item | Qty | Used for |
|---|---:|---|
| 1/4"-20 threaded wood insert | 10 | 2 per riser (×2) + 2 for the lid prop + 4 for the joiner batten |
| 1/4"-20 socket head cap screw, length to suit stock thickness | 10 | Matching bolts |
| 8mm wood dowel pin, 30mm long | 2 | Aligns the two base halves at the seam before bolting |
| 6mm wood dowel pin, ~24mm long | 2 | Aligns the sign block to the joined base before gluing |
| Wood glue | small amount | Sign-block-to-base seam (permanent) |

No adhesive needed for the sign panel itself — it's a friction/depth
fit in the slot, meant to slide in and out.

## Assembly (and disassembly for shipping)

1. Install threaded inserts into both base halves at every marked
   pilot hole before joining them: 2 for the riser, 1 for the lid
   prop, and 2 for the joiner batten, per half (5 per half, 10 total).
2. Glue the 2 alignment dowels into one half's seam edge, then bring
   the other half up to it (dowels + glue at the seam) for a precisely
   aligned joint. While the glue sets, bolt `joiner_batten.stl` across
   the underside with 4× 1/4"-20 bolts to hold the halves under
   clamping pressure.
3. Dowel and glue `sign_block.stl` onto the joined base's top surface,
   centered on the seam (2× 6mm dowels, one per half).
4. Bolt each riser onto the base with 2× 1/4"-20 bolts (socket-head
   counterbore already modeled — bolt heads sit flush/recessed).
5. Bolt the lid prop on with its 2× 1/4"-20 bolts.
6. Slide the assembled sign panel (`sign_panel_base.stl` +
   `sign_panel_letters.stl`, printed as one two-color piece) into the
   sign block's slot from above until it seats.
7. Set the assembled stand on a flat, stable surface. Rest the case's
   front-bottom edge in the two cleats, back sloping up and away from
   you. Fold the lid open and rest its edge in the tested lid-prop
   notch.

**To ship**: slide the sign panel out, then unbolt the joiner batten,
risers, and lid prop (steps 2/4/5 in reverse — no tools needed beyond
a 1/4" hex key). The two base halves, two risers, lid prop, batten,
and sign panel all pack flat; the sign block stays with the base since
it's glued/doweled on.

## Regenerating / editing

Re-export after any parameter change:

```powershell
$OSCAD = "C:\Program Files\OpenSCAD\openscad.com"
$parts = "base_right","base_left","sign_block","joiner_batten","riser_right","riser_left","lid_prop","sign_panel_base","sign_panel_letters","coupon_cleat"
foreach ($p in $parts) {
    & $OSCAD -D "part=`"$p`"" -o "exports\stl\$p.stl" andworx_stand_production.scad
}
py validate_stl_bounds.py
```

Key structural parameters (see the `.scad` file for the full list and
comments):

| Parameter | Value | Meaning |
|---|---:|---|
| `tilt_angle` | 45° | Display angle from horizontal |
| `ramp_slope_len` | 130 mm | Case-bearing contact length on each ramp |
| `front_margin` / `rear_margin` | 55 / 90 mm | Flat foot ahead of / behind the ramp; sized so the case's cantilevered center of mass still lands well inside the base's rear edge (see the `cog_margin` assert) |
| `riser_fillet` | 4 mm | Rounds exposed riser edges (peak, cleat, fin) |
| `base_corner_fillet` | 45 mm | Base plaque corner roundover |
| `lid_prop_notch_heights` | [70, 100, 130] mm | Test-fit and pick one |
| `logo_cap_height` | 26 mm | Letter cap height on the sign |
| `seam_dowel_x` | [70, foot_depth-70] mm | Alignment dowel positions along the base's center seam |
| `seam_batten_x` / `seam_batten_y_inset` | [60, foot_depth-60] / 30 mm | Joiner batten bolt positions |
| `lid_prop_y_offset` | 8 mm | Keeps both lid-prop bolts off the center seam (see the "BASE SPLIT" comment block) |
| `sign_tab_depth` | 22 mm | How far the sign panel's blank tab buries into the slot |
| `sign_slot_thickness` | 5 mm | Slot channel width (panel thickness 4mm + clearance) |
| `sign_p0_local` | [depth*0.64, height] | Where the slot opens on the sign block's top surface |

### Hard-won implementation notes (read before extending this file)

These are real bugs this file shipped during development, each caught
by a `trimesh` watertight/body-count/bounding-box check rather than by
eyeballing the OpenSCAD preview — several of them looked completely
plausible in a 3D perspective render right up until the numbers were
checked. If you're adding geometry here, check the actual exported STL
the same way, not just the preview:

1. **`linear_extrude()` always extrudes along Z, never Y.** Every 2D
   profile in `case_display_stand.scad` is authored as `(depth,
   height)`, meant for the XZ plane extruded along Y. Raw
   `linear_extrude()` on these profiles lands 90° out of alignment
   with the rest of the model — use `extrude_profile_along_y()`
   (or this file's local copy, `extrude_profile_along_y_local()`; see
   note 4 on why there are two).
2. **`offset()` rounding on a shape's edge, applied right at a convex
   vertex, can exit the shape entirely** through the *other* adjacent
   edge (the fin's peak-side endpoint did this against the ramp
   wedge's vertical back edge). Keep rounded/recessed features clear
   of vertices, not just clear of the nearest edge.
3. **A 3D transform can be a valid rotation for position but still
   read backward, or with the wrong depth direction, once you check
   which SIDE the viewer is actually on.** This bit twice, in two
   different forms. First, in the now-superseded vertical-fascia
   design: `rotate([90,0,90])` maps local (x=width, y=height,
   z=thickness) to world (Y=width, Z=height, X=depth), and individual
   glyphs came out mirrored top-to-bottom (fixed with
   `mirror([0,1,0])` on the 2D shape before extrusion — confirmed by
   "W renders as M", a vertical-mirror signature, not the horizontal
   one a first guess would assume), and separately raised letters
   ended up on the buried/deep side of a pocket instead of proud of
   the surface (fixed with `mirror([0,0,1])` before the same rotate).
   Second, in the current slot-mounted sign: switching to an explicit
   `multmatrix()` built directly from the trusted `dir2`/`nrm2`
   vectors (rather than a chained rotate/mirror guess) mathematically
   guarantees no *reflection* (the 2x2 [dir2;nrm2] determinant is +1,
   a proper rotation) -- but that property says nothing about *180°
   rotations within the plane*, which are equally determinant-+1 and
   not excluded by it. The letters still came out upside-down (right
   reading ORDER, wrong vertical orientation) until a `mirror([0,1,0])`
   was added to the source 2D word before the matrix -- proof that
   "provably no reflection" is a real but narrower guarantee than
   "provably correct orientation," and doesn't replace rendering the
   actual result and reading it.
4. **Cross-file `use<>` does not expose top-level variables, only
   modules/functions** — referencing a variable like `base_half_width`
   from a file that only `use`s its owner silently evaluates to
   `undef` rather than erroring loudly, and `linear_extrude(height =
   undef)` quietly falls back to OpenSCAD's historical default height
   of 100, which produces confusing-but-plausible-looking geometry.
   `andworx_stand_production.scad` duplicates the handful of shared
   parameters (`front_margin`, `foot_depth`, etc.) from
   `case_display_stand.scad` rather than relying on cross-file access
   — comments there flag them as "kept in sync by hand."
5. **Two pieces that are each individually correct can still combine
   wrong if they're not in the same coordinate frame.** The
   ~710mm-wide base export (vs. the correct ~473mm) wasn't a CGAL or
   `children()` bug, despite looking exactly like one through several
   rounds of bisection — `base_plaque_2d()` was never centered on Y
   (it spans `[0, base_half_width*2]`) while the fascia was already
   centered (`[-base_half_width, base_half_width]`). Always check a
   suspect piece's bounding-box **min and max**, not just its width,
   before assuming the bug is somewhere more exotic.
6. **OpenSCAD's PNG preview renderer is not a reliable correctness
   check for wide/asymmetric assemblies in this environment** — after
   splitting the base, several iso and top-down camera angles (at
   multiple distances) rendered what looked like only one base half
   present, no matter the angle tried. `trimesh` on the actual exported
   STL told a different, conclusive story: a single watertight body
   spanning the full expected 473.1mm in Y, which is only possible if
   both halves are correctly adjacent (two coincident/overlapping
   236.55mm-wide halves cannot produce a 473.1mm bounding box). When a
   render and a direct measurement disagree, trust the measurement —
   this file's camera parameters have misled more than one debugging
   session that turned out to have correct underlying geometry.
7. **`rounded()`'s erode-then-dilate technique fails silently (empty
   geometry, not an error) when the fillet is too large for the
   shape.** `offset(delta=-fillet)` on a shape narrower than
   `2*fillet` erodes it to nothing before the matching `offset(r=
   fillet)` dilate has anything left to work with. `sign_panel_fillet`
   at 4mm on a `sign_panel_t` of 4mm did exactly this (OpenSCAD printed
   "Current top level object is empty" instead of a warning); the
   fillet has to stay under half the shape's narrowest dimension —
   `sign_panel_fillet` is 1.5mm for that reason, not an arbitrary
   choice.
8. **A touching-but-not-overlapping seam can survive as one watertight
   body with a simple axis-aligned `linear_extrude()`, but not
   reliably through a `multmatrix()` built from `cos()`/`sin()`
   terms.** The old vertical-fascia letters (plain
   `translate()`+`linear_extrude()`, starting exactly at the base's
   top face) fused into one body with zero overlap margin. The new
   `sign_letters()`, built with the same "start exactly at the panel's
   front face" logic but through an explicit rotation matrix using
   `dir2`/`nrm2` (irrational-valued `cos(45)`/`sin(45)` terms), instead
   exported as 9 disconnected bodies — the coincident faces almost
   certainly land a few floating-point ULPs apart rather than
   bit-identical. The fix is the same `overlap_eps` pattern used
   throughout this file for the ramp/cleat/fin: start the letters
   `overlap_eps` behind the panel's front face and extrude
   `overlap_eps` taller, guaranteeing genuine volumetric overlap
   regardless of the exact floating-point values involved.

## History

- `case_display_stand.scad` — first working revision: two 3D-printed
  parts per side (`base_foot` + `riser`), joined by M3 screws and a
  center splice plate, no branding. Superseded by the CNC base, but
  its riser/cleat/fin/`case_ghost()` geometry is still the source of
  truth, reused via `use<>`.
- `mockup_concept.scad` — first branded concept: CNC base sketch with
  a Poppins-Bold-placeholder nameplate (before the vector logo
  arrived) and individually-painted-letter plan (before that was
  simplified to a single two-color print). Superseded by
  `andworx_stand_production.scad` for anything beyond a quick visual
  concept check.
- `andworx_stand_production.scad`, earlier revision — one-piece CNC
  base (later split into two halves + a joiner batten), with the sign
  mounted as a **vertical fascia wall** at the front, logo in a
  rectangular pocket. Superseded within the same file by the current
  **slot-mounted, 45°-tilted sign** (matching the case's own angle
  instead of standing vertical) per explicit direction for a cleaner
  look — `fascia_plate`/`fascia_profile_2d`/`logo_backer_pocket` are
  gone, replaced by `sign_block`/`sign_slot_2d`/`sign_letters`. The
  base-split/joiner-batten mechanism is unchanged from that revision.
