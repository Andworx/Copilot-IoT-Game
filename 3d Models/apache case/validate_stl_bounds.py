"""Validate exported STL bounding boxes against a Bambu Lab X1 Carbon bed.

Uses only the Python standard library and supports binary or ASCII STL files.
Run after export_parts.ps1. Dimensions are extents, so absolute OpenSCAD
coordinates do not affect the result.
"""
from __future__ import annotations

import re
import struct
from pathlib import Path

BUILD_VOLUME = (256.0, 256.0, 256.0)
STL_DIR = Path(__file__).resolve().parent / "exports" / "stl"


def bounds_binary(data: bytes):
    count = struct.unpack_from("<I", data, 80)[0]
    if len(data) != 84 + count * 50:
        return None
    mins = [float("inf")] * 3
    maxs = [float("-inf")] * 3
    for triangle in range(count):
        offset = 84 + triangle * 50 + 12
        for vertex in range(3):
            xyz = struct.unpack_from("<fff", data, offset + vertex * 12)
            for axis, value in enumerate(xyz):
                mins[axis] = min(mins[axis], value)
                maxs[axis] = max(maxs[axis], value)
    return mins, maxs


def bounds_ascii(data: bytes):
    text = data.decode("ascii", errors="ignore")
    vertices = [tuple(map(float, match)) for match in re.findall(
        r"\bvertex\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)", text
    )]
    if not vertices:
        raise ValueError("No STL vertices found")
    mins = [min(v[axis] for v in vertices) for axis in range(3)]
    maxs = [max(v[axis] for v in vertices) for axis in range(3)]
    return mins, maxs


def dimensions(path: Path):
    data = path.read_bytes()
    result = bounds_binary(data) if len(data) >= 84 else None
    mins, maxs = result if result else bounds_ascii(data)
    return tuple(maxs[i] - mins[i] for i in range(3))


def main() -> int:
    failures = []
    print("Part                                     X       Y       Z   X1C")
    print("-" * 70)
    for path in sorted(STL_DIR.glob("*.stl")):
        dims = dimensions(path)
        fits = all(d <= limit + 0.01 for d, limit in zip(dims, BUILD_VOLUME))
        print(f"{path.name:36} {dims[0]:7.1f} {dims[1]:7.1f} {dims[2]:7.1f}   "
              f"{'PASS' if fits else 'FAIL'}")
        if not fits:
            failures.append(path.name)
    if failures:
        print("\nOversize parts: " + ", ".join(failures))
        return 1
    print(f"\nAll exported parts fit within {BUILD_VOLUME[0]:.0f} x "
          f"{BUILD_VOLUME[1]:.0f} x {BUILD_VOLUME[2]:.0f} mm.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

