// RP07B targeted front-control fit update. Units mm; FRONT is the visible face.
include <../case-airflow-study/airflow_params.scad>
use <../apache_2800_chassis.scad>

part = "layout";
$fn = 64;
eps_rp07 = 0.02;

// Preserve proven component holes and the RP06 split LED collar geometry.
safety_hole_rp07 = 12.0;
key_hole_rp07 = 12.0;
led_panel_hole_d_rp07 = 5.6;
led_clip_bore_d_rp07 = 5.4;
led_clip_od_rp07 = 9.4;
led_clip_h_rp07 = 3.0;
led_clip_slit_rp07 = 1.2;

// Four LEDs move to the upper screen bezel, clear of the visible display and
// the covered safety toggles. Left-to-right: RED, BLUE, GREEN, ORANGE.
screen_led_positions_rp07 = [[-27, 54], [-9, 54], [9, 54], [27, 54]];

// Shift the complete M3 component pattern upward 10 mm. This retains its 23 mm
// row pitch while bringing the 22.12 mm rocker bezels inside the 50 mm window.
key_positions_rp07 = [[-22, 10], [22, 10]];
rocker_positions_rp07 = [[-22, -13], [22, -13]];

// Preserve the proven 36 mm socket row pitch and center the bank vertically.
activity_positions_rp07 = [[-22, 18], [22, 18], [-22, -18], [22, -18]];
utility_opening_size_rp07 = [66, 60];

module bottom_engraving_rp07(txt, x, y, size = 2.5) {
    translate([x, y, -eps_rp07])
        linear_extrude(height = 0.52)
            mirror([1, 0, 0])
                text(txt, size = size, halign = "center", valign = "center");
}

module led_split_collar_rp07(p, base_z = module_plate_thickness) {
    difference() {
        translate([p[0], p[1], base_z])
            cylinder(d = led_clip_od_rp07, h = led_clip_h_rp07);
        translate([p[0], p[1], base_z - eps_rp07])
            cylinder(d = led_clip_bore_d_rp07,
                     h = led_clip_h_rp07 + 2 * eps_rp07);
        translate([p[0] - led_clip_slit_rp07 / 2,
                   p[1] - led_clip_od_rp07 / 2 - eps_rp07,
                   base_z - eps_rp07])
            cube([led_clip_slit_rp07,
                  led_clip_od_rp07 / 2 + eps_rp07,
                  led_clip_h_rp07 + 2 * eps_rp07]);
    }
}

module screen_face_rp07() {
    difference() {
        union() {
            difference() {
                provisional_module_plate(screen_module_size,
                                         "M1 SCREEN + STATUS LED");
                rounded_plate(screen_opening_size[0], screen_opening_size[1],
                              module_plate_thickness + 2 * eps_rp07, 3,
                              -eps_rp07, -screen_opening_size[1] / 2);
                for (p = screen_led_positions_rp07)
                    vertical_hole(p[0], p[1], 0, module_plate_thickness,
                                  led_panel_hole_d_rp07);
                bottom_engraving_rp07("RP07B", 0, 64, 2.6);
            }
            for (p = screen_led_positions_rp07)
                led_split_collar_rp07(p);
        }
        for (p = screen_led_positions_rp07)
            translate([p[0], p[1], -eps_rp07])
                cylinder(d = led_clip_bore_d_rp07,
                         h = module_plate_thickness + led_clip_h_rp07 +
                             2 * eps_rp07);
    }
}

module safety_face_rp07() {
    difference() {
        provisional_module_plate(rotary_module_size, "M2 SAFETY");
        for (x = [-22, 22])
            vertical_hole(x, 0, 0, module_plate_thickness,
                          safety_hole_rp07);
        bottom_engraving_rp07("NO LED - RP07B", 0, -29, 2.2);
    }
}

module switch_face_rp07() {
    difference() {
        provisional_module_plate(switch_module_size, "M3 KEY / ROCKER");
        for (p = key_positions_rp07)
            vertical_hole(p[0], p[1], 0, module_plate_thickness,
                          key_hole_rp07);
        for (p = rocker_positions_rp07)
            vertical_hole(p[0], p[1], 0, module_plate_thickness,
                          rocker_hole_diameter);
        bottom_engraving_rp07("UP 10 - RP07B", 0, -30, 2.2);
    }
}

module activity_face_rp07() {
    difference() {
        provisional_module_plate(utility_module_size, "M4 4-CABLE MATCH");
        for (p = activity_positions_rp07)
            vertical_hole(p[0], p[1], 0, module_plate_thickness,
                          activity_socket_hole_diameter);
        for (i = [0 : activity_socket_count - 1])
            translate([activity_positions_rp07[i][0],
                       activity_positions_rp07[i][1] +
                           (activity_positions_rp07[i][1] > 0 ? -13 : 13),
                       module_plate_thickness - 0.6])
                linear_extrude(height = 0.7)
                    text(str("S", i + 1), size = 3.2,
                         halign = "center", valign = "center");
        bottom_engraving_rp07("CENTERED - RP07B", 0, -30, 2.1);
    }
}

module panel_right_rp07() {
    difference() {
        panel_half(false);
        // Existing M4 opening is 66 x 50. Remove the full centered 66 x 60
        // service window so loaded socket hardware can pass during assembly.
        translate([utility_module_center[0] - utility_opening_size_rp07[0] / 2,
                   utility_module_center[1] - utility_opening_size_rp07[1] / 2,
                   deck_underside_z - eps_rp07])
            cube([utility_opening_size_rp07[0],
                  utility_opening_size_rp07[1],
                  panel_thickness + 2 * eps_rp07]);
        translate([72, panel_back_y - 5, chassis_height - 0.55])
            linear_extrude(height = 0.7)
                text("M4 60 RP07B", size = 2.6,
                     halign = "center", valign = "center");
    }
}

module layout_rp07() {
    translate([0, 85, 0]) screen_face_rp07();
    translate([-100, -35, 0]) safety_face_rp07();
    translate([0, -35, 0]) switch_face_rp07();
    translate([100, -35, 0]) activity_face_rp07();
}

screen_open_top = screen_opening_size[1] / 2;
assert(screen_led_positions_rp07[0][1] - led_clip_od_rp07 / 2 -
       screen_open_top >= 4.7,
       "Screen LEDs crowd the visible display opening");
assert(screen_led_positions_rp07[3][0] + led_clip_od_rp07 / 2 <
       screen_module_size[0] / 2 - module_mount_edge_inset,
       "Screen LED row crowds a module fastener");
assert(rocker_positions_rp07[0][1] - rocker_bezel_diameter / 2 >= -25,
       "M3 rocker bezel remains below the panel window");
assert(key_positions_rp07[0][1] + key_switch_bezel_diameter / 2 <= 25,
       "M3 key bezel remains above the panel window");
assert(activity_positions_rp07[0][1] + 18.2 / 2 <=
       utility_opening_size_rp07[1] / 2,
       "Upper cable socket does not clear M4 window");
assert(activity_positions_rp07[2][1] - 18.2 / 2 >=
       -utility_opening_size_rp07[1] / 2,
       "Lower cable socket does not clear M4 window");
assert(utility_module_size[1] - utility_opening_size_rp07[1] >= 14,
       "M4 opening leaves less than 7 mm plate overlap per end");

if (part == "layout") layout_rp07();
else if (part == "screen_face") screen_face_rp07();
else if (part == "safety_face") safety_face_rp07();
else if (part == "switch_face") switch_face_rp07();
else if (part == "activity_face") activity_face_rp07();
else if (part == "panel_R") panel_right_rp07();

