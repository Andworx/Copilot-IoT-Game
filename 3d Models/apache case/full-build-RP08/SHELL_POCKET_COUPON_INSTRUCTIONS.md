# RP05 shell-pocket coupon test

Print one each of the following files from `exports/panel-shell-coupons/`:

1. `coupon_front.stl` — straight front-rail collision.
2. `coupon_rear.stl` — rear screen-boss collision including the nearby panel
   mounting hole.
3. `coupon_corner.stl` — combined front/left side-rail collision.

Use millimetres, 100% scale, and place the flat 8 mm face on the build plate.
No supports are intended. The coupons are extracted from the actual RP05 shell
top rail; they are gauges only and are not installed in the case.

The pocket is 9.6 mm for the printed 9 mm panel boss, providing 0.3 mm nominal
radial clearance. Recessed `F`, `R`, or `C` text identifies each coupon and the
`IN` direction points toward the electronics cavity.

## Test

- Use an existing large panel half; do not print another panel.
- Place the matching underside boss into the coupon pocket while the flat panel
  underside rests on the coupon's top rail surface.
- The boss must enter without force, the panel must reach the flat seating
  datum, and the coupon must not rock or spread.
- Test at room temperature and remove any brim/elephant-foot material first.
- Record pass, snug, or fail for all three coupons. If snug or failed, measure
  the printed pocket and boss diameters before changing CAD clearance.

Do not print revised shell quadrants until all three coupons pass. A passing
test authorizes applying the same localized pocket geometry at the ten modeled
boss/rail intersections; it does not independently approve overall shell fit.

