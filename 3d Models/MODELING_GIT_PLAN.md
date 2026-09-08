# Modeling Git plan

Status: Draft 1
Scope: `3d Models/apache case`

## Directory model

Use separate locations for in-progress versions, approved releases, and
supporting material:

```text
3d Models/
  versions/               Local safety snapshots; ignored by Git
  apache case/
    releases/
      current.json        Identifies the currently approved release
      RP08/               Current immutable release
      RP09/               Future immutable release after promotion
    versions/
      RP09/               Current tracked modeling work
    analysis/             Fit analysis and design investigations
    references/           External case models, licenses, and source records
    calibration/          Fit coupons and physical calibration tests
```

`RP08` and `RP09` are version identifiers. `releases` is the collection of
approved, immutable versions. `versions` contains active, tracked modeling work.
RP08 is the current release; RP09 will be the next working version.

The top-level `3d Models/versions/` directory has a different purpose: it is the
existing local safety-snapshot archive and remains ignored by Git. Rename that
archive to `local-snapshots/` in a later migration to eliminate the naming
collision, but do not move its 8.85 GB of data during the repository cleanup.

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
2. Copy the current release into `apache case/versions/RPNN`, update its labels,
   and make that the only working directory for the new version.
3. Save the required local before-change snapshot. Snapshots remain ignored.
4. Make source changes and create a small fit coupon under `calibration/` when
   geometry is uncertain.
5. Commit the source and coupon as a reviewable development commit.
6. Record the physical test result in the version notes.
7. Export every production part and run mesh, envelope, inheritance, clearance,
   and guide validation.
8. After all required physical tests pass, promote the version with a Git-aware
   move from `versions/RPNN` to `releases/RPNN`.
9. Update `releases/current.json`, commit the promotion, and tag the commit
   `model-rpNN`.
10. Treat every committed folder under `releases/` as immutable.
11. Merge through a modeling-only pull request. Do not mix Power Pages or other
    application changes into the modeling commit.

## Commit pattern

Use small commits while developing and one explicit promotion commit:

```text
model: start Apache 2800 RP09
model: add RP09 rear-control fit coupon
model: adjust RP09 switch and dial clearances
model: validate RP09 production meshes
release: promote Apache 2800 RP09
```

## Proposed migration from the current tree

See [`MODELING_MIGRATION_DRY_RUN.md`](MODELING_MIGRATION_DRY_RUN.md) for the
measured path-breakage analysis and recommended curated-release migration.

The existing `full-build-RP02` through `full-build-RP08` folders remain valid and
must not be deleted until migration parity is proven. Direct moves would break
their relative source and exporter paths. Build a curated `releases/RP08`
package from the approved meshes, guides, previews, validation, and notes; use a
Git source tag for the exact historical source. Add `releases/current.json` with
RP08 as the current release. RP02 through RP07 may be curated later if immediate
standalone packages are useful.

Move the existing support directories into the new categories:

- Keep `analysis/` and `references/` as top-level supporting directories.
- Move rear-control, length-fit, final-fit, and shell-pocket coupon work under
  `calibration/` with descriptive subdirectories.
- Move airflow, recessed-fuse, rear-power, tray-routing, and equipment-tray
  investigations under `analysis/` unless their final source is already part of
  a released version.

After the migration, create `versions/RP09` from `releases/RP08` when RP09 work
actually begins. Do not create a second permanent copy of RP08 as a working
version.

Before performing that migration:

- Verify all internal relative paths and export scripts in the active analysis,
  calibration, and working-version trees after their proposed moves.
- Verify that each curated release is self-contained enough to inspect, print,
  and install while relying on its Git tag for editable historical source.
- Move the modeling work onto a dedicated modeling branch.
- Record the outstanding RP08 rear-carrier and paper-drill-guide dry-fit as a
  validation note; RP08 remains the current release.

## Repository-size policy

Ordinary Git remains acceptable while individual files stay below 25 MB and the
repository remains responsive. Reassess Git LFS if a required CAD or mesh file
exceeds 25 MB; do not migrate existing history to LFS without a separate backup
and reviewed migration plan.
