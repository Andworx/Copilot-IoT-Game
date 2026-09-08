# 3D Models

This directory contains the printable mechanical hardware for the
Copilot-IoT-Game portable demonstration system. The current design is a
removable electronics and control-panel chassis for a Harbor Freight APACHE
case, designed as split parts that fit a Bambu Lab X1 Carbon build volume.

## Directory layout

Canonical working folder: C:\Code Projects\Copilot-IoT-Game\3d Models.
See [Version folders and export workflow](VERSIONING.md). Dated snapshots under
`versions/` preserve each release batch, including sources and generated files.

- `apache case/` — parametric OpenSCAD production chassis, generated STL
  files, preview renders, export scripts, dimensional validators, and physical
  fit-test iterations.
- `apache case/length-fit-test/` — low-material depth calibration gauges.
- `apache case/final-fit-test/` — labeled four-quadrant frame used to
  prove the final width, depth, corner, and lower-bevel fit before production.
- `apache case/case-airflow-study/` — complete APACHE case reference
  envelope, thermal estimate, component mockups, and proposed fan/power/dial
  placement study. It is not a drilling template.

## Current physical-fit status

- Proven width: **306.3875 mm** (12-1/16 inches).
- Current final-fit candidate depth: **229.45 mm**.
- Candidate front span: **113.975 mm**, labeled `F 227.95`.
- Candidate rear span: **115.475 mm**, labeled `R 230.95`.
- Lower bevel: 12 mm high, 10 mm inset, six-stage eased profile.

The current source is Rev 5, with upper-wall relief following the tight
full-height print. A passed lower frame does not validate the full-height shell:
print and check the upper-fit gauge before committing to the complete shell.
See [current model notes](apache%20case/README.md) for the detailed print gates.

## Engineering design record

- [Complete design document](apache%20case/DESIGN_DOCUMENT.md) — process,
  diagrams, mechanical and thermal analysis, decisions, risks, and validation.
- [System bill of materials](apache%20case/BOM.md) — purchased, used, planned,
  placeholder, fabricated, and test items with selection and verification status.
- [Design document changelog](apache%20case/DESIGN_CHANGELOG.md) —
  human-readable version history maintained in addition to Git.

## Tools

- [OpenSCAD](https://openscad.org/) for parametric modeling and STL/PNG export.
- Python 3 for STL bounding-box validation.
- Bambu Studio for plate layout, slicing, and X1 Carbon printing.

Run the PowerShell export script within the relevant model or test directory,
then run its Python validation script. Every printable part must fit within the
configured 256 x 256 x 256 mm build volume before slicing.

See `apache case/README.md` for the production model, measurement method,
hardware assumptions, print settings, and assembly sequence.
