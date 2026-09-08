# Model versions and canonical location

The working project is **C:\Code Projects\Copilot-IoT-Game\3d Models**.
Do not continue editing the older OneDrive equipment-tray worktree.

Each release batch has its own folder:
`versions/<UTC timestamp>-<reason>-<unique ID>/files/`.
Every file retains its relative path. This keeps CAD sources, matching STL
exports, previews, analysis, and documentation together rather than separating
an STL from the parameters that produced it. Existing snapshots are not overwritten.
A SHA-256 manifest lists every archived file. Folders containing INCOMPLETE.txt
without a manifest are failed snapshots, not releases.

All six export scripts automatically snapshot before replacing outputs and after
successful export. The working `exports/` directories remain the latest files.
Before and after manual source/document edits or newly created files, run:

```powershell
& '.\Save-ModelVersion.ps1' -Tag 'before-my-change'
# Edit/create files and perform appropriate validation.
& '.\Save-ModelVersion.ps1' -Tag 'after-my-change'
```

Run from the 3d Models directory. This is an export/workflow rule, not a background
filesystem watcher: arbitrary edits by another program are not automatically archived.
Do not run concurrent edits/exports while taking a snapshot. Snapshots include
all working files but exclude the versions directory itself. They can consume
significant storage because reference CAD and generated meshes are included.

Snapshot creation is not engineering approval. Check the design changelog and
print gates before slicing; reference case meshes are explicitly NOT printable.
The current full-height shell still needs its upper-fit test. Tray component
mounts remain provisional while an alternative to the fuse block is considered.

Update DESIGN_CHANGELOG.md with the reason and verification for engineering
changes; folder history complements both that record and Git.
