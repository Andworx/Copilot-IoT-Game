// RP09 M4 standard-keystone fit coupon. Units: millimetres.
module_plate_thickness = 3.2;
include <../../../versions/RP09/m4_keystone_params.scad>

part = "coupon";
$fn = 48;
eps = 0.02;
coupon_size = [82, 38];
coupon_corner_radius = 3;
coupon_centers = [-27, 0, 27];
label_font = "Liberation Sans:style=Bold";

module rounded_rect_2d(size, radius) {
    offset(r = radius)
        square([size[0] - 2 * radius, size[1] - 2 * radius], center = true);
}

module coupon_plate() {
    linear_extrude(module_plate_thickness)
        rounded_rect_2d(coupon_size, coupon_corner_radius);
}

module candidate_cutout(x, size) {
    translate([x - size[0] / 2, -size[1] / 2, -eps])
        cube([size[0], size[1], module_plate_thickness + 2 * eps]);
    translate([x - keystone_rear_relief_size[0] / 2,
               -keystone_rear_relief_size[1] / 2, -eps])
        cube([keystone_rear_relief_size[0], keystone_rear_relief_size[1],
              keystone_rear_relief_depth + eps]);
}

module coupon_labels() {
    for (i = [0 : len(coupon_centers) - 1])
        translate([coupon_centers[i], -15.0,
                   module_plate_thickness - 0.52])
            linear_extrude(0.54)
                text(chr(65 + i), size = 3.0, font = label_font,
                     halign = "center", valign = "center");
}

module coupon() {
    difference() {
        coupon_plate();
        for (i = [0 : len(coupon_centers) - 1])
            candidate_cutout(coupon_centers[i], keystone_coupon_sizes[i]);
        coupon_labels();
    }
}

assert(abs(module_plate_thickness - keystone_rear_relief_depth -
           keystone_local_wall_thickness) < eps,
       "Coupon does not reproduce the M4 local clip wall");

if (part == "coupon") coupon();
