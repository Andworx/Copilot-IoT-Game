"""Validate the RP09 APACHE 2800 lid-storage fit prototypes."""
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


def validate_mesh(path: Path) -> dict:
    tris = triangles(path)
    vertices = [point for tri in tris for point in tri]
    low = [min(point[i] for point in vertices) for i in range(3)]
    high = [max(point[i] for point in vertices) for i in range(3)]
    size = [round(high[i] - low[i], 3) for i in range(3)]
    edges, directed = Counter(), Counter()
    adjacent = defaultdict(set)
    for tri in tris:
        rounded = [tuple(round(value, 5) for value in point) for point in tri]
        assert len(set(rounded)) == 3, (path.name, "degenerate")
        for a, b in zip(rounded, rounded[1:] + rounded[:1]):
            edges[tuple(sorted((a, b)))] += 1
            directed[(a, b)] += 1
            adjacent[a].add(b)
            adjacent[b].add(a)
    pending, components = set(adjacent), 0
    while pending:
        todo = [pending.pop()]
        components += 1
        while todo:
            for point in adjacent[todo.pop()]:
                if point in pending:
                    pending.remove(point)
                    todo.append(point)
    return {
        "bounds_mm": size,
        "closed_edges": all(value == 2 for value in edges.values()),
        "winding_consistent": all(directed[(a, b)] == directed[(b, a)]
                                  for a, b in directed),
        "connected_bodies": components,
        "fits_256mm_bed": max(size) <= 256.001,
    }


expected = {
    "lid_fit_frame_L.stl",
    "lid_fit_frame_R.stl",
    "switch_locator_tile.stl",
    "andworx_field_kit_base.stl",
    "andworx_field_kit_logo.stl",
}
actual = {path.name for path in EXPORTS.glob("*.stl")}
assert actual == expected, (sorted(expected - actual), sorted(actual - expected))

meshes = {name: validate_mesh(EXPORTS / name) for name in sorted(actual)}
for name, result in meshes.items():
    assert result["closed_edges"], (name, "nonmanifold")
    assert result["winding_consistent"], (name, "winding")
    assert result["fits_256mm_bed"], (name, result["bounds_mm"])
    if name != "andworx_field_kit_logo.stl":
        assert result["connected_bodies"] == 1, (name, "not one body")

for name in ("lid_fit_frame_L.stl", "lid_fit_frame_R.stl"):
    bounds = meshes[name]["bounds_mm"]
    # The left alignment tongue adds 6 mm at the centre seam; the matching
    # receiver removes the same region from the right half.
    assert 140 <= bounds[0] <= 152, (name, bounds)
    assert bounds[1] == 216.0, (name, bounds)
    assert bounds[2] == 3.2, (name, bounds)

assert meshes["switch_locator_tile.stl"]["bounds_mm"] == [50.0, 50.0, 1.2]
assert meshes["andworx_field_kit_base.stl"]["bounds_mm"] == [120.0, 60.0, 2.4]
assert meshes["andworx_field_kit_logo.stl"]["bounds_mm"][2] == 0.9

report = {
    "revision": "RP09 calibration only",
    "status": "PASS - requires physical boss-pitch and closed-lid witness test",
    "measurements_mm": {
        "boss_pitch": [274.0, 200.0],
        "between_ribs": [255.0, 183.0],
        "lid_depth": 35.0,
        "provisional_storage_depth": 28.0,
        "adapter_length": 45.0,
        "key_length": 34.0,
        "cable_length": 152.4,
    },
    "physical_gates": [
        "Both frame halves install without bending and all four M3 holes align.",
        "The frame remains inside the gasket and clears every moulded rib.",
        "Painter's tape or clay on locator tiles records the safety-cover position.",
        "The lid closes without a rigid tile or frame touching any control.",
        "The final switch garage preserves at least 3-5 mm clearance.",
    ],
    "meshes": meshes,
}
(EXPORTS / "validation_lid_storage_rp09.json").write_text(
    json.dumps(report, indent=2), encoding="utf-8")
print(json.dumps(report, indent=2))
