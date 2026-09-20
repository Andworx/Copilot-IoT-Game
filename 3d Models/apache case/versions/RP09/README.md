# RP09 working revision — high-contrast face text

RP09 changes the four removable faceplates and the two fixed panel halves. The
screen cover is extended to the fixed panel's rear edge and its upper mounting
holes use the panel's existing rear screw locations. The fixed panel now has an
integrated drop-in screen seat so the display cannot fall through its carrier
opening. LED positions and collars, the lower screen mounting holes, component
holes, shell, and trays remain unchanged.

## Print the coupon first

For an AMS or other multi-material printer, import these two files together as
parts of one object without moving either part:

1. `../../calibration/face-text/RP09/exports/text_coupon_base.stl`
2. `../../calibration/face-text/RP09/exports/text_coupon_text.stl`

Assign the base and text different filaments. Use a light, opaque text color
against the black base. The text is 0.40 mm proud and has a 0.12 mm perimeter
clearance around its 0.80 mm-deep pocket.

For a manual filament change, print
`../../calibration/face-text/RP09/exports/text_coupon_layer_swap.stl` and change
color at Z = 3.20 mm. Do not scale any of the files.

## Production choices

Each face has two supported workflows:

- **Object/AMS color:** import the matching `*_base.stl` and `*_text.stl` at
  identical coordinates as parts of one object, then assign colors.
- **Layer change:** print the matching `*_layer_swap.stl` and change filament
  at Z = 3.20 mm.

The titles use Liberation Sans Bold at 5.4 mm (6.2 mm on the screen face), up
from the prior thin 4 mm recessed lettering. `FRONT` and the M4 socket labels
are also bold, color-capable geometry.

## Files after coupon approval

- `screen_face_base.stl` + `screen_face_text.stl`, or
  `screen_face_layer_swap.stl`
- `safety_face_base.stl` + `safety_face_text.stl`, or
  `safety_face_layer_swap.stl`
- `switch_face_base.stl` + `switch_face_text.stl`, or
  `switch_face_layer_swap.stl`
- `activity_face_base.stl` + `activity_face_text.stl`, or
  `activity_face_layer_swap.stl`

RP08 remains the current immutable release until the coupon and at least one
production face pass physical print review.

## Screen-cover alignment correction

The screen cover grows from 220 x 136 mm to 220 x 136.75 mm. Its rear edge now
ends at the fixed panel's modeled rear edge, global Y = 221.75 mm. The two upper
holes move from local X +/-105, Y +63 to X +/-95, Y +65.75, matching the
panel's existing rear screw centers at global X +/-95, Y 218.75. The lower pair
remain at local X +/-105, Y -63.

The earlier panel-relief option is superseded by the corrected cover geometry.
The later screen-seat change below does require both fixed panel halves to be
reprinted; no drilling or shell change is required.

## Screen seat

The measured 193 x 110 x 6.04 mm display drops into the existing 196 x 112 mm
carrier cavity. A 2 mm-thick underside ledge begins nominally 6.04 mm below the
panel top and has a 187 x 104 mm through-opening. A 0.02 mm modeled Z clearance
keeps the glass from holding the cover above the panel. This leaves 3 mm of
support beneath every screen-body edge and places the display front essentially
flush with the panel. The M1 Display / Status cover then spans the screen
perimeter and locks it in place when its four screws are tightened evenly.

Install the display from the top after joining the two fixed panel halves. Feed
the display cable through the 187 x 104 mm center opening, lower the display
onto the ledge without forcing it, place the M1 cover over it, and tighten the
four M1 screws in a diagonal pattern until the cover is seated. Do not use the
cover screws to force a screen that does not sit freely in the carrier cavity.

This change requires reprinting both `panel_L.stl` and `panel_R.stl` as well as
the revised M1 cover selected from the production choices above.

## Lineage

The approved RP08 front-control geometry was recovered from source tag
`model-rp08-source` (`front_controls_rp07.scad`). RP09 reproduces those proven
dimensions in `front_faces_rp09.scad` and changes only the visible text system.
