# Plinko Pi case

A case for the Raspberry Pi 3 Model B and its screw-terminal breakout, mounted on the back of the
Plinko board. It is parametric (`plinko_pi_case.scad`) and unverified: the values marked with `*`
in the SCAD are placeholders until they are measured on the real parts.

**Status: draft, not printed.** Print `plinko_pi_wing_test.stl` and `plinko_pi_fit_tray.stl` first;
do not print the base and lid until both pass.

## Parts

| File | What |
|---|---|
| `exports/stl/plinko_pi_base.stl` | The case: floor, walls, four Pi standoffs, lid posts, cable entry, port cut-outs and two mounting wings (flat at the back, in the board plane). 178 x 75 mm with wings. |
| `exports/stl/plinko_pi_lid.stl` | The lid, four M3 screws into heat-set inserts in the corner posts. Vent slots over the terminals. |
| `exports/stl/plinko_pi_fit_tray.stl` | Fit test: the Pi footprint with standoffs, low walls and the power and SD cut-outs. Confirms the Pi seats and the screws pick up. |
| `exports/stl/plinko_pi_wing_test.stl` | Fit test: a plate with the two wing slots at the screw spacing and the head pockets. Hold it to the board over the peg screws. |

## How it mounts

The base's flat back sits against the board. The two wings reach out either side at the same level
and carry a slot each, over the screws that hold down the pegs, so the case is held at the centre of
the back of the board. Slots are long in X (8 mm), so the spacing need not be exact. A pocket on the
board side of each slot clears the screw head.

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
| `bo_over_y` | 3 mm | How far the breakout overhangs the top PCB edge. Not measured yet. |
| `screw_spacing` | 150 mm | Centre-to-centre of the two peg screws to mount on. |
| `screw_shank_d`, `screw_head_d`, `screw_head_h` | 4, 8, 2.5 mm | The screw the wing goes over. |

## Export

```powershell
.\export_parts.ps1                 # all four parts, validated, with snapshots
.\export_parts.ps1 -SkipSnapshot   # quick iteration
```
