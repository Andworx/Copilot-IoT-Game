"""Validate rear-control calibration T02 coupon meshes and design intent."""
from collections import Counter, defaultdict
from pathlib import Path
import json
import struct

ROOT = Path(__file__).resolve().parent
EXPORTS = ROOT / "exports"


def triangles(path: Path):
    data = path.read_bytes()
    if len(data) >= 84:
        count = struct.unpack_from("<I", data, 80)[0]
        if 84 + 50 * count == len(data):
            return [[struct.unpack_from("<fff", data,
                     84 + i * 50 + 12 + j * 12) for j in range(3)]
                    for i in range(count)]
    vertices = [tuple(map(float, line.split()[1:]))
                for line in data.decode().splitlines()
                if line.strip().startswith("vertex ")]
    assert vertices and len(vertices) % 3 == 0, path.name
    return [vertices[i:i + 3] for i in range(0, len(vertices), 3)]


def validate_mesh(path: Path):
    ts = triangles(path)
    vertices = [point for tri in ts for point in tri]
    lo = [min(point[i] for point in vertices) for i in range(3)]
    hi = [max(point[i] for point in vertices) for i in range(3)]
    bounds = [round(hi[i] - lo[i], 3) for i in range(3)]
    edges, directed = Counter(), Counter()
    adjacent = defaultdict(set)
    for tri in ts:
        rounded = [tuple(round(value, 5) for value in point) for point in tri]
        assert len(set(rounded)) == 3, (path.name, "degenerate")
        for a, b in zip(rounded, rounded[1:] + rounded[:1]):
            edges[tuple(sorted((a, b)))] += 1
            directed[(a, b)] += 1
            adjacent[a].add(b)
            adjacent[b].add(a)
    pending, bodies, component_bounds = set(adjacent), 0, []
    while pending:
        seed = pending.pop()
        todo, component = [seed], {seed}
        bodies += 1
        while todo:
            for point in adjacent[todo.pop()]:
                if point in pending:
                    pending.remove(point)
                    todo.append(point)
                    component.add(point)
        component_bounds.append({
            "vertices": len(component),
            "lo": [min(point[i] for point in component) for i in range(3)],
            "hi": [max(point[i] for point in component) for i in range(3)],
        })
    result = {
        "bounds_mm": bounds,
        "closed_edges": all(value == 2 for value in edges.values()),
        "winding_consistent": all(directed[(a, b)] == directed[(b, a)]
                                  for a, b in directed),
        "connected_bodies": bodies,
        "fits_256mm_bed": max(bounds) <= 256.001,
    }
    assert result["closed_edges"], (path.name, "nonmanifold")
    assert result["winding_consistent"], (path.name, "winding")
    assert bodies == 1, (path.name, "bodies", bodies, component_bounds)
    assert result["fits_256mm_bed"], (path.name, bounds)
    return result


switch_sizes = [(23.4, 29.2), (23.6, 29.8), (23.8, 30.4)]
switch_bezel = (24.75, 31.57)
switch_overlap = [((switch_bezel[0] - w) / 2,
                   (switch_bezel[1] - h) / 2)
                  for w, h in switch_sizes]
assert min(x for x, _ in switch_overlap) >= 0.45
assert min(y for _, y in switch_overlap) >= 0.55

dial_pockets = [(18.2, 0.8), (18.6, 1.4), (19.0, 2.0)]
assert dial_pockets[0][0] > 17.72
assert 3.0 - dial_pockets[-1][1] >= 1.0

expected = {"switch_coupon.stl", "dial_shoulder_coupon.stl"}
actual = {path.name for path in EXPORTS.glob("*.stl")}
assert actual == expected, (expected - actual, actual - expected)
meshes = {name: validate_mesh(EXPORTS / name) for name in sorted(actual)}

report = {
    "test_revision": "rear-control-calibration-T02",
    "status": "PASS - physical rocker and dial-shoulder selection required",
    "production_geometry_changed": False,
    "coupon_thickness_mm": 3.0,
    "switch_candidates_mm": switch_sizes,
    "switch_bezel_overlap_per_side_mm": switch_overlap,
    "dial_shoulder_measured_diameter_mm": 17.72,
    "dial_pocket_candidates_diameter_depth_mm": dial_pockets,
    "dial_bushing_hole_diameter_mm": 9.67,
    "dial_register_slot": {
        "width_mm": 3.6,
        "pin_center_offset_range_mm": [7.5, 10.5],
    },
    "meshes": meshes,
}
(EXPORTS / "validation_t02.json").write_text(json.dumps(report, indent=2),
                                              encoding="utf-8")
print(json.dumps({"validated": sorted(actual),
                  "production_geometry_changed": False}, indent=2))

