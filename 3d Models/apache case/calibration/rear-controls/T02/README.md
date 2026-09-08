# Rear-control calibration T02

This is a test-only package responding to the physical T01 failures. It does
not modify or supersede RP07 production geometry. Print both coupons at 100%
scale in millimetres using the same material, layer height, wall settings, and
orientation intended for the final 3 mm rear carrier.

## 1. Power-switch coupon

Print `exports/switch_coupon.stl` flat with the recessed labels facing up. T01
A-C all failed, so T02 continues with larger openings:

- D: 23.4 x 29.2 mm
- E: 23.6 x 29.8 mm
- F: 23.8 x 30.4 mm

Test D, then E, then F. Stop at the smallest opening where the body enters
without forcing, both clips compress through the opening and snap behind the
3 mm plate, and the bezel remains seated without rocking. Do not file the
coupon. If F fails, stop and report where the interference occurs.

## 2. Dial-shoulder coupon

Print `exports/dial_shoulder_coupon.stl` flat with the recessed `REAR` labels
facing up. Insert the selector from that labelled rear face with its register
pin toward `PIN UP`. All candidates retain the 9.67 mm bushing opening and the
7.5-10.5 mm register-pin slot; they add pockets for the previously recorded
17.72 mm circular shoulder:

- P1: diameter 18.2 mm, depth 0.8 mm
- P2: diameter 18.6 mm, depth 1.4 mm
- P3: diameter 19.0 mm, depth 2.0 mm

Test P1, then P2, then P3. Report the smallest pocket where the circular
shoulder enters and the selector sits flat without rocking. Also report the
nearest register-pin tick: the bottom tick is 7.5 mm and each tick upward adds
0.5 mm through 10.5 mm. If the shoulder cannot enter any pocket,
stop: its recorded 17.72 mm diameter must be remeasured before production.

## Promotion gate

After the switch letter and dial-pocket number pass physically, create the next
full production revision from RP07. Update the rear carrier first, then verify
the existing 30 x 36 mm rocker and diameter 31 mm dial shell service envelopes.
Regenerate the drill guide only after the carrier geometry is final. The shell
and case drill outlines need not change if the successful component geometry
remains wholly inside those service envelopes.
