"""Compare the measured Rev 5 chassis envelope with the vendored APACHE 2800 STEP model.

CadQuery/OpenCascade is intentionally an analysis-only dependency. The production
print source remains OpenSCAD and physical fit tests remain authoritative.
"""

from __future__ import annotations

import json
import math
import re
from pathlib import Path

import cadquery as cq
from cadquery import importers


ROOT = Path(__file__).resolve().parents[1]
PARAMS = ROOT / "model_params.scad"
TRAY_PARAMS = ROOT / "analysis" / "equipment-tray" / "equipment_tray.scad"
AIRFLOW_PARAMS = ROOT / "analysis" / "airflow" / "airflow_params.scad"
REFERENCE = (
    ROOT
    / "references"
    / "apache-2800-cad-model"
    / "CompApache 2800 (Open).step"
)


def numeric_param(source: str, name: str) -> float:
    match = re.search(
        rf"^\s*{re.escape(name)}\s*=\s*([0-9.]+)(\s*\*\s*inch)?\s*;",
        source,
        re.M,
    )
    if not match:
        raise ValueError(f"Could not read numeric parameter {name!r}")
    value = float(match.group(1))
    return value * 25.4 if match.group(2) else value


def vector_param(source: str, name: str) -> list[float]:
    match = re.search(
        rf"^\s*{re.escape(name)}\s*=\s*\[([^\]]+)\]\s*;", source, re.M
    )
    if not match:
        raise ValueError(f"Could not read vector parameter {name!r}")
    return [float(item.strip()) for item in match.group(1).split(",")]


def chassis_parameters() -> dict[str, float]:
    source = PARAMS.read_text(encoding="utf-8")
    names = (
        "chassis_height",
        "case_bottom_bevel_height",
        "case_bottom_bevel_inset",
        "chassis_upper_relief_start_z",
        "chassis_upper_width_relief_per_side",
        "chassis_upper_depth_relief_per_side",
        "chassis_upper_corner_relief",
        "chassis_wall_thickness",
        "panel_edge_gap",
        "panel_thickness",
        "bottom_rail_height",
        "heatset_insert_depth",
        "screen_rear_keepout",
        "screen_display_depth",
    )
    result = {name: numeric_param(source, name) for name in names}
    result["chassis_outer_width"] = numeric_param(
        source, "measured_chassis_outer_width"
    )
    result["chassis_outer_depth"] = numeric_param(
        source, "measured_chassis_outer_depth"
    )
    result["chassis_corner_radius"] = numeric_param(
        source, "corner_radius"
    ) - numeric_param(source, "chassis_clearance")
    return result


def smoothstep(value: float) -> float:
    return value * value * (3.0 - 2.0 * value)


def profile_at(z: float, p: dict[str, float]) -> tuple[float, float, float]:
    bevel_h = p["case_bottom_bevel_height"]
    relief_z = p["chassis_upper_relief_start_z"]
    height = p["chassis_height"]

    if z <= bevel_h:
        phase = max(0.0, min(1.0, z / bevel_h))
        inset = p["case_bottom_bevel_inset"] * (1.0 - smoothstep(phase))
        return (
            p["chassis_outer_width"] - 2.0 * inset,
            p["chassis_outer_depth"] - 2.0 * inset,
            max(2.0, p["chassis_corner_radius"] - inset),
        )
    if z <= relief_z:
        return (
            p["chassis_outer_width"],
            p["chassis_outer_depth"],
            p["chassis_corner_radius"],
        )

    phase = max(0.0, min(1.0, (z - relief_z) / (height - relief_z)))
    return (
        p["chassis_outer_width"]
        - 2.0 * p["chassis_upper_width_relief_per_side"] * phase,
        p["chassis_outer_depth"]
        - 2.0 * p["chassis_upper_depth_relief_per_side"] * phase,
        p["chassis_corner_radius"]
        + p["chassis_upper_corner_relief"] * phase,
    )


def rounded_wire(width: float, depth: float, radius: float, z: float) -> cq.Wire:
    q = radius / math.sqrt(2.0)
    return (
        cq.Workplane("XY", origin=(0.0, 0.0, z))
        .moveTo(-width / 2.0 + radius, -depth / 2.0)
        .lineTo(width / 2.0 - radius, -depth / 2.0)
        .threePointArc(
            (width / 2.0 - radius + q, -depth / 2.0 + radius - q),
            (width / 2.0, -depth / 2.0 + radius),
        )
        .lineTo(width / 2.0, depth / 2.0 - radius)
        .threePointArc(
            (width / 2.0 - radius + q, depth / 2.0 - radius + q),
            (width / 2.0 - radius, depth / 2.0),
        )
        .lineTo(-width / 2.0 + radius, depth / 2.0)
        .threePointArc(
            (-width / 2.0 + radius - q, depth / 2.0 - radius + q),
            (-width / 2.0, depth / 2.0 - radius),
        )
        .lineTo(-width / 2.0, -depth / 2.0 + radius)
        .threePointArc(
            (-width / 2.0 + radius - q, -depth / 2.0 + radius - q),
            (-width / 2.0 + radius, -depth / 2.0),
        )
        .close()
        .val()
    )


def chassis_envelope(p: dict[str, float]) -> cq.Shape:
    bevel_h = p["case_bottom_bevel_height"]
    relief_z = p["chassis_upper_relief_start_z"]
    height = p["chassis_height"]
    levels = [0.0]
    levels.extend(bevel_h * i / 6.0 for i in range(1, 7))
    levels.extend([relief_z, height])
    levels = sorted(set(levels))

    sections = []
    for z in levels:
        width, depth, radius = profile_at(z, p)
        sections.append(rounded_wire(width, depth, radius, z))

    segments = [
        cq.Solid.makeLoft([sections[i], sections[i + 1]], True)
        for i in range(len(sections) - 1)
    ]
    envelope: cq.Shape = segments[0]
    for segment in segments[1:]:
        envelope = envelope.fuse(segment)
    return envelope


def rounded_perimeter(
    width: float, depth: float, radius: float, samples_per_feature: int = 7
) -> list[tuple[float, float, float, float]]:
    points: list[tuple[float, float, float, float]] = []

    for i in range(samples_per_feature + 1):
        t = i / samples_per_feature
        x = -width / 2.0 + radius + t * (width - 2.0 * radius)
        points.append((x, -depth / 2.0, 0.0, -1.0))
        points.append((x, depth / 2.0, 0.0, 1.0))
        y = -depth / 2.0 + radius + t * (depth - 2.0 * radius)
        points.append((-width / 2.0, y, -1.0, 0.0))
        points.append((width / 2.0, y, 1.0, 0.0))

    corners = (
        (width / 2.0 - radius, depth / 2.0 - radius, 0.0),
        (-width / 2.0 + radius, depth / 2.0 - radius, 90.0),
        (-width / 2.0 + radius, -depth / 2.0 + radius, 180.0),
        (width / 2.0 - radius, -depth / 2.0 + radius, 270.0),
    )
    for cx, cy, start_degrees in corners:
        for i in range(1, samples_per_feature):
            angle = math.radians(start_degrees + 90.0 * i / samples_per_feature)
            nx, ny = math.cos(angle), math.sin(angle)
            points.append((cx + radius * nx, cy + radius * ny, nx, ny))
    return points


def find_floor_top(lower: cq.Solid, x: float, y: float) -> float:
    transitions = []
    previous_inside = lower.isInside(cq.Vector(x, y, -5.0), 1e-5)
    previous_z = -5.0
    for step in range(1, 301):
        z = -5.0 + step * 0.5
        inside = lower.isInside(cq.Vector(x, y, z), 1e-5)
        if previous_inside and not inside:
            transitions.append((previous_z, z))
        previous_inside, previous_z = inside, z
    if not transitions:
        raise RuntimeError("Could not locate the modeled interior floor")
    low, high = transitions[0]
    for _ in range(24):
        mid = (low + high) / 2.0
        if lower.isInside(cq.Vector(x, y, mid), 1e-6):
            low = mid
        else:
            high = mid
    return high


def inner_axis_bounds(
    lower: cq.Solid, axis: str, fixed: float, z: float, limit: float = 180.0
) -> tuple[float, float]:
    def point(value: float) -> cq.Vector:
        return cq.Vector(value, fixed, z) if axis == "x" else cq.Vector(fixed, value, z)

    bounds = []
    for direction in (-1.0, 1.0):
        last_void = 0.0
        hit = None
        steps = int(limit / 0.25)
        for i in range(1, steps + 1):
            value = direction * i * 0.25
            if lower.isInside(point(value), 1e-5):
                low, high = last_void, value
                for _ in range(18):
                    mid = (low + high) / 2.0
                    if lower.isInside(point(mid), 1e-6):
                        high = mid
                    else:
                        low = mid
                hit = high
                break
            last_void = value
        if hit is None:
            raise RuntimeError(f"No {axis}-axis inner wall found in direction {direction}")
        bounds.append(hit)
    return min(bounds), max(bounds)


def perimeter_penetrations(
    lower: cq.Solid,
    p: dict[str, float],
    center_x: float,
    center_y: float,
    floor_top: float,
    levels: list[float],
) -> tuple[int, list[dict[str, float | int]]]:
    total = 0
    rows = []
    for relative_z in levels:
        width, depth, radius = profile_at(relative_z, p)
        collisions = 0
        for x, y, _, _ in rounded_perimeter(width, depth, radius):
            probe = cq.Vector(center_x + x, center_y + y, floor_top + relative_z + 0.15)
            collisions += int(lower.isInside(probe, 1e-5))
        total += collisions
        rows.append(
            {
                "z": relative_z,
                "width": width,
                "depth": depth,
                "radius": radius,
                "colliding_samples": collisions,
            }
        )
    return total, rows


def inner_wire_at(lower: cq.Solid, z: float) -> cq.Wire:
    section = cq.Workplane("XY", origin=(0.0, 0.0, z)).add(lower).section().val()
    wires = sorted(
        section.Wires(),
        key=lambda wire: wire.BoundingBox().xlen * wire.BoundingBox().ylen,
        reverse=True,
    )
    if len(wires) < 2:
        raise RuntimeError(f"Expected outer and inner case wires at Z={z:.3f}")
    return wires[1]


def effective_rounded_radius(wire: cq.Wire) -> float | None:
    box = wire.BoundingBox()
    area = cq.Face.makeFromWires(wire).Area()
    removed = box.xlen * box.ylen - area
    divisor = 4.0 - math.pi
    return math.sqrt(removed / divisor) if removed > 0.0 else None


def outside_area(
    cavity: cq.Face,
    width: float,
    depth: float,
    radius: float,
    z: float,
    center_x: float,
    center_y: float,
) -> float:
    wire = rounded_wire(width, depth, radius, z).moved(
        cq.Location(cq.Vector(center_x, center_y, 0.0))
    )
    return cq.Face.makeFromWires(wire).cut(cavity).Area()


def required_uniform_relief(
    cavity: cq.Face,
    width: float,
    depth: float,
    radius: float,
    z: float,
    center_x: float,
    center_y: float,
    tolerance_area: float = 0.01,
) -> float | None:
    if outside_area(cavity, width, depth, radius, z, center_x, center_y) <= tolerance_area:
        return 0.0
    low, high = 0.0, 8.0
    if outside_area(
        cavity, width - 2 * high, depth - 2 * high, radius, z, center_x, center_y
    ) > tolerance_area:
        return None
    for _ in range(18):
        mid = (low + high) / 2.0
        area = outside_area(
            cavity, width - 2 * mid, depth - 2 * mid, radius, z, center_x, center_y
        )
        if area <= tolerance_area:
            high = mid
        else:
            low = mid
    return high


def required_radius_increase(
    cavity: cq.Face,
    width: float,
    depth: float,
    radius: float,
    z: float,
    center_x: float,
    center_y: float,
    tolerance_area: float = 0.01,
) -> float | None:
    if outside_area(cavity, width, depth, radius, z, center_x, center_y) <= tolerance_area:
        return 0.0
    low, high = radius, min(width, depth) / 2.0 - 0.05
    if outside_area(cavity, width, depth, high, z, center_x, center_y) > tolerance_area:
        return None
    for _ in range(18):
        mid = (low + high) / 2.0
        area = outside_area(cavity, width, depth, mid, z, center_x, center_y)
        if area <= tolerance_area:
            high = mid
        else:
            low = mid
    return high - radius


def main() -> None:
    p = chassis_parameters()
    tray_source = TRAY_PARAMS.read_text(encoding="utf-8")
    airflow_source = AIRFLOW_PARAMS.read_text(encoding="utf-8")
    assembly = importers.importStep(str(REFERENCE)).val()
    solids = sorted(assembly.Solids(), key=lambda solid: solid.Volume(), reverse=True)
    lower = solids[0]
    lower_box = lower.BoundingBox()
    nominal_x = (lower_box.xmin + lower_box.xmax) / 2.0
    nominal_y = (lower_box.ymin + lower_box.ymax) / 2.0
    floor_top = find_floor_top(lower, nominal_x, nominal_y)

    levels = [2.0, 6.0, 10.0, 12.0, 16.0, 30.0, 50.0, 69.0, 77.0]
    reference_wire = inner_wire_at(lower, floor_top + 40.0)
    reference_box = reference_wire.BoundingBox()
    best_x = (reference_box.xmin + reference_box.xmax) / 2.0
    best_y = (reference_box.ymin + reference_box.ymax) / 2.0

    cross_sections = []
    for relative_z in levels:
        z = floor_top + relative_z + 0.15
        inner_wire = inner_wire_at(lower, z)
        cavity = cq.Face.makeFromWires(inner_wire)
        box = inner_wire.BoundingBox()
        width, depth, radius = profile_at(relative_z, p)
        area_outside = outside_area(
            cavity, width, depth, radius, z, best_x, best_y
        )
        cross_sections.append(
            {
                "z": relative_z,
                "model_clear_width": box.xlen,
                "model_clear_depth": box.ylen,
                "model_effective_corner_radius": effective_rounded_radius(inner_wire),
                "chassis_width": width,
                "chassis_depth": depth,
                "chassis_radius": radius,
                "axial_width_margin_total": box.xlen - width,
                "axial_depth_margin_total": box.ylen - depth,
                "chassis_area_outside_cavity_mm2": area_outside,
                "required_uniform_relief_per_side": required_uniform_relief(
                    cavity, width, depth, radius, z, best_x, best_y
                ),
                "required_radius_increase": required_radius_increase(
                    cavity, width, depth, radius, z, best_x, best_y
                ),
            }
        )

    tray_width = numeric_param(tray_source, "tray_width")
    tray_depth = numeric_param(tray_source, "tray_depth")
    tray_thickness = numeric_param(airflow_source, "equipment_tray_thickness")
    tray_pi_position = vector_param(tray_source, "tray_pi_position")
    floor_pi_size = vector_param(airflow_source, "floor_pi_size")
    fuse_size = vector_param(airflow_source, "fuse_block_size")
    install_above_floor = (
        p["bottom_rail_height"] + p["heatset_insert_depth"] + 2.0
    )
    tray_top_above_floor = install_above_floor + tray_thickness
    panel_underside_above_floor = p["chassis_height"] - p["panel_thickness"]
    lower_opening_width = p["chassis_outer_width"] - 2.0 * (
        p["chassis_wall_thickness"] + 4.0
    )
    lower_opening_depth = p["chassis_outer_depth"] - 2.0 * (
        p["chassis_wall_thickness"] + 4.0
    )
    panel_width = (
        p["chassis_outer_width"]
        - 2.0 * p["chassis_upper_width_relief_per_side"]
        - 2.0 * p["chassis_wall_thickness"]
        - 2.0 * p["panel_edge_gap"]
    )
    panel_depth = (
        p["chassis_outer_depth"]
        - 2.0 * p["chassis_upper_depth_relief_per_side"]
        - 2.0 * p["chassis_wall_thickness"]
        - 2.0 * p["panel_edge_gap"]
    )
    z16 = next(row for row in cross_sections if row["z"] == 16.0)
    z77 = next(row for row in cross_sections if row["z"] == 77.0)
    screen_pi_width = 85.0
    pi_x_gap = (
        tray_pi_position[0] - floor_pi_size[0] / 2.0 - screen_pi_width / 2.0
    )

    result = {
        "reference_step": str(REFERENCE.relative_to(ROOT)),
        "lower_case_bbox_mm": {
            "x": lower_box.xlen,
            "y": lower_box.ylen,
            "z": lower_box.zlen,
        },
        "lower_case_solid_volume_mm3": lower.Volume(),
        "modeled_center_floor_z_mm": floor_top,
        "best_chassis_center_mm": {"x": best_x, "y": best_y},
        "cross_sections": cross_sections,
        "tray_and_panel_integration": {
            "tray_top_above_physical_floor": tray_top_above_floor,
            "tray_case_clearance_per_side_at_z16": {
                "x": (z16["model_clear_width"] - tray_width) / 2.0,
                "y": (z16["model_clear_depth"] - tray_depth) / 2.0,
            },
            "tray_chassis_opening_clearance_per_side": {
                "x": (lower_opening_width - tray_width) / 2.0,
                "y": (lower_opening_depth - tray_depth) / 2.0,
            },
            "panel_case_clearance_per_side_at_z77": {
                "x": (z77["model_clear_width"] - panel_width) / 2.0,
                "y": (z77["model_clear_depth"] - panel_depth) / 2.0,
            },
            "panel_chassis_gap_per_side": p["panel_edge_gap"],
            "floor_pi_position": tray_pi_position,
            "floor_pi_to_screen_pi_hard_x_gap": pi_x_gap,
            "floor_pi_to_screen_pi_gap_after_2mm_allowance": pi_x_gap - 2.0,
            "fuse_top_above_physical_floor": tray_top_above_floor + fuse_size[2],
            "fuse_to_panel_underside_vertical_gap": (
                panel_underside_above_floor
                - tray_top_above_floor
                - fuse_size[2]
            ),
        },
        "limitations": [
            "The upstream author calls the case model approximate and notes measurement errors.",
            "The analysis aligns the chassis algorithmically; it does not prove the physical case matches the STEP model.",
            "Printed seam pads and fasteners are not part of the outer-envelope collision solid.",
            "Physical upper-frame fit testing remains the production gate.",
        ],
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
