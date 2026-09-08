"""Analytical RP05 panel-boss versus shell-top-rail check; dimensions in mm."""
from pathlib import Path
import json

ROOT = Path(__file__).parent

boss_radius = 9.0 / 2.0
chassis_top_outer_width = 306.3875 - 2.0
chassis_top_outer_depth = 229.45 - 2.0 * 1.5
top_ring_width = 3.2 + 7.0
top_y_offset = 1.5

inner_left_x = -chassis_top_outer_width / 2.0 + top_ring_width
inner_right_x = chassis_top_outer_width / 2.0 - top_ring_width
inner_front_y = top_y_offset + top_ring_width
inner_rear_y = top_y_offset + chassis_top_outer_depth - top_ring_width

modules = {
    "screen": {"center": (0.0, 153.0), "size": (220.0, 136.0)},
    "safety": {"center": (-98.0, 45.0), "size": (90.0, 74.0)},
    "key_rocker": {"center": (0.0, 45.0), "size": (90.0, 74.0)},
    "cable": {"center": (98.0, 45.0), "size": (90.0, 74.0)},
}
edge_inset = 5.0

collisions = []
for module, spec in modules.items():
    cx, cy = spec["center"]
    width, depth = spec["size"]
    for dx in (-width / 2.0 + edge_inset, width / 2.0 - edge_inset):
        for dy in (-depth / 2.0 + edge_inset, depth / 2.0 - edge_inset):
            x, y = cx + dx, cy + dy
            rails = []
            penetration = {}
            if y - boss_radius < inner_front_y:
                rails.append("front")
                penetration["front_mm"] = inner_front_y - (y - boss_radius)
            if y + boss_radius > inner_rear_y:
                rails.append("rear")
                penetration["rear_mm"] = y + boss_radius - inner_rear_y
            if x - boss_radius < inner_left_x:
                rails.append("left")
                penetration["left_mm"] = inner_left_x - (x - boss_radius)
            if x + boss_radius > inner_right_x:
                rails.append("right")
                penetration["right_mm"] = x + boss_radius - inner_right_x
            if rails:
                collisions.append(
                    {
                        "module": module,
                        "center_xy_mm": [x, y],
                        "rails": rails,
                        "penetration": penetration,
                        "z_overlap_mm": 8.0,
                    }
                )

assert len(collisions) == 10, collisions
assert sum("front" in item["rails"] for item in collisions) == 6
assert sum("rear" in item["rails"] for item in collisions) == 2
assert sum("left" in item["rails"] for item in collisions) == 2
assert sum("right" in item["rails"] for item in collisions) == 2

report = {
    "status": "FAIL AS-DESIGNED - ten panel bosses intersect shell top rail",
    "rail_inner_boundaries_mm": {
        "left_x": inner_left_x,
        "right_x": inner_right_x,
        "front_y": inner_front_y,
        "rear_y": inner_rear_y,
    },
    "boss_diameter_mm": 9.0,
    "collision_count": len(collisions),
    "collisions": collisions,
    "recommended_coupon_pocket_diameter_mm": 9.6,
}
(ROOT / "panel_shell_interference.json").write_text(json.dumps(report, indent=2))
print("CONFIRMED: 10 module bosses intersect the shell top rail (6 front, 2 rear, 4 side contacts).")
