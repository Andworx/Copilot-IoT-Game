# APACHE 2800 Design Document Changelog

This file is the human-readable history for `DESIGN_DOCUMENT.md`. It records
why the document and design changed, what evidence caused the change, and which
values remain candidates. It complements Git history rather than duplicating
commit messages.

## RP09 working revision - 2026-09-28 - M4 Ethernet keystones

### Changed

- Replaced only the M4 face's four circular cable-socket interfaces with four
  standard RJ-45 keystone openings; preserved the 90 x 74 mm face envelope,
  corner fasteners, port centers, shell, trays, and M1-M3 geometry.
- Changed the visible M4 title to `M4 ETHERNET` and the four port identifiers
  to `LAN1` through `LAN4` while retaining the RP09 multicolor text workflow.
- Added a rear relief at every port so the 3.2 mm face presents a 1.6 mm local
  clip wall, matching the reference jack manufacturer's recommended panel
  thickness.
- Added a three-opening coupon around the 14.90 x 19.40 mm production candidate
  so the exact purchased keystone determines final printed tolerance.

### Validated

- OpenSCAD export, manifold, winding, connected-body, 256 mm build-envelope,
  and unchanged-mesh SHA-256 checks are automated by
  `versions/RP09/export_m4_keystone.ps1`.

### Physical gate

- RP09 M4 remains a candidate until the smallest passing coupon opening is
  recorded and the jack clips seat without forcing, rocking, or cracking.

## RP09 working revision - 2026-09-20 - Pi display retention

### Changed

- Replaced the unsupported 196 x 112 mm Pi-display carrier opening with a
  stepped drop-in seat while preserving the proven body clearance.
- Added a 187 x 104 mm through-opening on a 2 mm ledge positioned nominally
  6.04 mm below the panel top. The measured 193 x 110 mm display body receives
  3 mm of support on every edge and finishes 0.02 mm below the panel surface.
- Updated both fixed-panel identifiers to `PANEL-L/R RP09 SEAT` and added both
  revised panel halves to the RP09 exporter and validation set.
- Replaced the M1 face's integral LED friction collars with a removable rear
  retainer bar. Four flange pockets capture rear-inserted 5 mm LEDs, four
  bottom-loading wire slits accept prewired leads, and two M3 x 4 mm screws
  fasten the bar into blind printed pilots without marking the visible face.

### Validated

- Both split-panel STL exports are closed, consistently wound, single-body
  meshes inside the 256 mm printer envelope.
- Mesh-level checks confirm the support ledge and inner opening corner planes
  survived the panel boolean and split operations.
- The 12 face meshes and three text-coupon meshes still pass validation, and
  all 17 immutable RP08 release meshes still match their manifest checksums.

### Physical gate

- Before RP09 promotion, install the measured display in the joined panel
  halves and confirm it drops in freely, rests on all four ledges, finishes
  flush, clears the attached Pi hardware, and is retained without stress when
  the M1 cover is tightened.

## Repository cleanup - 2026-09-08

### Changed

- Published RP08 as the curated, checksummed package under `releases/RP08` and
  protected its editable source with the `model-rp08-source` Git tag.
- Organized studies under `analysis/`, physical tests under `calibration/`, and
  third-party CAD under `references/`.
- Removed the redundant `full-build-RP02` through `full-build-RP08` working
  copies after release parity validation. Historical sources remain recoverable
  from Git rather than duplicated in the active tree.

## 3.7.0 - 2026-09-05 - RP04 fit corrections and RP05 panel-boss review

### Added

- Added complete `full-build-RP04` and `full-build-RP05` revision folders.
  RP05 carries all 24 validated RP04 STLs byte-for-byte and includes the RP03
  staggered-converter left tray plus all source and guide files updated during
  the session.
- Added `PANEL_FASTENER_REVIEW.md` and a SHA-256 inheritance report to RP05.
- Added three labeled RP05 shell-rail coupons: straight front, rear with the
  nearby panel insert hole, and combined front/side corner. Each uses a 9.6 mm
  pocket around the actual 9 mm boss interface.

### Changed

- RP04 increased the safety-toggle and keyed-switch nominal holes to 12.0 mm
  after failed printed openings measured 11.45 and 11.20 mm respectively.
- RP04 moved the four 5 mm LEDs into one row across the top of the safety panel
  and removed the LED holes from the four-cable panel. Proven cable-socket and
  circular-rocker openings were retained unchanged.

### Validated

- All 24 RP04 meshes are closed, consistently oriented, single-body exports
  within the 256 mm printer envelope.
- RP05's 24 carried-forward STLs are byte-identical to RP04. No RP05 geometry
  change has been released during the panel-boss review.
- All three coupon meshes are closed, consistently oriented single bodies. The
  rear pocket retains 3.571 mm calculated ligament to the existing insert hole.
- Corrected CAD review after the user clarified that `panel_L` and `panel_R`,
  not the small faceplates, fail to seat. Ten 9 mm module bosses intersect
  the shell top rail: six along the front rail, two along the rear rail, and
  four side-rail contacts shared by the outer safety/cable bosses.
  The nominal vertical overlap is the rail's full 8 mm height.

### Deferred

- Model and print front-rail and rear-rail coupons with a candidate 9.6 mm
  rounded clearance pocket for the 9 mm panel bosses. If both coupons allow the
  panel to reach its seating datum without force, apply the pocket to the eight
  affected shell locations and re-export only the affected shell quadrants.
- Preserve the panel and faceplate hole locations. Moving every fastener or
  removing the bosses without replacement remains rejected as a first-line fix.

## 3.6.1 - 2026-09-05 - RP02 installation and drill guides

- Added a standalone responsive HTML placement guide with the current CAD
  coordinates, component envelopes, assembly order and seven labeled harness
  routes. Wiring is intentionally logical rather than a terminal-level schematic.
- Added a one-page US Letter drill guide generated at exact PDF point scale.
  It presents the outside rear view, 176 x 68 mm trim envelope, carrier outline,
  cutouts, four carrier holes, four XT60 holes, center marks, 100 mm calibration
  bar and 25 mm square.
- Cross-checked the guide coordinates against `rear_power.scad` and the rear
  envelope against `airflow_params.scad`; verified the PDF MediaBox is Letter.
- Kept the guide at candidate status because the 176 x 68 mm rear flat is from
  the approximate model, not a completed physical rear-recess measurement.
  Paper and carrier dry fit are mandatory before drilling; no electrical pinout,
  fuse selection, environmental seal or thermal approval is added.

## 3.6.0 — 2026-09-04 — RP02 full build with rear dial

- Reason: RP01 omitted the previously requested rear selector; user requested
  a complete new revision including shell, tray and faceplates.
- Added full-build-RP02 as a separate candidate, preserving RF02/RP01 and the
  production lower interface. Shared rear carrier grows from 106 to 144 mm;
  X centers change from switch 0 / XT60 48 to dial -30 / switch 10 / XT60 52.
- Added 31 mm dial body/wiring relief, measured bushing/anti-rotation carrier
  holes and a labeled dial coupon. Candidate pin orientation is 12 o'clock.
- Full-height corners, recessed-fuse tray, joiners, top panel and module plates
  are bundled, with recessed part identification and alignment marks retained.
- Verification: exported mesh report and analytical rear-envelope report in
  full-build-RP02/exports; preview inspection required before release snapshot.
- Not promoted to physically approved production: tray binding, real case/rib/
  hinge clearance, clip and dial grip, lug access and lid clearance remain open.
  No drilling, electrical energization, thermal approval or purchase implied.

## Versioning policy

Document versions use `MAJOR.MINOR.PATCH`:

- **MAJOR** — the system architecture, physical case, production interface, or
  document structure changes substantially.
- **MINOR** — a measured component, validated fit, thermal result, or design
  decision adds or changes engineering content.
- **PATCH** — wording, links, diagrams, formatting, or clarifications change
  without altering design intent.

Every future update must include:

- date and document version;
- sections affected;
- evidence or reason;
- exact confirmed or candidate values changed;
- impact on CAD, printed parts, safety, and pending work; and
- author/reviewer when known.

Use the headings **Added**, **Changed**, **Validated**, **Deferred**, and
**Safety** as applicable. Do not delete old entries when an assumption is
superseded.

## [3.5.0] — 2026-09-04

### Added

- RP01 measured rear XT60/master rocker record incorporating the user's width
  and height corrections; BOM marks both items in hand.
- Exterior carrier, XT60 coupon, four switch-thickness coupons, positioning
  template, and two RF02-derived rear shells with passage and nut-access relief.
- Approximate STEP wall measurement provenance; case thickness is not verified.

### Retained / Deferred

- Fuse cavity received positive user feedback and is retained without changing
  its geometry. Front shells, lower supports and upper trays remain RF02.
- Upper tray binding, real terminal connector clearance, switch clip fit,
  fastener lengths, case-cut placement and sealing remain open. No production
  promotion or case drilling approval.

## [3.4.0] — 2026-09-04

### Added / Changed

- RF02 candidate four corner shells with integrated open lower supports,
  two upper-tray halves with a 92 x 132 mm fuse opening, lower seam connector,
  upper tray connector and two low-height left-support tests.
- Existing fuse block retained at candidate mounting Z=6 mm; ordinary lower
  ribs sit at Z=0..3 to avoid unsupported suspended floors. Outer Rev 5 shell
  profile is inherited without dimension changes.
- BOM includes candidate printed pieces and provisional fasteners.

### Deferred

- No production promotion. Real floor contact, blind-pilot strength, screw
  lengths, terminal/cover access, wire bends and upper-shell fit require tests.
- No new exact STEP collision or thermal simulation is claimed. See candidate
  validation report for mesh checks and analytical clearances.

## [3.3.0] — 2026-09-04

### Added

- Dated, hash-manifested source/export version folders, with automatic before
  and after snapshots in all six export scripts and manual-edit snapshot rules.
- Canonical location: C:\Code Projects\Copilot-IoT-Game\3d Models.
- BOM proposal for a smaller protected distribution assembly.

### Deferred / Safety

- No fuse-block or tray geometry changed. Replacement selection, dimensions,
  branch protection, insulated terminals and wiring clearances remain pending.
- Upper shell-fit gate remains; version snapshots are not print approval.

## [3.2.0] — 2026-09-03

### Changed

- Corrected all tray-mounted electronics in the airflow study from the case
  floor to the actual tray top, 17.5 mm above the APACHE floor.
- Moved the floor Pi 4B/GPIO assembly from X = 0 to X = +92 mm on the
  right-hand tray half after the corrected elevation exposed a collision with
  the Pi mounted behind the centered display.

### Validated

- The relocated floor Pi has 5.47 mm hard-body separation from the
  screen-mounted Pi in X, preserving 3.47 mm after the 2 mm model allowance.
- OpenSCAD's complete electronics AABB assertions pass at the corrected tray
  elevation, and all four regenerated tray parts are simple/manifold.
- The 291 x 214 mm tray clears the approximate APACHE STEP cavity at the
  relevant height. Its controlling interface is instead the printed chassis
  opening, with only 0.494 mm X and 0.525 mm Y nominal clearance per side.

### Deferred

- Tray perimeter clearance remains a physical print gate. Do not change the
  proven chassis footprint based solely on the external STEP reference.

## [3.1.0] — 2026-09-03

### Added

- Vendored the MIT-licensed Bellafaire APACHE 2800 FreeCAD model, open and
  closed STEP assemblies, upstream documentation, license, and source record at
  commit `03e16003008ad060749bf5ab678bf31af2ec339e`.
- Added a repeatable CadQuery/OpenCascade cross-section analyzer and detailed
  [fit-analysis report](analysis/FIT_ANALYSIS.md).

### Validated

- The reference model predicts that Rev 5 clears the cavity from Z = 16 through
  77 mm, with clearance increasing toward the top rail.
- The reference predicts X-axis interference in the bevel transition at Z = 10
  and 12 mm, requiring at most about 0.67 mm relief per side; radius increase
  alone does not resolve it.

### Deferred

- No production dimension was changed because the external model conflicts with
  the already accepted physical 16 mm fit frame. The upper-frame result and
  measurements of the assembled full-height print remain the production gate.

## [3.0.0] — 2026-09-03

### Changed

- Corrected the physical enclosure identity from APACHE 3800 to APACHE 2800
  after direct confirmation from the user.
- Renamed the production chassis and airflow-study source files and all script
  references from `apache_3800_*` to `apache_2800_*`.
- Replaced the incorrect APACHE 3800 catalogue envelope with the APACHE 2800
  nominal exterior 13-1/2 x 11-3/8 x 6 inch and interior
  11-7/8 x 9 x 5-5/16 inch envelope.

### Validated

- Existing production insert measurements remain physical-fit evidence from
  this actual case and were not rescaled or overwritten by catalogue values.
- Recorded the catalogue-versus-fit discrepancy: the nominal catalogue
  interior is 4.7625 mm shorter and 0.85 mm narrower than the validated lower
  insert footprint, consistent with measurements taken at different elevations
  in a drafted molded cavity.
- The discovered third-party APACHE 2800 FreeCAD/STEP model is suitable as a
  reference envelope, but its author identifies it as approximate; it is not
  promoted over this project's measured contact geometry.

## [2.6.0] — 2026-09-03

### Added

- Added a four-piece, 10 mm-high upper-clearance frame with etched
  `UP-FL/FR/RL/RR R5` IDs. It uses the existing `FIT-X/FIT-Y` pin joiners and
  isolates the full-height top outline from the already-proven lower bevel.
- Added permanent recessed part IDs, front-orientation marks, and mating seam
  witness lines to the shell quadrants, panel halves, module plates, chassis
  joiners, fit frames, tray halves, tray joiners, and tray coupon.

### Changed

- Recorded that the complete 77 mm Rev 4 shell was printable but very tight,
  despite the successful 16 mm lower fit frame.
- Created Revision 5: Z = 0–16 mm remains at the proven 306.3875 x 229.45 mm
  outline. Above Z = 16 mm, the shell progressively relieves 1.0 mm per width
  side and 1.5 mm per depth side, ending at 304.3875 x 226.45 mm.
- Increased the top corner radius from 21.5 to 23.5 mm while retaining the
  proven 21.5 mm lower radius and smooth bottom bevel.
- Reduced the derived control deck to 294.9875 x 217.05 mm and the centered
  display carrier to 220 x 136 mm to preserve module spacing.

### Validated

- Representative labeled Rev 5 chassis, panel, screen-module, joiner, tray,
  tray-joiner, coupon, and upper-frame parts compile as simple/manifold solids.

### Deferred

- Physically test the joined upper-clearance frame at the intended top-rail
  height. Do not reprint the four production shell quadrants until it fits
  without force, bowing, or spring-back.

## [2.5.0] — 2026-09-02

### Changed

- Promoted the fully joined 306.3875 x 229.45 mm fit result to production
  Revision 4. The production split is 113.975 mm front and 115.475 mm rear.
- Reduced the derived fixed deck to 296.9875 x 220.05 x 5 mm, the centered
  screen carrier to 220 x 140 mm, and the equipment tray to 291 x 214 x 2 mm
  split into two 145.3 x 214 mm halves.
- Replaced the in-case C14 and metal AC/DC supply with an external 12 V / 15 A
  supply feeding an XT60 case connector and a 12 V master switch. Removed the
  internal PSU envelope, straps, and strap coupon features from active CAD.
- Retained the 77 mm chassis as a conservative panel/wiring volume and retired
  the unproven 92 mm height candidate that existed only to clear the internal
  PSU.
- Shifted the Blue Sea fuse-block tray location to X = -91 mm and kept the Pi
  and three converters on measured mounting patterns.

### Validated

- The user confirmed that the locked final-fit frame worked well in the actual
  APACHE case. This satisfies the production footprint promotion gate.
- Production and airflow files now share the same Rev 4 footprint instead of
  disagreeing between 234.95 and 229.45 mm depth.

### Deferred

- Measure the arriving XT60 interface and 12 V master switch before releasing
  a rear-wall drilling template.
- Complete the 77 mm closed-lid witness test, tray boss/screw-stack coupon,
  control coupons, fan selection, and final thermal test.

### Safety

- Mains remains outside the APACHE case. Incoming 12 V still requires correct
  polarity, branch protection, suitable wire gauge, insulated terminals,
  strain relief, and a current-rated connector and switch.

## [2.4.0] — 2026-09-02

### Added

- Added four removable activity cables, one each red, blue, green, and orange,
  and expanded the planned connector set to four plugs and four sockets.
- Added a candidate four-pin logic interface using presence plus two identity
  bits so every socket can distinguish disconnected, red, blue, green, or
  orange without relying on visual cable color. This proposal was superseded
  within the same revision by the simpler single-contact matrix described below.

### Changed

- Replaced the one-captive-plug/two-socket activity with a four-socket
  two-by-two module. Removed the captive-cable exit from the module CAD.
- Confirmed all four cables at 152.4 mm (6 in), one active pin per socket, and
  one signal conductor per cable with an optional spare. The interim tethered
  cable-channel proposal was superseded by loose double-ended jumper cables.
- Assigned socket N to connector pin N and defined the candidate cable map as
  red 1A-2B, blue 2A-3B, green 3A-4B, and orange 4A-1B. Added permanent A/B
  end identification and numbered socket engravings to the panel model.
- Recorded the six-unique-pair ceiling for four sockets and the inability to
  distinguish reversed duplicate pair types without added electrical coding.
- Increased socket row pitch from 28 to 36 mm. The measured plug bodies now
  have 26.19 mm horizontal and 18.19 mm vertical clear gaps.
- Updated the BOM, production panel, airflow keepouts, requirements table,
  decision log, and service risks for removable leads and partial/empty modes.

### Deferred

- Confirm the quantity of delivered connectors, cable outside diameter, A/B
  label method, matrix scan wiring, series protection, GPIO interface, plug finger
  clearance, rear terminal bends, and cable storage after the remaining parts
  arrive. Print the utility module as a fit test before the complete panel.

### Safety

- The four activity connectors are low-voltage logic interfaces only. They
  must not be used for 12 V branch power, and the Pi GPIO must not be exposed
  directly to an unprotected external connector.

## [2.3.0] — 2026-09-02

### Added

- Added `analysis/equipment-tray/`, a separate revision 0.1 mounting study containing
  two X1C-printable ventilated tray halves, two narrow cross-joiners, a
  hardware/bridge coupon, export script, validator, and assembly view.
- Added BOM entries for the two tray halves, two cross-joiners, tray coupon,
  PSU straps, tray/joiner screws, and low-profile device fasteners.

### Changed

- Converted the floor-electronics planning envelopes into actual measured hole
  patterns for the Blue Sea fuse block, floor Pi/GPIO assembly, and three
  converters. The PSU remains strap-retained until its offset tab holes are
  measured.
- Shifted the fuse block from X = -100 to -91 mm and the PSU from
  X = 55/Y = -56 to X = 54/Y = -50 mm to clear the tray fastener stack while
  preserving the collision-study spacing.
- Replaced the side seam joiners with tray halves that meet at the chassis
  centerline. Front and rear cross-joiners tie the halves together through the
  existing center insert holes; the tray rests on all eight existing boss tops.

### Validated

- OpenSCAD reports both 145.3 x 219 mm tray halves, the 50 x 14 mm cross-joiner,
  and the fit coupon as simple/manifold objects within the 256 mm X1C envelope.

### Deferred

- The tray rests at Z = 15.5 mm on the production boss tops, placing its top
  at Z = 17.5 mm. The current 77 mm chassis produces 12.86 mm of nominal
  PSU/key interference. A 92 mm chassis candidate provides 2.14 mm nominal
  clearance but is not promoted until a closed-lid witness test passes.
- Measure PSU tab holes, real case-floor high points, chassis joiner thickness,
  insert engagement, tray screw length, connector access, and wire bends.

### Safety

- The metal PSU and fuse distribution require insulating pads/washers and
  guarded terminals. Tray straps and printed joiners are mechanical prototypes;
  validate heat, creep, vibration, and pull-out before powered transport.

## [2.2.0] — 2026-09-01

### Added

- Recorded caliper measurements for the original Raspberry Pi 7-inch display
  with its attached Pi 4B, the AC/DC supply, Blue Sea 5025 fuse block, two
  USB-C converters, one Micro-USB converter, rear C14 inlet, RS26 selector,
  floor Pi/GPIO-breakout assembly, four LEDs, two safety toggles, two keyed
  switches, two circular rockers, and the one-plug/two-socket mode interface.
- Added every in-hand part and quantity to `BOM.md`, including the OONO GPIO
  breakout and Micro-USB converter.
- Added measured rear-body keepouts and the captive 152.4 mm mode cable to the
  panel and airflow analyses.

### Changed

- Replaced the provisional lower control bank with two safety toggles; two key
  switches plus two rockers; and two mode sockets plus four colored LEDs.
- Changed the electronics layout from six generic converters to the three
  actual in-hand units, moved the PSU/fuse/Pi blocks, and set the pairwise hard
  envelope clearance to 2 mm.
- Raised the chassis from 70 to 77 mm because the measured 42 mm PSU and
  25.36 mm keyed-switch rear stack cannot share the former height where their
  plan envelopes overlap.
- Made `analysis/airflow/airflow_params.scad` import production chassis and
  panel parameters from `model_params.scad`. The airflow study now uses the
  shipped 306.3875 x 234.95 mm footprint; the unconfirmed 229.45 mm fit-test
  candidate remains isolated and cannot silently become an airflow baseline.
- Updated the full-load converter example from six branches/150 W output to
  three branches/75 W output, approximately 8.3 W converter loss at the
  provisional 90 percent efficiency assumption.

### Validated

- OpenSCAD accepted the measured panel cutout layout and the revised 77 mm
  chassis without an X1 Carbon build-volume assertion failure.
- Airflow-study assertions accept the revised rectangular component envelopes
  inside the chassis rail with the required 2 mm hard-envelope clearance.

### Deferred

- Verify the screen overlay/rear clamp, PSU tab-hole coordinates, LED holders,
  control nut stacks, connector and wire bends, fuse-cover service path, and
  captive-cable grommet/strain relief with coupons and a physical mockup.
- Measure the APACHE case split line and closed-lid clearance before releasing
  the 77 mm chassis height for a full print.
- Fans remain provisional 60 x 60 x 25 mm envelopes until the actual fan and
  filter assemblies are purchased and measured.

### Safety

- The C14 inlet and RS26 rear panel remain planning geometry, not drilling
  templates. Confirm wall ribs, hinge clearance, sealing, protective earth,
  fuse selection, finger-safe terminals, and mains/SELV segregation before
  cutting or energizing the case.

## [2.1.0] — 2026-08-29

### Added

- Added an explicit `screen_model` selector for the original official
  Raspberry Pi 7-inch Touch Display and the 7-inch Touch Display 2.
- Recorded the official original-display outer and viewable dimensions and the
  Touch Display 2 landscape envelope in the CAD, BOM, and design record.

### Changed

- Moved the display to the upper center and enlarged its carrier to 220 x 146
  mm; three equal 90 x 74 mm control plates now form the lower bank.
- Removed the active panel joiner export. The centered screen and toggle plates
  bridge the two X1C-printable panel halves at two separated locations.
- Reduced the display-only rear keepout from the former generic 27 mm envelope
  to a provisional 20 mm original-display allowance, excluding any Pi mounted
  on the display rear.
- Lowered the fuse-block datum and both converter tiers 4 mm to retain modeled
  clearance below the centered controls.

### Validated

- OpenSCAD production assertions report ten perimeter screws and accept both
  official seven-inch display outer envelopes within the carrier.
- Airflow-study rectangular-boundary and pairwise-clearance assertions pass
  with the centered display/control keepouts and revised floor elevations.

### Deferred

- Confirm whether the actual unit is the original 800 x 480 Touch Display or
  the newer portrait-native Touch Display 2 before printing the carrier.
- Measure the actual display mounting holes, rear components, FFC connector and
  bend, and closed-lid clearance; the present plate is not a drilling template.

## [2.0.0] — 2026-08-29

### Added

- Added a fixed 296.9875 x 225.55 x 5 mm removable control deck retained by
  ten perimeter screws into chassis inserts.
- Added four independently printable provisional module plates: touchscreen,
  four rotary controls, six toggles, and four buttons with eight indicators.
- Added four panel-module rear keepouts to the airflow-study collision system
  so screen and control depth participates in electronics placement.
- Added module-specific measurement and acceptance criteria to the design
  document and BOM.

### Changed

- Advanced the system architecture and design document to version 2.0.0.
- Replaced the separate front bezel and moving panel with one full-opening
  fixed deck split into X1C-printable halves.
- Designated the lid foam for removal and reserved the exposed lid first as
  control/knob clearance rather than an unventilated electronics bay.
- Revised the internal layout: PSU and fuse block remain rearward, six
  converter envelopes form three stacked front pairs, and both Pi envelopes
  sit on the floor behind the converter bank.
- Updated the production export set and previews for the fixed panel and four
  replaceable modules.

### Removed from the active design

- Retired the piano hinge, gas springs, linear actuator, panel-opening angles,
  moving cable loop, front bezel, manual release, and their active mounting
  pads/cutouts.
- Historical source modules and prior generated evidence may remain for design
  traceability, but they are not part of the current assembly or export set.

### Validated

- OpenSCAD compiled the fixed assembly and provisional panel layout.
- The revised airflow-study AABB checks pass with floor electronics and all
  four downward panel keepouts included.

### Deferred

- The touchscreen and all new toggle, rotary, button, and indicator interfaces
  remain provisional pending exact product selection and physical measurement.
- Current rear-depth allowances are 27 mm for the screen, 18 mm for the rotary
  module, and 16 mm each for toggle and utility modules; deeper hardware forces
  a packaging revision.
- Converter stacking requires measured thermal and service testing before
  bracket design or full-load operation.

## [1.2.0] — 2026-08-29

### Added

- Added the selected Blue Sea Systems 5025 six-circuit DC fuse block as BOM
  item `ELEC-010`, including manufacturer dimensions, ratings, mounting data,
  terminal types, and the requirement for separately selected ATO/ATC fuses.
- Added the selected PlusRoc `PR4A070` 8–32 V DC to 5 V/5 A USB-C converter to
  `ELEC-007`; the layout now reserves one conservative envelope per populated
  fused circuit and shows six modules.
- Added a documented power-distribution diagram, part-measurement rows, and
  automatic OpenSCAD component-boundary and pairwise-clearance assertions.

### Changed

- Revised the airflow-study component layout to remove the PSU/terminal-block
  intersection and PSU/chassis-rail clip. The fuse block occupies the rear-left
  floor, the PSU the rear-right floor, converters two front rows, and the Pi
  envelopes the volume above the converter bank under the control deck.
- Removed the generic DC terminal-block envelope because the 5025 provides the
  current DC distribution and negative-bus function; any mains terminal and
  barrier hardware remains separately required.
- Lowered the exhaust center from z = 54 mm to z = 50 mm so its 54 mm opening
  and 50 mm mounting pattern remain at or below the 77 mm panel-deck boundary.
- Updated the BOM to version 1.1.0 and this design document to version 1.2.0.

### Safety

- Defined the required order as fused switched C14 AC entry, AC/DC supply,
  low-voltage DC fuse block, individual branch fuse, converter, then 5 V load.
- Explicitly prohibited applying mains to the 32 V DC fuse block and noted that
  its 30 A branch limit is not an appropriate default fuse size for a 25 W
  converter.

### Deferred

- Acquisition status, physical dimensions, cover/tool access, wire bend radii,
  fuse values, and thermal performance remain unconfirmed for the new parts.
- The 30 W heat model remains provisional; six converters alone can dissipate
  approximately 16.7 W at full 150 W output and 90 percent efficiency.

## [1.1.0] — 2026-08-29

### Added

- Added `BOM.md` as the controlled system bill of materials.
- Assigned stable IDs to the enclosure, printed assemblies, mechanical
  hardware, electronics, controls, cooling hardware, mains-safety hardware,
  and development test equipment described by the design.
- Captured the original project brief's PETG material, touchscreen, toggle
  switches, push buttons, additional rotary controls, indicator LEDs,
  USB/service connector, nameplate, manual release, cable protection, and
  case-supplied foam/hardware even though their final implementations remain
  deferred.
- Recorded the ordered FILSHU C14 module and FOCMKEAS RS26 selector separately
  from unselected fans, electronics, hinge hardware, and future mechanisms.
- Added procurement and release gates so listing dimensions and planning
  envelopes cannot be mistaken for measured production interfaces.

### Changed

- Updated the engineering design document to version 1.1.0 and linked the BOM
  as a companion controlled record.
- Linked the BOM from the production, airflow-study, and parent 3D-model
  documentation.

### Deferred

- Exact models, quantities, suppliers, and measured dimensions remain open for
  every BOM row marked `Planned — select`, `Placeholder only`, or unverified.
- Receipt and caliper verification remain pending for both ordered controls.

## [1.0.0] — 2026-08-29

### Added

- Created the first consolidated engineering design document.
- Added requirements, evidence hierarchy, mechanical evolution, print-splitting
  strategy, bevel analysis, airflow analysis, rear I/O design, component data,
  safety constraints, test procedures, decision log, risk register, measurement
  worksheet, and file map.
- Added GitHub-renderable process, assembly, airflow, rear-panel, and validation
  diagrams plus links to generated OpenSCAD evidence images.
- Established this changelog and semantic document-versioning policy.

### Baseline state captured

- Width physically proven at 306.3875 mm.
- Production Rev 3 still modeled at 234.95 mm depth.
- Corrected final-fit candidate documented at 229.45 mm depth, consisting of a
  113.975 mm front span and 115.475 mm rear span.
- Validated lower interface recorded as a 21.5 mm corner radius, 12 mm bevel
  height, 10 mm inset, and six-stage eased transition.
- Airflow baseline recorded as 30 W estimated heat, 10 C allowable rise, 1.75
  safety factor, 60 percent delivery factor, 9.23 CFM design flow, and a 20 CFM
  nominal fan target.
- Ordered FILSHU C14 power module and FOCMKEAS RS26 selector documented with
  listing-derived dimensions and measurement warnings.

### Deferred

- Promotion of 229.45 mm depth into production Rev 4 remains blocked pending a
  successful fully joined physical final-fit test.
- Rear port drilling templates remain blocked pending measurements of the case
  recess and delivered components.
- Production airflow, fan selection, thermal validation, hinge, insert, and
  mechanism details remain open.

## Reconstructed pre-document design history

The following sequence predates versioned documentation. It is reconstructed
from the retained CAD sources, labeled test artifacts, photographs, user test
feedback, and repository history. Dates are intentionally omitted where the
evidence does not establish them precisely.

### Mechanical baseline — initial chassis

#### Added

- Parametric removable APACHE chassis, blank front bezel, moving panel, hinge
  envelope, insert bosses, cable route, and future mechanism pads.
- Four-quadrant chassis, two-part panel, two-part bezel, and X1C-sized joiners.
- Low-height footprint frame and hinge/insert sample coupon.

#### Deferred

- Catalogue-derived case values were marked `MEASURE_BEFORE_PRINT`.
- Electronics cutouts and final mechanism geometry were intentionally excluded.

### Physical-fit revision 2 — seam and bevel response

#### Evidence

- Initial loose quadrants could sink toward the center when pressed and did not
  provide a reliable assembled dimension.
- The frame was too large, and a simple bevel did not seat consistently on the
  molded case transition.

#### Changed

- Added push-pin joiners so sample seams close and dimensions remain locked.
- Increased clearance and separated width/depth correction parameters.
- Increased corner rounding.
- Replaced the linear lower ramp with a multi-stage smoothstep bevel.
- Required labels on sample parts and joiners.

### Physical-fit revision 3 — measured footprint

#### Evidence

- Target footprint supplied as 12-1/16 x 9-1/4 inches.
- Revised bevel was physically reported as good.

#### Changed

- Added direct measured-footprint override at 306.3875 x 234.95 mm.
- Retained the successful curved bevel treatment.
- Reduced the unpurchased hinge placeholder to 250 mm after panel narrowing.

#### Deferred

- Production print remained blocked because the assembled frame still would
  not fit lengthwise without force.

### Standalone depth-gauge phase

#### Added

- Separate low-material gauges at 232.95, 230.95, and 228.95 mm assembled
  depths.
- Recessed `F`, `R`, numeric, and `JOINER` labels that do not alter the contact
  envelope.

#### Evidence

- `F 228.95` and `R 230.95` were reported as the best-fitting halves.

### Corrected final-fit phase

#### Changed

- Combined the proven 306.3875 mm width with selected asymmetric front/rear
  spans.
- Reduced the two front pieces by another 1.0 mm overall after slight edge
  bowing was observed.
- Created the current 229.45 mm full-frame candidate.

#### Deferred

- Candidate remains outside production geometry until the complete joined frame
  is explicitly confirmed flat, relaxed, and removable.

### Complete-case airflow study

#### Added

- Separate APACHE lower-shell/lid reference model and electronics envelopes.
- Opposing left intake and right exhaust 60 mm fan stations.
- Preliminary 30 W forced-air analysis and repeatable Python calculator.
- Rear-center service-panel planning envelope based on exterior photographs.
- Dedicated rear-view and airflow preview renders.

#### Changed

- Moved power and control from the right side to the protected rear-center
  recess while preserving side-wall fans.
- Placed the fused C14 inlet on the exterior-view left and selector on the
  exterior-view right.
- Rotated the ordered C14 module horizontally after reviewing its listing
  dimensions.
- Replaced the generic 40 mm dial with the ordered six-position RS26 selector
  envelope and provisional mounting data.

#### Safety

- Documented that wall openings invalidate the original sealing claim unless
  retested.
- Restricted the RS26 selector to low-current controller inputs.
- Added mains segregation, fusing, earthing, insulation, strain-relief, fan
  guarding, and qualified-review requirements.

## Entry template

Copy this block for the next document update:

```markdown
## [x.y.z] — YYYY-MM-DD

### Added

- ...

### Changed

- ...

### Validated

- Measurement/test, method, exact result, and acceptance criteria.

### Deferred

- Remaining blocker and what evidence will clear it.

### Safety

- New or changed safety implication.
```
