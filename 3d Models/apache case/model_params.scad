/*
  APACHE 2800 portable IoT demonstration chassis
  Authoritative editable parameters (millimetres / degrees).

  IMPORTANT: every value tagged MEASURE_BEFORE_PRINT is deliberately a
  placeholder.  Measure the actual case and purchased hardware before making
  the full-size parts.  See README.md for the measurement procedure.
*/

$fn = 48;
inch = 25.4;

// ---------- CASE INTERFACE: MEASURE_BEFORE_PRINT ----------
case_inner_width        = 301.625; // APACHE 2800 catalogue reference; measured footprint below governs
case_inner_depth        = 228.6;   // APACHE 2800 catalogue reference; molded elevation is unspecified
usable_case_depth       = 229.45;  // measured production fit depth; retain physical-test authority
case_lower_clear_height = 95.0;  // MEASURE_BEFORE_PRINT: floor to case split line
case_wall_draft_per_side= 2.0;   // MEASURE_BEFORE_PRINT: inward taper at chassis bottom
case_bottom_bevel_height= 12.0;  // MEASURE_BEFORE_PRINT: floor to top of molded floor/wall bevel
case_bottom_bevel_inset = 10.0;  // MEASURE_BEFORE_PRINT: inward relief per side at Z=0
bevel_curve_steps       = 6;     // segmented smoothstep profile; >=4 gives a visibly round transition
chassis_clearance       = 2.5;   // clearance PER SIDE; increased after physical fit test
chassis_width_fit_adjust= 1.0;   // total EXTRA width reduction from physical fit test
chassis_depth_fit_adjust= 1.0;   // total EXTRA depth reduction from physical fit test
corner_radius           = 24.0;  // MEASURE_BEFORE_PRINT: increased after physical corner-fit test

// PHYSICAL FIT REVISION 5: the low joined frame passed, but the 77 mm shell was
// very tight. Preserve the validated bottom 16 mm and progressively relieve the
// upper shell, where the low frame could not test wall/rib/corner interference.
use_measured_outer_footprint = true;
measured_chassis_outer_width = 12.0625 * inch; // 306.3875 mm
measured_chassis_outer_depth = 229.45;
chassis_upper_relief_start_z = 16.0;
chassis_upper_width_relief_per_side = 1.0;
chassis_upper_depth_relief_per_side = 1.5;
chassis_upper_corner_relief = 2.0;

// ---------- CHASSIS ----------
chassis_wall_thickness  = 3.2;
// Retained as a conservative service cavity after moving the 12 V supply
// outside the case. Confirm the complete fixed-panel stack under the closed lid.
chassis_height          = 77.0;
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
panel_mount_edge_inset  = 3.0;
panel_mount_x_spacing   = 95.0;
panel_mount_y_fractions = [0.25,0.50,0.75];
module_plate_thickness  = 3.2;
module_plate_corner_radius = 5.0;
module_plate_lip        = 12.0;
module_mount_edge_inset = 5.0;

// Four replaceable top modules. The installed original official Raspberry Pi
// 7-inch Touch Display and attached Pi 4B were measured 2026-09-01.
screen_model            = "official_touch_display_7_original_measured";
screen_body_size        = [193.0,110.0];
screen_visible_size     = [155.0,87.0];
screen_module_center    = [0.0,153.0];
screen_module_size      = [220.0,136.0];
screen_opening_clearance= 1.0; // per side around the measured illuminated area
screen_opening_size     = [screen_visible_size[0]+2*screen_opening_clearance,
                           screen_visible_size[1]+2*screen_opening_clearance];
screen_display_depth    = 6.04;
// RP09 drop-in seat: the existing 196 x 112 mm carrier opening locates the
// measured screen body, while this smaller opening leaves a 3 mm bearing ledge
// under every body edge.  The ledge top is one measured display depth below
// the panel surface so the display finishes flush beneath the M1 cover.
screen_carrier_size     = [screen_module_size[0]-2*module_plate_lip,
                           screen_module_size[1]-2*module_plate_lip];
screen_seat_opening_size = [screen_body_size[0]-6.0,
                            screen_body_size[1]-6.0];
screen_seat_ledge_thickness = 2.0;
screen_seat_overlap     = 2.0;
screen_seat_join_overlap = 0.5;
screen_rear_keepout     = 35.0; // front glass to rearmost attached Pi hardware
screen_old_bezel_size   = [236.0,120.0,3.0];
screen_old_bezel_opening= [169.0,104.0];
screen_old_bezel_hole_pitch = [220.0,60.0];
screen_old_bezel_hole_diameter = 3.3;
rotary_module_center    = [-98.0,45.0];
rotary_module_size      = [90.0,74.0];
// Two measured red safety-cover toggles.
safety_toggle_count     = 2;
safety_toggle_hole_diameter = 11.62;
safety_toggle_cover_size = [17.05,40.70];
safety_toggle_rear_size = [14.63,26.13,14.46];
safety_toggle_front_projection = 27.89;
switch_module_center    = [0.0,45.0];
switch_module_size      = [90.0,74.0];
// Two keyed switches above two circular rocker switches.
key_switch_count        = 2;
key_switch_hole_diameter= 11.5;
key_switch_bezel_diameter = 14.82;
key_switch_rear_size    = [18.08,11.83,25.36];
key_switch_front_projection = 23.12;
rocker_switch_count     = 2;
rocker_hole_diameter    = 20.35;
rocker_bezel_diameter   = 22.12;
rocker_body_depth       = 15.07;
rocker_total_rear_depth = 23.14;
rocker_front_projection = 6.64;
utility_module_center   = [98.0,45.0];
utility_module_size     = [90.0,74.0];
// Mode-dependent plug-in activity: four removable color-coded four-pin cables
// and four identical sockets. Each plug receives an electrical ID so software
// can distinguish a correct cable from a merely occupied socket.
activity_socket_count   = 4;
activity_plug_count     = 4;
activity_socket_hole_diameter = 15.6;
activity_socket_flange_diameter = 18.2;
activity_socket_rear_depth = 13.3;
activity_socket_front_projection = 5.19;
activity_plug_diameter  = 17.81;
activity_plug_length    = 36.65;
activity_cable_colors   = ["RED","BLUE","GREEN","ORANGE"];
activity_cable_length   = 6*inch;
activity_wired_pins_per_socket = 1;
activity_socket_active_pins = [1,2,3,4];
// Cable rows are [A-end active pin, B-end active pin]. The A/B end labels are
// electrically significant; reversing a cable intentionally makes no contact.
activity_cable_pin_pairs = [[1,2],[2,3],[3,4],[4,1]];
activity_cable_end_labels = ["A","B"];
// A 36 mm row pitch leaves 18.2 mm between the measured 17.8 mm plug bodies.
// The 44 mm column pitch leaves 26.2 mm horizontally. Verify with four plugs.
activity_socket_local_positions = [[-22,10],[22,10],[-22,-26],[22,-26]];
activity_led_local_positions = [[-8,10],[8,10],[-8,-26],[8,-26]];
indicator_count         = 4;
indicator_hole_diameter = 5.0;
indicator_body_diameter = 5.03;
indicator_body_length   = 8.19;
// Position order is upper-left, upper-right, lower-left, lower-right so each
// LED can mark the matching red, blue, green, or orange socket.
indicator_colors        = activity_cable_colors;

// ---------- RETIRED MOVING-PANEL REFERENCE ----------
// Retained only so historical fit-check modules remain readable. The active
// fixed-panel architecture does not install a hinge, gas spring, or actuator.
front_bezel_depth       = 32.0;
front_bezel_thickness   = panel_thickness;
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

// ---------- RETIRED GAS SPRING PLACEHOLDERS ----------
gas_strut_mount_offset  = 45.0; // from each side toward centre
gas_strut_mount_y_chassis = 76.0; // behind hinge axis
gas_strut_mount_y_panel = 55.0; // forward from rear panel edge
gas_strut_pad_width     = 26.0;
gas_strut_pad_depth     = 30.0;
gas_strut_pad_thickness = 6.0;
gas_strut_hole_spacing  = 16.0;

// ---------- RETIRED LINEAR ACTUATOR PLACEHOLDERS ----------
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
printer_bed_x           = 256.0;
printer_bed_y           = 256.0;
split_joint_clearance   = 0.20;
joiner_width            = 24.0;
joiner_thickness        = 4.0;
joiner_hole_spacing     = 34.0;
// Proven final-fit spans: F 227.95 / 2 and R 230.95 / 2.
chassis_split_y         = 113.975;
seam_pad_wall_offset    = 11.0;  // boss centre from outer wall; guarantees rail overlap
fit_test_frame_height   = 16.0;  // captures the full curved bevel while remaining low-cost
upper_fit_frame_height = 10.0;   // low-material gauge for the relieved full-height top outline
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
chassis_top_outer_width = chassis_outer_width - 2*chassis_upper_width_relief_per_side;
chassis_top_outer_depth = chassis_outer_depth - 2*chassis_upper_depth_relief_per_side;
chassis_top_corner_radius = chassis_corner_radius + chassis_upper_corner_relief;
chassis_top_inner_width = chassis_top_outer_width - 2*chassis_wall_thickness;
chassis_top_inner_depth = chassis_top_outer_depth - 2*chassis_wall_thickness;

panel_front_y = chassis_wall_thickness + panel_edge_gap;
panel_width = chassis_top_inner_width - 2*panel_edge_gap;
panel_depth = chassis_top_inner_depth - 2*panel_edge_gap;
panel_back_y = panel_front_y + panel_depth;
deck_underside_z = chassis_height - panel_thickness;

// Historical values used only by retired reference modules.
hinge_pin_y = front_bezel_depth + hinge_offset + hinge_leaf_width + hinge_barrel_diameter/2;
hinge_axis_z = chassis_height - hinge_barrel_diameter/2;

panel_mount_positions = concat(
    [for (x=[-panel_mount_x_spacing,panel_mount_x_spacing])
        [x,panel_front_y+panel_mount_edge_inset]],
    [for (x=[-panel_mount_x_spacing,panel_mount_x_spacing])
        [x,panel_back_y-panel_mount_edge_inset]],
    [for (side=[-1,1], yf=panel_mount_y_fractions)
        [side*(panel_width/2-panel_mount_edge_inset),
         panel_front_y+panel_depth*yf]]
);
panel_joiner_ys = [panel_front_y+100.0,panel_back_y-12.0];

assert(case_working_depth > 150, "usable_case_depth is implausibly small");
assert(chassis_height + panel_thickness < case_lower_clear_height + 5,
       "Chassis/panel may exceed measured lower-case height");
assert(panel_width > 250 && panel_depth > 180,
       "Fixed panel collapsed: check chassis dimensions");
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
assert(chassis_upper_relief_start_z >= case_bottom_bevel_height &&
       chassis_upper_relief_start_z < chassis_height-top_rail_height,
       "Upper relief must start above the validated bevel and below the top rail");
assert(chassis_upper_width_relief_per_side >= 0 &&
       chassis_upper_depth_relief_per_side >= 0,
       "Upper relief cannot enlarge the shell");
assert(bevel_curve_steps >= 4, "Use at least four bevel curve steps");
assert(screen_module_center[0]+screen_module_size[0]/2 < panel_width/2 &&
       screen_module_center[0]-screen_module_size[0]/2 > -panel_width/2 &&
       screen_module_center[1]+screen_module_size[1]/2 < panel_back_y,
       "Screen module exceeds fixed panel boundary");
assert(screen_body_size[0] <= screen_module_size[0]-2*module_plate_lip &&
       screen_body_size[1] <= screen_module_size[1]-2*module_plate_lip,
       "Selected official display body does not pass through the carrier opening");
assert(screen_seat_opening_size[0] < screen_body_size[0] &&
       screen_seat_opening_size[1] < screen_body_size[1],
       "Screen seat must support the measured display body");
assert(screen_carrier_size[0] > screen_body_size[0] &&
       screen_carrier_size[1] > screen_body_size[1],
       "Screen carrier must retain drop-in clearance around the body");
assert(rotary_module_center[0]-rotary_module_size[0]/2 > -panel_width/2 &&
       utility_module_center[0]+utility_module_size[0]/2 < panel_width/2 &&
       rotary_module_center[1]-rotary_module_size[1]/2 > panel_front_y,
       "Lower control bank exceeds fixed panel boundary");
