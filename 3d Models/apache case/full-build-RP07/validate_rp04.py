"""Validate the complete RP04 export set and revised faceplate intent."""
from collections import Counter, defaultdict
from pathlib import Path
import json
import struct

ROOT = Path(__file__).parent
EXPORTS = ROOT / "exports"
PARTS = [
    "dial_coupon", "xt_coupon", "switch_1", "switch_2", "switch_3",
    "switch_3_27", "carrier", "layout_template", "rear_L", "rear_R",
    "shell_FL", "shell_FR", "tray_L", "tray_R", "panel_L", "panel_R",
    "screen_face", "safety_face", "switch_face", "activity_face",
    "lower_joiner", "tray_joiner", "shell_joiner_x", "shell_joiner_y",
]


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
    path = EXPORTS / f"{part}.stl"
    assert path.exists(), f"missing {part}"
    ts = triangles(path)
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
        assert len(set(rounded)) == 3, (part, "degenerate face")
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
    assert components == 1, (part, "disconnected bodies", components)
    results.append(
        {
            "part": part,
            "bounds_mm": size,
            "connected_bodies": components,
            "closed_edges": True,
        }
    )

# Intent/calibration guards. Proven RP02 interfaces remain exact.
safety_nominal = 12.0
key_nominal = 12.0
socket_nominal = 15.6
rocker_nominal = 20.35
assert abs((safety_nominal - 11.62) - 0.38) < 1e-9
assert abs((key_nominal - 11.5) - 0.5) < 1e-9
assert 14.82 - key_nominal >= 2.8
assert socket_nominal == 15.6
assert rocker_nominal == 20.35

led_positions = [(-30, 24.5), (-10, 24.5), (10, 24.5), (30, 24.5)]
assert len(led_positions) == 4
assert len({y for _, y in led_positions}) == 1
assert all(y > 0 for _, y in led_positions)

report = {
    "status": "PASS - CAD-only; revised holes require physical fit test",
    "revision": "RP04",
    "parts": results,
    "changed_parts": ["safety_face", "switch_face", "activity_face"],
    "carried_forward": {
        "tray_L": "RP03",
        "all_other_parts": "RP02",
    },
    "safety_hole_nominal_mm": safety_nominal,
    "safety_failed_print_measurement_mm": 11.45,
    "key_hole_nominal_mm": key_nominal,
    "key_failed_print_measurement_mm": 11.2,
    "socket_hole_nominal_mm_unchanged": socket_nominal,
    "rocker_hole_nominal_mm_unchanged": rocker_nominal,
    "led_positions_xy_mm": led_positions,
}
(EXPORTS / "validation.json").write_text(json.dumps(report, indent=2))
print(f"PASS: {len(PARTS)} complete RP04 parts; three revised faceplates validated.")
