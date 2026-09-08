# Modeling Git plan

Status: Draft 1
Scope: `3d Models/apache case`

## Naming model

Use different names for revision history and the currently approved print pack:

```text
apache case/
  source/                 Parametric working sources and shared scripts
  tests/                  Fit coupons and calibration studies
  revisions/
    RP08/                 Immutable, validated version RP08
    RP09/                 Next immutable version after approval
  release/                Current approved files to print and install
    manifest.json         Identifies the source revision, validation, and date
    stl/                  Production STL files only
    guides/               Drill guide and electronics-placement guide
    previews/             Small visual assembly and routing previews
```

`RP08` is the revision name. `release` is a stable location that always contains
the currently approved printable set. A release manifest must state which
revision supplied it. The release folder must never contain experimental
coupons or intermediate export logs.

## Track in Git

- OpenSCAD and other parametric source files.
- Export, validation, and clearance-check scripts.
- Revision notes, BOM, fit analysis, and assembly instructions.
- Validation JSON for an approved revision.
- Approved production STL/3MF files.
- The printable drill guide and electronics-placement guide.
- Small previews needed to identify parts and routing.
- The external Apache 2800 reference model, its license, and source record.

## Keep out of Git

- `3d Models/versions/` local safety snapshots.
- OpenSCAD/export `*.log` files.
- Temporary slicer projects, support experiments, and failed exports unless a
  file is deliberately promoted into a documented test or revision.
- Printer-specific G-code.

## Revision workflow

1. Create a dedicated branch named `modeling/rpNN-short-description`.
2. Save the required local before-change snapshot. Snapshots remain ignored.
3. Make source changes and create a small fit coupon when geometry is uncertain.
4. Commit the source and coupon as a reviewable development commit.
5. Record the physical test result in the revision notes.
6. Export every production part and run mesh, envelope, inheritance, clearance,
   and guide validation.
7. Create `revisions/RPNN` only after the required physical tests pass. Once
   committed, treat that revision folder as immutable.
8. Replace the contents of `release/` with the approved production files and
   update its manifest to identify `RPNN`.
9. Commit the revision and release promotion together, then tag the commit
   `model-rpNN`.
10. Merge through a modeling-only pull request. Do not mix Power Pages or other
    application changes into the modeling commit.

## Commit pattern

Use small commits while developing and one explicit promotion commit:

```text
model: add RP09 rear-control fit coupon
model: adjust RP09 switch and dial clearances
model: validate RP09 production meshes
release: promote Apache 2800 RP09
```

## Proposed migration from the current tree

The existing `full-build-RP02` through `full-build-RP08` folders remain valid and
must not be deleted. Migrate them with Git-aware renames into `revisions/RP02`
through `revisions/RP08` so history remains traceable. Then create the first
plain `release/` print pack from the validated RP08 exports.

Before performing that migration:

- Verify all internal relative paths and export scripts after the proposed move.
- Decide whether historical carried-forward source copies remain inside each
  revision or are replaced by a manifest pointing to the source commit.
- Move the modeling work onto a dedicated modeling branch.
- Confirm the RP08 rear carrier and paper drill guide with the outstanding case
  dry-fit before declaring RP08 the current release.

## Repository-size policy

Ordinary Git remains acceptable while individual files stay below 25 MB and the
repository remains responsive. Reassess Git LFS if a required CAD or mesh file
exceeds 25 MB; do not migrate existing history to LFS without a separate backup
and reviewed migration plan.
