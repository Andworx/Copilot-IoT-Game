// RP09 high-contrast, multi-material front faces.
// Units: millimetres. Export base and text at the same origin, import them
// together as parts of one object, and assign different filaments.
include <../../analysis/airflow/airflow_params.scad>
include <m4_keystone_params.scad>
use <../../apache_2800_chassis.scad>

part = "layout";
$fn = 64;
eps = 0.02;

// The RP08 component geometry is physically approved and remains unchanged.
safety_hole = 12.0;
key_hole = 12.0;
led_panel_hole_d = 5.6;
screen_led_positions = [[-27, 54], [-9, 54], [9, 54], [27, 54]];
led_retainer_mount_positions = [[-38, 54], [38, 54]];
led_retainer_size = [86, 16, 2.4];
led_retainer_corner_radius = 3.0;
led_retainer_screw_clearance_d = 3.4;
led_retainer_boss_d = 7.0;
led_retainer_boss_h = 1.2;
led_retainer_boss_pocket_d = 7.4;
led_retainer_boss_pocket_depth = 1.25;
led_retainer_pilot_d = 2.6;
led_retainer_pilot_depth = 3.0;
led_flange_pocket_d = 6.4;
led_flange_pocket_depth = 1.2;
led_wire_hole_d = 3.2;
led_wire_slit_w = 2.2;
led_wire_slit_overlap = 0.8;
face_key_positions = [[-22, 10], [22, 10]];
face_rocker_positions = [[-22, -13], [22, -13]];
face_activity_positions = [[-22, 18], [22, 18], [-22, -18], [22, -18]];

// Extend the screen cover to the fixed panel's rear edge. The upper pair uses
// the panel's existing rear mounting holes; the proven lower pair stays put.
screen_cover_bottom_y = -screen_module_size[1] / 2;
screen_cover_top_y = panel_back_y - screen_module_center[1];
screen_cover_height = screen_cover_top_y - screen_cover_bottom_y;
screen_cover_size = [screen_module_size[0], screen_cover_height];
screen_cover_mount_positions = [
    [-screen_module_size[0] / 2 + module_mount_edge_inset,
     screen_cover_bottom_y + module_mount_edge_inset],
    [ screen_module_size[0] / 2 - module_mount_edge_inset,
     screen_cover_bottom_y + module_mount_edge_inset],
    [-panel_mount_x_spacing,
     panel_back_y - panel_mount_edge_inset - screen_module_center[1]],
    [ panel_mount_x_spacing,
     panel_back_y - panel_mount_edge_inset - screen_module_center[1]]
];

// Text is deliberately larger and heavier than RP08. The multi-material text
// sits in a 0.80 mm pocket and finishes 0.40 mm proud of the plate. This gives
// the slicer an unambiguous color boundary and remains clear of panel seating.
font_bold = "Liberation Sans:style=Bold";
text_pocket_depth = 0.80;
text_proud = 0.40;
text_xy_clearance = 0.12;
title_size = 5.4;
screen_title_size = 6.2;
orientation_size = 3.6;
socket_label_size = 3.8;

module plain_plate(size) {
    difference() {
        rounded_plate(size[0], size[1], module_plate_thickness,
                      module_plate_corner_radius, 0, -size[1] / 2);
        for (p = module_fastener_positions([0, 0], size))
            vertical_hole(p[0], p[1], 0, module_plate_thickness,
                          mounting_screw_diameter);
    }
}

module title_2d(kind) {
    size = kind == "screen" ? screen_title_size : title_size;
    label = kind == "screen" ? "M1 DISPLAY / STATUS" :
            kind == "safety" ? "M2 SAFETY" :
            kind == "switch" ? "M3 KEY / ROCKER" :
                               "M4 ETHERNET";
    h = kind == "screen" ? screen_module_size[1] :
        kind == "safety" ? rotary_module_size[1] :
        kind == "switch" ? switch_module_size[1] : utility_module_size[1];
    title_y = kind == "screen" ? screen_cover_top_y - 6.5 : h / 2 - 5.5;
    translate([0, title_y])
        text(label, size = size, font = font_bold,
             halign = "center", valign = "center", spacing = 1.02);
}

module orientation_2d(kind) {
    h = kind == "screen" ? screen_module_size[1] :
        kind == "safety" ? rotary_module_size[1] :
        kind == "switch" ? switch_module_size[1] : utility_module_size[1];
    orientation_y = kind == "screen" ? screen_cover_bottom_y + 5 : -h / 2 + 5;
    translate([0, orientation_y])
        text("FRONT", size = orientation_size, font = font_bold,
             halign = "center", valign = "center", spacing = 1.08);
}

module activity_labels_2d() {
    for (i = [0 : len(face_activity_positions) - 1])
        translate([face_activity_positions[i][0],
                   face_activity_positions[i][1] +
                       (face_activity_positions[i][1] > 0 ? -13 : 13)])
            text(str("LAN", i + 1), size = socket_label_size,
                 font = font_bold, halign = "center", valign = "center");
}

module visible_text_2d(kind) {
    title_2d(kind);
    orientation_2d(kind);
    if (kind == "activity") activity_labels_2d();
}

module text_pockets(kind) {
    translate([0, 0, module_plate_thickness - text_pocket_depth])
        linear_extrude(text_pocket_depth + eps)
            offset(delta = text_xy_clearance)
                visible_text_2d(kind);
}

module text_insert(kind) {
    translate([0, 0, module_plate_thickness - text_pocket_depth])
        linear_extrude(text_pocket_depth + text_proud)
            visible_text_2d(kind);
}

module raised_text(kind) {
    // Slight overlap guarantees a single watertight layer-swap mesh.
    translate([0, 0, module_plate_thickness - eps])
        linear_extrude(text_proud + eps)
            visible_text_2d(kind);
}

module bottom_id(txt, x = 0, y = 0, size = 2.4) {
    translate([x, y, -eps])
        linear_extrude(0.52)
            mirror([1, 0, 0])
                text(txt, size = size, font = font_bold,
                     halign = "center", valign = "center");
}

module led_retainer_mount_boss(p) {
    translate([p[0], p[1], -led_retainer_boss_h])
        cylinder(d = led_retainer_boss_d, h = led_retainer_boss_h);
}

module led_retainer_mount_pilot(p) {
    translate([p[0], p[1], -led_retainer_boss_h - eps])
        cylinder(d = led_retainer_pilot_d,
                 h = led_retainer_pilot_depth + eps);
}

module led_retainer_label() {
    translate([0, 5.3, led_retainer_size[2] - 0.42])
        linear_extrude(0.44)
            text("M1 LED RETAINER RP09", size = 2.2, font = font_bold,
                 halign = "center", valign = "center", spacing = 1.0);
}

module screen_led_retainer() {
    difference() {
        rounded_plate(led_retainer_size[0], led_retainer_size[1],
                      led_retainer_size[2], led_retainer_corner_radius,
                      0, -led_retainer_size[1] / 2);

        // The two face bosses register the bar and keep screw loads off the
        // LED flanges. M3 x 4 mm pan/button-head screws use these clearances.
        for (x = [-38, 38]) {
            translate([x, 0, -eps])
                cylinder(d = led_retainer_boss_pocket_d,
                         h = led_retainer_boss_pocket_depth + eps);
            vertical_hole(x, 0, 0, led_retainer_size[2],
                          led_retainer_screw_clearance_d);
        }

        // Each rear-inserted LED flange sits in a shallow pocket. The smaller
        // lead hole and open-bottom slit allow a prewired pair to slide in
        // without removing a connector or desoldering the LED.
        for (x = [-27, -9, 9, 27]) {
            translate([x, 0, -eps])
                cylinder(d = led_flange_pocket_d,
                         h = led_flange_pocket_depth + eps);
            vertical_hole(x, 0, 0, led_retainer_size[2], led_wire_hole_d);
            translate([x - led_wire_slit_w / 2,
                       -led_retainer_size[1] / 2 - eps, -eps])
                cube([led_wire_slit_w,
                      led_retainer_size[1] / 2 - led_wire_hole_d / 2 +
                          led_wire_slit_overlap + eps,
                      led_retainer_size[2] + 2 * eps]);
        }
        led_retainer_label();
    }
}

module screen_core() {
    difference() {
        union() {
            difference() {
                difference() {
                    rounded_plate(screen_cover_size[0], screen_cover_size[1],
                                  module_plate_thickness,
                                  module_plate_corner_radius, 0,
                                  screen_cover_bottom_y);
                    for (p = screen_cover_mount_positions)
                        vertical_hole(p[0], p[1], 0,
                                      module_plate_thickness,
                                      mounting_screw_diameter);
                }
                rounded_plate(screen_opening_size[0], screen_opening_size[1],
                              module_plate_thickness + 2 * eps, 3, -eps,
                              -screen_opening_size[1] / 2);
                for (p = screen_led_positions)
                    vertical_hole(p[0], p[1], 0, module_plate_thickness,
                                  led_panel_hole_d);
                bottom_id("RP09", 0, 64, 2.6);
            }
            for (p = led_retainer_mount_positions)
                led_retainer_mount_boss(p);
        }
        for (p = led_retainer_mount_positions)
            led_retainer_mount_pilot(p);
    }
}

module safety_core() {
    difference() {
        plain_plate(rotary_module_size);
        for (x = [-22, 22])
            vertical_hole(x, 0, 0, module_plate_thickness, safety_hole);
        bottom_id("RP09", 0, -29);
    }
}

module switch_core() {
    difference() {
        plain_plate(switch_module_size);
        for (p = face_key_positions)
            vertical_hole(p[0], p[1], 0, module_plate_thickness, key_hole);
        for (p = face_rocker_positions)
            vertical_hole(p[0], p[1], 0, module_plate_thickness,
                          rocker_hole_diameter);
        bottom_id("RP09", 0, -30);
    }
}

module keystone_cutout(p) {
    translate([p[0] - keystone_cutout_size[0] / 2,
               p[1] - keystone_cutout_size[1] / 2, -eps])
        cube([keystone_cutout_size[0], keystone_cutout_size[1],
              module_plate_thickness + 2 * eps]);

    // Standard keystone jacks specify a 1.6 mm mounting panel.  Recess only
    // the rear of the M4 face so its proven 3.2 mm exterior stays unchanged
    // while the spring clips engage a manufacturer-compatible local wall.
    translate([p[0] - keystone_rear_relief_size[0] / 2,
               p[1] - keystone_rear_relief_size[1] / 2, -eps])
        cube([keystone_rear_relief_size[0], keystone_rear_relief_size[1],
              keystone_rear_relief_depth + eps]);
}

module activity_core() {
    difference() {
        plain_plate(utility_module_size);
        for (p = face_activity_positions)
            keystone_cutout(p);
        bottom_id("RP09", 0, -30);
    }
}

module face_core(kind) {
    if (kind == "screen") screen_core();
    else if (kind == "safety") safety_core();
    else if (kind == "switch") switch_core();
    else activity_core();
}

module face_base(kind) {
    difference() {
        face_core(kind);
        text_pockets(kind);
    }
}

module face_layer_swap(kind) {
    union() {
        face_core(kind);
        raised_text(kind);
    }
}

module multicolor_preview(kind) {
    color([0.055, 0.065, 0.075]) face_base(kind);
    color([0.95, 0.48, 0.08]) text_insert(kind);
}

module screen_alignment_preview() {
    multicolor_preview("screen");
    for (p = screen_cover_mount_positions)
        color([0.10, 0.65, 0.95, 0.9])
            translate([p[0], p[1],
                       module_plate_thickness + text_proud + 0.05])
                cylinder(d = mounting_screw_diameter, h = 0.35);
}

module coupon_text_2d() {
    text("M3 KEY / ROCKER", size = title_size, font = font_bold,
         halign = "center", valign = "center", spacing = 1.02);
}

module coupon_core() {
    rounded_plate(90, 22, module_plate_thickness, 3, 0, -11);
}

module coupon_base() {
    difference() {
        coupon_core();
        translate([0, 0, module_plate_thickness - text_pocket_depth])
            linear_extrude(text_pocket_depth + eps)
                offset(delta = text_xy_clearance) coupon_text_2d();
    }
}

module coupon_text() {
    translate([0, 0, module_plate_thickness - text_pocket_depth])
        linear_extrude(text_pocket_depth + text_proud) coupon_text_2d();
}

module coupon_layer_swap() {
    union() {
        coupon_core();
        translate([0, 0, module_plate_thickness - eps])
            linear_extrude(text_proud + eps) coupon_text_2d();
    }
}

module coupon_preview() {
    color([0.055, 0.065, 0.075]) coupon_base();
    color([0.95, 0.48, 0.08]) coupon_text();
}

module preview_layout() {
    translate([0, 90, 0]) multicolor_preview("screen");
    translate([-100, -35, 0]) multicolor_preview("safety");
    translate([0, -35, 0]) multicolor_preview("switch");
    translate([100, -35, 0]) multicolor_preview("activity");
}

assert(text_pocket_depth >= 0.6, "Text pocket too shallow for robust color separation");
assert(text_proud >= 0.3, "Text relief too low to remain visually distinct");
assert(text_xy_clearance >= 0.10, "Text insert requires slicer-safe XY clearance");
assert(abs(keystone_local_wall_thickness - 1.6) < eps,
       "Keystone clip wall must remain at the manufacturer-recommended 1.6 mm");
assert(keystone_rear_relief_depth > 0 &&
       keystone_rear_relief_depth < module_plate_thickness,
       "Keystone rear relief must leave a positive front wall");
assert(face_activity_positions[1][0] - face_activity_positions[0][0] -
       keystone_rear_relief_size[0] >= 20,
       "M4 keystone rear reliefs crowd each other");
assert(screen_led_positions[0][1] - led_flange_pocket_d / 2 -
       screen_opening_size[1] / 2 >= 4.7 - eps,
       "Screen LEDs crowd display opening");
assert(led_retainer_mount_positions[0][0] < screen_led_positions[0][0] &&
       led_retainer_mount_positions[1][0] > screen_led_positions[3][0],
       "LED-retainer screws must remain outside the four LED flanges");
assert(abs(screen_cover_top_y + screen_module_center[1] - panel_back_y) < eps,
       "Screen cover does not reach the fixed panel rear edge");
assert(abs(screen_cover_height - 136.75) < eps,
       "Unexpected full-height screen cover dimension");
assert(screen_cover_mount_positions[2][0] == -panel_mount_x_spacing &&
       screen_cover_mount_positions[3][0] == panel_mount_x_spacing,
       "Upper screen-cover holes miss existing panel X positions");
assert(abs(screen_cover_mount_positions[2][1] + screen_module_center[1] -
           (panel_back_y - panel_mount_edge_inset)) < eps,
       "Upper screen-cover holes miss existing panel Y position");

if (part == "layout") preview_layout();
else if (part == "screen_face_base") face_base("screen");
else if (part == "screen_face_text") text_insert("screen");
else if (part == "screen_face_layer_swap") face_layer_swap("screen");
else if (part == "safety_face_base") face_base("safety");
else if (part == "safety_face_text") text_insert("safety");
else if (part == "safety_face_layer_swap") face_layer_swap("safety");
else if (part == "switch_face_base") face_base("switch");
else if (part == "switch_face_text") text_insert("switch");
else if (part == "switch_face_layer_swap") face_layer_swap("switch");
else if (part == "activity_face_base") face_base("activity");
else if (part == "activity_face_text") text_insert("activity");
else if (part == "activity_face_layer_swap") face_layer_swap("activity");
else if (part == "activity_face_preview") multicolor_preview("activity");
else if (part == "text_coupon_base") coupon_base();
else if (part == "text_coupon_text") coupon_text();
else if (part == "text_coupon_layer_swap") coupon_layer_swap();
else if (part == "text_coupon_preview") coupon_preview();
else if (part == "screen_alignment_preview") screen_alignment_preview();
else if (part == "screen_led_retainer") screen_led_retainer();
