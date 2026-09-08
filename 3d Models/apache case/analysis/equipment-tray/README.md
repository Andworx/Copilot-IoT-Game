# Removable APACHE equipment tray — revision 0.3

This folder contains the first printable mounting-tray design for the measured
electronics. It is intentionally separate from the production chassis while
the tray and closed-lid height are being physically validated.

## Architecture

- Two 145.3 x 214 x 2 mm ventilated tray halves fit the Bambu Lab X1 Carbon.
- The halves sit on the eight existing chassis seam bosses, 15.5 mm above the
  APACHE floor. The design does not drill through the case floor.
- Each tray half replaces its side's former front/rear chassis seam joiner.
  Narrow front and rear cross-joiners fasten the two halves together using the
  existing center seam inserts.
- The measured Blue Sea 5025, floor Pi/GPIO assembly, and three converters use
  their measured mounting patterns.
- The 12 V / 15 A supply is now external. Power enters through a future XT60
  interface and a 12 V master switch, so this tray contains no internal mains
  supply or AC wiring.
- The floor Pi/GPIO assembly sits at X = +92 mm, Y = +38 mm on the open
  right-hand tray area. Its original
  center position was retired after correct tray elevation exposed a collision
  with the Pi mounted behind the display.
- Every tray half is etched `TRAY-L/R R5`, carries a front arrow, and has paired
  center-seam witness lines. Cross-joiners are etched `TRAY-J` with a centerline.

## Print files

Run `export_equipment_tray.ps1`. It generates:

- `tray_left.stl`
- `tray_right.stl`
- `tray_cross_joiner.stl` — print two
- `fit_coupon.stl` — print this first
- `assembly_preview.png`

The full tray selector is a CAD reference and exceeds the X1C bed. Only the
split halves are production-print candidates.

## Installation concept

1. Print the fit coupon and one cross-joiner.
2. Confirm the intended M2.5, M3, converter, and fuse hardware clears the coupon.
3. Install device screws upward through each tray half before placing it in the
   case. Use low-profile heads and insulating washers where required.
4. Remove the four former side seam joiners. Set each tray half directly on its
   four chassis seam bosses and fasten it into those existing inserts.
5. Install one narrow cross-joiner above the tray at both the front and rear
   center seam bosses. These joiners and the tray use the same insert locations.
6. Install the measured low-voltage components only after confirming terminal,
   cover-removal, connector, and wire-bend access in the case.

## Required physical checks

- Measure the arriving XT60 interface and 12 V master switch before designing
  or drilling their case-wall mounts.
- Confirm the tray clears the full-width inner opening above the curved lower
  rail and that every seam boss lands flat without twisting either half.
- Measure the actual insert depth, washer stack, and required tray/cross-joiner
  screw lengths.
- Confirm fuse-cover removal, terminal access, connector insertion, wire bends,
  and cable-tie paths with every component installed.
- The tray top is 17.5 mm above the case floor. Removing the internal PSU
  eliminates the former PSU/key-switch collision and the abandoned 92 mm
  chassis-height candidate. The 77 mm chassis still requires a closed-lid
  witness test with the screen and tallest controls installed.
- Use PETG, ASA, or another heat-tolerant material for the final tray. PLA is
  acceptable only for dimensional coupons, not unattended powered operation.
