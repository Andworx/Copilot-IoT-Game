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
