# Rear-control calibration T01

This is a test-only package. It does not modify or supersede RP07 production
geometry. Print both coupons at 100% scale in millimetres using the same printer,
material, layer height, wall settings, and orientation intended for the final
rear carrier.

## 1. Power-switch coupon

Print `exports/switch_coupon.stl` flat with the recessed labels facing up. Test
the switch in order A, B, then C:

- A: 22.4 x 27.8 mm
- B: 22.8 x 28.2 mm
- C: 23.2 x 28.6 mm

Stop at the smallest opening where the switch fully seats, both retaining clips
snap out behind the 3 mm plate, and the bezel cannot rock or pull through.
Report the letter. If C does not pass, stop; do not file the test or enlarge the
production carrier without another calibration coupon.

## 2. Dial-register coupon

Print `exports/dial_coupon.stl` flat with `PIN UP` readable. The main bushing
opening remains the current 9.67 mm. The 3.6 mm-wide vertical slot covers pin
center offsets from 7.5 through 10.5 mm, with recessed ticks every 0.5 mm.
The lower endpoint is labelled `7.5` and the upper endpoint `10.5`; count the
seven ticks upward in 0.5 mm increments.

Insert the dial from the rear with its register pin toward `PIN UP`. Seat the
bushing fully and report the tick nearest the center of the pin protruding
through the front. The current production hole is at 9.83 mm.

## Promotion gate

After both results are reported, create full-build RP08 from RP07. Use the
smallest passing switch opening and replace the calibration slot with a round
pin hole at the reported offset. The existing shell/case service openings are
30 x 36 mm for the switch and diameter 31 mm for the dial; retain them if the
winning geometry remains contained. Regenerate the drill guide and its geometry
record so the carrier dimensions and pin offset are documented even when the
case-cut outlines do not change.
