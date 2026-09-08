# Full build RP06 — verified shell pockets and retained safety LEDs

RP06 is a complete, self-contained print set. It carries every unchanged RP05
item forward and changes only the four shell quadrants and `safety_face.stl`.
The passed RP05 coupons authorize the d9.6 mm shell pockets at all ten panel-boss
collision points. Panel L/R, their ribs, their screw locations, and all four
module faceplate mounting patterns remain unchanged.

## Print now

1. Print `exports/led_clip_coupon.stl` and push one supplied 5 mm LED into it
   from the visible/front side.
2. If the LED seats without excessive force and the split collar retains it,
   print `exports/safety_face.stl`.
3. The shell coupon test has already passed, so print the revised
   `shell_FL.stl`, `shell_FR.stl`, `rear_L.stl`, and `rear_R.stl` when replacing
   the current shell set.

No tray, panel half, joiner, rear-power part, switch face, activity face, or
screen face needs to be reprinted for this revision.

## RP06 changes

- Ten d9.6 mm rounded relief pockets were added to the top shell rail at the
  measured panel-boss centers: six front, two side, and two rear contacts.
- The four safety LEDs moved below the covered safety switches. Left-to-right
  order remains RED, BLUE, GREEN, ORANGE.
- LED panel openings increased from nominal d5.0 to d5.6 mm. The prior nominal
  d5.0 opening printed d4.59; the new size compensates for that printer bias.
- Each LED opening has a 3 mm-high split retaining collar on the rear. It acts
  as a flexible friction clip and as a shallow glue well if needed.
- All revised parts retain recessed revision/orientation identification.

For a loose LED, use one small removable dab of neutral-cure silicone or hot
glue at the rear collar after wiring. Do not flood the LED leads or front lens.

## Lineage

- Shell FL/FR/rear L/rear R and safety face: RP06.
- Left equipment tray: RP03 staggered-converter routing update.
- Switch and activity faceplates: RP04 fit corrections.
- All other production STLs: carried unchanged through RP05 from their prior
  validated revision.
- RP05 shell-pocket coupons and reports remain in this folder for traceability.
