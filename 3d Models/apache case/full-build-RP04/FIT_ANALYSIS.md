# RP02 fit analysis — CAD candidate

New shared rear layout includes all three measured components. Millimetres,
physical case floor Z0, rear +Y. `check_clearances.py` reads RP02 dimensions
and RF02 fuse/tray values and writes `exports/clearances.json`. Negative axis
overlap means separation; it is not a Euclidean minimum-distance calculation.

| Check | Result from design dimensions |
|---|---:|
| Dial 31 mm service envelope to fuse right side, X | 3.5 mm |
| Switch service depth incl. 15 mm wiring to floor Pi rear, Y | 6.925 mm |
| XT service depth incl. 15 mm wiring to floor Pi rear, Y | 8.925 mm |
| Lowest rear body/service window above tray | 6.5 mm |
| Lowest carrier nut relief above tray | 1.5 mm — tight, verify physically |
| Dial and switch service windows, X separation | 9.5 mm |
| Switch and XT windows, X separation | 7 mm |
| Fuse top to panel underside | 26 mm |

Dial body starts at carrier back Y117.5, ending Y101.5; provisional wiring
extends to Y86.5. The lateral separation from the fuse prevents collision even
where their Y/Z ranges overlap. The carrier pin passes through into the larger
case opening; test the 3 mm plate, thread/nut engagement, and pin orientation.
Only the bushing and pin penetrate the carrier itself, not the 27 mm dial body.

The removable carrier places its small gripping holes outside the case wall;
larger layout-template openings behind it admit the rocker clips and dial body.
There is no verified screw length, waterproof seal, or real hinge sweep check.
The 1 mm wall estimate and Y117.5 location are from a rough third-party STEP.
**Do not use the template to drill until checked against the actual case.**

The mesh validator checks every export's closed edges, winding, connectedness,
nondegenerate triangles and 256 mm build-volume limits. These tests do not
establish printed strength, slicer support quality or mating fit.

The inherited top panel, screen plate and tray are bundled, not redesignated as
physically approved. RF02 tray binding remains unresolved. No measured fan is
available, so there is no new airflow or thermal result. External PSU remains
outside the box; the existing fuse block remains on its recessed support.

Previews: [internal assembly](exports/assembly.png),
[exploded full build](exports/exploded.png), [rear plate](exports/rear_face.png).
For purchased parts and fastening assumptions see [BOM](../BOM.md) and
[print quantities and gates](README.md).
