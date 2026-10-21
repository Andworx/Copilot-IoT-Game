"""Check the exported Plinko Pi case parts: watertight and inside the build volume.

Usage: python validate_parts.py
"""

import sys
from pathlib import Path

import trimesh

STL = Path(__file__).resolve().parent / "exports" / "stl"
BUILD_VOLUME = 256.0   # Bambu Lab X1 Carbon, per 3d Models/AGENTS.md


def main():
    problems = []
    for path in sorted(STL.glob("plinko_pi_*.stl")):
        mesh = trimesh.load_mesh(path)
        ok = mesh.is_watertight and max(mesh.extents) <= BUILD_VOLUME
        print(f"{path.name:28} {mesh.extents.round(1).tolist()}  {'OK' if ok else 'FAIL'}")
        if not mesh.is_watertight:
            problems.append(f"{path.name}: not watertight")
        if max(mesh.extents) > BUILD_VOLUME:
            problems.append(f"{path.name}: exceeds the build volume")
    for p in problems:
        print("FAIL", p)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
