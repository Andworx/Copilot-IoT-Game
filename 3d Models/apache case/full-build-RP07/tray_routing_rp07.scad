// RP07 left-tray routing update. Units mm; centered XY; FRONT is -Y.
// Shared-drop geometry is retained from the successful RP07 print. Converter
// centers are adjusted from physical dry-fit feedback to clear all three
// bodies while keeping their cables beside the shared slot.
include <../analysis/airflow/airflow_params.scad>

part = "assembly";
$fn = 48;
e = 0.02;

gap = 0.4;
split_y = chassis_split_y - chassis_outer_depth / 2;
deck_w = 291;
deck_d = 214;
deck_t = equipment_tray_thickness;
fuse_xy = [-91, 30];
fuse_pocket = [92, 132];

// Micro-USB measured body width is 27 mm; the earlier 14 mm value was its
// thickness and understated the plan-view collision envelope.
converter_sizes_rp07 = [[32, 63, 19], [32, 63, 19], [27, 64, 14]];
converter_positions_rp07 = [[-128, -65.5], [-88, -74], [-54, -73.5]];
converter_mount_pitch_rp07 = 52;

power_drop_center = [-30, -52];
power_drop_size = [12, 42];
power_drop_fuse_web =
    (power_drop_center[0] - power_drop_size[0] / 2) -
    (fuse_xy[0] + fuse_pocket[0] / 2);
power_drop_seam_web =
    -gap / 2 - (power_drop_center[0] + power_drop_size[0] / 2);

mounts = concat(
    [for (x = [-17, 17], y = [-chassis_outer_depth / 2 + 11,
                              chassis_outer_depth / 2 - 11]) [x, y]],
    [for (x = [-chassis_outer_width / 2 + 11,
               chassis_outer_width / 2 - 11],
          y = [split_y - 17, split_y + 17]) [x, y]]);

pi_points = [for (x = [-floor_pi_hole_pitch[0] / 2,
                       floor_pi_hole_pitch[0] / 2],
                  y = [-floor_pi_hole_pitch[1] / 2,
                       floor_pi_hole_pitch[1] / 2]) [92 + x, 38 + y]];

dc_points_rp07 = [for (p = converter_positions_rp07,
                       y = [-converter_mount_pitch_rp07 / 2,
                             converter_mount_pitch_rp07 / 2]) [p[0], p[1] + y]];

function near(p, ps, r, i = 0) =
    i >= len(ps) ? false : norm(p - ps[i]) < r ? true : near(p, ps, r, i + 1);

// Vent centers inside this keepout are suppressed so the shared drop has a
// smooth, continuous perimeter and cannot merge into a neighboring vent.
function near_power_drop(p, margin = 4) =
    abs(p[0] - power_drop_center[0]) <
        (18 / 2 + power_drop_size[0] / 2 + margin) &&
    abs(p[1] - power_drop_center[1]) <
        (5 / 2 + power_drop_size[1] / 2 + margin);

module rr(w, d, r) {
    hull()
        for (x = [-w / 2 + r, w / 2 - r],
             y = [-d / 2 + r, d / 2 - r])
            translate([x, y]) circle(r = r);
}

module recessed_label(s, p, size = 3) {
    translate([p[0], p[1], deck_t - 0.45])
        linear_extrude(0.47)
            text(s, size = size, halign = "center", valign = "center");
}

module pocket_cut() {
    translate([fuse_xy[0], fuse_xy[1], -e])
        linear_extrude(deck_t + 2 * e)
            rr(fuse_pocket[0], fuse_pocket[1], 2);
}

module shared_power_drop() {
    translate([power_drop_center[0], power_drop_center[1], -e])
        linear_extrude(deck_t + 2 * e)
            rr(power_drop_size[0], power_drop_size[1],
               power_drop_size[0] / 2);
}

module tray_left_rp07() {
    difference() {
        intersection() {
            linear_extrude(deck_t) rr(deck_w, deck_d, 15);
            translate([-160, -120, -1]) cube([160 - gap / 2, 240, 5]);
        }

        pocket_cut();

        for (p = mounts)
            translate([p[0], p[1], -e]) cylinder(d = 3.5, h = deck_t + 2 * e);
        for (p = pi_points)
            translate([p[0], p[1], -e]) cylinder(d = 2.8, h = deck_t + 2 * e);
        for (p = dc_points_rp07)
            translate([p[0], p[1], -e]) cylinder(d = 4.6, h = deck_t + 2 * e);

        // Replaces three RP03 drops hidden beneath the converter bodies and
        // the two small general exits formerly centered at X=-30.
        shared_power_drop();

        for (x = [-20 : 32 : 115], y = [-75 : 28 : 85])
            if (!near([x, y], concat(mounts, pi_points, dc_points_rp07), 17) &&
                !near_power_drop([x, y]))
                translate([x, y, -e])
                    linear_extrude(deck_t + 2 * e) rr(18, 5, 2);

        recessed_label("TRAY-L RP07B", [-24, 96], 3.1);
        recessed_label("FRONT", [-25, -88], 2.5);
        recessed_label("POWER DROP", [-30, -27], 2.2);

        for (y = [-65, 65])
            translate([-5, y - 0.4, deck_t - 0.45]) cube([10, 0.8, 0.47]);
    }
}

coupon_x0 = -145.5;
coupon_y0 = -107;
coupon_size = [130, 84];

module converter_bay_coupon() {
    translate([-coupon_x0 - coupon_size[0] / 2,
               -coupon_y0 - coupon_size[1] / 2, 0])
        difference() {
            intersection() {
                tray_left_rp07();
                translate([coupon_x0, coupon_y0, -e])
                    cube([coupon_size[0], coupon_size[1], deck_t + 2 * e]);
            }
            recessed_label("RP07", [-25, -25], 2.5);
            // Coupon alignment ticks correspond to the production X/Y crop.
            translate([-80.5, coupon_y0, deck_t - 0.45])
                cube([1, 5, 0.47]);
        }
}

module wire_segment(a, b, z, color_name) {
    color(color_name)
        hull() {
            translate([a[0], a[1], z]) sphere(d = 2.0, $fn = 16);
            translate([b[0], b[1], z]) sphere(d = 2.0, $fn = 16);
        }
}

module assembly_rp07(underside = false) {
    module shown() {
        color("gold") tray_left_rp07();
        color([0.2, 0.4, 0.8, 0.45])
            translate([fuse_xy[0] - fuse_block_size[0] / 2,
                       fuse_xy[1] - fuse_block_size[1] / 2,
                       -fuse_block_size[2]]) cube(fuse_block_size);
        for (i = [0 : len(converter_positions_rp07) - 1]) {
            p = converter_positions_rp07[i];
            s = converter_sizes_rp07[i];
            color(i < 2 ? "orange" : "darkorange")
                translate([p[0] - s[0] / 2, p[1] - s[1] / 2, deck_t])
                    cube(s);
            // Diagrammatic top route: lead pair goes to the accessible shared
            // slot. Final harness is secured after the coupon test.
            wire_segment([p[0], p[1]],
                         [power_drop_center[0], p[1]], deck_t + s[2] + 1,
                         "red");
            wire_segment([power_drop_center[0], p[1]], power_drop_center,
                         deck_t + s[2] + 1, "black");
        }
    }
    if (underside)
        rotate([180, 0, 0]) shown();
    else
        shown();
}

fuse_front_y = fuse_xy[1] - fuse_block_size[1] / 2;
for (i = [0 : len(converter_positions_rp07) - 1]) {
    p = converter_positions_rp07[i];
    s = converter_sizes_rp07[i];
    assert(fuse_front_y - (p[1] + s[1] / 2) >= 2,
           "Converter intrudes into fuse-block envelope");
    assert(p[1] - s[1] / 2 >= -deck_d / 2 + 1.5,
           "Converter body is too close to the front tray edge");
    assert(abs(p[0] - power_drop_center[0]) -
           s[0] / 2 - power_drop_size[0] / 2 >= 4.5,
           "Shared slot crowds a converter body");
}
assert(max([for (p = converter_positions_rp07) p[1]]) -
       min([for (p = converter_positions_rp07) p[1]]) >= 7.5,
       "Converter stagger was lost");

// Pairwise X clearances use the corrected plan-view body widths. The first
// USB-C is moved left; Micro-USB moves right and down to clear USB-C2.
assert((converter_positions_rp07[1][0] - converter_sizes_rp07[1][0] / 2) -
       (converter_positions_rp07[0][0] + converter_sizes_rp07[0][0] / 2) >= 8,
       "USB-C converter bodies are too close");
assert((converter_positions_rp07[2][0] - converter_sizes_rp07[2][0] / 2) -
       (converter_positions_rp07[1][0] + converter_sizes_rp07[1][0] / 2) >= 4.5,
       "Micro-USB crowds USB-C2");
assert(power_drop_fuse_web >= 9, "Fuse-to-slot web is below 9 mm");
assert(power_drop_seam_web >= 23.8, "Slot crowds tray center seam");

if (part == "assembly") assembly_rp07(false);
else if (part == "underside") assembly_rp07(true);
else if (part == "tray_L") tray_left_rp07();
else if (part == "converter_bay_coupon") converter_bay_coupon();
