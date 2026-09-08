# RP02 — complete Apache 2800 build candidate

2026-09-04. Supersedes RP01's incomplete two-control rear layout. RP01 and RF02
are retained unchanged. This is a **CAD candidate**, not approval to drill the case
or print the entire assembly before fit checks.

## Installation guides

The [electronics placement and wire-routing page](installation-guides/electronics-placement.html)
maps every lower component, the display-mounted Pi, harness routes and assembly
gates. The [US Letter rear drill guide](installation-guides/output/pdf/rear-drill-guide-letter.pdf)
is a true-size outside-rear template with calibration, trim and cut markings.
Read the [installation guide notes](installation-guides/README.md) first. The
176 x 68 mm paper envelope is still based on the approximate reference model;
verify it against the real rear recess and dry-fit the carrier before drilling.

## Included files

All printable meshes are in [exports](exports/). Print quantities for assembly:

| STL | Quantity | Purpose |
|---|---:|---|
| shell_FL, shell_FR, rear_L, rear_R | 1 each | Full-height shell with integrated lower supports; rear clearance for all three controls |
| tray_L, tray_R | 1 each | RF02 recessed-fuse equipment tray, RP02 marked |
| lower_joiner | 1 | Left lower-support seam |
| tray_joiner | 2 | Front/rear equipment tray seam |
| shell_joiner_x, shell_joiner_y | 2 each | Front/rear and left/right shell seams |
| panel_L, panel_R | 1 each | Fixed top-panel halves |
| screen_face, safety_face, switch_face, activity_face | 1 each | Existing four replaceable top faceplates, RP02 marked |
| carrier | 1 | Shared rear XT60, master rocker and dial faceplate |

Test-only: dial_coupon, xt_coupon, switch_1/2/3/3_27, layout_template.
The template is **layout only**, not an approved drill guide. All dimensions in mm.
No reference hardware boxes or whole-case reference mesh should be printed.
Old R5/RF02 marks identify inherited geometry; RP02 marks identify revised parts.
Joiners retain their existing recessed identification and alignment marks.

## Rear design

Floor is Z0; rear is +Y; all control centers Z45. Global X positions:
dial -30, switch +10, XT60 +52 (order reverses when viewed from outside rear).
Carrier is 144 x 52 x 3, center X10, external face Y120.5.
Estimated outer rear wall Y117.5 comes from the approximate imported case STEP;
**the actual case rib/hinge and drilling position still require confirmation**.

Measured hardware is unchanged: XT plate 38.4 x 38.16 x 5.27, hole pitch
29.85 x 30.27, body 14.2 x 22.12 x 28; rocker body 21.56 x 27.02 x 30,
bezel 24.75 x 31.57. Carrier openings add 0.2 mm per side.
Dial uses the recorded 9.27 bushing, 27 body diameter, 16 rear depth,
17.72 collar diameter, 26.48 knob diameter, 21.55 shaft projection, and
2.96 anti-rotation pin at 9.83 offset / 4.67 projection. Trial pin is at
12 o'clock. Knob depth 14 and shaft diameter 6 remain inherited approximations.
Confirm nut engagement and actual anti-rotation orientation on the coupon.

The case openings behind the carrier are larger than the carrier holes so the
switch clips engage only the 3 mm carrier and the dial body/pin have clearance.
Rear shell windows include 15 mm provisional wire space. They do not change the
proven lower case interface or the fuse pocket. No live electrical behavior or
terminal pinout is implied by these mechanical envelopes.

## Fit and analysis limits

The tray perimeter and mounting coordinates are deliberately preserved from RF02:
291 x 214 x 2, installed base Z15.5, fuse pocket 92 x 132. The previously reported
tray binding is **not resolved by this release**. Do not force it or scale it in
the slicer; report whether it binds at the corners, sides, or mounting supports.
The low fuse base is Z6, its top Z46, fixed panel underside Z72.
Full-height shell fit, screen retention, top control grips, wiring lugs, and lid
clearances still require physical verification. Fans are not yet measured.
This build is not a thermal validation or a final screen-retention redesign.

Start with dial_coupon and switch_3, then check the carrier against the actual
rear wall without cutting it. Check the tray before committing to a complete
replacement print. Slice at 100% scale. Inspect layers/supports for top panel
bosses and shell openings. Every exported mesh is checked for closed edges,
consistent winding, one connected surface, and the 256 mm build envelope.

Run `export_rear.ps1` in PowerShell 7 to regenerate all 24 meshes and previews;
its before/after snapshots preserve the full source dependency tree under
`3d Models/versions`. See validation.json and FIT_ANALYSIS.md for evidence.

Purchased components remain tracked in [BOM](../BOM.md), including the dial,
XT60 input, master rocker, external PSU and existing fuse block. No new component
has been purchased by this revision. Required carrier fasteners remain provisional
(four M3 carrier fixings and four M4 XT fixings, with nuts/washers and lengths
chosen after actual case/plate stacking is checked).
