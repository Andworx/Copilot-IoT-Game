# APACHE 3800 case and airflow study

This is a separate planning model for the complete APACHE 3800 enclosure. It
does not modify the production chassis and is not a drilling template.

The model combines Harbor Freight's approximate catalogue envelope with the
physically tested chassis footprint. It provides visible keepouts and proposed
locations for cooling, rear-wall AC power entry, and a rear control dial.

## Baseline geometry

Harbor Freight lists the APACHE 3800 at approximately:

- Exterior: 16-1/2 x 13 x 6-3/4 inches
- Interior: 14-7/8 x 10-5/8 x 6-1/8 inches
- Polypropylene construction with an IP65 rating

Source: <https://www.harborfreight.com/3800-weatherproof-protective-case-16-516-in-63927.html>

The study shows the current 306.3875 x 229.45 mm chassis candidate inside a
tapered lower cavity. The exact case split, floor size, draft, ribs, hinge,
latches, handle, and flat exterior wall areas remain `MEASURE_BEFORE_DRILL`
parameters.

## Recommended first-pass port layout

| Function | Proposed location | Placeholder interface |
|---|---|---|
| Filtered intake | Left short end, front/lower offset | 60 mm fan, 54 mm opening, 50 mm hole pitch |
| Exhaust | Right short end, rear/upper offset | 60 mm fan, 54 mm opening, 50 mm hole pitch |
| Fused AC inlet | Left side of the recessed rear-center panel shown in the reference photo | Ordered FILSHU C14/fuse/switch module; modeled horizontally with a 56.1 x 27.9 mm cutout and 66.6 x 31.8 mm face |
| Six-position control selector | Right side of the same recessed rear-center panel | Ordered FOCMKEAS RS26 2P6T; modeled 9.8 mm panel hole, 28.6 mm rear body, and 6 x 20 mm shaft |

This diagonal low-to-high path crosses the under-panel electronics cavity. The
fans stay on the unobstructed left/right ends, while power and the dial share
the protected rectangular panel between the two inner rear ribs and below the
hinges. The blue area and orange rib guides in `rear_port_layout.png` are a
photo-derived planning envelope, not measured geometry. Confirm that this area
is flat and single-wall, and that cords and the knob
clear the opened lid, hinge hardware, table, and adjacent equipment.

The power inlet now represents the ordered FILSHU IEC320 C14 inlet, fuse holder,
and rocker-switch module from Amazon ASIN `B0FZQ866Z3`. It is rotated 90 degrees
from the listing's vertical drawing so its approximately 66.6 x 31.8 mm face
fits comfortably within the low rear panel. The modeled opening is 56.1 x 27.9
mm and the rear body-depth allowance is 30 mm. These values come from the
listing and drawing, not the delivered component; measure its flange, snap-in
body, corner radii, mounting holes, and terminal clearance with calipers before
making a drilling template.

Product reference: <https://www.amazon.com/dp/B0FZQ866Z3?th=1>

The control is the ordered FOCMKEAS RS26 2P6T rotary band switch from Amazon
ASIN `B0F9KTRGV5`. It is a six-position selector, not a continuously variable
potentiometer. The listing specifies a 28.6 mm body diameter, 38 mm total
height, 6 mm shaft diameter, 20 mm shaft length, and a 0.3 A rating. The model
uses a 9.8 mm clearance hole for the commonly documented 3/8-32 RS26 mounting
bushing and infers an 18 mm rear-body depth from the listed total and shaft
lengths. The included knob remains an 18 x 14 mm placeholder until measured.

Use this switch as a low-current selector input for six controller modes, not
as a mains-power switch or direct high-current fan control. Confirm the actual
bushing diameter and usable threaded length, anti-rotation hardware, terminal
clearance, knob dimensions, and case-wall thickness before making a drilling
template or adapter plate.

Product reference: <https://www.amazon.com/dp/B0F9KTRGV5?th=1>

## Preliminary thermal estimate

The placeholder heat load is 30 W. At a 10 C permitted temperature rise, the
ideal airflow is about 5.3 CFM. Applying a 1.75 design margin gives 9.2 CFM.
Assuming filters and guards deliver only 60 percent of free-air rating, each fan
station should use a fan rated for at least about 15.4 CFM; the model uses a
20 CFM nominal target.

Opposing fans act primarily as a pressure-supporting series path, so do not add
their two free-air CFM ratings together. Verify airflow after assembly with the
actual filters, grilles, wiring, panel closed, and electronics operating at
worst-case load. Run `python estimate_airflow.py` to repeat the calculation.

## Measurements required before drilling

1. Lower-shell exterior height and the exact case split height.
2. Wall thickness and local double-wall/rib structure at all four proposed
   ports.
3. Flat mounting area around each port, including the exterior corner bumpers.
4. Hinge, latch, handle, pressure-valve, padlock, and gasket keepouts.
5. Clearance behind each 60 x 60 x 25 mm fan for wiring, guards, and service.
6. Exact Mean Well model, worst-case AC input, output load, and measured loss.
7. Exact fan model, voltage, current, free-air CFM, pressure curve, and noise.
8. Exact power inlet flange, cutout, fuse, switch, terminals, and strain relief.
9. Exact dial body depth, anti-rotation feature, terminal clearance, and knob.
10. Closed-lid clearance above the control panel and all moving wiring.

## Safety and sealing

Any wall opening defeats the original IP65 enclosure rating unless the complete
installation is independently sealed and tested. Use gasketed/IP-rated hardware,
finger-safe guards, a replaceable intake filter, and drip-aware orientation.

If mains voltage enters the case, use a recognized fused inlet, protective
earth where required, insulated terminals, strain relief, appropriate wire and
fusing, and physical separation from low-voltage/control wiring. Have the final
mains design reviewed by a qualified person before energizing it.

## Files and views

- `airflow_params.scad` — all envelope, port, component, and thermal inputs.
- `apache_3800_airflow_study.scad` — case shell, chassis envelope, hardware
  mockups, keepouts, component blocks, and airflow arrows.
- `estimate_airflow.py` — editable first-pass airflow calculation.
- `export_airflow_previews.ps1` — renders open, closed, airflow-only, and port
  placement PNGs plus lower-case/lid reference STLs into `exports/`.

The STL filenames contain `REFERENCE_DO_NOT_PRINT`. They are useful as import
envelopes in another CAD package or slicer, but they are larger than the X1C
bed and inherit unmeasured catalogue/placeholder dimensions. They must not be
used as manufacturing or drilling masters.

OpenSCAD selectors include `assembly_open`, `assembly_closed`,
`airflow_section`, `port_layout`, `rear_port_layout`,
`case_lower_reference`, and `case_lid_reference`. Use the dedicated rear view
to judge power/dial spacing below the hinge before choosing hardware.
