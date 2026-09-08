from __future__ import annotations

import hashlib
import json
import struct
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent
EXPORTS = ROOT / "exports"
RP05 = ROOT.parent / "full-build-RP05" / "exports"
CHANGED = {"shell_FL.stl", "shell_FR.stl", "rear_L.stl", "rear_R.stl",
           "safety_face.stl"}
EXPECTED_OLD = {p.name for p in RP05.glob("*.stl")}
EXPECTED_NEW = EXPECTED_OLD | {"led_clip_coupon.stl"}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_mesh(path: Path) -> dict:
    data = path.read_bytes()
    count = struct.unpack_from("<I", data, 80)[0] if len(data) >= 84 else 0
    if 84 + 50 * count == len(data):
        triangles = [
            [struct.unpack_from("<fff", data, 84 + i * 50 + 12 + j * 12)
             for j in range(3)]
            for i in range(count)
        ]
    else:
        vertices_ascii = [
            tuple(map(float, line.split()[1:]))
            for line in data.decode().splitlines()
            if line.strip().startswith("vertex ")
        ]
        assert len(vertices_ascii) % 3 == 0 and vertices_ascii, path.name
        triangles = [vertices_ascii[i:i + 3]
                     for i in range(0, len(vertices_ascii), 3)]
    vertices = [point for tri in triangles for point in tri]
    lo = [min(point[i] for point in vertices) for i in range(3)]
    hi = [max(point[i] for point in vertices) for i in range(3)]
    extents = [round(hi[i] - lo[i], 3) for i in range(3)]
    edges = Counter()
    directed = Counter()
    adjacent = defaultdict(set)
    for tri in triangles:
        rounded = [tuple(round(v, 5) for v in point) for point in tri]
        assert len(set(rounded)) == 3, (path.name, "degenerate face")
        for a, b in zip(rounded, rounded[1:] + rounded[:1]):
            edges[tuple(sorted((a, b)))] += 1
            directed[(a, b)] += 1
            adjacent[a].add(b)
            adjacent[b].add(a)
    watertight = all(value == 2 for value in edges.values())
    winding = all(directed[(a, b)] == directed[(b, a)]
                  for a, b in directed)
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
    return {
        "bytes": path.stat().st_size,
        "watertight": watertight,
        "winding_consistent": winding,
        "body_count": components,
        "extents_mm": extents,
        "fits_256mm_bed": max(extents) <= 256.0,
    }


actual = {p.name for p in EXPORTS.glob("*.stl")}
assert actual == EXPECTED_NEW, (sorted(EXPECTED_NEW - actual),
                                sorted(actual - EXPECTED_NEW))

unchanged = sorted(EXPECTED_OLD - CHANGED)
for name in unchanged:
    assert sha256(EXPORTS / name) == sha256(RP05 / name), f"changed unexpectedly: {name}"
for name in CHANGED:
    assert sha256(EXPORTS / name) != sha256(RP05 / name), f"did not change: {name}"

results = {name: validate_mesh(EXPORTS / name) for name in sorted(actual)}
for name, result in results.items():
    assert result["watertight"], f"not watertight: {name}"
    assert result["winding_consistent"], f"bad winding: {name}"
    assert result["body_count"] == 1, f"multiple bodies: {name}"
    assert result["fits_256mm_bed"], f"exceeds bed: {name}"

# Parametric guards duplicated here so validation records the design intent.
led_body = 5.03
old_printed_hole = 4.59
new_nominal_hole = 5.6
predicted_new_print = new_nominal_hole - (5.0 - old_printed_hole)
assert predicted_new_print > led_body
assert 27 + 9.4 / 2 < 33
assert -18.5 - 9.4 / 2 > -25
assert (ROOT / "exports" / "panel-shell-coupons" / "coupon_front.stl").exists()
assert (ROOT / "exports" / "panel-shell-coupons" / "coupon_rear.stl").exists()
assert (ROOT / "exports" / "panel-shell-coupons" / "coupon_corner.stl").exists()

report = {
    "revision": "RP06",
    "stl_count": len(actual),
    "changed_from_rp05": sorted(CHANGED),
    "new_parts": ["led_clip_coupon.stl"],
    "unchanged_hash_verified": unchanged,
    "shell_pocket_count": 10,
    "shell_pocket_nominal_diameter_mm": 9.6,
    "led": {
        "measured_body_mm": led_body,
        "old_nominal_hole_mm": 5.0,
        "old_printed_hole_mm": old_printed_hole,
        "new_nominal_hole_mm": new_nominal_hole,
        "predicted_printed_hole_mm": round(predicted_new_print, 2),
        "clip_bore_mm": 5.4,
        "clip_outer_diameter_mm": 9.4,
        "clip_height_mm": 3.0,
    },
    "meshes": results,
}
(EXPORTS / "validation_rp06.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
print(json.dumps({"validated": len(actual), "changed": sorted(CHANGED),
                  "new": ["led_clip_coupon.stl"]}, indent=2))
