// Rear-control calibration T02. Test geometry only; not production geometry.
// Units millimetres. Coupons reproduce the 3 mm rear-carrier thickness.
part = "layout";
$fn = 72;
eps = 0.02;
coupon_t = 3.0;
engrave_depth = 0.45;

// T01 A-C (up to 23.2 x 28.6) all failed to admit the rocker clips.
switch_openings = [
    [23.4, 29.2],
    [23.6, 29.8],
    [23.8, 30.4]
];
switch_labels = ["D 23.4x29.2", "E 23.6x29.8", "F 23.8x30.4"];
switch_centers = [-36, 0, 36];
switch_coupon_size = [108, 50];
switch_bezel = [24.75, 31.57];

// The 17.72 mm circular selector shoulder was measured previously but was not
// represented in T01. These coupled pocket candidates bracket print clearance
// and seating depth while retaining a 1.0 mm minimum front skin.
dial_shoulder_measured_d = 17.72;
dial_pockets = [
    [18.2, 0.8],
    [18.6, 1.4],
    [19.0, 2.0]
];
dial_labels = ["P1 D18.2 Z0.8", "P2 D18.6 Z1.4", "P3 D19.0 Z2.0"];
dial_centers = [-36, 0, 36];
dial_coupon_size = [108, 56];
dial_bushing_hole_d = 9.67;
dial_pin_measured_d = 2.96;
dial_scale_min = 7.5;
dial_scale_max = 10.5;
dial_slot_width = 3.6;
dial_slot_center = (dial_scale_min + dial_scale_max) / 2;
dial_slot_height = dial_scale_max - dial_scale_min + dial_slot_width;

module rounded_rect_2d(w, h, r = 3) {
    hull()
        for (x = [-w / 2 + r, w / 2 - r],
             y = [-h / 2 + r, h / 2 - r])
            translate([x, y]) circle(r = r);
}

module rounded_slot_2d(w, h) {
    r = min(w, h) / 2;
    hull()
        for (y = [-h / 2 + r, h / 2 - r])
            translate([0, y]) circle(r = r);
}

module top_engrave(txt, x, y, size = 2.2) {
    translate([x, y, coupon_t - engrave_depth])
        linear_extrude(engrave_depth + eps)
            text(txt, size = size, halign = "center", valign = "center");
}

module alignment_mark(x, y, rotation = 0) {
    translate([x, y, coupon_t - engrave_depth]) rotate([0, 0, rotation])
        translate([-2.5, -0.35, 0])
            cube([5, 0.7, engrave_depth + eps]);
}

module switch_coupon_t02() {
    difference() {
        linear_extrude(coupon_t)
            rounded_rect_2d(switch_coupon_size[0], switch_coupon_size[1], 3);
        for (i = [0 : len(switch_centers) - 1])
            translate([switch_centers[i], 2, -eps])
                linear_extrude(coupon_t + 2 * eps)
                    rounded_rect_2d(switch_openings[i][0],
                                    switch_openings[i][1], 0.25);
        for (i = [0 : len(switch_centers) - 1])
            top_engrave(switch_labels[i], switch_centers[i], -19.5, 1.75);
        top_engrave("SWITCH T02 - FRONT", 0, 22, 2.2);
        alignment_mark(0, -24.2);
    }
}

module dial_test_holes(x) {
    translate([x, 0, -eps])
        cylinder(d = dial_bushing_hole_d, h = coupon_t + 2 * eps);
    translate([x, dial_slot_center, -eps])
        linear_extrude(coupon_t + 2 * eps)
            rounded_slot_2d(dial_slot_width, dial_slot_height);
}

module dial_scale_ticks(x) {
    for (offset = [dial_scale_min : 0.5 : dial_scale_max]) {
        major = abs(offset - round(offset)) < 0.01;
        // Place the marks beyond the largest shoulder pocket so every depth
        // candidate retains a readable scale on the original rear surface.
        translate([x + 10.0, offset - 0.2,
                   coupon_t - engrave_depth])
            cube([major ? 5.0 : 3.2, 0.4, engrave_depth + eps]);
    }
}

module dial_scale_ticks(x) {
    for (offset = [dial_scale_min : 0.5 : dial_scale_max]) {
        major = abs(offset - round(offset)) < 0.01;
        // Place marks beyond the largest shoulder pocket so every depth
        // candidate retains the same readable pin-center reference.
        translate([x + 10.0, offset - 0.2,
                   coupon_t - engrave_depth])
            cube([major ? 4.0 : 2.5, 0.4, engrave_depth + eps]);
    }
}

module dial_coupon_t02() {
    difference() {
        linear_extrude(coupon_t)
            rounded_rect_2d(dial_coupon_size[0], dial_coupon_size[1], 3);
        for (i = [0 : len(dial_centers) - 1]) {
            dial_test_holes(dial_centers[i]);
            dial_scale_ticks(dial_centers[i]);
            // Counterbore from the labelled rear face only.
            translate([dial_centers[i], 0,
                       coupon_t - dial_pockets[i][1]])
                cylinder(d = dial_pockets[i][0],
                         h = dial_pockets[i][1] + eps);
            dial_scale_ticks(dial_centers[i]);
            top_engrave(dial_labels[i], dial_centers[i], -21.5, 1.65);
        }
        top_engrave("DIAL SHOULDER T02 - REAR / PIN UP", 0, 25.2, 2.0);
        top_engrave("TICKS 7.5 UP / 0.5", 0, 21.5, 1.6);
        top_engrave("TICKS: BOTTOM 7.5 / +0.5 UP", 0, 21.5, 1.55);
        alignment_mark(-51.5, 0, 90);
    }
}

module layout_t02() {
    translate([0, 35, 0]) switch_coupon_t02();
    translate([0, -35, 0]) dial_coupon_t02();
}

assert(switch_openings[2][0] < switch_bezel[0],
       "Largest switch opening exceeds measured bezel width");
assert(switch_openings[2][1] < switch_bezel[1],
       "Largest switch opening exceeds measured bezel height");
assert((switch_bezel[0] - switch_openings[2][0]) / 2 >= 0.45,
       "Insufficient switch bezel side overlap");
assert((switch_bezel[1] - switch_openings[2][1]) / 2 >= 0.55,
       "Insufficient switch bezel end overlap");
assert(dial_pockets[0][0] > dial_shoulder_measured_d,
       "First dial shoulder pocket lacks diametral clearance");
assert(dial_pockets[2][1] <= coupon_t - 1.0,
       "Dial pocket leaves less than 1 mm front skin");
assert(dial_slot_width > dial_pin_measured_d,
       "Dial register slot is narrower than measured pin");

if (part == "layout") layout_t02();
else if (part == "switch_coupon") switch_coupon_t02();
else if (part == "dial_shoulder_coupon") dial_coupon_t02();
