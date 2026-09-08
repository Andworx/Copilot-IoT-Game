# APACHE 2800 Parametric IoT Chassis — Fixed-Panel Architecture 3.2

**Latest complete candidate: [RP02 build and print list](full-build-RP02/README.md).**
Includes rear dial, master switch and XT60 carrier, all four shell corners with
lower supports, tray, joiners, top-panel halves and four module faceplates.
Previous RF02/RP01 files remain historical. Read the RP02 fit gates before printing;
tray binding and actual rear-wall/hinge clearance are still unconfirmed.

The consolidated engineering rationale, diagrams, calculations, validation
gates, and current design status are in [DESIGN_DOCUMENT.md](DESIGN_DOCUMENT.md).
All purchased, used, planned, and placeholder hardware is tracked in the
[system bill of materials](BOM.md). The human-maintained revision record is in
[DESIGN_CHANGELOG.md](DESIGN_CHANGELOG.md). The STEP-to-production comparison
is recorded in [analysis/FIT_ANALYSIS.md](analysis/FIT_ANALYSIS.md), and the
MIT-licensed third-party reference model is under
`references/apache-2800-cad-model/`.

This project is a mechanically focused foundation for a portable IoT demo
console. The current architecture uses a fixed, removable modular control deck
rather than a moving panel. The source is OpenSCAD, so every important case,
panel, module, insert, control cutout, and print-splitting dimension is editable
in `model_params.scad`.

The enclosure is a Harbor Freight APACHE 2800. Catalogue values are approximate;
the production insert dimensions come from this project's physical measurements
and fit prints. **Do not print the full chassis until every parameter marked
`MEASURE_BEFORE_PRINT` has been checked on the actual case or purchased
hardware.** Plastic cases vary, and the lower tray normally has draft, ribs,
corner transitions, and local obstructions that a catalogue bounding box does
not describe.

Revision 5 preserves the physically passed lower footprint of
**306.3875 x 229.45 mm**. It combines the validated 113.975 mm front span and
115.475 mm rear span through Z = 16 mm. The full-height Rev 4 print was very
tight, so the shell now progressively relieves 1.0 mm per width side and
1.5 mm per depth side above Z = 16 mm. The top outline is 304.3875 x 226.45 mm
with a 23.5 mm corner radius; verify it with the upper-clearance frame before
reprinting all four full-height quadrants.

## What is included

- Open-centre perimeter chassis with thin walls plus top/bottom structural rails
- Large unobstructed electronics/service cavity (the case floor remains usable)
- Full-opening fixed control panel secured by ten perimeter screws
- Upper-center measured original Raspberry Pi 7-inch display/Pi 4B carrier plus
  a full-width lower bank of measured switches, indicators, and mode sockets
- M3 heat-set insert interfaces for the removable deck and module plates
- No active piano hinge, pistons, gas springs, actuator, or moving cable loop
- Four printable chassis quadrants, two panel halves, four module plates, and
  screw-fastened seam joiners sized for a nominal 256 x 256 mm print bed
- Four-piece, 16 mm-high full-footprint fit-test frame
- Complete installed, exploded, and top-panel layout previews

## Measurements to take

Remove all foam and measure at the height where each chassis feature will sit.
Use calipers or a rigid rule and record millimetres.

| Physical measurement | Parameter | How to measure |
|---|---|---|
| Narrowest usable tray width | `case_inner_width` | Left-to-right between all ribs/bosses, at the chassis top and bottom |
| Narrowest tray depth | `case_inner_depth` | Front-to-back between usable wall faces |
| Obstruction-free depth | `usable_case_depth` | Depth actually available after hinge/latch/rear obstructions; the model uses the smaller of this and `case_inner_depth` |
| Lower-half clear height | `case_lower_clear_height` | Case floor to the lowest interference at the parting line/lid when closed |
| Wall taper | `case_wall_draft_per_side` | Difference per side between top and bottom widths; currently documented for fit planning and should be folded into the conservative width/depth values |
| Bottom bevel height | `case_bottom_bevel_height` | Case floor to the point where the molded floor/wall bevel becomes approximately vertical |
| Bottom bevel horizontal run | `case_bottom_bevel_inset` | Horizontal distance from the upper wall line inward to the flat floor; use the largest measured side/corner value plus tolerance |
| Additional width correction | `chassis_width_fit_adjust` | Total width removed after a physical fit test, independent of depth |
| Additional depth correction | `chassis_depth_fit_adjust` | Total depth removed after a physical fit test, independent of width |
| Interior corner radius | `corner_radius` | Best-fit radius of each tray corner; check all four and use the smallest safe value |
| Desired wall gap | `chassis_clearance` | Gap per side, normally 1.0–2.0 mm after a corner test fit |
| Insert pilot/outer diameter | `heatset_insert_diameter` | Use insert maker's recommended printed pilot, then validate a coupon |
| Insert installed length | `heatset_insert_depth` | Brass insert length / recommended installation depth |
| Touchscreen body and opening | `screen_opening_size`, `screen_rear_keepout` | Measure bezel, active area, fasteners, connector locations, and cable bend |
| Toggle/rotary/button/LED interfaces | Component hole and keepout parameters | Measure panel cutout, anti-rotation feature, nut stack, body depth, and terminal bend |

Also inspect and note local protrusions. If they cannot be avoided by making
`usable_case_depth` smaller, add explicit reliefs to `chassis_shell()` rather
than quietly shrinking unrelated dimensions.

## How panel clearance is calculated

When `use_measured_outer_footprint = true`, the outer chassis dimensions are
exactly `measured_chassis_outer_width` and `measured_chassis_outer_depth`.
Panel and split dimensions derive from that footprint.

When the direct override is false, the outer chassis width is:

`case_inner_width - 2 × chassis_clearance`

The working depth uses `min(case_inner_depth, usable_case_depth)`, then subtracts
the same per-side clearance and any fit adjustments. The fixed panel overlaps
the perimeter support ledge. Its width and depth are:

`panel_width = chassis_inner_width - 2 × panel_edge_gap`

`panel_depth = chassis_inner_depth - 2 × panel_edge_gap`

## Fixed modular panel

Ten perimeter holes fasten the panel to inserts in the chassis top rail. Four
module openings accept independently printable plates. The 220 x 136 mm
display carrier is centered across the upper panel and is sized around the
measured original official Raspberry Pi 7-inch Touch Display: 193 x 110 mm
glass, 155 x 87 mm active area, and 35 mm total depth with the Pi 4B attached.
It uses an overlay bezel and rear support because there are no front mounting
holes. Three equal 90 x 74 mm modules form the lower bank: two safety-cover
toggles; two keyed switches plus two circular rockers; and four mode sockets
paired with four 5 mm LEDs. The matching activity uses removable red, blue,
green, and orange 152.4 mm (6 in) cables rather than one captive pull-out lead.
Each loose cable has two plugs, permanently marked A and B. Only pin N is
active in socket N. The initial cable map is red 1A-2B, blue 2A-3B, green
3A-4B, and orange 4A-1B. Software scans the four protected socket channels to
detect the resulting pairings. Four sockets support six unique pin-pair cable
types without adding resistance coding or a second active conductor.

The cutouts derive from the measured hardware in `model_params.scad`. The
remaining production details are the screen clamp/rear fastener pattern, LED
holders, removable-cable storage, control nut stacks, terminal bends, and
closed-lid height. Print thin coupons before printing complete module plates.

Service access is obtained by removing the ten perimeter screws and lifting the
panel. Use labeled removable connectors and enough harness slack to reach those
connectors without loading conductors or terminals.

## Bambu Lab X1 Carbon split plan

The configured printable volume is 256 x 256 x 256 mm. The full model is never
intended to print as one object. Use these production files:

| Group | Files / quantity | Nominal maximum XY footprint |
|---|---|---|
| Front chassis | `chassis_front_left` + `chassis_front_right` | About 153.2 x 114.0 mm each |
| Rear chassis | `chassis_rear_left` + `chassis_rear_right` | About 153.2 x 115.5 mm each |
| Fixed control panel | `panel_left` + `panel_right` | About 147.5 x 217.1 mm each |
| Touchscreen module | `screen_module_provisional` | 220 x 136 mm, measured screen opening |
| Safety-switch module | `rotary_module_provisional` | 90 x 74 mm, two safety-cover toggles |
| Key/rocker module | `switch_module_provisional` | 90 x 74 mm, two keyed and two rocker switches |
| Four-cable matching module | `utility_module_provisional` | 90 x 74 mm, four sockets and four LEDs |
| Chassis seams | `chassis_joiner_x` and `chassis_joiner_y`; print two of each | About 50 x 24 mm |
| Upper-clearance test | `upper_fit_front/rear_left/right`; use two each of the existing FIT-X/FIT-Y pin joiners | About 152.1 x 113.5 mm each |

The assertions in `model_params.scad` stop a render if a quadrant or panel half
exceeds the configured X1 Carbon bed dimensions after parameter
changes. Still verify slicer orientation, skirt/brim space, and build-plate
exclusions in Bambu Studio before sending a job.

## Required sample prints before the full chassis

Use a staged fit validation rather than printing a production quadrant first.

1. Print a small representative insert coupon before the structural panel.
   Confirm the chosen heat-set inserts install without splitting or spinning
   and that the selected screws repeatedly assemble without pull-out.
2. Print the four `fit_test_front/rear_*.stl` parts plus two each of
   `fit_test_pin_joiner_x.stl` and `fit_test_pin_joiner_y.stl`. Press the pins
   into the existing boss holes to lock all four seams. No inserts or screws are
   needed for this dimensional test. The assembled sample is the exact full
   chassis footprint and corner profile, reduced to a 16 mm-high rail.
3. Assemble the fit frame and place it in the empty APACHE case. Its bottom edge
   is inset by `case_bottom_bevel_inset` and follows a rounded, six-stage eased
   transition over `case_bottom_bevel_height`. Confirm the complete lower edge
   bears on the flat floor rather than rocking on the molded bevel. Then check every wall, corner,
   rib, case-hinge/latch obstruction, and removal path. It should insert and lift out
   without bowing or force.
4. Target a repeatable 2–3 mm gap per side for the next validation print. If a corner binds, correct
   `case_inner_width`, `case_inner_depth`, `usable_case_depth`, `corner_radius`,
   `case_bottom_bevel_height`, `case_bottom_bevel_inset`, or
   `chassis_clearance`, regenerate, and repeat the sample—not the full print.
5. Print each thin measured hole-pattern coupon before a complete module.
   Verify every nut, washer, anti-rotation feature, body,
   terminal, and cable bend.
6. Only after the fit frame, insert test, control coupons, and closed-lid height
   test pass should the production chassis and fixed panel be printed.

The low frame validates the footprint but not lid closure. Before production,
also compare `chassis_height` plus the fixed panel, module plates, controls, and
screen bezel against the measured closed-case height using a rigid depth gauge
or a simple clay witness after the lid foam is removed.

### Physical fit-test revision notes

The first printed sample was assembled without dimension-locking joiners; the
visible seam gaps allowed the long rails to bow inward and drop when pressed.
Revision 2 adds push-pin joiners, increases nominal clearance, applies separate
width/depth correction parameters, increases the corner radius, and replaces
the straight bevel ramp with a smoothstep curve. Do not evaluate size from loose
quadrants—the seams must be locked before checking fit.

Revision 3 replaces the estimated outer footprint with the measured target
12-1/16 x 9-1/4 inch finished size. The validated bevel and corner treatment are
unchanged. Architecture 2.0 retires the former hinge and moving-panel mechanism
in favor of the screw-fastened modular deck.

Revision 4 promotes the physically passed 306.3875 x 229.45 mm joined-frame
test. Its front and rear spans are 113.975 and 115.475 mm. Panel, module, split,
and equipment-tray dimensions now derive from this production footprint.

The subsequent 77 mm-high Rev 4 shell was very tight even though its low frame
fit. Revision 5 keeps the proven bottom geometry, then tapers inward above
16 mm and increases the top corner radius by 2 mm. Every printable assembly
piece now carries a recessed part ID, orientation mark where applicable, and
paired seam witness marks. Print the four `upper_fit_*.stl` parts and support
the joined gauge at the intended top-rail height before printing the new shell.

## Printing and assembly

Run `export_parts.ps1` from PowerShell to generate the STL set and four PNG
views. The script expects OpenSCAD's synchronous console binary at
`C:\Program Files\OpenSCAD\openscad.com`;
override `-OpenScad` if needed.

After exporting, run `py validate_stl_bounds.py`. It reads every generated STL,
prints its exact X/Y/Z bounding box, and fails if any dimension exceeds the
configured 256 x 256 x 256 mm X1 Carbon build volume.

Suggested PETG starting point: 0.4 or 0.6 mm nozzle, 4 perimeters, 5 top/bottom
layers, 25–35% gyroid infill, and 0.2–0.28 mm layers. Orient quadrant rails and
plates with their largest flat face on the bed. The triangular/rib transitions
are designed to avoid major supports; inspect every slice before printing.

Use four chassis quadrants and the joiner plates. Install inserts in the molded
seam pads, then fasten joiners from the accessible cavity side with M3 screws.
Install the ten chassis-rail inserts, place both panel halves, and fasten the
fixed panel around its perimeter. The centered touchscreen plate and centered
toggle plate each span the X seam and mechanically tie the two halves together;
therefore the active design no longer needs separate panel joiner bars. Install
all four independently removable module plates. Do not glue primary service
joints. Use labeled plug connectors and enough slack to lift the unscrewed deck
for service.

The design does not require holes through the waterproof shell. Retention can be
by tuned friction, removable edge shims, existing case geometry, or later
non-penetrating clamps. Confirm the chosen retention strategy after a physical
corner/rail fit test.

## Removable electronics tray

The initial mounting design is in [equipment-tray](analysis/equipment-tray/README.md).
It uses two ventilated 145.3 x 214 x 2 mm halves supported by the eight existing
chassis seam bosses. The halves replace the former side seam joiners; two narrow
front/rear cross-joiners tie them together using the existing center inserts.
The result remains removable without drilling the APACHE floor. The fuse, Pi,
and converter holes use their measured patterns. The 12 V / 15 A supply is now
external, entering through an XT60 interface and 12 V master switch whose
mounting details remain pending receipt and measurement.

Print `analysis/equipment-tray/exports/stl/fit_coupon.stl` and one
`tray_cross_joiner.stl` first. The tray top is 17.5 mm above the case floor.
Removing the internal PSU eliminates the former PSU/key-switch collision and
the 92 mm height candidate. The retained 77 mm chassis still needs a closed-lid
witness test with the complete screen and control stack.

## Finalize before a full print

1. All case-interface measurements and the lowest usable width/depth caused by
   wall draft or molded ribs.
2. `chassis_height` plus panel modules and controls against the closed lid after
   the lid foam is removed.
3. Corner radius and per-side chassis clearance.
4. Exact touchscreen, toggle, rotary, button, indicator, washer, knob, and rear
   body/cable envelopes.
5. Actual M3 insert pilot diameter/depth and screw-head/countersink choice for
   both the deck and its modules.
6. Panel deflection and insert retention after repeated removal/reinstallation.
7. Printer's true usable bed dimensions and slicer orientation of every split
   component.
8. Harness strain relief, connector labeling, and safe lift-out service slack.

The active model contains no piston, gas-spring, actuator, or moving-panel
mounting features.
