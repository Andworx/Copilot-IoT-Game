"""Validate the RP09 M4 keystone exports and prove all other meshes unchanged."""
from collections import Counter, defaultdict
from pathlib import Path
import hashlib
import json
import struct

ROOT = Path(__file__).resolve().parent
EXPORTS = ROOT / "exports"
COUPON = ROOT.parents[1] / "calibration" / "m4-keystone" / "RP09" / "exports" / "m4_keystone_fit_coupon.stl"

UNCHANGED_SHA256 = {
    "panel_L.stl": "db94e18056919ae5a44ffc233cc9ee45a85854666bbb6aef70c73d254c711d92",
    "panel_R.stl": "0bcc7c6b9aa26e21c9dfb64b317dffe90e3d8e3b5f502120ed77f1bed60de730",
    "safety_face_base.stl": "431bc14a20ac59763064693515dbb041b8da93214c25fad3258dbcbf66a2a830",
    "safety_face_layer_swap.stl": "0992db889873ca68acdaf7f8f0bb2cba25229483275d1c225d3c582b0459c7a8",
    "safety_face_text.stl": "d77a08ea3639c071fccc1fa8b1105ea4ac8278c55c2532ee8297cc67e3ca8208",
    "screen_face_base.stl": "2e254b4b7770f2d6d97da407b6c31fa1e2c4fbda905c4c8548eee01026e17551",
    "screen_face_layer_swap.stl": "876bddca939a0c3c8ccea4b76accd51aa81cac3fa4e60a9c35c819d881d25eb7",
    "screen_face_text.stl": "7d62be795299f7dbd33429545e9aa8a78305353a81f2de8523f688c93646c0c2",
    "screen_led_retainer.stl": "497edbf1b432748a3e60209a2cd1304e84ce8ebc050fbf62c30482bd62a749fd",
    "switch_face_base.stl": "8eb91ed56e28c81ddd9474d1e8f07a2f078f83746747520370d7b2ca946ae8b5",
    "switch_face_layer_swap.stl": "2954c559015472e67d7aec3b08cfbe153a233ec485c286dbff2af3284eb0b9d7",
    "switch_face_text.stl": "9a44e91e79bb9c0120ca385727cd0b581584f1007e5464e3b2571e3bc10a28c3",
}


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


for name, expected in UNCHANGED_SHA256.items():
    assert sha256(EXPORTS / name) == expected, (name, "unexpectedly changed")

results = {}
for name in ("activity_face_base.stl", "activity_face_text.stl",
             "activity_face_layer_swap.stl"):
    results[name] = validate_mesh(EXPORTS / name)
results["calibration/m4_keystone_fit_coupon.stl"] = validate_mesh(COUPON)

for name, result in results.items():
    assert result["closed_edges"], (name, "nonmanifold")
    assert result["winding_consistent"], (name, "inconsistent winding")
    assert result["fits_256mm_bed"], (name, result["bounds_mm"])
    if "_text.stl" not in name:
        assert result["connected_bodies"] == 1, (name, "not one body")

assert results["activity_face_base.stl"]["bounds_mm"] == [90.0, 74.0, 3.2]
assert results["activity_face_layer_swap.stl"]["bounds_mm"] == [90.0, 74.0, 3.6]
assert results["calibration/m4_keystone_fit_coupon.stl"]["bounds_mm"] == [82.0, 38.0, 3.2]

report = {
    "revision": "RP09",
    "component": "M4 ETHERNET",
    "status": "PASS - physical keystone coupon approval required",
    "production_candidate": {
        "cutout_mm": [14.9, 19.4],
        "local_clip_wall_mm": 1.6,
        "rear_relief_mm": [19.0, 23.5, 1.6],
        "port_centers_mm": [[-22, 18], [22, 18], [-22, -18], [22, -18]],
    },
    "coupon_candidates_mm": [[14.7, 19.2], [14.9, 19.4], [15.1, 19.6]],
    "unchanged_meshes_verified": len(UNCHANGED_SHA256),
    "meshes": results,
}
(EXPORTS / "validation_m4_keystone_rp09.json").write_text(
    json.dumps(report, indent=2), encoding="utf-8")
print(json.dumps(report, indent=2))
