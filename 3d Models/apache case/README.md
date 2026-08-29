# APACHE 3800 Parametric IoT Chassis — Structural Iteration 1

The consolidated engineering rationale, diagrams, calculations, validation
gates, and current design status are in [DESIGN_DOCUMENT.md](DESIGN_DOCUMENT.md).
Its human-maintained revision record is in
[DESIGN_CHANGELOG.md](DESIGN_CHANGELOG.md).

This project is a mechanically focused foundation for a portable IoT demo
console. It intentionally leaves the electronics layout and control cut-outs
blank. The source is OpenSCAD, so every important case, panel, hinge, insert,
strut, actuator, cable, and print-splitting dimension is editable in one file:
`model_params.scad`.

The default case values are placeholders based on a nominal APACHE 3800-sized
interior. **Do not print the full chassis until every parameter marked
`MEASURE_BEFORE_PRINT` has been checked on the actual case or purchased
hardware.** Plastic cases vary, and the lower tray normally has draft, ribs,
corner transitions, and local obstructions that a catalogue bounding box does
not describe.

Revision 3 uses a directly measured finished chassis footprint of
**12-1/16 x 9-1/4 inches (306.3875 x 234.95 mm)**. This direct footprint takes
precedence over the earlier catalogue-derived clearance calculation while
`use_measured_outer_footprint` is true.

## What is included

- Open-centre perimeter chassis with thin walls plus top/bottom structural rails
- Large unobstructed electronics/service cavity (the case floor remains usable)
- Separate blank front bezel and blank moving control panel
- Recessed fixed and moving leaves for a continuous metal hinge
- M3 heat-set insert bosses for removable hinge mounting
- Symmetric left/right chassis and panel pads for one or two gas springs
- Rear-centre chassis and panel pads for a future actuator pivot
- Broad cable opening at the hinge, with clearance for sleeve or cable chain
- 30-degree operating view and 80-degree service view
- Four printable chassis quadrants, two panel halves, two bezel halves, and
  screw-fastened seam joiners sized for a nominal 256 x 256 mm print bed
- Four-piece, 16 mm-high full-footprint fit-test frame and a separate
  hinge/insert coupon for validation before committing to the full chassis
- Complete closed, open, service, and exploded fit-check assemblies

The represented hinge is a fit-check envelope only; print the plastic parts and
install a purchased black metal piano hinge.

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
| Hinge length | `hinge_length` | End-to-end metal leaf length |
| One hinge leaf width | `hinge_leaf_width` | Pin centreline to outer edge of one leaf |
| Hinge metal thickness | `hinge_leaf_thickness` | Leaf sheet thickness, excluding knuckle |
| Hinge knuckle diameter | `hinge_barrel_diameter` | Maximum outside diameter |
| Insert pilot/outer diameter | `heatset_insert_diameter` | Use insert maker's recommended printed pilot, then validate a coupon |
| Insert installed length | `heatset_insert_depth` | Brass insert length / recommended installation depth |

Also inspect and note local protrusions. If they cannot be avoided by making
`usable_case_depth` smaller, add explicit reliefs to `chassis_shell()` rather
than quietly shrinking unrelated dimensions.

## How panel clearance is calculated

When `use_measured_outer_footprint = true`, the outer chassis dimensions are
exactly `measured_chassis_outer_width` and `measured_chassis_outer_depth`.
Panel, bezel, split, and hinge-support dimensions derive from that footprint.

When the direct override is false, the outer chassis width is:

`case_inner_width - 2 × chassis_clearance`

The working depth uses `min(case_inner_depth, usable_case_depth)`, then subtracts
the same per-side clearance and any fit adjustments. The panel width is derived from the chassis inner
opening after subtracting both support ledges and the reveal on both sides:

`panel_width = chassis_inner_width - 2 × support_ledge_width - 2 × panel_edge_gap`

The panel depth starts behind the bezel and the hinge barrel. Its back edge then
keeps one support ledge plus one reveal from the rear wall. Change
`panel_edge_gap` to tune the visible reveal; PETG prototypes typically need at
least 1.0–1.5 mm per moving edge at this size.

## Hinge setup

Measure the purchased hinge and edit the five hinge parameters in
`model_params.scad`. `hinge_leaf_thickness` plus `hinge_pocket_clearance`
controls pocket depth. `hinge_offset` moves the complete hinge rearward from the
fixed bezel. The pin axis and panel start are derived automatically.

The fixed-leaf insert pilots are in the chassis hinge rail. The moving-leaf
clearance holes pass through the panel skin into underside bosses with insert
pilots. Insert size is intentionally exposed because M3 heat-set inserts are not
dimensionally standardized. Verify insertion direction and pilot size on a
small coupon before committing to the panel.

## Opening angles

Set `panel_deploy_angle` for the normal assembly view (default 30 degrees). Set
`panel_service_angle` for disconnected-strut maintenance (default 80 degrees).
These values only position the fit-check assembly in this iteration; they do not
pretend to solve a gas-spring or actuator linkage. Final pivot locations, stroke,
forces, collision checks, and hard stops belong in the next mechanism iteration.

## Bambu Lab X1 Carbon split plan

The configured printable volume is 256 x 256 x 256 mm. The full model is never
intended to print as one object. Use these production files:

| Group | Files / quantity | Nominal maximum XY footprint |
|---|---|---|
| Front chassis | `chassis_front_left` + `chassis_front_right` | 153.1 x 110.0 mm each |
| Rear chassis | `chassis_rear_left` + `chassis_rear_right` | 153.1 x 124.9 mm each |
| Control panel | `panel_left` + `panel_right` | 141.5 x 159.1 mm each |
| Front bezel | `front_bezel_left` + `front_bezel_right` | 150.0 x 32.0 mm each |
| Chassis seams | `chassis_joiner_x` and `chassis_joiner_y`; print two of each | About 50 x 24 mm |
| Panel seam | `panel_joiner`; print two | About 50 x 24 mm |
| Bezel seam | `bezel_joiner`; print one | About 50 x 24 mm |

The assertions in `model_params.scad` stop a render if a quadrant, panel half,
or bezel half exceeds the configured X1 Carbon bed dimensions after parameter
changes. Still verify slicer orientation, skirt/brim space, and build-plate
exclusions in Bambu Studio before sending a job.

## Required sample prints before the full chassis

Use a staged fit validation rather than printing a production quadrant first.

1. Print `hinge_insert_coupon.stl`. Confirm the actual hinge leaf sits flush,
   the barrel clears, M3 screws pass correctly, and the chosen heat-set inserts
   install without splitting or spinning. Adjust the hinge/insert parameters.
2. Print the four `fit_test_front/rear_*.stl` parts plus two each of
   `fit_test_pin_joiner_x.stl` and `fit_test_pin_joiner_y.stl`. Press the pins
   into the existing boss holes to lock all four seams. No inserts or screws are
   needed for this dimensional test. The assembled sample is the exact full
   chassis footprint and corner profile, reduced to a 16 mm-high rail.
3. Assemble the fit frame and place it in the empty APACHE case. Its bottom edge
   is inset by `case_bottom_bevel_inset` and follows a rounded, six-stage eased
   transition over `case_bottom_bevel_height`. Confirm the complete lower edge
   bears on the flat floor rather than rocking on the molded bevel. Then check every wall, corner,
   rib, latch/hinge obstruction, and removal path. It should insert and lift out
   without bowing or force.
4. Target a repeatable 2–3 mm gap per side for the next validation print. If a corner binds, correct
   `case_inner_width`, `case_inner_depth`, `usable_case_depth`, `corner_radius`,
   `case_bottom_bevel_height`, `case_bottom_bevel_inset`, or
   `chassis_clearance`, regenerate, and repeat the sample—not the full print.
5. Only after the fit frame and hardware coupon pass should the production
   chassis quadrants, bezel, and panel be printed.

The low frame validates the footprint but not lid closure. Before production,
also compare `chassis_height` plus the panel/hinge envelope against the measured
closed-case height using a rigid depth gauge or a simple foam/clay witness.

### Physical fit-test revision notes

The first printed sample was assembled without dimension-locking joiners; the
visible seam gaps allowed the long rails to bow inward and drop when pressed.
Revision 2 adds push-pin joiners, increases nominal clearance, applies separate
width/depth correction parameters, increases the corner radius, and replaces
the straight bevel ramp with a smoothstep curve. Do not evaluate size from loose
quadrants—the seams must be locked before checking fit.

Revision 3 replaces the estimated outer footprint with the measured target
12-1/16 x 9-1/4 inch finished size. The validated bevel and corner treatment are
unchanged. Because the panel became narrower, the unpurchased hinge placeholder
was reduced to 250 mm; measure the actual hinge before production.

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
The split panel uses two `panel_joiner` bars (one at each prepared Y station).
The split bezel uses its dedicated underside `bezel_joiner` and heat-set insert
bosses, so its centre seam is mechanically fastened. Do not glue the primary
service joints.

The design does not require holes through the waterproof shell. Retention can be
by tuned friction, removable edge shims, existing case geometry, or later
non-penetrating clamps. Confirm the chosen retention strategy after a physical
corner/rail fit test.

## Finalize before a full print

1. All case-interface measurements and the lowest usable width/depth caused by
   wall draft or molded ribs.
2. `chassis_height` against the closed lid and any lid foam retained.
3. Corner radius and per-side chassis clearance.
4. Purchased hinge dimensions, screw-hole pattern, and barrel clearance through
   the full 0–80 degree motion.
5. Actual M3 insert pilot diameter/depth and screw-head/countersink choice.
6. Printer's true usable bed dimensions and slicer orientation of every split
   component.
7. Cable sleeve/chain envelope at both 30 and 80 degrees.

The gas-spring and actuator pads are reinforced placeholders, not validated
linkages. Do not buy springs or drill their brackets from these coordinates yet.
