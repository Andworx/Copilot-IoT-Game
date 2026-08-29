/*
  Standalone APACHE-case front-to-back fit gauge.

  This file intentionally does not include or modify the main chassis project.
  It reproduces only the validated Rev 3 lower bevel and corner profile on one
  side of the case, minimizing print time while testing overall depth.
*/

$fn = 48;

part = "front";       // [front,rear,pin_joiner,assembled]
test_depth = 230.95;  // exported choices: 232.95, 230.95, and 228.95 mm

// Frozen Rev 3 interface values. Update the main project only after a gauge fits.
reference_width = 306.3875;
reference_depth = 234.95;
corner_radius = 21.5;
bevel_height = 12.0;
bevel_inset = 10.0;
bevel_curve_steps = 6;
rail_thickness = 7.2;

// Gauge-only construction values.
gauge_height = 12.0;
corner_capture = 42.0;
split_gap = 0.20;
boss_diameter = 9.0;
boss_center_from_edge = 8.0;
pin_hole_diameter = 4.0;
pin_clearance = 0.25;
joiner_spacing = 34.0;
joiner_width = 16.0;
joiner_thickness = 2.4;
pin_height = 5.0;
label_depth = 0.70;
label_size = 3.6;
eps = 0.02;

assert(test_depth <= reference_depth,
       "The standalone gauge is intended to test reductions from Rev 3 depth.");
assert(test_depth >= reference_depth - 10,
       "Depth reduction exceeds the intended calibration range.");

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

module validated_bevel_ring(w, d) {
    render(convexity = 10)
        union()
            for (i = [0 : bevel_curve_steps - 1]) {
                t0 = i / bevel_curve_steps;
                t1 = (i + 1) / bevel_curve_steps;
                inset0 = bevel_inset * (1 - smoothstep01(t0));
                inset1 = bevel_inset * (1 - smoothstep01(t1));
                tapered_ring_slice(w, d, corner_radius, rail_thickness,
                                   inset0, inset1,
                                   bevel_height*t0,
                                   bevel_height*t1 + eps);
            }
}

module vertical_hole(x, y, d) {
    translate([x, y, -eps]) cylinder(h = gauge_height + 2*eps, d = d);
}

module side_gauge_complete() {
    split_y = test_depth / 2;
    boss_x = -reference_width/2 + boss_center_from_edge;
    difference() {
        union() {
            intersection() {
                validated_bevel_ring(reference_width, test_depth);
                translate([-reference_width/2 - 1, -1, -1])
                    cube([corner_capture + 1, test_depth + 2,
                          gauge_height + 2]);
            }
            for (y = [split_y - joiner_spacing/2,
                      split_y + joiner_spacing/2])
                translate([boss_x, y, 0])
                    cylinder(h = gauge_height, d = boss_diameter);
        }
        for (y = [split_y - joiner_spacing/2,
                  split_y + joiner_spacing/2])
            vertical_hole(boss_x, y, pin_hole_diameter);
    }
}

module gauge_half(front = true) {
    split_y = test_depth / 2;
    seam_half = split_gap / 2;
    label_y = front ? test_depth/4 : 3*test_depth/4;
    difference() {
        intersection() {
            side_gauge_complete();
            translate([-reference_width/2 - 2,
                       front ? -1 : split_y + seam_half,
                       -1])
                cube([corner_capture + 4,
                      front ? split_y + 1 - seam_half
                            : test_depth - split_y + 1,
                      gauge_height + 2]);
        }
        // Recessed identification stays inside the top face and cannot alter fit.
        translate([-reference_width/2 + rail_thickness/2,
                   label_y,
                   gauge_height - label_depth])
            rotate([0, 0, 90])
                linear_extrude(height = label_depth + eps)
                    text(str(front ? "F " : "R ", test_depth),
                         size = label_size,
                         halign = "center", valign = "center",
                         font = "Liberation Sans:style=Bold");
    }
}

module pin_joiner() {
    pin_d = pin_hole_diameter - pin_clearance;
    plate_length = joiner_spacing + 14;
    difference() {
        union() {
            translate([-joiner_width/2, -plate_length/2, 0])
                cube([joiner_width, plate_length, joiner_thickness]);
            for (y = [-joiner_spacing/2, joiner_spacing/2])
                translate([0, y, joiner_thickness])
                    cylinder(h = pin_height, d = pin_d);
        }
        translate([0, 0, joiner_thickness - label_depth])
            rotate([0, 0, 90])
                linear_extrude(height = label_depth + eps)
                    text("JOINER", size = 3.2,
                         halign = "center", valign = "center",
                         font = "Liberation Sans:style=Bold");
    }
}

module assembled() {
    side_gauge_complete();
    split_y = test_depth / 2;
    boss_x = -reference_width/2 + boss_center_from_edge;
    // Show the printed connector flipped pins-down into the gauge bosses.
    translate([boss_x, split_y, gauge_height + joiner_thickness])
        rotate([180, 0, 0]) pin_joiner();
}

if (part == "front") gauge_half(true);
else if (part == "rear") gauge_half(false);
else if (part == "pin_joiner") pin_joiner();
else if (part == "assembled") assembled();
else assert(false, str("Unknown part: ", part));
