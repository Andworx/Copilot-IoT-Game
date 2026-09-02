# APACHE 3800 Portable IoT Demonstration System BOM

**BOM version:** 2.2.0

**Last updated:** 2026-09-01
**Design record:** [DESIGN_DOCUMENT.md](DESIGN_DOCUMENT.md)  
**Change history:** [DESIGN_CHANGELOG.md](DESIGN_CHANGELOG.md)

This bill of materials consolidates every physical item currently described as
purchased, used, modeled, planned, or required by the APACHE case design. It is
both a procurement record and an assumptions register. A modeled envelope is
not proof that the corresponding part has been purchased or physically
measured.

## Status definitions

| Status | Meaning |
|---|---|
| In hand / used | The project already uses or physically possesses the item |
| Ordered | The user reported ordering the identified item; receipt and dimensions remain unconfirmed |
| Selected / acquisition unconfirmed | An exact product was chosen for the design, but ordering or receipt was not explicitly confirmed |
| Planned — select | The design calls for the item, but no exact manufacturer part number is recorded |
| Placeholder only | Space or mounting provisions exist, but installation is optional or deferred |
| Retired from active design | Previously modeled or considered, but intentionally excluded from the current architecture |
| CAD-defined | A project-controlled printable part exists in the repository; this does not assert that the production part has been printed |
| Test tooling / equipment | Used to establish measurements, fabricate parts, or validate fit; not installed in the final system |

## Enclosure and fabricated structure

| ID | Qty | Part | Selection or specification | Status | Verification / notes |
|---|---:|---|---|---|---|
| ENC-001 | 1 | Protective enclosure | Harbor Freight APACHE 3800 weatherproof protective case | In hand / used | Actual molded floor, rear recess, wall thickness, ribs, and closed-lid clearance govern the design; catalogue dimensions are reference-only |
| ENC-002 | 1 set | Case-supplied integral hardware and removable foam | Gasket, latches, case hinges, handle, pressure valve, lock features, and supplied foam | In hand / used | Remove the lid foam for the fixed-console configuration; retain the gasket and integral hardware. Measure exposed lid ribs and closed-lid clearance before assigning the freed volume |
| FAB-001 | 4 | Chassis quadrants | Front-left, front-right, rear-left, and rear-right from `apache_3800_chassis.scad` | CAD-defined | Production footprint remains 306.3875 x 234.95 mm. Height is now 77 mm to clear the measured PSU/control stack; verify split-line clearance before the full-height print. The 229.45 mm depth remains an unpromoted fit-test candidate |
| FAB-002 | 2 | Fixed control-panel base halves | Left and right halves of a 296.9875 x 225.55 x 5 mm removable deck | CAD-defined | Ten perimeter screws fasten the joined panel to inserts in the chassis top rail; production depth is derived from `model_params.scad` |
| FAB-003 | 2 | Former front-bezel halves | Previous moving-panel architecture | Retired from active design | The fixed full-opening panel replaces the separate bezel; historical files may remain as design evidence but are no longer exported |
| FAB-004 | As required | Printed seam joiners | Chassis X/Y joiners only in the active architecture | CAD-defined | Centered screen and toggle plates bridge the panel seam; the panel joiner and former bezel joiner are retired |
| FAB-005 | 1 | Logo or nameplate | Future front-bezel identification feature | Placeholder only | Content, material, attachment, and location are not designed |
| FAB-006 | 1 | Official 7-inch display module plate | 220 x 146 x 3.2 mm replaceable upper-center plate with a 157 x 89 mm opening | CAD-defined | Based on the measured 193 x 110 mm glass and 155 x 87 mm visible area. A rear support/clamp remains required because the delivered screen has rear-only mounting and carries a Pi 4B |
| FAB-007 | 1 | Safety-toggle module plate | 90 x 74 x 3.2 mm lower-left plate with two 11.62 mm holes | CAD-defined | Sized for two measured red safety-cover toggles; preserve each 40.70 x 17.05 mm cover footprint and 27.89 mm front projection |
| FAB-008 | 1 | Key/rocker module plate | 90 x 74 x 3.2 mm lower-center plate with two 11.5 mm keyed-switch holes and two 20.35 mm circular rocker holes | CAD-defined | Rear depths are 25.36 mm for keyed switches and 23.14 mm including rocker terminals |
| FAB-009 | 1 | Plug-mode/status module plate | 90 x 74 x 3.2 mm lower-right plate with two 15.6 mm socket holes, four 5 mm LED holes, and an 8 mm provisional captive-cable exit | CAD-defined | The cable exit requires a selected grommet/strain relief. Bare LEDs require printed rear retainers or commercial holders |
| MAT-001 | TBD | Printing filament | PETG is the initial specified polymer; manufacturer and color are not recorded | Planned — select | Validate case temperature, stiffness, creep resistance, and insert performance; record manufacturer, color, and lot before production |

## Mechanical hardware

| ID | Qty | Part | Selection or specification | Status | Verification / notes |
|---|---:|---|---|---|---|
| MEC-001 | 1 | Continuous metal piano hinge | Former moving-panel concept | Retired from active design | No hinge is installed in the fixed-panel architecture |
| MEC-002 | TBD | M3 heat-set inserts | Current pilot/OD assumption 4.0 mm; installed length 5.5 mm | Planned — select | Insert dimensions are not standardized. Validate the selected insert and installation temperature on `hinge_insert_coupon.stl` |
| MEC-003 | TBD | M3 machine screws | CAD clearance diameter 3.2 mm; nominal countersink diameter 6.3 mm | Planned — select | Length, head style, material, and quantity depend on hinge, seam joiners, bezel, panel, and future mounts |
| MEC-004 | As required | Fixed wiring looms and service connectors | Strain-relieved harnesses between removable panel modules and floor electronics | Planned — select | No moving hinge loop is needed; provide labeled disconnects and enough slack to lift the unscrewed panel for service |
| MEC-005 | 1–2 | Gas springs and mounting hardware | Former moving-panel concept | Retired from active design | Pads and holes are removed from active chassis and panel geometry |
| MEC-006 | 1 | Linear actuator and mounting hardware | Former moving-panel concept | Retired from active design | Pads and holes are removed from active chassis and panel geometry |
| MEC-007 | 1 | Manual panel release | Former moving-panel concept | Retired from active design | The panel is retained by accessible screws instead |

## Electronics and controls

| ID | Qty | Part | Selection or specification | Status | Verification / notes |
|---|---:|---|---|---|---|
| ELEC-001 | 1 | Fused switched AC inlet | FILSHU IEC320 C14 inlet/fuse holder/rocker switch module, Amazon ASIN `B0FZQ866Z3` | In hand / used | [Product reference](https://www.amazon.com/dp/B0FZQ866Z3?th=1). Measured 2026-09-01: 66.72 x 31.8 mm face, 47.38 x 27.56 mm body/cutout, 16.62 mm rear depth, two 2.99 mm holes on 55.09 mm centers |
| ELEC-002 | 1 | Six-position control selector | FOCMKEAS RS26 2P6T rotary band switch, Amazon ASIN `B0F9KTRGV5` | In hand / used | [Product reference](https://www.amazon.com/dp/B0F9KTRGV5?th=1). Measured: 9.27 mm panel bushing, 27 mm main flange/body, 17.72 mm rear collar, 16 mm rear depth, 21.55 mm front projection, and 2.96 mm anti-rotation pin at 9.83 mm offset with 4.67 mm projection. Low-current logic selection only |
| ELEC-003 | 1 | Selector knob | Included with ELEC-002 | In hand / used | Measured diameter 26.48 mm; installed selector front projection is 21.55 mm |
| ELEC-004 | 1 | AC/DC power supply | Perforated metal enclosed supply; exact model and electrical rating still to be transcribed | In hand / used | Measured 158 x 97 x 42 mm. Two offset mounting tabs are present, but exact hole coordinates remain pending. Record nameplate ratings, protective-earth requirements, terminal access, and measured loss before wiring |
| ELEC-005 | 2 | Raspberry Pi 4 Model B | One attached behind the display; one floor-mounted bare board with ELEC-012 | In hand / used | Screen/Pi assembly depth is 35 mm. Floor assembly with breakout measures 88.06 x 61.15 x 25.23 mm; all four standard 58 x 49 mm M2.5 mounting holes remain accessible |
| ELEC-006 | 1 | Original official Raspberry Pi 7-inch Touch Display | Original official 800 x 480 display with Pi 4B attached | In hand / used | [Official product](https://www.raspberrypi.com/products/raspberry-pi-touch-display/) and [documentation](https://www.raspberrypi.com/documentation/accessories/display.html). Measured 193 x 110 mm glass, 155 x 87 mm visible area, 6.04 mm display thickness, and 35 mm total depth with Pi. No front mounting holes; use a bezel plus rear support |
| ELEC-007 | 2 | 12/24 V-to-5 V USB-C converters | PlusRoc waterproof USB-C buck converter, model `PR4A070`, Amazon ASIN `B0FD735LFG` | In hand / used | [Product reference](https://www.amazon.com/dp/B0FD735LFG). Each measured body is 46 x 32 x 19 mm and 63 mm overall including tabs; slots are 52 mm center-to-center and 4.29 mm wide. Not USB Power Delivery; verify load compatibility and sustained thermal performance |
| ELEC-008 | As required | Mains terminal and segregation hardware | Finger-safe terminals/barriers appropriate to the selected AC/DC supply and voltage domain | Planned — select | The former generic 90 x 24 x 22 mm DC terminal-block mockup is removed from the current layout because ELEC-010 provides DC positive distribution and a negative bus. This row remains for any separately required mains termination; maintain mains/low-voltage segregation |
| ELEC-009 | 1 | Fan controller or driver | Must be rated for the selected fans | Planned — select | ELEC-002 must command low-current control inputs rather than directly carrying mains or fan current |
| ELEC-010 | 1 | Six-circuit DC fuse block with negative bus | Blue Sea Systems `5025` ST Blade Fuse Block, Amazon ASIN `B000THQ0CQ`; 32 V DC maximum, 100 A block maximum, 30 A branch maximum | In hand / used | [Manufacturer specifications](https://www.bluesea.com/products/5025/ST_Blade_Fuse_Block) and [product reference](https://www.amazon.com/dp/B000THQ0CQ). Measured with cover: 124 x 84 x 40 mm, 63 x 93 mm mounting centers, four 4.78 mm holes. DC only—never connect mains directly |
| ELEC-011 | Up to 6; 3 initially populated | ATO/ATC branch fuses | One correctly sized fuse for each populated ELEC-010 circuit | Planned — select | Select each fuse below the connected converter, conductor, connector, and source limits. The 30 A branch rating is an upper hardware limit, not the correct fuse size |
| ELEC-012 | 1 | Direct GPIO terminal breakout | OONO Ultra-Small Raspberry Pi GPIO Terminal Block Breakout, Amazon ASIN `B084C69VSQ` | In hand / used | [Product reference](https://www.amazon.com/dp/B084C69VSQ). Plugs directly onto the floor Pi 4B; combined measured envelope is recorded in ELEC-005 |
| ELEC-013 | 1 | 12/24 V-to-5 V Micro-USB converter | Waterproof inline converter; exact listing/model to record | In hand / used | Measured body 47 x 14 x 14 mm and 64 mm overall including tabs; slots are 52 mm center-to-center and 3.94 mm wide |
| CTRL-001 | 2 | Red safety-cover toggle switches | 11.62 mm panel bushing; 40.70 x 17.05 mm cover footprint | In hand / used | Rear body 26.13 x 14.63 x 14.46 mm; cover projects 27.89 mm above panel |
| CTRL-002 | 2 | Keyed switches | 11.5 mm panel hole; 14.82 mm front bezel | In hand / used | Rear body 18.08 x 11.83 x 25.36 mm; key projects 23.12 mm when inserted |
| CTRL-003 | 2 | Circular rocker switches | 20.35 mm round panel body; 22.12 mm bezel | In hand / used | Body depth 15.07 mm; total rear depth including terminals 23.14 mm; front projection 6.64 mm |
| CTRL-004 | 4 | Pre-wired 5 mm LEDs | One each green, blue, orange, and red | In hand / used | Measured 5.03 mm body diameter and 8.19 mm plastic length. Bare LEDs need holders/retainers and suitable current limiting or drivers |
| CTRL-005 | 2 sockets + 1 plug | Four-pin keyed plug activity | One captive plug is inserted into either of two mode-dependent sockets | In hand / used | Socket: 15.6 mm panel body, 18.2 mm flange, 13.3 mm rear depth, 5.19 mm front projection. Plug: 17.81 mm maximum diameter x 36.65 mm rigid length. Provide 152.4 mm usable pull-out cable, strain relief, and low-voltage signals only |
| CTRL-006 | 1 | Separate main power switch | Original front-bezel concept; may be superseded by the rocker integrated into ELEC-001 | Placeholder only | Resolve during electrical architecture to avoid ambiguous or redundant master-power controls |

## Cooling and airflow hardware

| ID | Qty | Part | Selection or specification | Status | Verification / notes |
|---|---:|---|---|---|---|
| THM-001 | 1 | Intake fan | 60 x 60 x 25 mm planning envelope; at least 15.4 CFM preliminary free-air target, 20 CFM nominal study target | Planned — select | Record voltage, current, airflow, pressure curve, noise, connector, polarity, and operating temperature |
| THM-002 | 1 | Exhaust fan | Same planning envelope and selection requirements as THM-001 | Planned — select | Opposed fans primarily add pressure capability; do not add their free-air CFM ratings |
| THM-003 | 1 | Replaceable intake filter | Sized for THM-001 with adequate free area | Planned — select | Validate pressure loss, service access, and replacement interval |
| THM-004 | 2 sets | Finger-safe fan guards / grilles | Compatible with selected 60 mm fans and case-wall arrangement | Planned — select | Provide protection wherever blades can be contacted; verify restriction and clearances |
| THM-005 | 8 nominal | Fan fasteners | Four per fan; current CAD hole diameter 3.5 mm | Planned — select | Select screw size, length, nuts/inserts, washers, vibration isolation, and corrosion resistance after measuring the wall stack |
| THM-006 | As required | Fan/filter gaskets or sealing hardware | Compatible with the chosen fans, guards, filter, and polypropylene case | Planned — select | Any case opening invalidates the original IP rating unless the completed installation is independently sealed and tested |

## Mains and wiring safety hardware

These items are requirements whenever mains power enters the case. Final
selection and wiring must be reviewed by a qualified person before energizing
the system.

| ID | Qty | Part | Selection or specification | Status | Verification / notes |
|---|---:|---|---|---|---|
| SAF-001 | 1 | Replaceable inlet fuse | Type and size compatible with ELEC-001 and the complete load | Planned — select | Size from measured worst-case current, inrush, conductor rating, and applicable protection requirements |
| SAF-002 | As required | Protective-earth conductor, terminal, and bonding hardware | Green/yellow conductor and suitable termination where required | Planned — select | Determine from the selected power supply, exposed conductive parts, and applicable electrical requirements |
| SAF-003 | As required | Mains-rated wire, terminals, and insulated covers | Voltage, temperature, and current ratings appropriate to the final load | Planned — select | Maintain finger-safe insulation and physical segregation from low-voltage/control wiring |
| SAF-004 | As required | Cable strain relief and edge protection | Sized for every cable crossing or external cord not retained by a panel-rated connector | Planned — select | No conductor may bear on a printed or cut case edge |
| SAF-005 | As required | Low-voltage wire, ring/fork terminals, connectors, and distribution protection | Sized for ELEC-010, converters, controls, LEDs, touchscreen, and fans | Planned — select | Record wire gauge, connector family, terminal sizes, branch fusing, polarity, and routing. Size terminations to the 5025's #10-32 studs and #8-32 branch screws as applicable |
| SAF-006 | 1 | Detachable IEC mains cord | Cordset compatible with ELEC-001 and the local supply | Planned — select | Select an appropriately listed, grounded, current-rated cord and verify plug access with the lid open and closed as applicable |

## Fit-test parts and measurement equipment

These items support development and are not part of the installed system BOM.

| ID | Qty | Part | Selection or specification | Status | Verification / notes |
|---|---:|---|---|---|---|
| TEST-001 | 1 set | Length-fit gauges | Labeled front/rear gauge variants in `length-fit-test/` | Test tooling / equipment | Retain as dimensional evidence |
| TEST-002 | 1 set | Final-fit frame | Four labeled 306.3875 x 229.45 mm candidate quadrants plus printed pin joiners | Test tooling / equipment | Must sit flat without force, bowing, or spring-back before candidate promotion |
| TEST-003 | 1 | Former hinge/insert coupon | Historical `hinge_insert_coupon.stl` | Retired from active design | Retained only as evidence; a simpler insert coupon should be created for the fixed-panel and module fasteners if needed |
| TEST-004 | 1 | Bambu Lab X1 Carbon printer | 256 x 256 x 256 mm configured build volume | Test tooling / equipment | Verify each affected STL and slicer plate before printing |
| TEST-005 | 1 each | Calipers and rigid rule | Millimetre measurement | Test tooling / equipment | Use calipers for hardware and local features; use a rigid rule for larger spans |
| TEST-006 | As required | Temperature sensors or probes | Intake, exhaust, ambient, power-supply, and compute-device measurement points | Test tooling / equipment | Required for closed-case idle and worst-load thermal validation |

## Procurement and release gates

1. Do not convert an **Ordered** item to **In hand / used** until receipt is
   confirmed and its physical dimensions are recorded.
2. Do not create rear-wall drilling templates from ELEC-001 or ELEC-002 listing
   dimensions; measure the delivered parts and the actual rear recess first.
3. Do not release the full production chassis until TEST-002 passes the
   mechanical acceptance criteria and the confirmed depth is promoted to the
   production parameter source.
4. Do not finalize electronics or control-panel mounts until ELEC-004 through
   ELEC-011 and CTRL-001 through CTRL-006 have exact manufacturer part numbers,
   connector keepouts, mounting patterns, and heat data where applicable.
5. Do not cut fan openings until THM-001 through THM-006 are selected and their
   installed stack, airflow restriction, service access, and sealing strategy
   are verified.
6. Do not energize mains wiring until SAF-001 through SAF-006 are selected,
   documented, installed, inspected, and reviewed by a qualified person.
7. Do not energize the DC distribution system until ELEC-004, ELEC-007,
   ELEC-010, ELEC-011, and SAF-005 ratings, polarity, wire sizes, terminations,
   and branch loads have been verified. ELEC-010 must only receive the DC
   output of ELEC-004, never AC mains.

## BOM maintenance

Update this document whenever an item is ordered, received, measured, replaced,
or removed from the design. Record the same change in
`DESIGN_CHANGELOG.md`. Exact manufacturer, part number, supplier, quantity,
measurement date, and evidence should replace placeholders as information
becomes available.
