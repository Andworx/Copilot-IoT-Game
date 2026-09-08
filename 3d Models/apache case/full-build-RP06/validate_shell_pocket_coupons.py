"""Validate RP05 shell-pocket coupons. Physical fit remains the release gate."""
from collections import Counter, defaultdict
from pathlib import Path
import json
import math
import struct

ROOT = Path(__file__).parent
OUT = ROOT / "exports" / "panel-shell-coupons"
PARTS = ["coupon_front", "coupon_rear", "coupon_corner"]


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


results = []
for part in PARTS:
    ts = triangles(OUT / f"{part}.stl")
    assert ts, part
    vertices = [point for tri in ts for point in tri]
    lo = [min(point[i] for point in vertices) for i in range(3)]
    hi = [max(point[i] for point in vertices) for i in range(3)]
    size = [hi[i] - lo[i] for i in range(3)]
    assert all(0 < value <= 256.001 for value in size), (part, size)
    assert lo[2] >= -0.001, (part, lo)

    edges = Counter()
    directed = Counter()
    adjacent = defaultdict(set)
    for tri in ts:
        rounded = [tuple(round(value, 5) for value in point) for point in tri]
        assert len(set(rounded)) == 3, (part, "degenerate")
        for a, b in zip(rounded, rounded[1:] + rounded[:1]):
            edges[tuple(sorted((a, b)))] += 1
            directed[(a, b)] += 1
            adjacent[a].add(b)
            adjacent[b].add(a)
    assert all(count == 2 for count in edges.values()), (part, "nonmanifold")
    assert all(directed[(a, b)] == directed[(b, a)] for a, b in directed), (
        part,
        "winding",
    )

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
    assert components == 1, (part, "disconnected", components)
    results.append({"part": part, "bounds_mm": size, "closed": True, "bodies": 1})

# Analytical intent checks.
boss_diameter = 9.0
pocket_diameter = 9.6
assert abs((pocket_diameter - boss_diameter) / 2.0 - 0.3) < 1e-9

# Rear coupon retains the nearby panel-mount hole. Check minimum edge ligament
# from the 9.6 mm pocket to the 4.0 mm insert hole.
rear_center_distance = math.dist((-105.0, 216.0), (-95.0, 218.75))
rear_ligament = rear_center_distance - pocket_diameter / 2.0 - 4.0 / 2.0
assert rear_ligament >= 3.0, rear_ligament

report = {
    "status": "PASS - mesh/analytical; physical panel fit required",
    "revision": "RP05",
    "parts": results,
    "boss_diameter_mm": boss_diameter,
    "pocket_diameter_mm": pocket_diameter,
    "radial_clearance_mm": 0.3,
    "rear_pocket_to_panel_insert_ligament_mm": rear_ligament,
    "print_quantity_each": 1,
}
(OUT / "validation.json").write_text(json.dumps(report, indent=2))
print("PASS: 3 RP05 shell-pocket coupons; closed, one body, printer-safe.")
print(f"Rear pocket-to-insert ligament: {rear_ligament:.3f} mm")

