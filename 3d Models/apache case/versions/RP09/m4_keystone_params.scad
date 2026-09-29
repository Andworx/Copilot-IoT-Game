// RP09 M4 standard-keystone candidate dimensions. Units: millimetres.
// CommScope KJ-series reference cutout: 14.79 x 19.31 in a 1.6 mm panel.
// The production candidate adds 0.11/0.09 mm nominal FDM clearance; print the
// calibration coupon before treating this size as physically approved.
keystone_cutout_size = [14.90, 19.40];
keystone_local_wall_thickness = 1.60;
keystone_rear_relief_size = [19.0, 23.5];
keystone_rear_relief_depth = module_plate_thickness -
                             keystone_local_wall_thickness;

keystone_coupon_sizes = [
    [14.70, 19.20],
    [14.90, 19.40],
    [15.10, 19.60]
];
