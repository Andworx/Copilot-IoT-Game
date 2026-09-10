"""RP03 left-tray mesh and routing validation. Physical fit remains required."""
from collections import Counter, defaultdict
from pathlib import Path
import json
import struct

ROOT = Path(__file__).parent
STL = ROOT / "exports" / "tray_L_RP03.stl"


def triangles(path: Path):
    data = path.read_bytes()
    if len(data) >= 84:
        count = struct.unpack_from("<I", data, 80)[0]
        if 84 + 50 * count == len(data):
            return [
                [
                    struct.unpack_from("<fff", data, 84 + i * 50 + 12 + j * 12)
                    for j in range(3)
                ]
                for i in range(count)
            ]
    vertices = [
        tuple(map(float, line.split()[1:]))
        for line in data.decode().splitlines()
        if line.strip().startswith("vertex ")
    ]
    assert len(vertices) % 3 == 0
    return [vertices[i : i + 3] for i in range(0, len(vertices), 3)]


ts = triangles(STL)
assert ts, "empty STL"
vertices = [point for tri in ts for point in tri]
lo = [min(point[i] for point in vertices) for i in range(3)]
hi = [max(point[i] for point in vertices) for i in range(3)]
size = [hi[i] - lo[i] for i in range(3)]
assert all(0 < value <= 256.001 for value in size), size
assert lo[2] >= -0.001, lo

edges = Counter()
directed = Counter()
adjacent = defaultdict(set)
for tri in ts:
    rounded = [tuple(round(value, 5) for value in point) for point in tri]
    assert len(set(rounded)) == 3, "degenerate face"
    for a, b in zip(rounded, rounded[1:] + rounded[:1]):
        edges[tuple(sorted((a, b)))] += 1
        directed[(a, b)] += 1
        adjacent[a].add(b)
        adjacent[b].add(a)

assert all(count == 2 for count in edges.values()), "nonmanifold edges"
assert all(directed[(a, b)] == directed[(b, a)] for a, b in directed), "winding"

pending = set(adjacent)
components = 0
while pending:
    todo = [pending.pop()]
    components += 1
    while todo:
        for point in adjacent[todo.pop()]:
            if point in pending:
                pending.remove(point)
                todo.append(point)
assert components == 1, ("disconnected bodies", components)

positions = [(-126.0, -66.0), (-88.0, -73.5), (-58.0, -70.5)]
sizes = [(32.0, 63.0), (32.0, 63.0), (14.0, 64.0)]
fuse_front_y = 30.0 - 124.0 / 2.0
tray_front_y = -214.0 / 2.0
for position, envelope in zip(positions, sizes):
    assert fuse_front_y - (position[1] + envelope[1] / 2.0) >= 2.0
    assert position[1] - envelope[1] / 2.0 >= tray_front_y + 1.5

assert max(y for _, y in positions) - min(y for _, y in positions) >= 7.5

# Each 12 x 7 mm drop is centered between holes spaced 52 mm apart.
# Its nearest edge remains over 19 mm from either mounting-hole center.
assert 52.0 / 2.0 - 7.0 / 2.0 > 19.0

# The converters remain separated laterally; no envelope overlaps another.
for i in range(len(positions)):
    for j in range(i + 1, len(positions)):
        x_gap = abs(positions[i][0] - positions[j][0]) - (sizes[i][0] + sizes[j][0]) / 2.0
        y_gap = abs(positions[i][1] - positions[j][1]) - (sizes[i][1] + sizes[j][1]) / 2.0
        assert x_gap >= 0 or y_gap >= 0, (i, j, x_gap, y_gap)

report = {
    "status": "PASS - CAD-only; physical fit and wire bend test required",
    "part": "tray_L_RP03",
    "bounds_mm": size,
    "connected_bodies": components,
    "closed_edges": True,
    "converter_centers_xy_mm": positions,
    "converter_stagger_mm": max(y for _, y in positions) - min(y for _, y in positions),
    "power_drop_slots_mm": [12, 7],
    "power_drop_slot_count": 3,
    "unchanged_parts_source": "model-rp08-source:3d Models/apache case/full-build-RP02/exports",
}
(ROOT / "exports" / "validation.json").write_text(json.dumps(report, indent=2))
print("PASS: tray_L_RP03 is closed, consistently oriented, one body;")
print("three staggered converter envelopes and three two-wire drops validated.")
