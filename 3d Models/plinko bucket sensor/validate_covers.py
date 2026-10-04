"""Check exported cover sets without a boolean engine:

- every part is watertight and fits the build volume;
- colour layers sit only in the inlay layers at the cover face (print Z 0..depth);
- base + colour layers add up to the plain cover's volume (exports/covers/_plain_cover.stl,
  logo = "none"), so the layers neither overlap each other or the base nor leave gaps;
- colour layers below MIN_COLOUR_VOLUME (specks left by colours painted over) are deleted.

Usage: python validate_covers.py [logo-name ...]   (default: every folder in exports/covers)
"""

import sys
from pathlib import Path

import trimesh

COVERS = Path(__file__).resolve().parent / "exports" / "covers"
BUILD_VOLUME = 256.0   # Bambu Lab X1 Carbon, per 3d Models/AGENTS.md
INLAY_DEPTH = 0.6      # logo_inlay_depth in plinko_bucket_sensor.scad
VOLUME_TOL = 0.002     # fraction of the plain cover volume
MIN_COLOUR_VOLUME = 0.5  # mm^3; smaller colour layers are deleted


def check(folder, plain_volume):
    parts = {p.name: trimesh.load_mesh(p) for p in sorted(folder.glob("*.stl"))}
    problems = []
    # A colour almost entirely painted over leaves only unprintable specks: delete it.
    for name in [n for n, m in parts.items() if "_colour" in n and m.volume < MIN_COLOUR_VOLUME]:
        print(f"{folder.name:16} removed {name} ({parts[name].volume:.3f} mm^3, unprintable speck)")
        (folder / name).unlink()
        del parts[name]
    base = next((m for n, m in parts.items() if n.endswith("_cover_base.stl")), None)
    if base is None:
        return [f"{folder.name}: no cover base"]
    for name, mesh in parts.items():
        if not mesh.is_watertight:
            problems.append(f"{name}: not watertight")
        if max(mesh.extents) > BUILD_VOLUME:
            problems.append(f"{name}: exceeds build volume")
    colours = [(n, m) for n, m in parts.items() if "_colour" in n]
    for name, mesh in colours:
        z0, z1 = mesh.bounds[:, 2]
        if z0 < -0.01 or z1 > INLAY_DEPTH + 0.01:
            problems.append(f"{name}: outside the inlay layers (Z {z0:.2f}..{z1:.2f})")
    total = base.volume + sum(m.volume for _, m in colours)
    if colours and abs(total - plain_volume) > VOLUME_TOL * plain_volume:
        problems.append(f"{folder.name}: parts total {total:.1f} mm^3 vs plain cover {plain_volume:.1f} "
                        "(overlap if larger, gaps if smaller)")
    filled = sum(m.volume for _, m in colours)
    print(f"{folder.name:16} {len(colours)} colours, inlay {filled:6.1f} mm^3, base {base.volume:8.1f} mm^3"
          + ("" if problems else "  OK"))
    return problems


def main():
    names = sys.argv[1:]
    folders = [COVERS / n for n in names] if names else sorted(p for p in COVERS.iterdir() if p.is_dir())
    plain_volume = trimesh.load_mesh(COVERS / "_plain_cover.stl").volume
    problems = [p for f in folders for p in check(f, plain_volume)]
    for p in problems:
        print("  FAIL", p)
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
