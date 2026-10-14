# Plinko Pi case

A case for the Raspberry Pi 3 Model B and its screw-terminal breakout, mounted on the back of the
Plinko board. It is parametric (`plinko_pi_case.scad`) and unverified: the values marked with `*`
in the SCAD are placeholders until they are measured on the real parts.

**Status: draft.** The wing test passed (2026-10-14): the 90.83 mm screw spacing and the slot size are
confirmed on the board. The first fit tray (2026-10-15) confirmed the Pi, the standoffs and the power and
SD cut-outs; the breakout sticks out past its top wall, so the top overhang `bo_over_y` is being
measured and the tray was enlarged to include the breakout's room.

## Parts

| File | What |
|---|---|
| `exports/stl/plinko_pi_base.stl` | The case: floor, walls, four Pi standoffs, lid posts, cable entry, port cut-outs and two mounting wings (flat at the back, in the board plane). 108.8 x 105 mm with wings. |
| `exports/stl/plinko_pi_lid.stl` | The lid, four M3 screws into heat-set inserts in the corner posts. Vent slots over the terminals. |
| `exports/stl/plinko_pi_fit_tray.stl` | Fit test: the Pi footprint with standoffs, low walls and the power and SD cut-outs. Confirms the Pi seats and the screws pick up. |
| `exports/stl/plinko_pi_wing_test.stl` | Fit test: a plate with the two countersunk slots at the screw spacing. Hold it to the board over the peg screws. |

## How it mounts

The base's flat back sits against the board. The peg screws are only 90.83 mm apart, so they are
under the case's 108.8 mm width; the wings therefore go out along the case's **short** side, one
above and one below it, in the board plane, each with a slot over a screw. The slots are
countersunk on the outer face for the **#8 flat-head** screws, so a screw drives through the tab and
clamps it to the board. Remove each existing peg screw, put the tab on, and re-drive it. If the board
screw was flush, the replacement needs to be about 3.6 mm longer (the tab thickness). Slots are 6 mm
long in the direction between the screws, so the spacing need not be exact.

## Layout (Pi on its standoffs, GPIO header on the top edge)

- **Top (+Y) wall:** wide cable entry (6 cables) with zip-tie slots on either side for strain relief.
- **Bottom (-Y) wall:** micro-USB power.
- **Left (-X) wall:** SD card.
- **Right (+X) wall:** window over the USB and Ethernet end (`open_usb_end`).
- **Lid:** vents over the terminals; floor vents under the Pi.

## Values to confirm (the `*` parameters)

| Parameter | Now | Check |
|---|---|---|
| `bo_h` | 22.57 mm (measured) | Height of the breakout above the Pi's PCB, terminals included. |
| `bo_left_over` | 9.96 mm (measured) | How far the breakout sticks out past the Pi's left (SD card side) edge. |
| `bo_x1` | header end + 1.5 mm | Where the breakout ends on the right. Not measured yet. |
| `bo_over_y` | 12 mm (estimate) | How far the breakout reaches past the top PCB edge, to its outer face. The first fit tray showed it is more than 4 mm. **Measure this.** |
| `screw_spacing` | 90.83 mm (**confirmed**: wing test fits the board) | Centre-to-centre of the two peg screws to mount on. |
| `screw_shank_d`, `screw_head_d` | 4.17, 8.1 mm (#8, **confirmed** with the wing test) | The screw the wing goes over. |

## Export

```powershell
.\export_parts.ps1                 # all four parts, validated, with snapshots
.\export_parts.ps1 -SkipSnapshot   # quick iteration
```
