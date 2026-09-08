# Agent instructions for 3D Models

These instructions apply to everything under `3d Models/`.

## Canonical location and version folders

- Work in C:\Code Projects\Copilot-IoT-Game\3d Models, not the older OneDrive
  equipment-tray worktree.
- Before edits, run Save-ModelVersion.ps1 with a descriptive before-change tag.
  After creating or updating files and validating them, run it again with an
  after-change tag. Every new release batch must have a version folder.
- Export scripts snapshot automatically before and after exports. Keep those
  hooks in new exporters too. Never overwrite archived versions.
- Read VERSIONING.md for manifest, storage, and print-approval semantics.

## Modeling version and release workflow

- Follow `MODELING_GIT_PLAN.md` and `MODELING_MIGRATION_DRY_RUN.md` for all
  Apache-case version, release, and repository-structure work.
- Treat top-level `3d Models/versions/` only as the ignored local safety-snapshot
  archive. It is not the tracked modeling workspace.
- Perform new tracked modeling work only in
  `apache case/versions/RPNN` on a dedicated `modeling/rpNN-*` branch. Recover
  the starting source from the preceding release's source tag (for example,
  recover `model-rp08-source` to begin RP09); do not use curated release meshes
  as editable source.
- Keep uncertain fit work and physical coupons under `apache case/calibration/`.
  Record the physical result before promoting candidate dimensions.
- Before release, export every affected production part and pass mesh,
  build-volume, clearance, inheritance, guide, and required physical-fit gates.
- Tag the final editable source commit as `model-rpNN-source` before removing the
  tracked working-version folder.
- Publish approved artifacts under `apache case/releases/RPNN`. A release is a
  curated package of production meshes, guides, previews, validation, release
  notes, and a manifest containing the source tag and SHA-256 checksums. Do not
  copy working source, exporters, intermediate coupons, or logs into a release.
- Update `apache case/releases/current.json` during promotion and tag the release
  commit as `model-rpNN`.
- Never modify an existing release folder after promotion. Any later geometry
  change starts the next RP version, even when the change is small.
- RP08 is the current release. Do not create RP09 until an actual production
  geometry change begins. The legacy `full-build-RP*` working copies were
  removed after RP08 parity validation; recover historical editable source from
  `model-rp08-source` or older Git history rather than recreating those folders.

## Purpose and authoritative files

- This directory owns the physical APACHE-case chassis for the portable
  Copilot-IoT-Game demonstration system.
- Treat `apache case/model_params.scad` as the authoritative production
  dimensions and `apache case/apache_2800_chassis.scad` as the
  authoritative production geometry.
- Fit-test directories are calibration tools, not production geometry. Do not
  copy a candidate measurement into the production model until the user
  explicitly confirms that the assembled physical test passes.

## Mechanical constraints

- Use millimetres for all modeled dimensions.
- Preserve the proven 306.3875 mm outer width unless a later physical test
  explicitly changes it.
- The current unconfirmed final-fit candidate is 229.45 mm deep, consisting of
  a 113.975 mm front span and a 115.475 mm rear span.
- Preserve the validated lower interface unless physical evidence requires a
  change: 21.5 mm production corner radius, 12 mm bevel height, 10 mm bevel
  inset, and six eased bevel stages.
- No individual printable STL may exceed the Bambu Lab X1 Carbon's configured
  256 x 256 x 256 mm build volume.

## Editing and validation

- Keep the design parametric; change named parameters rather than embedding
  unexplained dimensions in geometry modules.
- Keep test designs separate from production source until the test passes.
- Recess labels on inside or top faces so identification never changes the
  case-contact envelope.
- Preserve previous fit-test variants and generated evidence unless the user
  explicitly asks to remove them.
- After geometry changes, export every affected STL with OpenSCAD, confirm the
  top-level object is simple/manifold, and run the relevant Python bounds
  validator.
- Use the provided PowerShell export scripts. They write through `C:\tmp` to
  avoid incomplete OneDrive artifacts before copying completed exports into the
  project.
- Inspect the generated preview after changes that affect overall geometry.

## Production gate

Do not start or recommend the full-height production print until all of the
following are true:

1. The fully joined final-fit frame sits flat without bowing or force.
2. Width, front span, rear span, corner radius, and bevel are explicitly
   confirmed from the physical case.
3. The production parameters are updated from those confirmed values.
4. All regenerated production STLs pass build-volume validation and slicer
   inspection.
