# APACHE 2800 Portable IoT Demonstration System BOM

**BOM version:** 3.4.0

**Last updated:** 2026-09-04

## Distribution alternative under consideration

The [RP02 complete build](full-build-RP02/README.md) now packages ELEC-002/003
(selector/knob), ELEC-015 (XT60), and ELEC-016 (master rocker) on one rear carrier.
It supersedes RP01's rear locations. Printed-part quantities and provisional
M3/M4 fasteners are listed in that release; existing purchased components are
retained. Dial nut/washer and anti-rotation engagement require a coupon check.
No alternative distribution board has been purchased or substituted.

Rear hardware is now in hand and dimensioned in the [RP01 record](rear-power-study/README.md).
RP01 adds one exterior printed carrier, four proposed M3 carrier bolts with
washers/nuts, and four proposed M4 XT60 bolts with washers/nuts. Lengths and
weather sealing remain unconfirmed. Coupons, positioning template, and two
relieved rear shells are CAD candidates, not installed hardware.

**2026-09-04 decision:** Retain the in-hand fuse block. The small distribution
PCB was not ordered; the alternatives below are deferred, not active purchases.
See [RF02 candidate](recessed-fuse-study/README.md).

| RF02 candidate item | Quantity | Status |
|---|---:|---|
| Shell corner with integrated lower support | 4 | CAD candidate; replaces plain shells only after fit checks |
| Recessed-pocket upper tray halves | 2 | CAD candidate; replaces old equipment tray for this layout |
| Lower seam connector | 1 | CAD candidate |
| Upper tray connector | 2 | Existing geometry reused |
| M3 screws suitable for plastic and washers for fuse mounting | 4 each | Planned; length and pilot engagement require physical verification |
| M3 screws suitable for plastic for lower connector | 2 | Planned; length requires physical verification |
| Low-height left support tests | 2 | CAD test parts; not installed with full shells |

| Item | Status | Selection / envelope |
|---|---|---|
| Compact fused distribution block OR insulated positive/negative distribution buses | Proposed alternative; not selected or purchased | User proposed smaller distribution to reclaim fuse-block space. Dimensions, ratings, mounting and cover remain unknown. Existing fuse block stays modeled pending selection. |
| Individual branch fuse holders and fuses, if unfused buses are used | Conditional planned items | Quantity and ratings depend on final circuits and wire/connector ratings; do not omit branch protection. Include holders and wiring in clearance checks. |

This proposal does not retire the in-hand fuse block or authorize new tray holes.
See [design decision](DESIGN_DOCUMENT.md#current-distribution-proposal-and-file-history).
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
| ENC-001 | 1 | Protective enclosure | Harbor Freight APACHE 2800 weatherproof protective case | In hand / used | Model identity physically confirmed by the user on 2026-09-03. Actual molded floor, rear recess, wall thickness, ribs, and closed-lid clearance govern the design; catalogue dimensions are reference-only |
| ENC-002 | 1 set | Case-supplied integral hardware and removable foam | Gasket, latches, case hinges, handle, pressure valve, lock features, and supplied foam | In hand / used | Remove the lid foam for the fixed-console configuration; retain the gasket and integral hardware. Measure exposed lid ribs and closed-lid clearance before assigning the freed volume |
| FAB-001 | 4 | Rev 5 chassis quadrants | Etched CH-FL, CH-FR, CH-RL, and CH-RR parts from `apache_2800_chassis.scad` | CAD-defined / bottom footprint physically validated | Bottom 16 mm retains the passed 306.3875 x 229.45 mm footprint. Above 16 mm, Rev 5 progressively relieves 1.0 mm per width side and 1.5 mm per depth side, reaching 304.3875 x 226.45 mm with a 23.5 mm top radius. Full-height correction requires the upper-frame test |
| FAB-002 | 2 | Fixed control-panel base halves | Etched PANEL-L/PANEL-R halves of a 294.9875 x 217.05 x 5 mm removable deck | CAD-defined | Ten perimeter screws fasten the joined panel to inserts in the relieved chassis top rail; both halves have mating witness marks |
| FAB-003 | 2 | Former front-bezel halves | Previous moving-panel architecture | Retired from active design | The fixed full-opening panel replaces the separate bezel; historical files may remain as design evidence but are no longer exported |
| FAB-004 | As required | Printed seam joiners | Etched J-X/J-Y chassis joiners with center witness lines | CAD-defined | Centered screen and toggle plates bridge the panel seam; the panel joiner and former bezel joiner are retired |
| FAB-005 | 1 | Logo or nameplate | Future front-bezel identification feature | Placeholder only | Content, material, attachment, and location are not designed |
| FAB-006 | 1 | Official 7-inch display module plate | Etched M1, 220 x 136 x 3.2 mm replaceable upper-center plate with a 157 x 89 mm opening | CAD-defined | Shortened for spacing on the relieved Rev 5 panel. Based on the measured 193 x 110 mm glass and 155 x 87 mm visible area. A rear support/clamp remains required because the delivered screen has rear-only mounting and carries a Pi 4B |
| FAB-007 | 1 | Safety-toggle module plate | 90 x 74 x 3.2 mm lower-left plate with two 11.62 mm holes | CAD-defined | Sized for two measured red safety-cover toggles; preserve each 40.70 x 17.05 mm cover footprint and 27.89 mm front projection |
| FAB-008 | 1 | Key/rocker module plate | 90 x 74 x 3.2 mm lower-center plate with two 11.5 mm keyed-switch holes and two 20.35 mm circular rocker holes | CAD-defined | Rear depths are 25.36 mm for keyed switches and 23.14 mm including rocker terminals |
| FAB-009 | 1 | Four-cable matching module plate | 90 x 74 x 3.2 mm lower-right plate with four 15.6 mm socket holes and four 5 mm LED holes | CAD-defined / validation candidate | Two-by-two socket layout removes the captive-cable exit. Measured plug bodies have 26.2 mm horizontal and 18.2 mm vertical clear gaps in the candidate layout. Verify simultaneous four-plug finger clearance, labels, LED association, and rear terminal bends with delivered hardware |
| FAB-010 | 2 | Removable equipment-tray halves | Etched TRAY-L/TRAY-R halves of a 291 x 214 x 2 mm ventilated tray | CAD-defined / validation candidate | Each half is 145.3 x 214 mm, includes a front mark and paired seam witnesses, and fits the X1C. Internal PSU slots are removed |
| FAB-011 | 2 | Equipment-tray cross-joiners | Etched TRAY-J 50 x 14 x 4 mm front/rear bars with center witness line | CAD-defined / validation candidate | Join the tray halves at the center seam using the existing front/rear insert locations; print and test one with the coupon first |
| FAB-012 | 1 | Equipment-tray fit coupon | 80 x 32 x 2 mm hole/bridge coupon | Test tooling / equipment | Validates M2.5, M3, 4.6–5 mm holes, tray thickness, and vent bridging before full tray prints |
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
| MEC-008 | 2 | Former PSU retaining straps | Previous internal-supply tray concept | Retired from active design | External 12 V supply removes the internal metal PSU and its strap slots |
| MEC-009 | 8 | M3 tray/cross-joiner screws | Length to suit chassis insert, tray, cross-joiner, and washer stack | Planned — select | Four side screws retain the tray halves; four center screws pass through the cross-joiners and tray. Verify thread engagement without bottoming |
| MEC-010 | As required | Device screws, washers, and locknuts | M2.5 for Pi; hardware matched to measured fuse and converter slots | Planned — select | Install from below before placing the tray. Maintain insulation and clearance above the APACHE floor and chassis lower rail |

## Electronics and controls

| ID | Qty | Part | Selection or specification | Status | Verification / notes |
|---|---:|---|---|---|---|
| ELEC-001 | 1 | Fused switched AC inlet | FILSHU IEC320 C14 inlet/fuse holder/rocker switch module, Amazon ASIN `B0FZQ866Z3` | Retired from active design / in hand | [Product reference](https://www.amazon.com/dp/B0FZQ866Z3?th=1). Replaced by external low-voltage power. Historical measurements: 66.72 x 31.8 mm face, 47.38 x 27.56 mm body/cutout, 16.62 mm rear depth, two 2.99 mm holes on 55.09 mm centers |
| ELEC-002 | 1 | Six-position control selector | FOCMKEAS RS26 2P6T rotary band switch, Amazon ASIN `B0F9KTRGV5` | In hand / used | [Product reference](https://www.amazon.com/dp/B0F9KTRGV5?th=1). Measured: 9.27 mm panel bushing, 27 mm main flange/body, 17.72 mm rear collar, 16 mm rear depth, 21.55 mm front projection, and 2.96 mm anti-rotation pin at 9.83 mm offset with 4.67 mm projection. Low-current logic selection only |
| ELEC-003 | 1 | Selector knob | Included with ELEC-002 | In hand / used | Measured diameter 26.48 mm; installed selector front projection is 21.55 mm |
| ELEC-004 | 1 | Internal AC/DC power supply | Perforated metal enclosed supply, measured 158 x 97 x 42 mm | Retired from active design / in hand | Replaced by the external 12 V supply because mounting it above the tray conflicted with panel hardware and increased internal heat |
| ELEC-005 | 2 | Raspberry Pi 4 Model B | One attached behind the display; one tray-mounted bare board with ELEC-012 | In hand / used | Screen/Pi assembly depth is 35 mm. Tray assembly with breakout measures 88.06 x 61.15 x 25.23 mm; all four standard 58 x 49 mm M2.5 mounting holes remain accessible. Located at X = +92 mm, Y = +38 mm on the right tray half to clear the display-mounted Pi |
| ELEC-006 | 1 | Original official Raspberry Pi 7-inch Touch Display | Original official 800 x 480 display with Pi 4B attached | In hand / used | [Official product](https://www.raspberrypi.com/products/raspberry-pi-touch-display/) and [documentation](https://www.raspberrypi.com/documentation/accessories/display.html). Measured 193 x 110 mm glass, 155 x 87 mm visible area, 6.04 mm display thickness, and 35 mm total depth with Pi. No front mounting holes; use a bezel plus rear support |
| ELEC-007 | 2 | 12/24 V-to-5 V USB-C converters | PlusRoc waterproof USB-C buck converter, model `PR4A070`, Amazon ASIN `B0FD735LFG` | In hand / used | [Product reference](https://www.amazon.com/dp/B0FD735LFG). Each measured body is 46 x 32 x 19 mm and 63 mm overall including tabs; slots are 52 mm center-to-center and 4.29 mm wide. Not USB Power Delivery; verify load compatibility and sustained thermal performance |
| ELEC-008 | As required | Mains terminal and segregation hardware | Finger-safe terminals/barriers appropriate to the selected AC/DC supply and voltage domain | Planned — select | The former generic 90 x 24 x 22 mm DC terminal-block mockup is removed from the current layout because ELEC-010 provides DC positive distribution and a negative bus. This row remains for any separately required mains termination; maintain mains/low-voltage segregation |
| ELEC-009 | 1 | Fan controller or driver | Must be rated for the selected fans | Planned — select | ELEC-002 must command low-current control inputs rather than directly carrying mains or fan current |
| ELEC-010 | 1 | Six-circuit DC fuse block with negative bus | Blue Sea Systems `5025` ST Blade Fuse Block, Amazon ASIN `B000THQ0CQ`; 32 V DC maximum, 100 A block maximum, 30 A branch maximum | In hand / used | [Manufacturer specifications](https://www.bluesea.com/products/5025/ST_Blade_Fuse_Block) and [product reference](https://www.amazon.com/dp/B000THQ0CQ). Measured with cover: 124 x 84 x 40 mm, 63 x 93 mm mounting centers, four 4.78 mm holes. DC only—never connect mains directly |
| ELEC-011 | Up to 6; 3 initially populated | ATO/ATC branch fuses | One correctly sized fuse for each populated ELEC-010 circuit | Planned — select | Select each fuse below the connected converter, conductor, connector, and source limits. The 30 A branch rating is an upper hardware limit, not the correct fuse size |
| ELEC-012 | 1 | Direct GPIO terminal breakout | OONO Ultra-Small Raspberry Pi GPIO Terminal Block Breakout, Amazon ASIN `B084C69VSQ` | In hand / used | [Product reference](https://www.amazon.com/dp/B084C69VSQ). Plugs directly onto the floor Pi 4B; combined measured envelope is recorded in ELEC-005 |
| ELEC-013 | 1 | 12/24 V-to-5 V Micro-USB converter | Waterproof inline converter; exact listing/model to record | In hand / used | Measured body 47 x 14 x 14 mm and 64 mm overall including tabs; slots are 52 mm center-to-center and 3.94 mm wide |
| ELEC-014 | 1 | External 12 V / 15 A power supply | 180 W nominal external supply | Ordered / awaiting measurement | Keeps mains and most conversion heat outside the APACHE case. Record manufacturer, protections, connector polarity, cord arrangement, and sustained-load performance on receipt |
| ELEC-015 | 1 set | XT60 case power connection | Panel/bulkhead connection between ELEC-014 and the case | In hand / dimensioned | Plate 38.4 x 38.16 x 5.27; hole pitch 29.85 x 30.27, diameter 4.93; centered body 14.2 x 22.12, rear depth 28; front projection 4 beyond plate. See RP01 for fit gates; polarity and wiring access unconfirmed. |
| ELEC-016 | 1 | 12 V DC master rocker switch | Series switch between XT60 entry and protected DC distribution | In hand / dimensioned | Body 21.56 x 27.02; bezel 24.75 x 31.57; rear terminals depth 30; front projection 9.4; approximate clip gap 3.27. Photo marks KCD2-201-B, 30A 12VDC, T125, 1E4: markings are not independent rating verification. Pinout, load suitability and clip fit remain unverified. |
| CTRL-001 | 2 | Red safety-cover toggle switches | 11.62 mm panel bushing; 40.70 x 17.05 mm cover footprint | In hand / used | Rear body 26.13 x 14.63 x 14.46 mm; cover projects 27.89 mm above panel |
| CTRL-002 | 2 | Keyed switches | 11.5 mm panel hole; 14.82 mm front bezel | In hand / used | Rear body 18.08 x 11.83 x 25.36 mm; key projects 23.12 mm when inserted |
| CTRL-003 | 2 | Circular rocker switches | 20.35 mm round panel body; 22.12 mm bezel | In hand / used | Body depth 15.07 mm; total rear depth including terminals 23.14 mm; front projection 6.64 mm |
| CTRL-004 | 4 | Pre-wired 5 mm LEDs | One each red, blue, green, and orange, paired with the correspondingly colored activity socket | In hand / used | Measured 5.03 mm body diameter and 8.19 mm plastic length. Candidate order is red upper-left, blue upper-right, green lower-left, orange lower-right. Bare LEDs need holders/retainers and suitable current limiting or drivers |
| CTRL-005 | 4 sockets + 8 plugs / 4 cables | Four-color directional jumper activity | Loose, double-ended red, blue, green, and orange 152.4 mm (6 in) cables connect four numbered sockets; valid modes may require two disjoint cables or none | Partially in hand / complete set planned | Socket: 15.6 mm panel body, 18.2 mm flange, 13.3 mm rear depth, 5.19 mm front projection. Plug: 17.81 mm maximum diameter x 36.65 mm rigid length. Only pin N is active in socket N. Candidate cable A-to-B pairs are red 1-2, blue 2-3, green 3-4, and orange 4-1. Mark both ends permanently `A` and `B`; reversing them intentionally produces no contact |
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
| TEST-002 | 1 set | Final-fit frame | Four labeled 306.3875 x 229.45 mm quadrants plus printed pin joiners | Test tooling / equipment / passed | User confirmed the fully joined frame fits well without the prior bowing; footprint promoted to production Rev 4 on 2026-09-02 |
| TEST-003 | 1 set | Rev 5 upper-clearance frame | Four etched UP-FL/FR/RL/RR 304.3875 x 226.45 mm top-profile quadrants plus FIT-X/FIT-Y pin joiners | Test tooling / equipment / print next | Support at the intended top-rail height to isolate upper length and corner-radius clearance before reprinting the complete 77 mm shell |
| TEST-004 | 1 | Former hinge/insert coupon | Historical `hinge_insert_coupon.stl` | Retired from active design | Retained only as evidence; a simpler insert coupon should be created for the fixed-panel and module fasteners if needed |
| TEST-005 | 1 | Bambu Lab X1 Carbon printer | 256 x 256 x 256 mm configured build volume | Test tooling / equipment | Verify each affected STL and slicer plate before printing |
| TEST-006 | 1 each | Calipers and rigid rule | Millimetre measurement | Test tooling / equipment | Use calipers for hardware and local features; use a rigid rule for larger spans |
| TEST-007 | As required | Temperature sensors or probes | Intake, exhaust, ambient, power-supply, and compute-device measurement points | Test tooling / equipment | Required for closed-case idle and worst-load thermal validation |

## Procurement and release gates

1. Do not convert an **Ordered** item to **In hand / used** until receipt is
   confirmed and its physical dimensions are recorded.
2. Do not create rear-wall drilling templates from ELEC-001 or ELEC-002 listing
   dimensions; measure the delivered parts and the actual rear recess first.
3. TEST-002 passed only the lower footprint. The Rev 4 full-height shell was
   very tight. Print TEST-003 at the intended top-rail height before releasing
   the relieved Rev 5 shell, then confirm insert fit and the closed-lid stack.
4. Do not finalize electronics or control-panel mounts until ELEC-004 through
   ELEC-011 and CTRL-001 through CTRL-006 have exact manufacturer part numbers,
   connector keepouts, mounting patterns, and heat data where applicable.
5. Do not cut fan openings until THM-001 through THM-006 are selected and their
   installed stack, airflow restriction, service access, and sealing strategy
   are verified.
6. Do not bring mains into the case. ELEC-001, ELEC-004, and the internal-mains
   safety rows are retained only as historical records.
7. Do not energize the DC distribution system until ELEC-014 through ELEC-016, ELEC-007,
   ELEC-010, ELEC-011, and SAF-005 ratings, polarity, wire sizes, terminations,
   and branch loads have been verified. ELEC-010 receives protected 12 V DC
   after the XT60 entry and master switch, never AC mains.

## BOM maintenance

Update this document whenever an item is ordered, received, measured, replaced,
or removed from the design. Record the same change in
`DESIGN_CHANGELOG.md`. Exact manufacturer, part number, supplier, quantity,
measurement date, and evidence should replace placeholders as information
becomes available.
