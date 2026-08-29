# Standalone final fit test

This is the final low-height fit frame before updating the production chassis.
It remains separate from Rev 3.

## Proven dimensions represented

- Width: **306.3875 mm** (12-1/16 inches)
- Front span: **113.975 mm**, labeled `F 227.95`; this is 0.50 mm shorter
  than the slightly bowed final-fit print
- Rear span: **115.475 mm**, selected by `R 230.95`
- Assembled depth: **229.45 mm**
- Height: **12 mm**

The frame uses the same 21.5 mm corner radius and six-stage 12 mm bevel as the
successful test pieces.

## Print list

For this correction, reuse the existing rear quadrants and all four connectors.
Reprint only:

- `front_left.stl`
- `front_right.stl`

For a completely new set, also print one each:

- `rear_left.stl`
- `rear_right.stl`

Print two each:

- `pin_joiner_x.stl` for the front and rear center seams
- `pin_joiner_y.stl` for the left and right side seams

Print connectors pins-up. Flip them pins-down during assembly. Close every seam
fully before testing the frame in the case.

Each quadrant is recessed with its position, selected front/rear calibration,
and width. The connectors are recessed `JOIN X` or `JOIN Y`. Labels are on the
inside/top surfaces and do not change the case-contact dimensions.

The assembled frame must sit on the flat case floor without bending, springing
up, or requiring force. If it passes, use **306.3875 x 229.45 mm** as the Rev 4
production footprint.
