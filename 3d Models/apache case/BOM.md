# APACHE 3800 Portable IoT Demonstration System BOM

**BOM version:** 2.1.0  
**Last updated:** 2026-08-29  
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
| FAB-001 | 4 | Chassis quadrants | Front-left, front-right, rear-left, and rear-right from `apache_3800_chassis.scad` | CAD-defined | Production Rev 3 remains 306.3875 x 234.95 mm; do not make the full-height set until the 229.45 mm final-fit candidate passes |
| FAB-002 | 2 | Fixed control-panel base halves | Left and right halves of a 296.9875 x 225.55 x 5 mm removable deck | CAD-defined | Ten perimeter screws fasten the joined panel to inserts in the chassis top rail; exact production depth remains tied to the unpromoted Rev 3 chassis source |
| FAB-003 | 2 | Former front-bezel halves | Previous moving-panel architecture | Retired from active design | The fixed full-opening panel replaces the separate bezel; historical files may remain as design evidence but are no longer exported |
| FAB-004 | As required | Printed seam joiners | Chassis X/Y joiners only in the active architecture | CAD-defined | Centered screen and toggle plates bridge the panel seam; the panel joiner and former bezel joiner are retired |
| FAB-005 | 1 | Logo or nameplate | Future front-bezel identification feature | Placeholder only | Content, material, attachment, and location are not designed |
| FAB-006 | 1 | Official 7-inch display module plate | 220 x 146 x 3.2 mm replaceable upper-center plate with a 156 x 88 mm opening for the original Touch Display profile | CAD-defined | Sized from ELEC-006 official envelope; confirm original versus Touch Display 2, mounting holes, rear parts, and cable path before production |
| FAB-007 | 1 | Provisional rotary-control module plate | 90 x 74 x 3.2 mm lower-left plate with four 9.8 mm holes | CAD-defined | One hole can accept ELEC-002 if verified; remaining controls are unselected |
| FAB-008 | 1 | Provisional toggle-switch module plate | 90 x 74 x 3.2 mm lower-center plate with six 12 mm holes | CAD-defined | Plate bridges the panel seam; hole diameter, anti-rotation features, spacing, and rear depth require actual switch selection |
| FAB-009 | 1 | Provisional button/status module plate | 90 x 74 x 3.2 mm lower-right plate with four 16 mm button holes and eight 5 mm indicator holes | CAD-defined | Button and LED holder interfaces remain placeholders |
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
| ELEC-001 | 1 | Fused switched AC inlet | FILSHU IEC320 C14 inlet/fuse holder/rocker switch module, Amazon ASIN `B0FZQ866Z3` | Ordered | [Product reference](https://www.amazon.com/dp/B0FZQ866Z3?th=1). Study envelope: 66.6 x 31.8 mm face, 56.1 x 27.9 mm cutout, and 30 mm rear allowance. Measure the delivered part before making a drilling template |
| ELEC-002 | 1 | Six-position control selector | FOCMKEAS RS26 2P6T rotary band switch, Amazon ASIN `B0F9KTRGV5` | Ordered | [Product reference](https://www.amazon.com/dp/B0F9KTRGV5?th=1). Study assumptions: 28.6 mm body, 9.8 mm panel hole, 6 x 20 mm shaft, and 18 mm inferred rear depth. Use only as a low-current logic selector |
| ELEC-003 | 1 | Selector knob | Included with or fitted to ELEC-002; current envelope 18 mm diameter x 14 mm deep | Ordered | Measure the received knob and confirm lid, hinge, and hand clearance |
| ELEC-004 | 1 | AC/DC power supply | Mean Well supply referenced; exact model not recorded; current planning envelope 159 x 97 x 30 mm | Planned — select | Record model, input/output ratings, protective-earth requirements, mounting pattern, connector access, and measured loss |
| ELEC-005 | 2 | Raspberry Pi-class compute devices | One IoT/control device and one touchscreen-connected device; current planning envelope 85 x 56 x 22 mm each | Planned — select | Exact board models, cases/heatsinks, connectors, standoffs, and sustained loads are not recorded |
| ELEC-006 | 1 | Official Raspberry Pi 7-inch Touch Display | Original official 800 x 480 display is the current CAD assumption: 192.96 x 110.76 mm outer envelope, 154.08 x 85.92 mm viewable area, and 200 mA at 5 V typical maximum-brightness draw | Planned — select | [Official product](https://www.raspberrypi.com/products/raspberry-pi-touch-display/), [documentation](https://www.raspberrypi.com/documentation/accessories/display.html), and [mechanical drawing](https://datasheets.raspberrypi.com/display/7-inch-display-mechanical-drawing.pdf). The 7-inch Touch Display 2 is 189.5 x 120 x 15 mm in landscape and also fits FAB-006 when `screen_model="touch_display_2_7"`; confirm which unit is on hand, then measure mounting and cable clearances |
| ELEC-007 | Up to 6 modules; 3 two-packs for all branches | 12/24 V-to-5 V DC converters | PlusRoc waterproof USB-C buck converter, model `PR4A070`, Amazon ASIN `B0FD735LFG`; 8–32 V DC input, 5 V/5 A and 25 W maximum output | Selected / acquisition unconfirmed | [Product reference](https://www.amazon.com/dp/B0FD735LFG). Listing body is approximately 46 x 32 x 18 mm; CAD reserves 68 x 32 x 18 mm for unverified ears/lead exits. One module is modeled after each used fused branch. It is not USB Power Delivery; verify load compatibility, mounting, wire gauge, voltage drop, and sustained thermal performance |
| ELEC-008 | As required | Mains terminal and segregation hardware | Finger-safe terminals/barriers appropriate to the selected AC/DC supply and voltage domain | Planned — select | The former generic 90 x 24 x 22 mm DC terminal-block mockup is removed from the current layout because ELEC-010 provides DC positive distribution and a negative bus. This row remains for any separately required mains termination; maintain mains/low-voltage segregation |
| ELEC-009 | 1 | Fan controller or driver | Must be rated for the selected fans | Planned — select | ELEC-002 must command low-current control inputs rather than directly carrying mains or fan current |
| ELEC-010 | 1 | Six-circuit DC fuse block with negative bus | Blue Sea Systems `5025` ST Blade Fuse Block, Amazon ASIN `B000THQ0CQ`; 32 V DC maximum, 100 A block maximum, 30 A branch maximum | Selected / acquisition unconfirmed | [Manufacturer specifications](https://www.bluesea.com/products/5025/ST_Blade_Fuse_Block) and [product reference](https://www.amazon.com/dp/B000THQ0CQ). Drawing envelope 124.31 x 84.20 x 38.57 mm, mounting centers 98.58 x 63.50 mm, M4/#8 holes, #10-32 positive/negative studs, and #8-32 branch terminals. Accepts ATO/ATC fuses, sold separately. DC only—never connect mains directly |
| ELEC-011 | Up to 6 | ATO/ATC branch fuses | One correctly sized fuse for each populated ELEC-010 circuit | Planned — select | Select each fuse below the connected converter, conductor, connector, and source limits. The 30 A fuse-block branch rating is an upper hardware limit, not the fuse size for a 25 W converter |
| CTRL-001 | Up to 6 | Physical toggle switches | Provisional 12 mm openings in FAB-008 | Placeholder only | Select function, contact rating, anti-rotation interface, terminal depth, and actual cutout before finalizing FAB-008 |
| CTRL-002 | Up to 4 | Push buttons | Provisional 16 mm openings in FAB-009 | Placeholder only | Select function, contact rating, illumination, body depth, and actual cutout before finalizing FAB-009 |
| CTRL-003 | Up to 4 total | Rotary controls | FAB-007 provides four provisional 9.8 mm openings; ELEC-002 may occupy one | Placeholder only | Select the other control types, ratings, bodies, knobs, anti-rotation features, and wiring |
| CTRL-004 | Up to 8 | Indicator LEDs and holders | Provisional 5 mm openings in FAB-009 | Placeholder only | Select voltage, current limiting/driver, color, lens, retention, and body depth |
| CTRL-005 | 1 | USB/service connector | Future front-bezel service interface | Placeholder only | Connector type, panel coupling, cable, sealing, and ESD protection are not designed |
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
