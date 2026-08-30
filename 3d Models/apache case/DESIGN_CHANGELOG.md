# APACHE 3800 Design Document Changelog

This file is the human-readable history for `DESIGN_DOCUMENT.md`. It records
why the document and design changed, what evidence caused the change, and which
values remain candidates. It complements Git history rather than duplicating
commit messages.

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
