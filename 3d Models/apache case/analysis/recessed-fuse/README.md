# RF02 — recessed fuse insert candidate

**Revision 0.2 — 2026-09-04. Test candidate, not production fit approval.**

This is the new lower-support / shell / upper-tray design. It keeps the existing
84 x 124 x 40 mm six-circuit fuse block. Production Rev 5 and the old tray are
preserved; do not mix the old tray with this fuse installation.
See [main design record](../DESIGN_DOCUMENT.md), [BOM](../BOM.md), and
[version workflow](../../VERSIONING.md).

## Print first

From [exports](exports/), print one each:

1. **test_FL.stl** — front-left lower shell and fuse support, 16 mm high.
2. **test_RL.stl** — rear-left lower shell and fuse support, 16 mm high.
3. **lower_joiner.stl** — links the lower supports across their seam.

Use millimetres, 100% scale, flat floor down. No support is designed beneath the
new floor ribs; inspect the inherited curved shell in the slicer. The upper-wall
profile still requires its existing upper-fit gauge check. Do not force a tight
assembly into the case.

Check the two supports sit flat without rocking on case molding, all four fuse
holes align, screw tips cannot reach the case floor, the seam closes without
force, and the cover, terminals and wires remain accessible. The blue block in
the preview is a component reference, not a printed part.

## Full candidate set (after tests)

| File | Qty | Purpose |
|---|---:|---|
| shell_FL / shell_FR / shell_RL / shell_RR.stl | 1 each | Full-height shells WITH integrated open lower ribs; no separate lower tray required |
| tray_L / tray_R.stl | 1 each | Upper equipment tray with recessed fuse opening |
| lower_joiner.stl | 1 | Left lower seam connection |
| tray_joiner.stl | 2 | Front and rear upper-tray seam connections, using existing chassis bosses |

FL/FR are handle/front side; RL/RR are hinge/rear side. Left/right are viewed
from the handle. Recessed RF02 labels identify this candidate and line marks
identify matching seams. The inherited R5 rail marks identify the unchanged
outer-interface revision. All shells are individual corner prints.

## Geometry and mounting

- Fuse center: X=-91, Y=30 mm; all coordinates centered on the chassis footprint.
  This is 5 mm behind the initial study position, retaining at least 6 mm
  between the fuse body and converter bank and 5.7 mm of tray material from
  the nearest converter screw-hole edge to the pocket.
- Floor ribs start at Z=0 and are 3 mm thick. This replaces the 0.1 study's
  suspended Z=2..5 floor: direct bed contact avoids a large supported overhang.
  The new floor-contact ribs MUST be tested against the real case floor.
- Fuse mounting pads end at Z=6. Hole pitch is 63 x 93 mm.
- Blind 2.7 mm pilots are provisional for M3 screws suitable for plastic, leaving
  a 1.5 mm solid base. Use washers at the fuse block's measured 4.78 mm holes.
  **Not heat-set holes.** Do not drive screws through the base; choose lengths
  from the actual fuse mounting-flange thickness and remaining engagement.
  Test a pilot before loading the mount; these fasteners are not finalized.
- Lower connector is 2 mm thick at installed Z=6..8, with two 3.4 mm clearance
  holes on 20 mm centers. It screws into the blind lower-rail pilots.
- Upper tray remains at Z=15.5..17.5 with the existing eight seam-boss locations.
  Two front/rear tray joiners go above it. Upper fastener lengths remain subject
  to actual insert engagement; retain the existing mounting hardware scheme.
- Tray pocket is 92 x 132 mm: 4 mm/side around the body. This is NOT yet a
  validated terminal/tool envelope. Cable exits are beside the pocket; clip
  leads along the open lower lanes and keep them away from seam screws.
- Under-tray clearance is 12.5 mm above ordinary 3 mm ribs, 9.5 mm above the
  6 mm lower spine, and 7.5 mm above its connector. Wires do not run beneath
  the fuse mounting pads.

## Analysis and limits

Fuse top is 46 mm above the floor, versus 57.5 mm previously. The nominal
panel-underside clearance increases from 14.5 to 26 mm. The fuse body remains
6.5 mm laterally separated from the modeled screen Pi; wiring is not included.
The fuse still occupies its original footprint, with the tray surrounding it.

The added ribs' maximum X extent is 142 mm, inside the production shell's
143.194 mm half-width at the floor. Their rear extent is at most 88 mm from
the center, away from the floor corner transitions. The imported STEP remains
approximate: its existing disagreement with the validated shell is NOT resolved
by this design. No new exact STEP collision calculation or thermal simulation
has been performed for RF02.

Open ribs preserve paths for under-tray wiring and airflow, but no airflow rate
or thermal performance is certified. Fuse-cover removal still requires removing
the fixed control panel. Check side-lug bend space, cover lift, wire bundles,
floor molding and screwdriver access with the real block before full printing.

The exporter checks OpenSCAD's Simple result and errors. Run
`python validate_candidate.py` after export to check all ten expected meshes,
build bounds, closed edges, winding and single connected bodies. Its output is
`exports/validation.json`. These checks do not replace slicer or physical tests.

## Version history

- 0.2 / RF02: Added four integrated-shell CAD parts, two upper trays, lower
  connector, inherited upper connector, and two 16 mm left-support tests.
  Lower floor changed from suspended 2..5 mm to flat 0..3 mm ribs. Positive left
  seam connection and blind screw pilots added. Production geometry not promoted.
- 0.1: Recessed mounting feasibility and nominal 11.5 mm height recovery.
