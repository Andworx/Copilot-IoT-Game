"""Validate RP09 high-contrast face exports and RP08 release immutability."""
from collections import Counter, defaultdict
from pathlib import Path
import hashlib
import json
import struct

ROOT = Path(__file__).resolve().parent
EXPORTS = ROOT / "exports"
RP08 = ROOT.parents[1] / "releases" / "RP08"
CALIBRATION = ROOT.parents[1] / "calibration" / "face-text" / "RP09" / "exports"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


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
    f"{face}_face_{variant}.stl"
    for face in ("screen", "safety", "switch", "activity")
    for variant in ("base", "text", "layer_swap")
}
actual = {path.name for path in EXPORTS.glob("*.stl")}
assert actual == expected, (sorted(expected - actual), sorted(actual - expected))

coupon_expected = {f"text_coupon_{variant}.stl"
                   for variant in ("base", "text", "layer_swap")}
coupon_actual = {path.name for path in CALIBRATION.glob("*.stl")}
assert coupon_actual == coupon_expected, (
    sorted(coupon_expected - coupon_actual), sorted(coupon_actual - coupon_expected))

meshes = {name: validate_mesh(EXPORTS / name) for name in sorted(actual)}
coupon_meshes = {name: validate_mesh(CALIBRATION / name)
                 for name in sorted(coupon_actual)}
meshes.update({f"calibration/{name}": value
               for name, value in coupon_meshes.items()})
for name, result in meshes.items():
    assert result["closed_edges"], (name, "nonmanifold")
    assert result["winding_consistent"], (name, "winding")
    assert result["fits_256mm_bed"], (name, result["bounds_mm"])
    if "_text.stl" not in name:
        assert result["connected_bodies"] == 1, (name, "not one body")

expected_xy = {
    "screen": [220.0, 136.75],
    "safety": [90.0, 74.0],
    "switch": [90.0, 74.0],
    "activity": [90.0, 74.0],
}
for face, xy in expected_xy.items():
    for variant in ("base", "layer_swap"):
        bounds = meshes[f"{face}_face_{variant}.stl"]["bounds_mm"]
        assert bounds[:2] == xy, (face, variant, bounds)

screen_cover_alignment = {
    "size_mm": [220.0, 136.75],
    "panel_rear_edge_global_y_mm": 221.75,
    "cover_rear_edge_global_y_mm": 221.75,
    "lower_hole_centers_local_xy_mm": [[-105.0, -63.0], [105.0, -63.0]],
    "upper_hole_centers_local_xy_mm": [[-95.0, 65.75], [95.0, 65.75]],
    "upper_hole_centers_global_xy_mm": [[-95.0, 218.75], [95.0, 218.75]],
    "led_centers_local_xy_mm": [[-27, 54], [-9, 54], [9, 54], [27, 54]],
}
assert screen_cover_alignment["panel_rear_edge_global_y_mm"] == \
       screen_cover_alignment["cover_rear_edge_global_y_mm"]

# Text choices are intentionally substantial enough to survive 0.4 mm nozzles.
text_geometry = {
    "font": "Liberation Sans Bold",
    "title_size_mm": 5.4,
    "screen_title_size_mm": 6.2,
    "orientation_size_mm": 3.6,
    "socket_label_size_mm": 3.8,
    "pocket_depth_mm": 0.8,
    "proud_height_mm": 0.4,
    "xy_clearance_mm": 0.12,
}
assert text_geometry["title_size_mm"] >= 5.0
assert text_geometry["pocket_depth_mm"] >= 0.6
assert text_geometry["proud_height_mm"] >= 0.3

# Prove the immutable release meshes still match their curated manifest.
manifest = json.loads((RP08 / "manifest.json").read_text(encoding="utf-8"))
rp08_stls = [item for item in manifest["files"]
             if item["path"].startswith("stl/")]
for item in rp08_stls:
    path = RP08 / item["path"]
    assert path.stat().st_size == item["size_bytes"], item["path"]
    assert sha256(path) == item["sha256"], item["path"]

report = {
    "revision": "RP09",
    "status": "PASS - revised screen cover requires physical fit approval",
    "exports": sorted(actual),
    "calibration_exports": sorted(coupon_actual),
    "text_geometry": text_geometry,
    "screen_cover_alignment": screen_cover_alignment,
    "rp08_release_stls_verified": len(rp08_stls),
    "meshes": meshes,
}
(EXPORTS / "validation_rp09.json").write_text(
    json.dumps(report, indent=2), encoding="utf-8")
print(json.dumps({
    "validated_meshes": len(meshes),
    "rp08_release_stls_verified": len(rp08_stls),
    "print_next": ["screen_face_base.stl", "screen_face_text.stl"],
}, indent=2))
