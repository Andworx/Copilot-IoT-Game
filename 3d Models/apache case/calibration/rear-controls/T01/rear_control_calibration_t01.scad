// Rear-control calibration T01. Test geometry only; not production geometry.
// Units millimetres. Coupons reproduce the 3 mm rear-carrier thickness.
part = "layout";
$fn = 72;
eps = 0.02;
coupon_t = 3.0;
engrave_depth = 0.45;

switch_openings = [
    [22.4, 27.8],
    [22.8, 28.2],
    [23.2, 28.6]
];
switch_labels = ["A 22.4x27.8", "B 22.8x28.2", "C 23.2x28.6"];
switch_centers = [-36, 0, 36];
switch_coupon_size = [108, 50];

dial_bushing_hole_d = 9.67;
dial_pin_measured_d = 2.96;
dial_scale_min = 7.5;
dial_scale_max = 10.5;
dial_scale_step = 0.5;
dial_slot_width = 3.6;
dial_slot_center = (dial_scale_min + dial_scale_max) / 2;
dial_slot_height = dial_scale_max - dial_scale_min + dial_slot_width;
dial_coupon_size = [54, 54];
dial_center_y = -5;

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

module top_engrave(txt, x, y, size = 2.4) {
    translate([x, y, coupon_t - engrave_depth])
        linear_extrude(engrave_depth + eps)
            text(txt, size = size, halign = "center", valign = "center");
}

module alignment_mark(x, y, rotation = 0) {
    translate([x, y, coupon_t - engrave_depth]) rotate([0, 0, rotation])
        translate([-2.5, -0.35, 0])
            cube([5, 0.7, engrave_depth + eps]);
}

module switch_coupon_t01() {
    difference() {
        linear_extrude(coupon_t)
            rounded_rect_2d(switch_coupon_size[0], switch_coupon_size[1], 3);
        for (i = [0 : len(switch_centers) - 1])
            translate([switch_centers[i], 2, -eps])
                linear_extrude(coupon_t + 2 * eps)
                    rounded_rect_2d(switch_openings[i][0],
                                    switch_openings[i][1], 0.4);
        for (i = [0 : len(switch_centers) - 1])
            top_engrave(switch_labels[i], switch_centers[i], -19.5, 1.8);
        top_engrave("SWITCH T01 - FRONT", 0, 22, 2.2);
        alignment_mark(0, -24.2);
    }
}

module dial_scale_ticks() {
    for (offset = [dial_scale_min : dial_scale_step : dial_scale_max]) {
        major = abs(offset - round(offset)) < 0.01;
        translate([2.0, dial_center_y + offset - 0.2,
                   coupon_t - engrave_depth])
            cube([major ? 4.0 : 2.5, 0.4, engrave_depth + eps]);
    }
    // The 0.5 mm ticks are necessarily close together. Label only the two
    // endpoints, away from the scale, so the numbers remain printable.
    top_engrave(str(dial_scale_min), 9.5,
                dial_center_y + dial_scale_min - 2.2, 1.65);
    top_engrave(str(dial_scale_max), 9.5,
                dial_center_y + dial_scale_max + 2.2, 1.65);
}

module dial_coupon_t01() {
    difference() {
        linear_extrude(coupon_t)
            rounded_rect_2d(dial_coupon_size[0], dial_coupon_size[1], 3);
        translate([0, dial_center_y, -eps])
            cylinder(d = dial_bushing_hole_d, h = coupon_t + 2 * eps);
        translate([0, dial_center_y + dial_slot_center, -eps])
            linear_extrude(coupon_t + 2 * eps)
                rounded_slot_2d(dial_slot_width, dial_slot_height);
        dial_scale_ticks();
        top_engrave("PIN UP", 0, 22.5, 2.4);
        top_engrave("DIAL T01 - FRONT", 0, -22.5, 2.1);
        // Keep the recessed orientation mark fully inside the rounded edge so
        // it cannot isolate a thin perimeter crescent during STL export.
        alignment_mark(-23.5, 0, 90);
    }
}

module layout_t01() {
    translate([0, 35, 0]) switch_coupon_t01();
    translate([0, -35, 0]) dial_coupon_t01();
}

assert(switch_openings[2][0] < 24.75,
       "Largest switch opening exceeds measured bezel width");
assert(switch_openings[2][1] < 31.57,
       "Largest switch opening exceeds measured bezel height");
assert((24.75 - switch_openings[2][0]) / 2 >= 0.775,
       "Insufficient switch bezel side overlap");
assert(dial_slot_width > dial_pin_measured_d,
       "Dial calibration slot is narrower than measured pin");
assert(dial_scale_max + dial_slot_width / 2 < 31 / 2,
       "Dial calibration range exceeds existing shell clearance radius");

if (part == "layout") layout_t01();
else if (part == "switch_coupon") switch_coupon_t01();
else if (part == "dial_coupon") dial_coupon_t01();
