# Standalone front-to-back fit gauge

This calibration print is deliberately separate from the Rev 3 chassis. It
does not change `model_params.scad`, the production STLs, or the existing fit
frame.

The gauge reproduces one complete front-to-back side of the validated Rev 3
lower rail, including both rounded end transitions and the six-stage 12 mm
bevel. It omits the opposite side and most of both cross rails, greatly reducing
material. Rotate the assembled gauge 180 degrees on the case floor to check the
other side.

## Which files to print

Start with `exports/depth_230_95/front.stl`,
`exports/depth_230_95/rear.stl`, and one `exports/pin_joiner.stl`.

- `depth_232_95`: 2 mm shorter than Rev 3
- `depth_230_95`: 4 mm shorter than Rev 3 — recommended first test
- `depth_228_95`: 6 mm shorter than Rev 3

Print only one depth pair initially. Print the connector pins-up. After
printing, flip the connector over and press its pins into the two bosses beside
the center seam. The seam must close before checking the fit.

Every STL is physically labeled. Gauge halves are recessed with `F` or `R`
plus their assembled test depth (for example, `F 230.95`), and the common
connector is recessed with `JOINER`. The markings are on inside/top surfaces
and do not change the case-contact envelope.

Place the curved end of the assembled gauge against the front of the case and
lower the other end without bending it. Repeat after rotating it 180 degrees to
check the opposite side. Record the longest option that seats fully on the flat
floor, lifts out without force, and does not spring upward at either end.

Once that depth is known, update the main project's
`measured_chassis_outer_depth` and regenerate the full Rev 4 model. Do not alter
the main project based only on a loose or unjoined gauge.

Run `export_length_tests.ps1` to regenerate the three choices. Run
`python validate_length_tests.py` afterward to verify their build-volume bounds.
