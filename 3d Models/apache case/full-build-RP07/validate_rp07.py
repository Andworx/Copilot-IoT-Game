"""Validate RP07 tray routing, front-control fits, inheritance, and meshes."""
from collections import Counter, defaultdict
from pathlib import Path
import hashlib
import json
import math
import struct

ROOT = Path(__file__).resolve().parent
EXPORTS = ROOT / "exports"
RP06 = ROOT.parent / "full-build-RP06" / "exports"


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
    ts = triangles(path)
    vertices = [point for tri in ts for point in tri]
    lo = [min(point[i] for point in vertices) for i in range(3)]
    hi = [max(point[i] for point in vertices) for i in range(3)]
    size = [round(hi[i] - lo[i], 3) for i in range(3)]
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
    closed = all(value == 2 for value in edges.values())
    winding = all(directed[(a, b)] == directed[(b, a)]
                  for a, b in directed)
    pending, components = set(adjacent), 0
    while pending:
        todo = [pending.pop()]
        components += 1
        while todo:
            for point in adjacent[todo.pop()]:
                if point in pending:
                    pending.remove(point)
                    todo.append(point)
    return {"bounds_mm": size, "closed_edges": closed,
            "winding_consistent": winding, "connected_bodies": components,
            "fits_256mm_bed": max(size) <= 256.001}


old_stls = {p.name for p in RP06.glob("*.stl")}
expected = old_stls | {"converter_bay_coupon.stl"}
actual = {p.name for p in EXPORTS.glob("*.stl")}
assert actual == expected, (sorted(expected - actual), sorted(actual - expected))

changed_stls = {"tray_L.stl", "panel_R.stl", "screen_face.stl",
                "safety_face.stl", "switch_face.stl", "activity_face.stl"}
for name in sorted(old_stls - changed_stls):
    assert sha256(EXPORTS / name) == sha256(RP06 / name), name
for name in sorted(changed_stls):
    assert sha256(EXPORTS / name) != sha256(RP06 / name), name

meshes = {name: validate_mesh(EXPORTS / name) for name in sorted(actual)}
for name, result in meshes.items():
    assert result["closed_edges"], (name, "nonmanifold")
    assert result["winding_consistent"], (name, "winding")
    assert result["connected_bodies"] == 1, (name, "bodies")
    assert result["fits_256mm_bed"], (name, result["bounds_mm"])

converter_positions = [(-128.0, -65.5), (-88.0, -74.0), (-54.0, -73.5)]
converter_sizes = [(32.0, 63.0), (32.0, 63.0), (27.0, 64.0)]
drop_center = (-30.0, -52.0)
drop_size = (12.0, 42.0)
fuse_right = -91.0 + 92.0 / 2.0
drop_left = drop_center[0] - drop_size[0] / 2.0
drop_right = drop_center[0] + drop_size[0] / 2.0
fuse_web = drop_left - fuse_right
seam_web = -0.2 - drop_right
assert abs(fuse_web - 9.0) < 1e-9
assert seam_web >= 23.8 - 1e-9

converter_clearances = []
surface_routes = []
for position, size in zip(converter_positions, converter_sizes):
    clearance = abs(position[0] - drop_center[0]) - size[0] / 2 - drop_size[0] / 2
    converter_clearances.append(clearance)
    assert clearance >= 4.5
    surface_routes.append(math.dist(position, drop_center))
assert max(surface_routes) < 100.0
assert max(y for _, y in converter_positions) - min(y for _, y in converter_positions) == 8.5

usb_gap = ((converter_positions[1][0] - converter_sizes[1][0] / 2) -
           (converter_positions[0][0] + converter_sizes[0][0] / 2))
micro_gap = ((converter_positions[2][0] - converter_sizes[2][0] / 2) -
             (converter_positions[1][0] + converter_sizes[1][0] / 2))
assert usb_gap >= 8.0
assert micro_gap >= 4.5

# Front-control analytical fit checks. The loaded M4 face needs at least 59 mm;
# RP07B uses a centered 60 mm service opening and keeps the 36 mm row pitch.
utility_opening = (66.0, 60.0)
activity_positions = [(-22.0, 18.0), (22.0, 18.0),
                      (-22.0, -18.0), (22.0, -18.0)]
socket_nut_d = 18.2
assert max(abs(x) + socket_nut_d / 2 for x, _ in activity_positions) <= utility_opening[0] / 2
assert max(abs(y) + socket_nut_d / 2 for _, y in activity_positions) <= utility_opening[1] / 2

key_positions = [(-22.0, 10.0), (22.0, 10.0)]
rocker_positions = [(-22.0, -13.0), (22.0, -13.0)]
assert max(y + 14.82 / 2 for _, y in key_positions) <= 25.0
assert min(y - 22.12 / 2 for _, y in rocker_positions) >= -25.0

screen_led_positions = [(-27.0, 54.0), (-9.0, 54.0),
                        (9.0, 54.0), (27.0, 54.0)]
screen_open_half_height = 89.0 / 2.0
led_collar_d = 9.4
screen_led_ligament = min(y - led_collar_d / 2 - screen_open_half_height
                          for _, y in screen_led_positions)
assert screen_led_ligament >= 4.7 - 1e-9

# RP03 vent grid: prove every retained 18x5 vent is clear of the 12x42 slot
# by the planned 4 mm keepout. Points within the keepout are suppressed.
vent_centers = [(x, y) for x in range(-20, 116, 32)
                for y in range(-75, 86, 28)]
suppressed = [(x, y) for x, y in vent_centers
              if abs(x - drop_center[0]) < 19.0 and
              abs(y - drop_center[1]) < 27.5]
assert suppressed == [(-20, -75), (-20, -47)]

report = {
    "revision": "RP07",
    "status": "PASS - updated converter and front-control fits require physical approval",
    "stl_count": len(actual),
    "changed_production_parts": sorted(changed_stls),
    "new_test_part": "converter_bay_coupon.stl",
    "unchanged_rp06_stl_count": len(old_stls) - len(changed_stls),
    "shared_power_drop": {"center_xy_mm": drop_center,
                          "size_mm": drop_size,
                          "fuse_web_mm": fuse_web,
                          "center_seam_web_mm": seam_web},
    "converter_positions_xy_mm": converter_positions,
    "converter_slot_clearances_mm": converter_clearances,
    "converter_body_gaps_mm": {"usb_c1_to_usb_c2": usb_gap,
                                 "usb_c2_to_micro_usb": micro_gap},
    "maximum_surface_route_mm": round(max(surface_routes), 3),
    "suppressed_vent_centers_xy_mm": suppressed,
    "front_controls": {
        "screen_led_positions_xy_mm": screen_led_positions,
        "screen_opening_to_led_collar_ligament_mm": screen_led_ligament,
        "m3_key_positions_xy_mm": key_positions,
        "m3_rocker_positions_xy_mm": rocker_positions,
        "m4_socket_positions_xy_mm": activity_positions,
        "m4_service_opening_mm": utility_opening,
    },
    "meshes": meshes,
}
(EXPORTS / "validation_rp07.json").write_text(json.dumps(report, indent=2),
                                               encoding="utf-8")
print(json.dumps({"validated": len(actual), "changed": sorted(changed_stls),
                  "coupon": "converter_bay_coupon.stl",
                  "fuse_web_mm": fuse_web, "seam_web_mm": seam_web}, indent=2))
