# RP01 — measured rear XT60 and master switch

Candidate 0.1. Authoritative working folder: this directory in the main repository.
The user reported the recessed fuse cavity looks good; this does not resolve the
previous upper-tray binding or confirm the full installed assembly.
Production files and RF02 files are preserved. [RF02](../recessed-fuse-study/README.md)
remains the source for front shells, trays and lower supports.

## Print first — no case cutting yet

Print **xt_coupon.stl** and **switch_3.stl**, one each, 100% scale, flat face down.
If the rocker will not latch securely, compare switch_1, switch_2 and
switch_3_27 (numbers are coupon thickness in mm). Test without power.
The measured 3.27 mm clip gap is not a manufacturer's thickness specification.

Then test **carrier.stl** with both parts installed. The **layout_template.stl**
is an unapproved positioning aid for the case exterior, not permission to drill.
Verify case rib/hinge clearance with the lid open AND closed, true wall thickness,
alignment with the inner shell, and nut/terminal access before any cutting.
The approximate downloaded model suggests only 1 mm case wall here; the real
case may differ. Removing wall for the switch's clips also removes weather sealing.
No waterproof rating or structural certification is claimed.

## Measured hardware (mm)

| Feature | XT60 input | Master rocker |
|---|---|---|
| Front plate/bezel W x H | 38.4 x 38.16 | 24.75 x 31.57 |
| Plate thickness | 5.27 | Not separately measured |
| Body passing through wall W x H | 14.2 x 22.12, centered | 21.56 x 27.02 |
| Rear rigid depth | 28 from plate rear face | 30 from seating face, including terminals |
| Front projection | 4 beyond supplied plate face | 9.4 from seating face |
| Hole pitch / diameter | 29.85 x 30.27 / 4.93 | Snap clips |
| Clip gap | N/A | Approximately 3.27 |

Corrections to earlier spoken width/height values are incorporated here.
The XT60's complete exterior projection from carrier is 5.27 + 4 = 9.27 mm.

## Candidate layout and internal changes

All installed coordinates use the physical interior floor as Z=0, chassis
center as X=Y=0, rear/hinge wall at positive Y. Viewed from outside the rear,
positive X appears to the viewer's left. Put the XT60 on that side.

- Both centers Z=45 mm. XT60 X=48; rocker X=0.
- Carrier 106 x 52 x 3 mm, center X=25. Four M3-clearance carrier fasteners at
  X=-22/+72, Z=24/66. Mount through case with washers/nuts; no hidden blind
  fastening or drilling into the insert. Hardware lengths remain unmeasured.
- Carrier switch opening 21.96 x 27.42; XT60 opening 14.6 x 22.52.
  These add 0.2 mm/side print clearance. M4 clearance holes 4.5 mm follow the
  measured XT60 pitch. Check with actual bolts before drilling.
- Approximate case outer rear plane Y=117.5, carrier outer face Y=120.5.
  Carrier lies OUTSIDE the case. Switch clips engage only its 3 mm thickness;
  the case positioning template provides a larger 30 x 36 mm clip-access
  window behind it. XT60 case opening is 18.2 x 26.12.
- New **rear_L.stl** and **rear_R.stl** wrap the RF02 rear shells with internal
  passage/service cutouts. Switch service opening is 30 x 36; XT60 opening
  is 40 x 42 to include its nuts without thin webs between separate holes.
  Four carrier nut clearances and identification marks are included.
- Body/service windows start at Z=24; tray top Z=17.5 gives 6.5 mm separation.
  The lowest carrier-nut relief reaches Z=19, leaving only 1.5 mm above the tray;
  confirm the fastener envelope and print tolerances at this location.
  Therefore the lower ribs and tray geometry are unchanged. Existing upper-tray
  binding remains OPEN; do not print replacement trays on the assumption it is fixed.
- Solid switch terminals reach Y=90.5; XT60 body reaches Y=92.5. A provisional
  15 mm wiring allowance extends inward to Y=75.5/77.5. The floor Pi's modeled
  rear edge is Y=68.575, leaving at least 6.925 mm to that allowance.
  Actual insulated spade connectors and wire bends must be measured.
- Fuse remains at X=-91,Y=30, base Z=6. Neither new rear port occupies its
  X range. The old rear rotary-selector position is not redesigned here;
  carrier edge is close to its former envelope. Confirm selector placement
  separately before installing it or making any selector hole.

The external carrier location is a proposed alignment, not a confirmed shared
origin between real case, imported STEP and insert. No new case solid was cut.
No generic scaling or unconfirmed tray resizing was done.

## Files / compatibility

| File | Qty | Use |
|---|---:|---|
| xt_coupon.stl | 1 | First input fit test |
| switch_3.stl | 1 | First clip fit test |
| switch_1 / switch_2 / switch_3_27.stl | Optional | Alternative clip thickness tests |
| carrier.stl | 1 | Exterior hardware carrier after coupon pass |
| layout_template.stl | 1 | Case-positioning aid; confirm physically before cutting |
| rear_L / rear_R.stl | 1 each | Replace RF02 rear shells only after hardware/alignment tests |

No reprint is needed for the unchanged RF02 front shells or lower fuse supports.
Do not mix plain R5 rear shells with installed protruding hardware.
All new printable pieces have recessed identification and/or datum marks.
Existing RF02/R5 markings remain on inherited geometry.

Power stays external 12 V DC, through the XT60/master switch to the existing
fused distribution. Switch terminal function/polarity is NOT inferred from the
photo. Verify its wiring diagram and actual load/wire ratings before energizing.

## Validation and history

Run export_rear.ps1 using PowerShell 7. It creates before/after version snapshots,
exports nine STLs, checks OpenSCAD Simple output, renders the assembly and runs
validate_rear.py for manifold edges, winding, connected bodies and X1C bounds.
The inherited analytical RF02 support checks remain in that validator; rear
clearance assertions live in rear_power.scad. These are not thermal or physical
fit certification. Inspect the slicer and real mounting alignment.

- 0.1 / RP01: Measured hardware captured; external carrier, thickness coupons,
  case positioning aid, rear shell relief, and provisional wiring allowance added.
  Fuse cavity retained. Upper-tray binding unresolved. No production promotion.
