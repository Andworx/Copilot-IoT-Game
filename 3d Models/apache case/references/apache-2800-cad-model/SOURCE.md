# Vendored APACHE 2800 reference CAD

- Upstream: <https://github.com/Bellafaire/Apache-2800-CAD-Model>
- Vendored commit: `03e16003008ad060749bf5ab678bf31af2ec339e`
- Retrieved: 2026-09-03
- License: MIT; see [LICENSE.md](LICENSE.md)
- Original author: Matthew James Bellafaire

The FreeCAD file, open and closed STEP assemblies, upstream README, license,
and preview images are preserved as received. The nested Git metadata was
removed so this directory is ordinary vendored source in the parent project.

The upstream README describes the model as a rough stand-in and warns that it
contains measurement errors. It is therefore a reference envelope, not the
authority for production insert dimensions. Physical measurements and fit
prints from this project's actual APACHE 2800 remain authoritative.

Both STEP exports retain an internal `PRODUCT` label of `Apache 3800`. This is
upstream metadata, not a project classification: the repository, FreeCAD file,
published description, and approximately 339 x 292 mm lower-case envelope all
identify the intended model as the APACHE 2800. The mismatch is preserved and
documented rather than silently rewriting the vendored files.
