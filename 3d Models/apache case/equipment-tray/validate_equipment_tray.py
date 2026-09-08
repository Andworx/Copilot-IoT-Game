from pathlib import Path
import struct
import sys

LIMIT = 256.0


def bounds(path: Path):
    data = path.read_bytes()
    vertices = []
    if len(data) >= 84:
        count = struct.unpack_from("<I", data, 80)[0]
        if 84 + count * 50 == len(data):
            for i in range(count):
                offset = 84 + i * 50 + 12
                for j in range(3):
                    vertices.append(struct.unpack_from("<fff", data, offset + j * 12))
    if not vertices:
        text = data.decode("utf-8", errors="ignore")
        for line in text.splitlines():
            fields = line.strip().split()
            if len(fields) == 4 and fields[0] == "vertex":
                vertices.append(tuple(float(v) for v in fields[1:]))
    if not vertices:
        raise ValueError(f"No STL vertices found in {path}")
    mins = [min(v[i] for v in vertices) for i in range(3)]
    maxs = [max(v[i] for v in vertices) for i in range(3)]
    return tuple(maxs[i] - mins[i] for i in range(3))


root = Path(__file__).parent / "exports" / "stl"
failed = False
for path in sorted(root.glob("*.stl")):
    size = bounds(path)
    ok = all(value <= LIMIT + 1e-3 for value in size)
    failed |= not ok
    print(f"{path.name:24} {size[0]:7.1f} x {size[1]:7.1f} x {size[2]:6.1f}  "
          f"{'PASS' if ok else 'FAIL'}")

if failed:
    sys.exit(1)
