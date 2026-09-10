# Apache 2800 RP08 release

RP08 is the current approved release. It promotes the physically approved
converter layout, T02-E master-switch opening, and T02-P3 dial shoulder pocket.
It also packages the carrier and drill guide for the measured 132.55 x 75.62 mm
rear flat recess.

## What to print now

1. Print `stl/carrier.stl` and dry-fit it in the rear recess before drilling.
2. Install the XT60 inlet, master rocker, and dial in the carrier and verify lid,
   hinge, rib, terminal, and wire-bend clearance.
3. Print `templates/layout_template.stl` only when a rigid transfer template is
   useful. The letter-size paper guide is `guides/rear-drill-guide-letter.pdf`.
4. Print `stl/tray_L.stl` for the approved converter spacing and 12 x 42 mm
   shared power-drop slit.

Do not drill until the paper guide's 100 mm bar, 25 mm square, and
132.55 x 75.62 mm trim boundary measure correctly at 100% print scale.

## Package contents

- `stl/`: 17 production parts.
- `templates/`: optional rigid drill-transfer template.
- `guides/`: electronics placement, wire routing, and rear drilling documents.
- `previews/`: assembly, controls, tray, and rear-carrier identification images.
- `validation/`: RP08 mesh, clearance, inheritance, and panel/shell evidence.
- `RELEASE_NOTES.md`: exact RP08 geometry changes.
- `manifest.json`: source tag plus file sizes and SHA-256 checksums.

Calibration coupons, editable source, export scripts, and generated logs are not
part of this release. Recover the exact editable source using the
`model-rp08-source` Git tag.

## Known validation note

RP08 remains the current release. The rear carrier and paper drill guide retain
the documented physical case dry-fit note; complete that check before drilling.
