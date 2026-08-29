/*
  APACHE 3800 portable IoT demonstration chassis
  Authoritative editable parameters (millimetres / degrees).

  IMPORTANT: every value tagged MEASURE_BEFORE_PRINT is deliberately a
  placeholder.  Measure the actual case and purchased hardware before making
  the full-size parts.  See README.md for the measurement procedure.
*/

$fn = 48;
inch = 25.4;

// ---------- CASE INTERFACE: MEASURE_BEFORE_PRINT ----------
case_inner_width        = 377.8; // MEASURE_BEFORE_PRINT: narrowest usable width
case_inner_depth        = 269.9; // MEASURE_BEFORE_PRINT: narrowest usable front/back depth
usable_case_depth       = 250.0; // MEASURE_BEFORE_PRINT: obstruction-free base depth
case_lower_clear_height = 95.0;  // MEASURE_BEFORE_PRINT: floor to case split line
case_wall_draft_per_side= 2.0;   // MEASURE_BEFORE_PRINT: inward taper at chassis bottom
case_bottom_bevel_height= 12.0;  // MEASURE_BEFORE_PRINT: floor to top of molded floor/wall bevel
case_bottom_bevel_inset = 10.0;  // MEASURE_BEFORE_PRINT: inward relief per side at Z=0
bevel_curve_steps       = 6;     // segmented smoothstep profile; >=4 gives a visibly round transition
chassis_clearance       = 2.5;   // clearance PER SIDE; increased after physical fit test
chassis_width_fit_adjust= 1.0;   // total EXTRA width reduction from physical fit test
chassis_depth_fit_adjust= 1.0;   // total EXTRA depth reduction from physical fit test
corner_radius           = 24.0;  // MEASURE_BEFORE_PRINT: increased after physical corner-fit test

// PHYSICAL FIT REVISION 3: direct finished outer footprint supplied after the
// second sample print. When true, these override the catalogue-derived case
// formula so the printed assembly measures exactly 12-1/16 x 9-1/4 inches.
use_measured_outer_footprint = true;
measured_chassis_outer_width = 12.0625 * inch; // 306.3875 mm
measured_chassis_outer_depth = 9.25 * inch;    // 234.9500 mm

// ---------- CHASSIS ----------
chassis_wall_thickness  = 3.2;
chassis_height          = 70.0;
bottom_rail_height      = 8.0;
top_rail_height         = 8.0;
support_ledge_width     = 7.0;
structure_fillet        = 2.0;   // nominal design intent; OpenSCAD geometry uses radiused transitions

// ---------- CONTROL PANEL ----------
panel_thickness         = 5.0;
panel_edge_gap          = 1.5;
panel_rib_height        = 6.0;
panel_rib_thickness     = 3.2;
panel_corner_radius     = 7.0;
front_bezel_depth       = 32.0;
front_bezel_thickness   = panel_thickness;

// ---------- CONTINUOUS HINGE: MEASURE_BEFORE_PRINT ----------
hinge_length            = 250.0; // MEASURE_BEFORE_PRINT; shortened for revision 3 panel width
hinge_leaf_width        = 20.0;  // MEASURE_BEFORE_PRINT, pin centre to leaf edge
hinge_leaf_thickness    = 1.2;   // MEASURE_BEFORE_PRINT
hinge_barrel_diameter   = 6.0;   // MEASURE_BEFORE_PRINT
hinge_offset            = 3.0;   // tuning offset behind the front bezel
hinge_pocket_clearance  = 0.30;
hinge_end_clearance     = 1.0;
hinge_screw_count       = 6;

// ---------- M3 FASTENERS / INSERTS: MEASURE_BEFORE_PRINT ----------
heatset_insert_diameter = 4.0;   // MEASURE_BEFORE_PRINT: actual insert pilot/OD
heatset_insert_depth    = 5.5;   // MEASURE_BEFORE_PRINT
mounting_screw_diameter = 3.2;
countersink_diameter    = 6.3;
boss_outer_diameter     = 9.0;
boss_extra_depth        = 3.0;

// ---------- GAS SPRING PLACEHOLDERS ----------
gas_strut_mount_offset  = 45.0; // from each side toward centre
gas_strut_mount_y_chassis = 76.0; // behind hinge axis
gas_strut_mount_y_panel = 55.0; // forward from rear panel edge
gas_strut_pad_width     = 26.0;
gas_strut_pad_depth     = 30.0;
gas_strut_pad_thickness = 6.0;
gas_strut_hole_spacing  = 16.0;

// ---------- FUTURE LINEAR ACTUATOR PLACEHOLDERS ----------
actuator_mount_offset   = 52.0; // forward from rear wall / panel edge
actuator_pad_width      = 52.0;
actuator_pad_depth      = 36.0;
actuator_pad_thickness  = 7.0;
actuator_hole_spacing   = 28.0;

// ---------- WIRING ----------
cable_route_width       = 34.0;
cable_route_depth       = 20.0;
cable_bend_clearance    = 14.0;

// ---------- ASSEMBLY / PRINTING ----------
panel_deploy_angle      = 30.0;
panel_service_angle     = 80.0;
printer_bed_x           = 256.0;
printer_bed_y           = 256.0;
split_joint_clearance   = 0.20;
joiner_width            = 24.0;
joiner_thickness        = 4.0;
joiner_hole_spacing     = 34.0;
chassis_split_y         = 110.0; // avoids cutting through the gas-strut pad
seam_pad_wall_offset    = 11.0;  // boss centre from outer wall; guarantees rail overlap
fit_test_frame_height   = 16.0;  // captures the full curved bevel while remaining low-cost
fit_test_pin_clearance  = 0.25;  // interference tuning for tool-free sample joiner pins
fit_test_pin_height     = 5.0;
fit_test_joiner_thickness = 2.4;
hardware_coupon_width   = 80.0;

// ---------- DERIVED VALUES: change the inputs above, not these ----------
case_working_depth = min(case_inner_depth, usable_case_depth);
chassis_outer_width = use_measured_outer_footprint
    ? measured_chassis_outer_width
    : case_inner_width - 2*chassis_clearance - chassis_width_fit_adjust;
chassis_outer_depth = use_measured_outer_footprint
    ? measured_chassis_outer_depth
    : case_working_depth - 2*chassis_clearance - chassis_depth_fit_adjust;
chassis_inner_width = chassis_outer_width - 2*chassis_wall_thickness;
chassis_inner_depth = chassis_outer_depth - 2*chassis_wall_thickness;
chassis_corner_radius = max(4, corner_radius - chassis_clearance);

hinge_pin_y = front_bezel_depth + hinge_offset + hinge_leaf_width + hinge_barrel_diameter/2;
panel_front_y = hinge_pin_y + hinge_barrel_diameter/2;
panel_width = chassis_inner_width - 2*support_ledge_width - 2*panel_edge_gap;
panel_depth = chassis_inner_depth - panel_front_y - support_ledge_width - panel_edge_gap;
panel_back_y = panel_front_y + panel_depth;
deck_underside_z = chassis_height - panel_thickness;
hinge_axis_z = chassis_height - hinge_barrel_diameter/2;

assert(case_working_depth > 150, "usable_case_depth is implausibly small");
assert(chassis_height + panel_thickness < case_lower_clear_height + 5,
       "Chassis/panel may exceed measured lower-case height");
assert(panel_width > 100 && panel_depth > 80, "Panel collapsed: check case/hinge parameters");
assert(hinge_length <= panel_width - 2*hinge_end_clearance,
       "hinge_length exceeds panel width");
assert(chassis_outer_width/2 <= printer_bed_x &&
       max(chassis_split_y,chassis_outer_depth-chassis_split_y) <= printer_bed_y,
       "Chassis quadrants exceed configured printer bed");
assert(panel_width/2 <= printer_bed_x && panel_depth <= printer_bed_y,
       "Split panel halves exceed configured printer bed");
assert(chassis_inner_width/2 <= printer_bed_x && front_bezel_depth <= printer_bed_y,
       "Split bezel halves exceed configured printer bed");
assert(chassis_height <= 256, "Chassis height exceeds Bambu X1 Carbon Z travel");
assert(case_bottom_bevel_height > 0 && case_bottom_bevel_height <= bottom_rail_height+4,
       "Bottom bevel height must remain within the reinforced lower rail zone");
assert(case_bottom_bevel_inset >= 0 && case_bottom_bevel_inset < chassis_outer_width/4,
       "Bottom bevel inset is invalid");
assert(bevel_curve_steps >= 4, "Use at least four bevel curve steps");
