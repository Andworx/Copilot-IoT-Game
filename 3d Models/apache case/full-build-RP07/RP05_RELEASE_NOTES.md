# Full build RP05 — panel fastener review set

RP05 is a complete review folder created after the two large ribbed panel halves
were found to collide with screw bosses at the shell's top support rail. It
carries forward the complete validated RP04 print set, including the RP03
routed left tray and the three RP04 faceplate fit corrections.

No production geometry has been changed in RP05 yet. Read
`PANEL_FASTENER_REVIEW.md` before printing another large panel half or shell.
The corrected review identifies ten module bosses that intersect the front,
side, or rear shell rail by design. Three fit coupons are now available in
`exports/panel-shell-coupons/`.

## Carried-forward printable set

- `exports/` contains all 24 RP04 printable STLs.
- `tray_L.stl` is the RP03 staggered-converter tray carried into RP04.
- `safety_face.stl`, `switch_face.stl`, and `activity_face.stl` contain the RP04
  fit and LED-layout corrections.
- Every remaining STL is inherited unchanged from RP02.

The copied files are retained so this folder is self-contained. The earlier
RP02, RP03, and RP04 folders remain unchanged and are not superseded until the
RP05 physical decision gate is resolved.

## Current action

Print the three small shell-pocket coupons and test them with an existing panel
half. Do not force `panel_L` or `panel_R` into the shell. The preferred fix preserves
all panel and faceplate hole locations and adds ten localized rounded pockets
to the shell rail. Front and rear rail coupons should be printed before any
full shell pieces are regenerated. Moving all screw locations or removing the
bosses without replacement is not recommended.
