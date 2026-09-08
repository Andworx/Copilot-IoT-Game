# Apache 2800 complete print set — RP04

**Revision RP04 — 2026-09-05. Faceplate fit correction candidate.**

This folder is the complete current printable set. It carries the RP03 left tray
forward and copies every other unchanged printable part from RP02. The prior
revision folders remain intact.

## Parts changed in RP04

| File | Qty | Change |
|---|---:|---|
| `exports/safety_face.stl` | 1 | Safety-switch holes increased from 11.62 to 12.0 mm nominal; four 5 mm LEDs moved into one row across the top |
| `exports/switch_face.stl` | 1 | Keyed-switch holes increased from 11.5 to 12.0 mm nominal; proven rocker holes remain 20.35 mm |
| `exports/activity_face.stl` | 1 | Four proven 15.6 mm cable-socket holes retained; LED holes removed |

The RP02 safety hole printed at 11.45 mm and the keyed hole printed at 11.20 mm.
The new nominal values compensate for those observed undersizes. Test both real
components before final assembly.

The LED row is ordered left-to-right **red, blue, green, orange**. Each hole
remains 5.0 mm nominal. The cable socket and circular rocker geometry is not
changed because both passed the physical fit test.

## Complete set lineage

- `tray_L.stl`: carried forward from RP03, including staggered converters and
  the three under-tray power-wire drops.
- `safety_face.stl`, `switch_face.stl`, `activity_face.stl`: RP04.
- All remaining STLs: exact RP02 exports copied into this revision folder.

All changed faceplates retain recessed part labels, FRONT orientation markings,
and an RP04 revision mark. Unchanged parts retain their original accurate RP02
or RP03 etched revision marks.

Run `export_rp04.ps1` to rebuild the complete folder, export the three changed
faceplates, render the comparison preview, validate all 24 meshes, and create
the required version snapshots.

## Print recommendation

Only the three changed faceplates need reprinting. Use millimetres, 100% scale,
and the same material and slicer compensation used for the failed-fit samples.
Do not force the threaded safety or keyed switch bodies into an undersized hole.

