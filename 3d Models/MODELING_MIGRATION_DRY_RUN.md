# Modeling tree migration dry run

Date: 2026-09-08

Baseline commit: `af422ce`

Result: **Do not perform a direct folder move.** The proposed destinations are
collision-free, but the current full-build directories depend heavily on their
present relative paths. A curated release migration is safer and produces the
clean repository layout requested.

No production files or directories were moved during this dry run.

## Proposed destination layout

```text
3d Models/
  versions/                         Ignored local safety snapshots
  apache case/
    releases/
      current.json
      RP08/
        manifest.json
        README.md
        RELEASE_NOTES.md
        stl/
        guides/
        previews/
        validation/
    versions/
      RP09/                         Future tracked working version
    analysis/
    references/
    calibration/
```

RP08 remains the current release. RP09 should not be created until new modeling
work begins.

## Simulated move map

| Current path | Proposed category | Files | Size |
| --- | --- | ---: | ---: |
| `full-build-RP02` | `releases/RP02` | 65 | 24.16 MB |
| `full-build-RP04` | `releases/RP04` | 69 | 24.30 MB |
| `full-build-RP05` | `releases/RP05` | 96 | 26.23 MB |
| `full-build-RP06` | `releases/RP06` | 106 | 29.12 MB |
| `full-build-RP07` | `releases/RP07` | 120 | 31.93 MB |
| `full-build-RP08` | `releases/RP08` | 128 | 31.74 MB |
| `case-airflow-study` | `analysis/airflow` | 13 | 0.81 MB |
| `equipment-tray` | `analysis/equipment-tray` | 9 | 1.97 MB |
| `rear-power-study` | `analysis/rear-power` | 24 | 7.58 MB |
| `recessed-fuse-study` | `analysis/recessed-fuse` | 26 | 8.73 MB |
| `tray-routing-RP03` | `analysis/tray-routing/RP03` | 8 | 1.25 MB |
| `final-fit-test` | `calibration/case-fit/final-fit` | 13 | 6.31 MB |
| `length-fit-test` | `calibration/case-fit/length-fit` | 13 | 5.09 MB |
| `rear-control-calibration-T01` | `calibration/rear-controls/T01` | 10 | 4.77 MB |
| `rear-control-calibration-T02` | `calibration/rear-controls/T02` | 10 | 9.23 MB |

The complete direct-move simulation covered 710 files and 213.22 MB. No target
path or filename collisions were found.

## Breakage found in a direct move

| Check | Finding |
| --- | ---: |
| OpenSCAD `include`/`use` references scanned | 71 |
| OpenSCAD references that would break | 61 |
| OpenSCAD references already broken | 4 |
| Snapshot-helper references scanned | 37 |
| Snapshot-helper references inside moved trees | 36 |
| Cross-directory code references | 108 matches in 57 files |
| Documentation references needing review | 66 matches in 14 files |

Moving `full-build-RP08` one level deeper changes imports such as
`../apache_2800_chassis.scad`, `../model_params.scad`, and
`../case-airflow-study/airflow_params.scad`. Moving the studies at the same time
does not preserve those relative paths. Export scripts that currently use
`../../Save-ModelVersion.ps1` also gain one or more directory levels.

Cross-revision validation code names folders directly, including
`full-build-RP04`, `full-build-RP05`, `full-build-RP06`, and `full-build-RP07`.
Those validators and inheritance reports would require updates if retained as
executable files in the release folders.

The four currently broken OpenSCAD imports are the carried-forward copies of
`tray-routing-RP03/tray_routing_rp03.scad` inside RP05 through RP08. Their
`../case-airflow-study` path resolves inside `carried-forward-sources`, where no
such directory exists. The released meshes are already exported and validated,
so this does not invalidate those mesh files, but these copied sources are not
self-contained or directly rebuildable.

## Full-copy versus curated releases

The existing full-build directories contain both release artifacts and working
tools:

| Revision | Total files | Artifact/document files | Source/script files |
| --- | ---: | ---: | ---: |
| RP02 | 65 | 35 | 6 |
| RP04 | 69 | 36 | 9 |
| RP05 | 96 | 51 | 17 |
| RP06 | 106 | 57 | 20 |
| RP07 | 120 | 66 | 24 |
| RP08 | 128 | 72 | 26 |

A direct move would preserve convenient source copies but would also preserve
broken imports, repeated carried-forward sources, obsolete exporters, and
historical logs. Fixing those files after release would undermine the rule that
approved releases are immutable.

The recommended release package therefore contains:

- Approved production STL and 3MF files.
- Drill guide and electronics-placement guide.
- Assembly, routing, and identification previews.
- Validation and clearance JSON.
- Release notes, print list, and known validation notes.
- A manifest containing the source Git tag/commit and SHA-256 for every packaged
  artifact.

The release does not need copied `.scad`, Python, or PowerShell files. The exact
historical source remains available at the release Git tag.

## Files at the Apache-case root

Eight current production files are not covered by the folder move map:

- `apache_2800_chassis.scad`
- `model_params.scad`
- `export_parts.ps1`
- `validate_stl_bounds.py`
- `README.md`
- `BOM.md`
- `DESIGN_DOCUMENT.md`
- `DESIGN_CHANGELOG.md`

They should not be moved into `releases/RP08` as executable release source. For
RP08, capture them through the baseline Git tag and reference that tag from the
release manifest. When RP09 begins, copy the applicable production source and
automation into `versions/RP09`, then update the internal paths there once.
Move the RP08-specific documentation into its curated release package; keep a
short navigation README at the Apache-case root.

## Recommended migration sequence

1. Create a dedicated `modeling/repository-restructure` branch from the current
   modeling baseline.
2. Tag the source baseline used by the current release, for example
   `model-rp08-source`.
3. Create `releases/RP08` as a new curated package. Do not move
   `full-build-RP08` yet.
4. Generate `manifest.json` and `releases/current.json`, then compare every RP08
   packaged artifact with the existing file using SHA-256.
5. Re-run RP08 mesh and guide validation against the curated paths.
6. Move analysis, reference, and calibration directories with Git-aware moves.
7. Update the 61 OpenSCAD references, 36 snapshot-helper references, affected
   Python/PowerShell paths, and the 14 documentation files in the active support
   tree. Historical release packages should not contain those executable files.
8. Verify that the curated RP08 package can be printed and installed without any
   file outside `releases/RP08`, except for the source tag used for rebuilding.
9. Remove the legacy `full-build-RP02` through `full-build-RP08` working copies
   only after release-package parity is proven. Git history and the baseline tag
   retain them.
10. Create `versions/RP09` from the tagged RP08 source only when the next design
    change begins.

## Required gates before executing the migration

- Approve curated mesh-and-manifest releases rather than direct full-source
  folder moves.
- Decide whether RP02 through RP07 need curated release packages now or remain
  available only through Git history until requested.
- Confirm the name of the ignored 8.85 GB local snapshot directory. Renaming it
  from top-level `versions/` to `local-snapshots/` is recommended but is a
  separate filesystem operation.
- Keep unrelated Power Pages and solution work out of the migration commit.

## Dry-run conclusion

The proposed category structure is sound, but direct renaming is not safe. Use
a curated `releases/RP08` plus a source tag, reorganize supporting work, and use
`versions/RP09` as the next tracked working directory. This provides fast access
to printable meshes while Git supplies the exact historical source when needed.
