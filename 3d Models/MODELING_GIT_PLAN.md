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
2. Recover the preceding release's editable source tag into
   `apache case/versions/RPNN` (for example, recover `model-rp08-source` to begin
   RP09), update its labels, and make that the only working directory for the
   new version.
3. Save the required local before-change snapshot. Snapshots remain ignored.
4. Make source changes and create a small fit coupon under `calibration/` when
   geometry is uncertain.
5. Commit the source and coupon as a reviewable development commit.
6. Record the physical test result in the version notes.
7. Export every production part and run mesh, envelope, inheritance, clearance,
   and guide validation.
8. Tag the final editable source commit as `model-rpNN-source`.
9. Build a curated `releases/RPNN` package containing production meshes, guides,
   previews, validation, notes, and a SHA-256 manifest that names the source tag.
10. Update `releases/current.json`, remove the tracked `versions/RPNN` working
    folder after its source tag is verified, commit the promotion, and tag the
    release commit `model-rpNN`.
11. Treat every committed folder under `releases/` as immutable. Any later
    geometry change starts RP(NN+1); never silently patch a released version.
12. Merge through a modeling-only pull request. Do not mix Power Pages or other
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

## Completed migration from the legacy tree

See [`MODELING_MIGRATION_DRY_RUN.md`](MODELING_MIGRATION_DRY_RUN.md) for the
measured path-breakage analysis and recommended curated-release migration.

RP08 parity was proven against the legacy working copy, the exact editable
source was protected by `model-rp08-source`, and the curated package was tagged
as `model-rp08`. The redundant `full-build-RP02` through `full-build-RP08`
working copies were then removed from the current tree. Recover them from the
source tag or Git history if a historical investigation requires them. RP02
through RP07 may be curated later if standalone historical packages become
useful.

The supporting directories are organized as follows:

- Keep `analysis/` and `references/` as top-level supporting directories.
- Move rear-control, length-fit, final-fit, and shell-pocket coupon work under
  `calibration/` with descriptive subdirectories.
- Move airflow, recessed-fuse, rear-power, tray-routing, and equipment-tray
  investigations under `analysis/` unless their final source is already part of
  a released version.

Create `versions/RP09` from the `model-rp08-source` tag only when RP09 work
actually begins. Do not create a second permanent copy of RP08 as a working
version.

The migration validation established that:

- All internal OpenSCAD references and moved exporter snapshot-helper paths
  resolve in the active analysis and calibration trees.
- The curated RP08 release is self-contained for inspection, printing, and
  installation while its Git tag supplies editable historical source.
- Modeling work is isolated on a dedicated modeling branch.
- The outstanding RP08 rear-carrier and paper-drill-guide dry-fit remains a
  release validation note; RP08 remains the current release.

## Repository-size policy

Ordinary Git remains acceptable while individual files stay below 25 MB and the
repository remains responsive. Reassess Git LFS if a required CAD or mesh file
exceeds 25 MB; do not migrate existing history to LFS without a separate backup
and reviewed migration plan.
