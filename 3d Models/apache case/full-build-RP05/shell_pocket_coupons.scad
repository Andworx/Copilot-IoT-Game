// RP05 shell-rail pocket coupons. Units millimetres; extracted from the
// authoritative APACHE 2800 chassis top rail at its actual installed Z.
include <../model_params.scad>
use <../apache_2800_chassis.scad>

part = "layout";
$fn = 64;
eps_coupon = 0.02;

pocket_diameter = 9.6; // 9.0 mm panel boss + 0.30 mm radial clearance
rail_z0 = chassis_height - top_rail_height;

front_boss = [-40, 13];
rear_boss = [-105, 216];
corner_boss = [-138, 13];

module pocketed_shell(p) {
    difference() {
        chassis_shell();
        translate([p[0], p[1], rail_z0 - eps_coupon])
            cylinder(d = pocket_diameter, h = top_rail_height + 2 * eps_coupon);
    }
}

module world_coupon(p, lower, size, label, label_at, rotation = 0) {
    translate([-lower[0], -lower[1], -rail_z0])
        difference() {
            intersection() {
                pocketed_shell(p);
                translate([lower[0], lower[1], rail_z0])
                    cube([size[0], size[1], top_rail_height]);
            }
            recessed_text_cut(label, label_at[0], label_at[1], chassis_height,
                              rotation, 2.1, 0.5);
        }
}

module coupon_front() {
    // Straight front section. Cavity/interior is +Y.
    world_coupon(front_boss, [-60, 0], [40, 24],
                 "F R5 IN+Y", [-40, 5.5]);
}

module coupon_rear() {
    // Exact rear section. Cavity is -Y; the neighboring panel-mount hole at
    // (-95,218.75) remains in the extracted rail.
    world_coupon(rear_boss, [-125, 205], [40, 24],
                 "R R5 IN-Y", [-114, 224]);
}

module coupon_corner() {
    // Front-left corner tests simultaneous front and side-rail relief.
    world_coupon(corner_boss, [-153, 0], [27, 28],
                 "C R5", [-147, 20], 90);
}

module coupon_layout() {
    coupon_front();
    translate([50, 0, 0]) coupon_rear();
    translate([100, 0, 0]) coupon_corner();
}

assert(abs((pocket_diameter - boss_outer_diameter) - 0.6) < 0.001,
       "Coupon lost 0.30 mm radial boss clearance");
assert(rail_z0 == 69, "Unexpected shell top-rail elevation");

if (part == "layout") coupon_layout();
else if (part == "coupon_front") coupon_front();
else if (part == "coupon_rear") coupon_rear();
else if (part == "coupon_corner") coupon_corner();

