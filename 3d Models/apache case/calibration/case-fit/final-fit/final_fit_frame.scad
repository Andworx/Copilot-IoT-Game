/*
  Standalone final fit frame for the APACHE case.

  Width comes from the successful Rev 3 width test. Front and rear spans come
  from the user's successful mixed length-gauge pair:
    F 227.95 -> 113.975 mm front span (0.50 mm shorter than prior final test)
    R 230.95 -> 115.475 mm rear span
    assembled depth -> 229.450 mm

  This file does not include or modify the production chassis project.
*/

$fn = 48;
part = "assembly";
// [assembly,front_left,front_right,rear_left,rear_right,pin_joiner_x,pin_joiner_y]

frame_width = 306.3875;
front_gauge_reference = 227.95;
rear_gauge_reference = 230.95;
front_span = front_gauge_reference / 2;
rear_span = rear_gauge_reference / 2;
frame_depth = front_span + rear_span;

corner_radius = 21.5;
bevel_height = 12.0;
bevel_inset = 10.0;
bevel_curve_steps = 6;
rail_thickness = 7.2;
frame_height = 12.0;

split_gap = 0.20;
boss_diameter = 9.0;
boss_center_from_edge = 11.0;
pin_hole_diameter = 4.0;
pin_clearance = 0.25;
joiner_spacing = 34.0;
joiner_width = 16.0;
joiner_thickness = 2.4;
pin_height = 5.0;
label_depth = 0.70;
label_size = 3.4;
eps = 0.02;

echo(str("FINAL FIT FRAME: ", frame_width, " x ", frame_depth, " x ",
         frame_height, " mm"));
echo(str("FRONT/REAR SPANS: ", front_span, " / ", rear_span, " mm"));

module rounded_rect_2d(w, d, r) {
    rr = min(r, min(w, d) / 2 - eps);
    hull()
        for (x = [-w/2 + rr, w/2 - rr], y = [rr, d - rr])
            translate([x, y]) circle(r = rr);
}

function smoothstep01(v) = v * v * (3 - 2 * v);

module tapered_ring_slice(w, d, r, t, inset0, inset1, z0, z1) {
    difference() {
        hull() {
            translate([0, inset0, z0])
                linear_extrude(height = eps)
                    rounded_rect_2d(w - 2*inset0, d - 2*inset0,
                                    max(2, r - inset0));
            translate([0, inset1, z1 - eps])
                linear_extrude(height = eps)
                    rounded_rect_2d(w - 2*inset1, d - 2*inset1,
                                    max(2, r - inset1));
        }
        hull() {
            translate([0, inset0 + t, z0 - eps])
                linear_extrude(height = 2*eps)
                    rounded_rect_2d(w - 2*inset0 - 2*t,
                                    d - 2*inset0 - 2*t,
                                    max(1, r - inset0 - t));
            translate([0, inset1 + t, z1 - eps])
                linear_extrude(height = 2*eps)
                    rounded_rect_2d(w - 2*inset1 - 2*t,
                                    d - 2*inset1 - 2*t,
                                    max(1, r - inset1 - t));
        }
    }
}

module validated_bevel_ring() {
    render(convexity = 10)
        union()
            for (i = [0 : bevel_curve_steps - 1]) {
                t0 = i / bevel_curve_steps;
                t1 = (i + 1) / bevel_curve_steps;
                inset0 = bevel_inset * (1 - smoothstep01(t0));
                inset1 = bevel_inset * (1 - smoothstep01(t1));
                tapered_ring_slice(frame_width, frame_depth,
                                   corner_radius, rail_thickness,
                                   inset0, inset1,
                                   bevel_height*t0,
                                   bevel_height*t1 + eps);
            }
}

module vertical_hole(x, y, d) {
    translate([x, y, -eps]) cylinder(h = frame_height + 2*eps, d = d);
}

module frame_complete() {
    difference() {
        union() {
            validated_bevel_ring();

            // Two bosses span each of the four quadrant seams.
            for (x = [-joiner_spacing/2, joiner_spacing/2],
                 y = [boss_center_from_edge,
                      frame_depth - boss_center_from_edge])
                translate([x, y, 0])
                    cylinder(h = frame_height, d = boss_diameter);

            for (y = [front_span - joiner_spacing/2,
                      front_span + joiner_spacing/2],
                 x = [-frame_width/2 + boss_center_from_edge,
                       frame_width/2 - boss_center_from_edge])
                translate([x, y, 0])
                    cylinder(h = frame_height, d = boss_diameter);
        }

        for (x = [-joiner_spacing/2, joiner_spacing/2],
             y = [boss_center_from_edge,
                  frame_depth - boss_center_from_edge])
            vertical_hole(x, y, pin_hole_diameter);

        for (y = [front_span - joiner_spacing/2,
                  front_span + joiner_spacing/2],
             x = [-frame_width/2 + boss_center_from_edge,
                   frame_width/2 - boss_center_from_edge])
            vertical_hole(x, y, pin_hole_diameter);
    }
}

module quadrant(front = true, left = true) {
    seam_half = split_gap / 2;
    label_x = left ? -frame_width/4 : frame_width/4;
    label_y = front ? rail_thickness/2
                    : frame_depth - rail_thickness/2;
    quadrant_code = front ? (left ? "FL" : "FR")
                          : (left ? "RL" : "RR");
    gauge_code = front ? str("F", front_gauge_reference)
                       : str("R", rear_gauge_reference);

    difference() {
        intersection() {
            frame_complete();
            translate([left ? -frame_width/2 - 1 : seam_half,
                       front ? -1 : front_span + seam_half,
                       -1])
                cube([left ? frame_width/2 + 1 - seam_half
                           : frame_width/2 + 1,
                      front ? front_span + 1 - seam_half
                            : rear_span + 1,
                      frame_height + 2]);
        }

        // Each quadrant carries its position, selected gauge, and final width.
        translate([label_x, label_y, frame_height - label_depth])
            rotate([0, 0, front ? 0 : 180])
                linear_extrude(height = label_depth + eps)
                    text(str(quadrant_code, " ", gauge_code, " W306.39"),
                         size = label_size,
                         halign = "center", valign = "center",
                         font = "Liberation Sans:style=Bold");
    }
}

module pin_joiner(along = "x") {
    pin_d = pin_hole_diameter - pin_clearance;
    plate_length = joiner_spacing + 14;
    difference() {
        union() {
            if (along == "x") {
                translate([-plate_length/2, -joiner_width/2, 0])
                    cube([plate_length, joiner_width, joiner_thickness]);
                for (x = [-joiner_spacing/2, joiner_spacing/2])
                    translate([x, 0, joiner_thickness])
                        cylinder(h = pin_height, d = pin_d);
            } else {
                translate([-joiner_width/2, -plate_length/2, 0])
                    cube([joiner_width, plate_length, joiner_thickness]);
                for (y = [-joiner_spacing/2, joiner_spacing/2])
                    translate([0, y, joiner_thickness])
                        cylinder(h = pin_height, d = pin_d);
            }
        }

        translate([0, 0, joiner_thickness - label_depth])
            rotate([0, 0, along == "x" ? 0 : 90])
                linear_extrude(height = label_depth + eps)
                    text(along == "x" ? "JOIN X" : "JOIN Y",
                         size = 3.2,
                         halign = "center", valign = "center",
                         font = "Liberation Sans:style=Bold");
    }
}

if (part == "assembly") frame_complete();
else if (part == "front_left") quadrant(true, true);
else if (part == "front_right") quadrant(true, false);
else if (part == "rear_left") quadrant(false, true);
else if (part == "rear_right") quadrant(false, false);
else if (part == "pin_joiner_x") pin_joiner("x");
else if (part == "pin_joiner_y") pin_joiner("y");
else assert(false, str("Unknown part: ", part));
