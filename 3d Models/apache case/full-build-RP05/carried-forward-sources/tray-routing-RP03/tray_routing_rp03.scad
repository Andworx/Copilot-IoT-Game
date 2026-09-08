// RP03 tray-only update. Units mm, centered XY; FRONT is -Y.
// All RP02 shell, rear-power, right-tray, joiner, and faceplate geometry remains unchanged.
include <../../../analysis/airflow/airflow_params.scad>

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

// Measured converter envelopes, kept in the same X order as RP02:
// USB-C 5 A, USB-C 5 A, Micro-USB 3 A.
converter_sizes_rp03 = [[32, 63, 19], [32, 63, 19], [14, 64, 14]];
converter_positions_rp03 = [[-126, -66], [-88, -73.5], [-58, -70.5]];
converter_mount_pitch_rp03 = 52;

// Feed-through is centered between each converter's mounting holes. Feed the
// red/black input pair through before fastening the converter to the tray.
power_drop_size = [12, 7];

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

dc_points_rp03 = [for (p = converter_positions_rp03,
                       y = [-converter_mount_pitch_rp03 / 2,
                             converter_mount_pitch_rp03 / 2]) [p[0], p[1] + y]];

function near(p, ps, r, i = 0) =
    i >= len(ps) ? false : norm(p - ps[i]) < r ? true : near(p, ps, r, i + 1);

module rr(w, d, r) {
    hull()
        for (x = [-w / 2 + r, w / 2 - r], y = [-d / 2 + r, d / 2 - r])
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

module tray_left_rp03() {
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

        for (p = dc_points_rp03)
            translate([p[0], p[1], -e]) cylinder(d = 4.6, h = deck_t + 2 * e);

        // One rounded two-wire drop per converter, centered between its screws.
        for (p = converter_positions_rp03)
            translate([p[0], p[1], -e])
                linear_extrude(deck_t + 2 * e)
                    rr(power_drop_size[0], power_drop_size[1], 2);

        // Preserve RP02 venting and the two existing general cable exits.
        for (x = [-20 : 32 : 115], y = [-75 : 28 : 85])
            if (!near([x, y], concat(mounts, pi_points, dc_points_rp03), 17))
                translate([x, y, -e])
                    linear_extrude(deck_t + 2 * e) rr(18, 5, 2);

        for (y = [-42, -62])
            translate([-30, y, -e])
                linear_extrude(deck_t + 2 * e) rr(12, 5, 2);

        recessed_label("TRAY-L RP03", [-24, 96], 3.1);
        recessed_label("FRONT", [-25, -88], 2.5);

        // RP02 seam witness marks remain in the same locations.
        for (y = [-65, 65])
            translate([-5, y - 0.4, deck_t - 0.45]) cube([10, 0.8, 0.47]);
    }
}

module assembly_rp03() {
    color("gold") tray_left_rp03();

    color([0.2, 0.4, 0.8, 0.55])
        translate([fuse_xy[0] - fuse_block_size[0] / 2,
                   fuse_xy[1] - fuse_block_size[1] / 2,
                   -fuse_block_size[2]])
            cube(fuse_block_size);

    for (i = [0 : len(converter_positions_rp03) - 1]) {
        p = converter_positions_rp03[i];
        s = converter_sizes_rp03[i];
        color(i < 2 ? "orange" : "darkorange")
            translate([p[0] - s[0] / 2, p[1] - s[1] / 2, deck_t]) cube(s);

        // Visual routing indicators only; red/black wires are not printed.
        color("red") translate([p[0] - 2, p[1], -8]) cylinder(d = 2, h = 10);
        color("black") translate([p[0] + 2, p[1], -8]) cylinder(d = 2, h = 10);
    }
}

fuse_front_y = fuse_xy[1] - fuse_block_size[1] / 2;
for (i = [0 : len(converter_positions_rp03) - 1]) {
    p = converter_positions_rp03[i];
    s = converter_sizes_rp03[i];
    assert(fuse_front_y - (p[1] + s[1] / 2) >= 2,
           "Converter intrudes into fuse-block envelope");
    assert(p[1] - s[1] / 2 >= -deck_d / 2 + 1.5,
           "Converter body is too close to the front tray edge");
}
assert(max([for (p = converter_positions_rp03) p[1]]) -
       min([for (p = converter_positions_rp03) p[1]]) >= 7.5,
       "Converter stagger was lost");

if (part == "assembly") assembly_rp03();
else if (part == "tray_L_RP03") tray_left_rp03();

