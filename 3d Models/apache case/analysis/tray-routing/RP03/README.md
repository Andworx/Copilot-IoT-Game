# RP03 — left-tray converter routing update

**Revision RP03 — 2026-09-05. Tray-only physical test candidate.**

This revision changes only the left equipment tray. It preserves the RP02 shell,
rear carrier, right tray, joiners, top-panel halves, and faceplates without
modification.

## Print

This is a historical tray-only test. Print one copy of
`exports/tray_L_RP03.stl` at 100% scale in millimetres only when reproducing the
RP03 experiment. The original RP02 comparison set is available through the
`model-rp08-source` Git tag. For the assembled system, use the current
`releases/RP08` production package instead.

The recessed labels `TRAY-L RP03` and `FRONT`, plus the two seam witness marks,
identify and orient the replacement part. FRONT is the handle side of the case.

## What changed

- The two 25 W USB-C converters and the 15 W Micro-USB converter retain their
  RP02 X order but use Y centers of -66, -73.5, and -70.5 mm. The resulting
  7.5 mm alternating stagger prevents the three bodies from forming one crowded
  straight row.
- A rounded 12 x 7 mm drop slot is centered between the two mounting holes for
  each converter. Feed that converter's red/black 12 V input pair through its
  slot before fastening the converter. Route the pair under the tray and up into
  the adjacent fuse-block cavity.
- Fuse pocket, overall tray outline, thickness, tray mounting holes, seam marks,
  ventilation field, and the existing two general cable exits are unchanged.

The slot is deliberately underneath the converter envelope: this hides and
protects the pair and avoids weakening the narrow material at the fuse pocket.
Confirm that the real wire exit direction can make the bend without pinching.
Use a grommet or edge protection if the selected wire insulation can rub on the
printed slot edge.

## Validation

Run `export_tray_rp03.ps1` to export the STL, render the assembly preview, run
mesh checks, and create required before/after model-version snapshots. The
validator checks a single closed, consistently wound body, printer bounds,
converter separation, fuse-envelope clearance, stagger, and slot count.

This is not physical-fit approval. Test the replacement left tray with all three
converters and their actual input leads before final wiring.
