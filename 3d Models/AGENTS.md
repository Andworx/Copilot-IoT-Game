# Agent instructions for 3D Models

These instructions apply to everything under `3d Models/`.

## Purpose and authoritative files

- This directory owns the physical APACHE-case chassis for the portable
  Copilot-IoT-Game demonstration system.
- Treat `apache case/model_params.scad` as the authoritative production
  dimensions and `apache case/apache_3800_chassis.scad` as the
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
