// RP06 targeted update: verified shell pockets and safety-panel LED retention.
// Units millimetres. FRONT is -Y in exported shell coordinates.
include <../case-airflow-study/airflow_params.scad>
use <rear_power.scad>
use <../apache_2800_chassis.scad>

part = "layout";
$fn = 64;
eps_rp06 = 0.02;

// The d9.6 shell-pocket coupon passed against the production panel bosses.
shell_pocket_d = 9.6;
shell_pocket_z0 = 68.8;
shell_pocket_h = 8.4;
shell_center_y = chassis_outer_depth / 2;
shell_split_y = chassis_split_y - shell_center_y;

// Production panel-boss centers transformed into centered shell coordinates.
shell_pocket_centers = [
    [-138, 13 - shell_center_y], [-58, 13 - shell_center_y],
    [-40, 13 - shell_center_y],   [40, 13 - shell_center_y],
    [58, 13 - shell_center_y],   [138, 13 - shell_center_y],
    [-138, 77 - shell_center_y], [138, 77 - shell_center_y],
    [-105, 216 - shell_center_y], [105, 216 - shell_center_y]
];

module shell_pocket(p) {
    translate([p[0], p[1], shell_pocket_z0])
        cylinder(d = shell_pocket_d, h = shell_pocket_h);
}

module shell_id(front, left) {
    // Recessed on the accessible top rail and away from all boss pockets.
    x = front ? (left ? -100 : 100) : (left ? -62 : 62);
    y = front ? -109 : 108;
    translate([x, y, chassis_height - 0.55])
        linear_extrude(height = 0.7)
            text(str(front ? "F" : "R", left ? "L" : "R", " RP06"),
                 size = 2.5, halign = "center", valign = "center");
}

module shell_rp06(front, left) {
    difference() {
        full_shell(front, left);
        for (p = shell_pocket_centers)
            if ((front == (p[1] < shell_split_y)) &&
                (left == (p[0] < 0)))
                shell_pocket(p);
        shell_id(front, left);
    }
}

// Bare 5 mm LED body measured 5.03 mm. A nominal d5.0 hole printed d4.59.
// d5.6 compensates for the observed -0.41 mm process bias.
led_panel_hole_d = 5.6;
led_clip_bore_d = 5.4;
led_clip_od = 9.4;
led_clip_h = 3.0;
led_clip_slit = 1.2;
safety_hole_rp06 = 12.0; // proven RP04 nominal; unchanged
safety_led_positions_rp06 = [[-27, -18.5], [-9, -18.5],
                             [9, -18.5], [27, -18.5]];

module rp06_bottom_engraving(txt, x, y, size = 2.5) {
    // Mirrored so the recessed mark reads correctly from the visible face.
    translate([x, y, -eps_rp06])
        linear_extrude(height = 0.52)
            mirror([1, 0, 0])
                text(txt, size = size, halign = "center", valign = "center");
}

module led_split_collar(p, base_z = module_plate_thickness) {
    difference() {
        translate([p[0], p[1], base_z])
            cylinder(d = led_clip_od, h = led_clip_h);
        translate([p[0], p[1], base_z - eps_rp06])
            cylinder(d = led_clip_bore_d, h = led_clip_h + 2 * eps_rp06);
        // Radial relief lets the collar flex around the LED body.
        translate([p[0] - led_clip_slit / 2,
                   p[1] - led_clip_od / 2 - eps_rp06,
                   base_z - eps_rp06])
            cube([led_clip_slit, led_clip_od / 2 + eps_rp06,
                  led_clip_h + 2 * eps_rp06]);
    }
}

module safety_face_rp06() {
    difference() {
        union() {
            difference() {
                provisional_module_plate(rotary_module_size, "M2 SAFETY");
                for (x = [-22, 22])
                    vertical_hole(x, 0, 0, module_plate_thickness,
                                  safety_hole_rp06);
                for (p = safety_led_positions_rp06)
                    vertical_hole(p[0], p[1], 0, module_plate_thickness,
                                  led_panel_hole_d);
                rp06_bottom_engraving("RP06", 0, 28.5, 2.6);
                rp06_bottom_engraving("LED", 0, -29, 2.4);
            }
            for (p = safety_led_positions_rp06)
                led_split_collar(p);
        }
        // Guarantee a continuous insertion path through plate and collar.
        for (p = safety_led_positions_rp06)
            translate([p[0], p[1], -eps_rp06])
                cylinder(d = led_clip_bore_d,
                         h = module_plate_thickness + led_clip_h +
                             2 * eps_rp06);
    }
}

module led_clip_coupon_rp06() {
    difference() {
        union() {
            linear_extrude(module_plate_thickness)
                hull()
                    for (x = [-9, 9], y = [-9, 9])
                        translate([x, y]) circle(r = 2);
            led_split_collar([0, 0]);
        }
        translate([0, 0, -eps_rp06])
            cylinder(d = led_clip_bore_d,
                     h = module_plate_thickness + led_clip_h +
                         2 * eps_rp06);
        rp06_bottom_engraving("5.6 RP06", 0, -7, 2.1);
        rp06_bottom_engraving("FRONT", 0, 7, 2.0);
    }
}

module shell_layout_rp06() {
    for (front = [true, false], left = [true, false])
        color(left ? [0.30, 0.48, 0.78] : [0.30, 0.66, 0.48])
            shell_rp06(front, left);
    for (p = shell_pocket_centers)
        color([0.95, 0.22, 0.15, 0.65])
            translate([p[0], p[1], 68.2]) cylinder(d = 9.0, h = 9.5);
}

module safety_layout_rp06() {
    safety_face_rp06();
    for (x = [-22, 22])
        color([0.75, 0.12, 0.12, 0.45])
            translate([x, 0, module_plate_thickness])
                cylinder(d = 17.05, h = 16);
    for (p = safety_led_positions_rp06)
        color([0.2, 0.8, 0.3, 0.75])
            translate([p[0], p[1], -4]) cylinder(d = 5.03, h = 8.2);
}

assert(led_panel_hole_d > 5.03, "LED panel hole must exceed measured body");
assert(safety_led_positions_rp06[0][0] - led_clip_od / 2 > -33,
       "Left LED collar exceeds panel opening");
assert(safety_led_positions_rp06[3][0] + led_clip_od / 2 < 33,
       "Right LED collar exceeds panel opening");
assert(safety_led_positions_rp06[0][1] - led_clip_od / 2 > -25,
       "LED collars exceed lower panel opening");

if (part == "layout") safety_layout_rp06();
else if (part == "shell_layout") shell_layout_rp06();
else if (part == "shell_FL") shell_rp06(true, true);
else if (part == "shell_FR") shell_rp06(true, false);
else if (part == "rear_L") shell_rp06(false, true);
else if (part == "rear_R") shell_rp06(false, false);
else if (part == "safety_face") safety_face_rp06();
else if (part == "led_clip_coupon") led_clip_coupon_rp06();
