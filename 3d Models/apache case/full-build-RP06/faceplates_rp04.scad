// RP04 faceplate-only fit correction. Units millimetres; FRONT is -Y.
// Unchanged components and every non-faceplate part are inherited from RP02,
// while tray_L is inherited from RP03.
include <../analysis/airflow/airflow_params.scad>
use <../apache_2800_chassis.scad>

part = "layout";
$fn = 64;
eps_rp04 = 0.02;

// Printed RP02 holes measured 11.45 mm (safety) and 11.20 mm (keyed), and
// neither component passed. These nominal 12.0 mm openings compensate for the
// observed undersize while retaining an adequate annulus beneath each bezel.
safety_hole_rp04 = 12.0;
key_hole_rp04 = 12.0;

// Left-to-right LED order remains RED, BLUE, GREEN, ORANGE.
safety_led_positions_rp04 = [[-30, 24.5], [-10, 24.5], [10, 24.5], [30, 24.5]];

module rp04_mark(y = -24) {
    translate([0, y, module_plate_thickness - 0.6])
        linear_extrude(height = 0.7)
            text("RP04", size = 2.6, halign = "center", valign = "center");
}

module safety_face_rp04() {
    difference() {
        provisional_module_plate(rotary_module_size, "M2 SAFETY + LED");
        for (x = [-22, 22])
            vertical_hole(x, 0, 0, module_plate_thickness, safety_hole_rp04);
        for (p = safety_led_positions_rp04)
            vertical_hole(p[0], p[1], 0, module_plate_thickness,
                          indicator_hole_diameter);
        rp04_mark();
    }
}

module switch_face_rp04() {
    difference() {
        provisional_module_plate(switch_module_size, "M3 KEY / ROCKER");
        for (x = [-22, 22]) {
            vertical_hole(x, 0, 0, module_plate_thickness, key_hole_rp04);
            // Proven fit: retain the RP02 circular rocker opening unchanged.
            vertical_hole(x, -23, 0, module_plate_thickness,
                          rocker_hole_diameter);
        }
        rp04_mark();
    }
}

module activity_face_rp04() {
    difference() {
        provisional_module_plate(utility_module_size, "M4 4-CABLE MATCH");
        // Proven fit: retain all four RP02 cable-socket openings unchanged.
        for (p = activity_socket_local_positions)
            vertical_hole(p[0], p[1], 0, module_plate_thickness,
                          activity_socket_hole_diameter);
        for (i = [0 : activity_socket_count - 1])
            translate([activity_socket_local_positions[i][0],
                       activity_socket_local_positions[i][1] + 13,
                       module_plate_thickness - 0.6])
                linear_extrude(height = 0.7)
                    text(str("S", i + 1), size = 3.2,
                         halign = "center", valign = "center");
        rp04_mark();
    }
}

module layout_rp04() {
    translate([-100, 0, 0]) color([0.82, 0.30, 0.20]) safety_face_rp04();
    color([0.30, 0.45, 0.80]) switch_face_rp04();
    translate([100, 0, 0]) color([0.25, 0.65, 0.42]) activity_face_rp04();
}

// Hard geometry guards for the revised controls and top LED row.
assert(safety_hole_rp04 > 11.62, "Safety hole must exceed measured hardware");
assert(key_hole_rp04 > 11.5, "Key hole must exceed measured hardware");
assert(key_switch_bezel_diameter - key_hole_rp04 >= 2.8,
       "Insufficient keyed-switch bezel support");
assert(safety_led_positions_rp04[0][0] - indicator_hole_diameter / 2 >
       -rotary_module_size[0] / 2 + module_mount_edge_inset,
       "Left LED crowds module fastener edge");
assert(safety_led_positions_rp04[3][0] + indicator_hole_diameter / 2 <
       rotary_module_size[0] / 2 - module_mount_edge_inset,
       "Right LED crowds module fastener edge");

if (part == "layout") layout_rp04();
else if (part == "safety_face") safety_face_rp04();
else if (part == "switch_face") switch_face_rp04();
else if (part == "activity_face") activity_face_rp04();

