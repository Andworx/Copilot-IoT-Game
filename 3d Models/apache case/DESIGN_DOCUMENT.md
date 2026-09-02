# APACHE 3800 Portable IoT Demonstration System

**Engineering design document — version 2.2.0**

**Document status:** Active working design record

**Last updated:** 2026-09-01

**Companion records:** [BOM.md](BOM.md) ·
[DESIGN_CHANGELOG.md](DESIGN_CHANGELOG.md)

## 1. Purpose

This document records the complete mechanical and thermal design process for a
portable IoT demonstration system installed in a Harbor Freight APACHE 3800
case. It explains what was designed, why each decision was made, what physical
tests changed the design, and what remains unverified.

The design consists of two related but deliberately separate models:

1. A removable, split, 3D-printed electronics chassis with a fixed modular
   control panel.
2. A planning model of the complete APACHE enclosure used to study airflow,
   heat, fan openings, AC power entry, and a six-position control selector.

This is the authoritative narrative design record. The authoritative production
dimensions remain in `model_params.scad`. The airflow study includes those
production parameters and adds only case-reference, component-layout, port,
and thermal inputs in `case-airflow-study/airflow_params.scad`.

## 2. Design objectives

The system must:

- fit the actual molded floor of the APACHE 3800 without force or bowing;
- sit flat above the lower internal bevel rather than rocking on it;
- break into parts that fit a Bambu Lab X1 Carbon 256 x 256 x 256 mm build
  volume;
- provide a removable structural chassis with a large electronics cavity;
- provide a rigid, removable, screw-fastened control deck with independently
  replaceable touchscreen and control modules;
- remove the lid foam and verify the newly exposed lid/rib clearance without
  placing heat-producing equipment outside the forced-air lower cavity;
- allow inexpensive fit testing before long production prints;
- move cooling air across the electronics rather than short-circuiting between
  adjacent vents;
- place user-accessible power and controls in the protected rear-center recess;
- preserve serviceability, electrical separation, strain relief, and guarded
  fan access; and
- distinguish measurements confirmed by a physical print from catalogue data,
  estimates, and placeholders.

## 3. Requirements and evidence status

| Item | Current value | Evidence class | Status |
|---|---:|---|---|
| Finished chassis width | 306.3875 mm / 12-1/16 in | Physical assembled fit test | Proven |
| Production Rev 3 depth | 234.95 mm / 9-1/4 in | Direct target measurement | Superseded by depth testing; still present in production source |
| Final-fit candidate depth | 229.45 mm | Labeled front/rear gauge selection | Awaiting final assembled-frame confirmation |
| Candidate front span | 113.975 mm (`F 227.95`) | Corrected front pieces | Awaiting final confirmation |
| Candidate rear span | 115.475 mm (`R 230.95`) | Best physical rear gauge | Selected candidate |
| Final-fit corner radius | 21.5 mm | Physical corner/bevel tests | Candidate carried into final frame |
| Lower bevel height | 12 mm | Successful sample geometry | Validated profile |
| Lower bevel inset | 10 mm | Successful sample geometry | Validated profile |
| Bevel interpolation | Six-stage smoothstep | Successful sample geometry | Validated profile |
| Chassis height | 77 mm | Measured component-stack analysis | Raised from 70 mm for PSU/key-switch separation; closed-lid clearance not yet proven |
| Case catalogue exterior | 419.1 x 330.2 x 171.45 mm | Manufacturer listing | Reference only |
| Case catalogue interior | 377.825 x 269.875 x 155.575 mm | Manufacturer listing | Reference only |
| Airflow heat load | 30 W | Placeholder analysis input | Measure after electronics selection |
| Allowed temperature rise | 10 C | Design target | Validate thermally |
| Fan format | Opposed 60 x 60 x 25 mm | Planning envelope | Exact fans not selected |
| Rear service-panel size | 176 x 68 mm estimated | Photo-derived envelope | Must be measured |
| Power inlet | FILSHU C14/fuse/switch, ASIN B0FZQ866Z3 | Direct caliper measurements | In hand; flange, cutout, depth, and holes promoted to study CAD |
| Control selector | FOCMKEAS RS26 2P6T, ASIN B0F9KTRGV5 | Direct caliper measurements | In hand; bushing, body, knob, depth, and anti-rotation pin promoted |
| DC distribution | Blue Sea Systems 5025, six circuits with negative bus | Direct caliper measurements | In hand; 124 x 84 x 40 mm envelope and 63 x 93 mm mounting pattern promoted |
| Branch conversion | Two PlusRoc USB-C and one Micro-USB converter | Direct caliper measurements | Three initially populated branches modeled; remaining fuse positions stay available |
| Panel architecture | Fixed 296.9875 x 225.55 x 5 mm split deck, ten chassis screws | Parametric CAD | Replaces moving panel; exact depth follows current Rev 3 production source |
| Display/control modules | Measured original 7-inch Pi display; two safety toggles; two keys; two rockers; two activity sockets; four colored LEDs | Direct caliper measurements | Cutouts and hard rear envelopes promoted; screen rear clamp and cable strain relief remain to design/test |

### Evidence hierarchy

When values conflict, use this order:

1. Fully joined physical fit test in the actual case.
2. Direct caliper or rigid-rule measurement of the actual case or component.
3. Manufacturer dimensional drawing.
4. Product-listing dimensions.
5. Catalogue enclosure dimensions.
6. Photo-derived estimates and CAD placeholders.

No lower class of evidence may silently overwrite a higher one.

### Bill of materials control

Every enclosure, fabricated assembly, mechanical component, electronic device,
cooling component, and electrical-safety item named by this design is tracked
in the [system bill of materials](BOM.md). BOM status distinguishes parts in
hand or ordered from planning envelopes and optional placeholders. Listing or
catalogue dimensions remain unverified until the delivered item is measured.

The BOM IDs provide stable references as selections mature. In particular,
`ELEC-001` is the ordered fused C14 inlet, `ELEC-002` is the ordered RS26
selector, `ELEC-010` is the selected Blue Sea 5025 DC fuse block, `ELEC-007`
is the selected PlusRoc converter family, `THM-001` and `THM-002` are the
unselected intake and exhaust fans. `MEC-001` records the retired hinge, while
`MEC-002` and `MEC-003` track the active heat-set inserts and M3 fasteners.

## 4. Development process

```mermaid
flowchart TD
    A[Catalogue envelope and initial case estimate] --> B[Parametric chassis model]
    B --> C[Split into X1C-sized printable parts]
    C --> D[Low-height four-piece footprint test]
    D --> E{Fully joined and flat?}
    E -- No --> F[Inspect width, depth, corners, bevel and seams]
    F --> G[Change one controlled dimension family]
    G --> H[Print labeled low-material gauge]
    H --> E
    E -- Yes --> I[Promote confirmed values to production model]
    I --> J[Verify lid clearance, fixed-panel inserts and module coupons]
    J --> K[Print production chassis]
    K --> L[Install electronics and measure heat]
    L --> M[Validate airflow and temperature]
```

This loop deliberately separates calibration geometry from production
geometry. A candidate value is not promoted merely because an individual loose
piece appears to fit.

## 5. Mechanical design evolution

### 5.1 Initial parametric chassis

The initial model created an open-center perimeter chassis so the molded case
floor remains available for electronics. It included:

- upper and lower structural rails;
- a blank front bezel;
- a split moving control panel;
- continuous-hinge pockets and M3 heat-set insert bosses;
- gas-spring and actuator placeholder pads;
- a broad hinge-side cable route; and
- removable screw-fastened seam joiners.

Important dimensions were centralized in `model_params.scad`. This prevents
independent parts from drifting out of alignment when the footprint changes.

### 5.2 Printer-driven part splitting

The 306 mm-class chassis cannot fit on a 256 mm bed as one part. The chassis is
therefore split into four quadrants. The fixed panel is split into two halves,
each replaceable module fits separately, and joints use dedicated joiners
rather than permanent glue.

```mermaid
flowchart LR
    subgraph Chassis[Four chassis quadrants]
      FL[Front left] --- FR[Front right]
      FL --- RL[Rear left]
      FR --- RR[Rear right]
      RL --- RR
    end
    subgraph Panel[Fixed removable panel]
      PL[Panel left] --- PR[Panel right]
    end
    subgraph Modules[Replaceable modules]
      TS[Touchscreen]
      RT[Four rotary]
      SW[Six toggle]
      UT[Buttons and indicators]
    end
```

The current nominal maximum footprints remain below 256 x 256 mm, and the
OpenSCAD assertions plus Python STL validators provide two independent checks.
Slicer margins, brims, and plate exclusions must still be checked in Bambu
Studio.

### 5.3 Why the first footprint test was misleading

The first printed pieces looked generally correct but were too large and did
not sit consistently. Loose seams allowed the long rails to bow inward or
outward. Pressing the frame downward could make it appear to fit even though it
was storing elastic stress and sinking toward the center.

Design response:

- add push-pin joiners to lock all four test seams;
- evaluate only the fully assembled frame;
- label every part so mixed variants cannot be confused;
- separate width and depth corrections; and
- print only low-height interface geometry during calibration.

### 5.4 Lower bevel and corner response

The case floor transitions into the side wall through a rounded molded bevel.
A square-bottomed or simple straight-chamfer frame contacts the slope before it
reaches the flat floor.

The successful interface uses:

- 12 mm vertical bevel height;
- 10 mm horizontal inset;
- 21.5 mm corner radius in the final-fit frame; and
- six smoothstep-interpolated tapered slices.

For normalized height `t`, the inset interpolation is:

`inset(t) = bevel_inset x (1 - (3t^2 - 2t^3))`

The zero-slope ends make the transition visually and mechanically rounder than
a single linear frustum while remaining practical to generate in OpenSCAD.

### 5.5 Width and depth calibration

The width converged at 306.3875 mm. Depth remained too long even when the
overall nominal measurement appeared correct, most likely because the usable
floor is constrained by local corner transitions, draft, or molded features.

To avoid repeatedly printing a complete frame, a standalone one-side depth
gauge tested assembled depths of 232.95, 230.95, and 228.95 mm. Front and rear
halves were physically labeled, and a joiner locked the center seam.

The best observations were `F 228.95` and `R 230.95`. A subsequent complete
frame showed slight edge bowing, so only the front half was shortened another
1.0 mm overall. The current final-fit candidate is therefore:

`113.975 mm front + 115.475 mm rear = 229.45 mm assembled depth`

![Final-fit frame](final-fit-test/exports/final_fit_preview.png)

### 5.6 Production promotion gate

The production file intentionally remains Rev 3 at 306.3875 x 234.95 mm. The
229.45 mm candidate must not be copied into `model_params.scad` until the fully
joined corrected final-fit frame:

- sits flat without hand pressure;
- shows no visible edge bowing;
- does not spring upward when released;
- inserts and lifts out without force; and
- clears all four corners and local molded obstructions.

## 6. Production chassis architecture

```mermaid
flowchart TB
    Case[APACHE 3800 lower shell] --> Frame[Four-part removable chassis]
    Frame --> Inserts[Ten perimeter heat-set inserts]
    Inserts --> Fixed[Two-part fixed removable panel]
    Fixed --> Screen[Upper-center official 7-inch display module]
    Fixed --> Safety[Two red safety toggles]
    Fixed --> Keys[Two keyed and two rocker switches]
    Fixed --> Utility[Two mode sockets, captive plug and four LEDs]
    Frame --> Electronics[Under-panel electronics cavity]
    Fixed --> Looms[Labeled removable wiring looms]
```

The open-center frame minimizes material and preserves access. Mechanical
service joints use screws and heat-set inserts instead of glue. The former
front bezel, piano hinge, gas-spring pads, actuator pads, hinge cable route, and
moving/service-angle assemblies are retired. Ten accessible perimeter screws
retain the deck. Removing those screws and disconnecting labeled harnesses
allows the complete panel to lift out for service.

The fixed base panel is split into X1C-printable left and right halves. Four
module plates sit over openings in the base:

- a 220 x 146 mm upper-center display carrier with a 157 x 89 mm viewing
  opening around the measured 155 x 87 mm illuminated area;
- a 90 x 74 mm lower-left plate for two measured red safety-cover toggles;
- a 90 x 74 mm lower-center plate for two keyed switches and two circular
  rocker switches; and
- a 90 x 74 mm lower-right plate for two four-pin mode sockets, a captive
  pull-out cable exit, and four colored 5 mm LEDs.

Every module uses four screws into panel bosses. This lets a measured module
plate be reprinted without reprinting the structural deck. All control openings
use measured cutouts. The cable grommet, LED retention, terminal bends, and
screen rear support remain `MEASURE_BEFORE_PRINT` interfaces.
The centered screen and toggle plates cross the panel split and serve as two
widely separated seam bridges, so separate panel joiner bars are no longer part
of the active export set.

The delivered screen is the original official 800 x 480 Touch Display with a
Pi 4B attached. It measures 193 x 110 mm across the glass, 155 x 87 mm across
the illuminated area, 6.04 mm for the display assembly, and 35 mm from the
front glass to the rearmost Pi hardware. It has no front mounting holes. The
module therefore acts as a front bezel and must be paired with a rear support
that does not load the glass or obstruct the Pi and display cables. The older
reference bezel STL measured 236 x 120 x 3 mm with a 169 x 104 mm opening and
a 220 x 60 mm four-hole pattern; those values are retained as design evidence,
not copied blindly into the smaller modular carrier.

The lid foam is removed. The exposed lid is treated first as clearance above
the screen, switches, and knobs—not as an assumed electronics bay. Powered
hardware placed in the lid would sit outside the lower side-to-side fan path and
would require a separate airflow, wiring-flex, retention, and lid-load analysis.
Until then, keep the lid volume empty or use only a shallow nonpowered holder
that clears the controls when the case closes.

![Fixed modular panel layout](exports/preview/panel_layout.png)

## 7. Complete case and airflow study

The airflow study is a separate non-production model. Its case shell is an
approximate reference envelope and its large STLs are explicitly named
`REFERENCE_DO_NOT_PRINT`.

The fixed panel and airflow study now derive from the same production source:
296.9875 x 225.55 mm for the current 234.95 mm production depth. The 229.45 mm
final-fit candidate remains isolated in `final-fit-test/`; it can no longer
silently alter the airflow study before promotion.

![Open enclosure study](case-airflow-study/exports/assembly_open.png)

### 7.1 Electronics envelopes

The revised mock layout includes planning blocks for BOM items `ELEC-004`,
`ELEC-005`, `ELEC-007`, and `ELEC-010`:

- one measured 158 x 97 x 42 mm power supply toward the front-right;
- one measured Blue Sea 5025 fuse block, rotated to an 84 x 124 x 40 mm
  rear-left envelope;
- two measured USB-C converters and one measured Micro-USB converter in a
  single front-left service bank;
- one floor Pi 4B with direct GPIO terminal breakout, measured as an
  88.06 x 61.15 x 25.23 mm assembly; and
- the measured screen body and its attached Pi as separate rear keepouts.

The fuse block replaces the former generic DC terminal-block mockup. The power
supply and fuse block no longer intersect it. Named OpenSCAD positions feed
automatic rectangular-boundary and pairwise 2 mm hard-envelope checks. The
control list uses each measured rear body instead of one placeholder box per
module. The 42 mm PSU and 25.36 mm keyed-switch stack proved the former 70 mm
chassis too shallow wherever their plan views overlap; raising the chassis to
77 mm produces about 4.6 mm vertical separation at the closest planned
overlap. Closed-lid and case split-line clearance must be physically tested
before this height is released for a full print.

The checks prevent the previous PSU/terminal-block collision, but they do not
prove clearance at rounded case corners, connectors, fasteners, wire bends,
tool access, or service-removal paths.

![Collision-checked electronics layout](case-airflow-study/exports/electronics_layout.png)

### 7.2 Airflow arrangement

The selected arrangement uses BOM item `THM-001`, a filtered intake on the left
short wall, and `THM-002`, an exhaust on the right short wall. The intake is
lower/front-biased and the exhaust is higher/rear-biased, producing a diagonal
sweep through the under-panel electronics volume.

```mermaid
flowchart LR
    Ambient[Room air] --> Filter[Replaceable intake filter]
    Filter --> Intake[Left 60 mm intake]
    Intake --> Conv[Three fused converter branches]
    Conv --> Pi[Pi and low-voltage devices]
    Pi --> PSU[Power supply and fuse block]
    PSU --> Exhaust[Right 60 mm exhaust]
    Exhaust --> Room[Heated exhaust air]
```

![Airflow section](case-airflow-study/exports/airflow_section.png)

Placing intake and exhaust on opposite ends reduces direct recirculation.
Filters, guards, wall openings, wiring, and internal pressure loss will reduce
the fans' free-air rating. Two opposing fans in one path should not be treated
as having additive CFM; they primarily help overcome system resistance.

### 7.3 Preliminary thermal analysis

Near room conditions, approximately 1 CFM carries 0.569 W per degree Celsius.
The first-pass model uses:

- estimated internal loss: 30 W;
- allowed internal temperature rise: 10 C;
- safety factor: 1.75; and
- filter/grille delivery factor: 0.60.

The calculations are:

`ideal CFM = 30 / (0.569 x 10) = 5.27 CFM`

`design CFM = 5.27 x 1.75 = 9.23 CFM`

`required free-air rating = 9.23 / 0.60 = 15.38 CFM`

A nominal 20 CFM fan derates to approximately 12 CFM under the assumed factor,
which clears the preliminary 9.23 CFM target. This is not a thermal validation.
Three populated converters delivering their full 25 W outputs would provide
75 W total; at the provisional 90 percent efficiency assumption, converter
loss alone is approximately 8.3 W. That value does not include the AC/DC supply, computers,
display, fans, wiring, or other loads, so the present 30 W total heat input must
not be treated as a demonstrated worst case. The selected AC/DC supply must
also support the simultaneous branch load with appropriate margin.
The final test must use the closed case, actual filters and grilles, final wire
routing, maximum sustained compute load, and measured ambient and internal
temperatures.

## 8. Rear service panel

The exterior photograph identified a protected flat-looking recess between two
inner vertical ribs and below the hinge bar. The current study represents that
area as a 176 x 68 mm photo-derived planning envelope.

```mermaid
flowchart LR
    L[Left inner rib] --- P[Horizontal C14 fused inlet]
    P --- S[Clear separation]
    S --- D[Six-position selector]
    D --- R[Right inner rib]
```

![Rear service-panel study](case-airflow-study/exports/rear_port_layout.png)

The power inlet is placed on the exterior-view left and the selector on the
right. Rotating the power module horizontally avoids consuming nearly the full
estimated panel height and improves clearance below the hinge.

### 8.1 Ordered power inlet

The selected part, BOM item `ELEC-001`, is a FILSHU IEC320 C14 inlet module with
a fuse holder, rocker switch, and preattached leads, Amazon ASIN `B0FZQ866Z3`.

Delivered-part measurements currently modeled:

| Feature | Modeled value |
|---|---:|
| Face, horizontal orientation | 66.72 x 31.8 mm |
| Panel body/cutout | 47.38 x 27.56 mm |
| Rear body depth | 16.62 mm |
| Mounting holes | Two 2.99 mm holes on 55.09 mm centers |

These values support a thin drilling/template coupon. The case recess, wall
thickness, fuse access, terminals, wire bend, and strain relief still require
physical confirmation before the APACHE shell is cut.

### 8.2 Ordered six-position selector

The selected control, BOM item `ELEC-002`, is a FOCMKEAS RS26 2P6T rotary band
switch, Amazon ASIN `B0F9KTRGV5`.

| Feature | Current model |
|---|---:|
| Positions | 6 discrete positions |
| Main body/flange diameter | 27 mm |
| Rear collar diameter | 17.72 mm |
| Rear body depth | 16 mm |
| Panel hole | 9.27 mm |
| Knob diameter | 26.48 mm |
| Installed front projection | 21.55 mm |
| Anti-rotation pin | 2.96 mm diameter, 9.83 mm center offset, 4.67 mm projection |

This is a selector, not a continuous potentiometer. A suitable control scheme
is six low-current logic modes such as Off, Auto, Low, Medium, High, and Test.
Its listed 0.3 A contact rating makes it unsuitable for directly switching
mains power or high-current fans.

## 9. Electrical, thermal, and enclosure safety

The intended power architecture is:

```mermaid
flowchart LR
    AC[Detachable AC cord] --> C14[Fused switched C14 inlet]
    C14 --> PSU[Mean Well AC/DC supply]
    PSU --> DC[12 or 24 V DC output]
    DC --> FUSE[Blue Sea 5025 DC fuse block]
    FUSE --> B1[Branch fuse 1] --> C1[PlusRoc converter 1] --> L1[5 V USB-C load 1]
    FUSE --> B2[Branch fuse 2] --> C2[PlusRoc converter 2] --> L2[5 V USB-C load 2]
    FUSE --> BN[Branches 3–6] --> CN[One PlusRoc per used branch] --> LN[5 V loads 3–6]
    PE[Protective earth, where required] --> PSU
```

The Blue Sea 5025 is a maximum-32 V **DC** fuse block. Mains power must never
be connected to it. AC enters only through the fused C14 module and feeds the
AC/DC supply; the supply's low-voltage DC output then feeds the fuse block.
Each populated branch receives an individually selected ATO/ATC fuse before
its converter. Fuse values must protect the converter, branch wiring, and
connectors—not merely match the fuse block's 30 A per-circuit maximum rating.

Cutting fan and connector openings invalidates the original enclosure rating
unless the finished system is independently sealed and tested. The design must
include:

- finger-safe fan guards on both sides where contact is possible;
- a serviceable intake filter and adequate free vent area;
- gasketed or sealed interfaces where environmental resistance is required;
- fused AC entry, protective earth where required, and strain relief;
- insulated mains terminals and physical segregation from low voltage;
- wire gauges and fusing sized for the actual load;
- guarded fuse replacement and switch access;
- no cable contact with fan blades, case-hinge hardware, or sharp cut edges;
  and
- review of the final mains implementation by a qualified person before use.

The rotary selector belongs on the isolated low-voltage control side. Fan power
should pass through a properly rated controller or driver.

## 10. Verification strategy

```mermaid
flowchart TD
    M[Measure actual case and delivered hardware] --> C[Update named CAD parameters]
    C --> E[Export all affected STLs and PNGs]
    E --> V[Run STL bounds validators]
    V --> S[Inspect every part in Bambu Studio]
    S --> P[Print lowest-cost representative sample]
    P --> F[Physical fit and function test]
    F --> Q{Passes acceptance criteria?}
    Q -- No --> M
    Q -- Yes --> R[Record result in design changelog]
    R --> G[Promote candidate to production]
```

### 10.1 Mechanical acceptance tests

1. Join every fit-test seam completely.
2. Place the frame in the empty lower case without bending it.
3. Confirm continuous floor bearing and no rocking.
4. Confirm no visible rail bowing and no spring-back when released.
5. Confirm repeatable insertion and removal without force.
6. Check all ribs, corners, case hinge/latch structures, and removed-foam areas.
7. Verify chassis plus panel height using the closed lid.
8. Verify all ten panel screws engage inserts without pulling the split deck
   out of plane.
9. Lift the unscrewed panel using its intended service harness slack and verify
   that every connector can be reached without stressing wiring.

### 10.2 Port and hardware acceptance tests

1. Measure the rear recess width, height, wall thickness, rib boundaries, and
   distance to hinge hardware.
2. Measure the power module face, cutout body, retention features, corner
   radii, rear depth, and cable exit envelope.
3. Measure the selector bushing diameter, usable thread length, nut/washer,
   anti-rotation feature, body depth, terminal envelope, and knob.
4. Measure the 5025 overall envelope, mounting centers, terminal hardware,
   cover-removal space, and wire-bend/service envelope.
5. Measure a PlusRoc converter body, mounting ears, lead exits, lead lengths,
   and connector insertion/removal envelope.
6. Measure the touchscreen bezel, active area, body, mounting holes, connector
   positions, rear depth, and cable bend.
7. Measure every toggle, rotary, button, and indicator cutout, anti-rotation
   feature, nut/washer stack, rear depth, and terminal bend envelope.
8. Create and print thin labeled module/drill-template coupons.
9. Test the rear-panel components and control modules before modifying the case
   or printing the full structural panel.
10. Verify plug insertion/removal and knob use with the lid fully open.

### 10.3 Thermal acceptance tests

Record ambient temperature plus internal temperatures at the power supply,
compute devices, intake, and exhaust. Test at idle and worst sustained load with
the lid closed. Verify that the maximum temperature rise remains within the
selected limit and that fan noise, filter loading, and exhaust recirculation
are acceptable.

## 11. Measurement worksheet

Fill this table when the ordered parts arrive.

| Measurement | Result | Tool/method | Date | Promoted to CAD? |
|---|---:|---|---|---|
| Rear recess clear width | TBD | Calipers/rigid rule | — | No |
| Rear recess clear height | TBD | Calipers/rigid rule | — | No |
| Rear wall thickness | TBD | Calipers | — | No |
| C14 face width x height | 66.72 x 31.8 mm | Calipers | 2026-09-01 | Yes |
| C14 required cutout/body | 47.38 x 27.56 mm | Calipers/test coupon | 2026-09-01 | Yes |
| C14 rear depth | 16.62 mm plus unmeasured wire bend | Calipers/mock wiring | 2026-09-01 | Yes, hard body only |
| Selector bushing diameter | 9.27 mm | Calipers | 2026-09-01 | Yes |
| Selector usable thread length | TBD | Calipers | — | No |
| Selector rear body/terminal depth | 16 mm | Calipers | 2026-09-01 | Yes |
| Selector knob diameter/front projection | 26.48 / 21.55 mm | Calipers | 2026-09-01 | Yes |
| Blue Sea 5025 overall envelope | 124 x 84 x 40 mm | Calipers | 2026-09-01 | Yes |
| Blue Sea 5025 mounting centers | 63 x 93 mm; 4.78 mm holes | Calipers | 2026-09-01 | Yes |
| Blue Sea 5025 cover and wire service envelope | TBD | Physical mock wiring | — | No |
| PlusRoc converter ear-to-ear envelope | 63 x 32 x 19 mm; 52 mm slots | Calipers | 2026-09-01 | Yes |
| PlusRoc lead and USB-C service envelope | TBD | Physical mock wiring | — | No |
| Touchscreen visible area / glass | 155 x 87 / 193 x 110 mm | Calipers/template | 2026-09-01 | Yes |
| Touchscreen display / assembled rear depth | 6.04 / 35 mm | Calipers/mock wiring | 2026-09-01 | Yes, cable bend pending |
| Safety toggle cutout / rear depth | 11.62 / 14.46 mm | Calipers/coupon | 2026-09-01 | Yes |
| Key and rocker cutouts | 11.5 / 20.35 mm | Calipers/coupon | 2026-09-01 | Yes |
| LED and activity-socket interfaces | 5 / 15.6 mm | Calipers/coupon | 2026-09-01 | Yes, holders/grommet pending |
| Fixed-panel screw/insert pull-down test | TBD | Physical assembly | — | No |
| Final joined frame 306.3875 x 229.45 fit | TBD | Physical case test | — | No |

## 12. Decision log

| ID | Decision | Rationale | Revisit trigger |
|---|---|---|---|
| D-001 | Use OpenSCAD with centralized named parameters | Repeatable regeneration and auditable dimensions | Change of CAD platform |
| D-002 | Split chassis into four quadrants | Required by 256 mm X1C bed | Larger printer or fundamentally smaller chassis |
| D-003 | Use removable mechanical joiners | Prevent seam movement during testing and preserve serviceability | Joint-strength failure |
| D-004 | Use low-height fit tests before production | Saves time and filament while reproducing the case interface | None; retain as standard process |
| D-005 | Use eased six-stage bevel | Successful flat seating against molded lower transition | New physical bevel evidence |
| D-006 | Calibrate width and depth independently | Case geometry and print error are not necessarily symmetric | New metrology showing uniform scale error |
| D-007 | Keep fit tests separate from production | Prevent unconfirmed values entering production geometry | Candidate passes full acceptance gate |
| D-008 | Use opposing side-wall fans | Long airflow path and reduced inlet/exhaust short circuit | Thermal or acoustic test failure |
| D-009 | Put power and selector in rear center recess | Protected, accessible surface away from side fans | Recess measurements or hinge conflict |
| D-010 | Mount the C14 module horizontally | Fits the low rear panel with better vertical margin | Delivered module or recess does not fit |
| D-011 | Use RS26 only as low-current selector | Six discrete modes; insufficient rating for direct power control | Controller architecture changes |
| D-012 | Use the Blue Sea 5025 for low-voltage branch distribution | Six fused positive branches and a negative bus match the six-mode/branch planning architecture | Measured space, current, or wiring tests fail |
| D-013 | Put one PlusRoc converter after each populated fuse-block branch | Provides per-load branch protection and local 5 V USB-C conversion | Fewer loads are installed or a centralized converter architecture proves preferable |
| D-014 | Retire the moving-panel mechanism | A fixed deck is simpler, more rigid, provides more control area, and removes hinge/strut/actuator clearance and failure modes | A later requirement demands frequent tool-free under-panel access |
| D-015 | Use four replaceable control modules | Exact controls can change without reprinting the full structural panel | A measured integrated commercial panel is selected |
| D-016 | Retain the fixed deck with ten perimeter screws | Distributed pull-down resists bowing while keeping the complete electronics bay serviceable | Insert pull-out, panel deflection, or access testing fails |
| D-017 | Use one unstacked front-left bank for two USB-C and one Micro-USB converter | Matches parts in hand, improves cooling and service access, and leaves three fuse circuits available | More branches are populated or wire routing rejects the bank |
| D-018 | Center the official 7-inch Pi display at the upper middle | Improves visibility and produces a symmetric console layout with controls below | Closed-lid, mounting, cable, or human-factors testing fails |
| D-019 | Use the centered screen and toggle plates as panel-seam bridges | Avoids joiner collisions inside the large centered display opening and reduces hardware | Module fastener or panel-deflection testing fails |
| D-020 | Raise chassis height from 70 to 77 mm | Measured 42 mm PSU and 25.36 mm keyed-switch depth require at least 4 mm separation where their plan views overlap | Closed-lid or case split-line test fails |
| D-021 | Use one captive plug with two mode-dependent sockets | Creates a reusable physical matching activity without loose parts; software determines the correct socket by mode | Connector wear, accessibility, or low-voltage interface testing fails |

## 13. Open risks and unresolved work

| Risk | Impact | Mitigation/status |
|---|---|---|
| Final 229.45 mm frame has not been explicitly confirmed | Production chassis may still bow or bind | Complete joined-frame test before Rev 4 |
| Closed-lid height is unverified | Collision or inability to close | Depth-gauge or foam/clay witness test |
| Rear panel is photo-derived | Ports may hit ribs or double walls | Measure before any drilling template |
| Measured controls still lack printed coupons | Incorrect tolerance or retention despite correct nominal openings | Print thin labeled coupons before structural modules |
| Fan model and pressure curve unknown | Inadequate flow/noise | Select fan and test with actual filter/grille |
| Heat load is a placeholder | Thermal estimate may be wrong | Measure input/output losses at worst load |
| Converter leads and connector bends are not measured | Wires may collide despite measured hard bodies | Mock-wire all three converters before designing retainers |
| Fuse-block cover and terminal service clearance are unverified | Cover removal or safe wiring may be obstructed | Mock up the actual block, largest conductors, and tool access before mounting |
| Mains wiring design incomplete | Shock/fire hazard | Qualified review, protection, segregation |
| Fixed-panel inserts and module fasteners are untested | Panel could bow, loosen, or strip during service | Print insert coupon and perform repeated assembly/pull-down test |
| New 77 mm chassis height is not physically verified | Panel or tall controls may interfere with lid/ribs | Rigid depth-gauge or foam/clay witness test before full-height print |
| Screen rear-clamp geometry is not finalized | Screen could move or glass could be point-loaded | Design a broad rear support after recording Pi/cable offsets and print a screen-only fit coupon |
| Captive cable grommet and stowage are provisional | Cable abrasion, snagging, or strain on solder joints | Select strain relief and verify 152.4 mm pullout/stow cycles |

## 14. File map

| Path | Role |
|---|---|
| `model_params.scad` | Authoritative production mechanical parameters |
| `apache_3800_chassis.scad` | Production chassis, fixed modular panel, module plates, joints, and assemblies |
| `export_parts.ps1` | Production STL and preview export |
| `validate_stl_bounds.py` | X1C build-volume validation |
| `length-fit-test/` | Standalone low-material depth gauges |
| `final-fit-test/` | Current four-quadrant 306.3875 x 229.45 mm candidate |
| `case-airflow-study/airflow_params.scad` | Case, hardware, and thermal study parameters |
| `case-airflow-study/apache_3800_airflow_study.scad` | Complete enclosure and airflow visualization |
| `case-airflow-study/estimate_airflow.py` | Repeatable preliminary airflow calculation |
| `case-airflow-study/exports/` | Visual evidence and non-printable reference envelopes |
| `BOM.md` | Controlled purchased, planned, fabricated, safety, and test-item register |
| `DESIGN_CHANGELOG.md` | Human-maintained document and design-history record |

## 15. Document maintenance

Update this document whenever a measurement is confirmed, a candidate is
promoted, a component changes, an analysis assumption changes, or a test alters
the design. Add a matching entry to `DESIGN_CHANGELOG.md` in the same commit.
Git history remains useful, but it does not replace the explicit engineering
reason, evidence, and effect recorded in the changelog.
