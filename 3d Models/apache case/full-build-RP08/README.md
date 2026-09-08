# Full build RP08 - approved controls and measured rear recess

RP08 is a complete copy-forward of RP07. It promotes the physically approved
converter layout, T02-E master-switch opening, and T02-P3 dial shoulder pocket.
The rear carrier and drill guide now use the measured 132.55 x 75.62 mm rear
flat recess. See `RP08_RELEASE_NOTES.md` for exact geometry.

## Print now

1. Print `exports/carrier.stl` and dry-fit it in the rear recess without drilling.
2. Install the XT60 inlet, master rocker, and dial in the carrier and confirm
   the lid/hinge, ribs, terminals, and wire bends remain clear.
3. Print `exports/layout_template.stl` only if a rigid transfer template is
   desired. The PDF drill guide is in `installation-guides/output/pdf`.
4. Print `exports/tray_L.stl`; it contains the approved converter spacing and
   the full 12 x 42 mm shared cable slit.

Do not drill until the 100 mm bar, 25 mm square, and 132.55 x 75.62 mm red
trim boundary on the paper guide all measure correctly.

## RP07 history

RP07 is a complete, self-contained carry-forward of RP06. The physically proven
shared cable slit is retained. Dry-fit feedback updates the converter mounting
positions, screen/safety LEDs, M3 key/rocker positions, and M4 cable-match
opening. Every unrelated RP06 STL remains byte-identical.

## Print first

Print `exports/converter_bay_coupon.stl` at 100% scale in millimetres. Install
both USB-C converters and the Micro-USB converter together, using their actual
mounting tabs and input/output cables.

The coupon passes when:

- all six mounting points align without forcing;
- all three red/black input pairs reach and pass through the shared slot;
- no lead is trapped beneath a converter;
- all three USB output connectors remain serviceable; and
- the 9 mm bridge beside the fuse-cavity edge remains acceptably stiff.

The earlier coupon proved the shared slit, but the Micro-USB body exposed a
plan-view spacing error. Print the revised coupon before replacing the full
tray. After physical approval, print `exports/tray_L.stl`.

## Design change

- USB-C1 moves 2 mm left. USB-C2 moves 0.5 mm down. Micro-USB moves 4 mm toward
  the shared slit and 3 mm down.
- The Micro-USB plan-view width is corrected from 14 mm (its thickness) to the
  measured 27 mm body width. The revised layout retains 4.5 mm to USB-C2 and
  4.5 mm to the shared slit.
- Converter mounting pitch and hole diameters remain unchanged.
- Three inaccessible 12 x 7 mm drops beneath the converter bodies are removed.
- The two former general exits at X -30 are replaced by one accessible rounded
  12 x 42 mm `POWER DROP` centered at X -30, Y -52.
- The slot retains 9 mm to the fuse cavity and 23.8 mm to the center seam.
- Two neighboring vent cells are suppressed to leave a smooth slot perimeter.
- Route the three input pairs over the tray to the shared slot, then under the
  tray into the adjacent fuse-block cavity. Add abrasion protection at the slot.

## Front-control updates

- `screen_face.stl`: the four retained 5 mm LED collars move to a centered row
  above the display opening, left-to-right RED, BLUE, GREEN, ORANGE.
- `safety_face.stl`: all LED holes and collars are removed; only the two proven
  12 mm guarded-switch openings remain.
- `switch_face.stl`: both keys and both circular rockers move upward 10 mm as a
  group. Their 23 mm row pitch and proven opening diameters remain unchanged.
- `activity_face.stl`: the four sockets keep their 36 mm row pitch but the bank
  moves upward 8 mm to centers Y +18/-18.
- `panel_R.stl`: the M4 service window grows from 66 x 50 to 66 x 60 mm. This
  exceeds the physically requested 59 mm height while retaining 7 mm plate
  overlap above and below.

Print only these changed production parts after reviewing the previews:

1. `exports/tray_L.stl` after its revised coupon fits all converters.
2. `exports/screen_face.stl`
3. `exports/safety_face.stl`
4. `exports/switch_face.stl`
5. `exports/activity_face.stl`
6. `exports/panel_R.stl`

## Lineage

- Left tray, converter coupon, four front faces, and panel R: RP07B update.
- Shell quadrants: RP06.
- Remaining production parts retain their prior validated geometry.
