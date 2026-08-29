"""Validate final-fit STL bounds against a 256 mm cubic build volume."""
from __future__ import annotations

import re
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parent / "exports"
LIMIT = 256.0


def dimensions(path: Path) -> tuple[float, float, float]:
    data = path.read_bytes()
    vertices: list[tuple[float, float, float]] = []
    if len(data) >= 84:
        count = struct.unpack_from("<I", data, 80)[0]
        if len(data) == 84 + count * 50:
            for triangle in range(count):
                offset = 84 + triangle * 50 + 12
                for vertex in range(3):
                    vertices.append(struct.unpack_from("<fff", data, offset + vertex * 12))
    if not vertices:
        text = data.decode("ascii", errors="ignore")
        vertices = [tuple(map(float, match)) for match in re.findall(
            r"\bvertex\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)", text
        )]
    if not vertices:
        raise ValueError(f"No vertices found in {path}")
    return tuple(max(v[a] for v in vertices) - min(v[a] for v in vertices)
                 for a in range(3))


def main() -> int:
    failed = False
    print("Part                              X       Y       Z   X1C")
    print("-" * 64)
    for path in sorted(ROOT.glob("*.stl")):
        dims = dimensions(path)
        passed = all(value <= LIMIT + 0.01 for value in dims)
        print(f"{path.name:28} {dims[0]:7.1f} {dims[1]:7.1f} {dims[2]:7.1f}   "
              f"{'PASS' if passed else 'FAIL'}")
        failed |= not passed
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())

