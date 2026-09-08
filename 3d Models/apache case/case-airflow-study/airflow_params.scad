/* APACHE 2800 enclosure and airflow-study parameters, millimetres/degrees. */

// Production dimensions are imported rather than duplicated. This prevents
// the airflow study from silently drifting to an unpromoted fit-test depth.
include <../model_params.scad>

// Official Harbor Freight catalogue envelope. Specifications are approximate.
case_outer_x = 13.5 * inch;        // 342.90 mm, long axis
case_outer_y = 11.375 * inch;      // 288.925 mm, front-to-rear axis
case_total_height = 6.0 * inch;    // 152.40 mm
case_inner_x_top = 11.875 * inch;  // 301.625 mm
case_inner_y_top = 9.0 * inch;     // 228.60 mm
case_inner_height = 5.3125 * inch; // 134.9375 mm

// MEASURE_BEFORE_DRILL: case split and molded floor/wall geometry.
lower_outer_height = 98.0;
lid_outer_height = case_total_height - lower_outer_height;
case_outer_corner_radius = 34.0;
case_inner_top_radius = 27.0;
case_base_thickness = 7.0;
case_floor_clear_x = chassis_outer_width + 10.0;
case_floor_clear_y = chassis_outer_depth + 10.0;
case_floor_radius = 26.5;

// Removable chassis envelope, derived from production model_params.scad.
chassis_outer_x = chassis_outer_width;
chassis_outer_y = chassis_outer_depth;
chassis_rail_width = 7.2;
chassis_floor_z = case_base_thickness;
study_control_panel_z = chassis_floor_z + chassis_height;

// Shared installed-tray elevation. The tray source uses the relative
// above-floor value; this airflow study uses the absolute case coordinate.
equipment_tray_install_above_floor = bottom_rail_height+heatset_insert_depth+2.0;
equipment_tray_thickness = 2.0;
equipment_tray_top_z = chassis_floor_z+equipment_tray_install_above_floor+
    equipment_tray_thickness;

// Thermal placeholders. Replace with measured input power and component losses.
estimated_heat_watts = 30.0;
allowed_internal_rise_c = 10.0;
airflow_safety_factor = 1.75;
filter_and_grille_derating = 0.60;
recommended_fan_nominal_cfm = 20.0;

// Proposed opposing 60 mm fan stations on the short end walls.
fan_size = 60.0;
fan_thickness = 25.0;
fan_air_cutout_diameter = 54.0;
fan_hole_pitch = 50.0;
fan_fastener_diameter = 3.5;
intake_y = -58.0;
intake_z = 39.0;
exhaust_y = 58.0;
exhaust_z = 50.0; // lowered so the opening and mounting pattern clear the panel deck

// Proposed rear-wall controls in the recessed center panel shown in the photo.
// Coordinates are model coordinates; left/right descriptions use the exterior
// rear view. MEASURE this panel and the purchased hardware before drilling.
rear_service_panel_clear_width = 176.0;
rear_service_panel_clear_height = 68.0;
rear_service_panel_center_z = 43.0;
rear_service_rib_x = 100.0;
power_inlet_x = 48.0; // exterior rear-view left
power_inlet_z = 42.0;
// Reserved envelope for the arriving XT60 interface and 12 V master switch.
// It is deliberately not cut into the reference shell until both parts are
// measured; these values are visualization placeholders, not a drill pattern.
power_port_measured = false;
power_face_x = 58.0;
power_face_z = 30.0;
power_cutout_x = 0;
power_cutout_z = 0;
power_body_depth = 25.0;
dial_x = -45.0; // exterior rear-view right
dial_z = 42.0;
// Ordered FOCMKEAS B0F9KTRGV5 RS26 2P6T six-position selector.
// The common RS26 panel bushing is 3/8-32; use a small clearance hole here.
// Verify the delivered bushing, anti-rotation washer, nut, and knob with calipers.
dial_panel_hole_diameter = 9.27;
dial_body_diameter = 27.0;
dial_body_depth = 16.0;
dial_rear_collar_diameter = 17.72;
dial_shaft_diameter = 6.0;
dial_shaft_length = 21.55;
dial_knob_diameter = 26.48;
dial_knob_depth = 14.0;
dial_anti_rotation_pin_diameter = 2.96;
dial_anti_rotation_pin_offset = 9.83;
dial_anti_rotation_pin_projection = 4.67;

// Delivered electronics envelopes and collision-checked planning locations.
// Positions are [center X, center Y, bottom Z]. Cable bends and final mounting
// brackets remain separate service clearances, not part of these hard bodies.
component_clearance = 2.0;

// The measured metal AC/DC supply is retired from the active enclosure. A
// selected external 12 V / 15 A supply will enter through XT60 hardware whose
// delivered dimensions remain pending.

// Blue Sea 5025 measured with cover. Rotated so its 84 mm axis runs in X.
fuse_block_size = [84.0,124.0,40.0];
fuse_block_position = [-91.0,40.0,equipment_tray_top_z];
fuse_block_hole_pitch = [63.0,93.0];
fuse_block_hole_diameter = 4.78;
fuse_block_circuits = 6;

// One floor-mounted Pi 4B with OONO direct GPIO terminal breakout.
floor_pi_size = [88.06,61.15,25.23];
// Shifted right so the raised floor Pi/GPIO envelope does not intersect the
// screen-mounted Pi directly above the original center position.
floor_pi_position = [92.0,38.0,equipment_tray_top_z];
floor_pi_hole_pitch = [58.0,49.0];

// Two measured USB-C converters and one measured Micro-USB converter.
// They are rotated 90 degrees in plan to form a serviceable front-left bank.
usb_c_converter_size = [32.0,63.0,19.0];
micro_usb_converter_size = [14.0,64.0,14.0];
converter_positions = [
    [-126.0,-70.0,equipment_tray_top_z],
    [ -88.0,-70.0,equipment_tray_top_z],
    [ -58.0,-70.0,equipment_tray_top_z]
];
converter_sizes = [usb_c_converter_size,usb_c_converter_size,
                   micro_usb_converter_size];
converter_names = ["DC_USBC1","DC_USBC2","DC_MICRO"];
converter_mount_pitch = 52.0;
usb_c_converter_slot_width = 4.29;
micro_usb_converter_slot_width = 3.94;
converter_max_output_watts = 25.0;
converter_efficiency_assumption = 0.90;
converter_full_load_loss_watts = len(converter_positions) *
    converter_max_output_watts * (1 / converter_efficiency_assumption - 1);

// Fixed panel derives from production dimensions. Module Y coordinates convert
// the production front-origin convention into this centered airflow study.
fixed_panel_size = [panel_width,panel_depth,panel_thickness];
study_fixed_panel_thickness = panel_thickness;
study_deck_underside_z = chassis_floor_z+chassis_height-panel_thickness;
panel_module_centers = [
    [screen_module_center[0],screen_module_center[1]-chassis_outer_y/2],
    [rotary_module_center[0],rotary_module_center[1]-chassis_outer_y/2],
    [switch_module_center[0],switch_module_center[1]-chassis_outer_y/2],
    [utility_module_center[0],utility_module_center[1]-chassis_outer_y/2]
];
panel_module_sizes = [[screen_module_size[0],screen_module_size[1],module_plate_thickness],
                      [rotary_module_size[0],rotary_module_size[1],module_plate_thickness],
                      [switch_module_size[0],switch_module_size[1],module_plate_thickness],
                      [utility_module_size[0],utility_module_size[1],module_plate_thickness]];

// The display is split into its shallow full body and the deeper attached Pi.
// The Pi XY offset is provisional until measured relative to the glass edges;
// keeping it centered is conservative for the present floor layout.
screen_display_size = [screen_body_size[0],screen_body_size[1],screen_display_depth];
screen_display_position = [panel_module_centers[0][0],panel_module_centers[0][1],
                           study_deck_underside_z-screen_display_depth];
screen_pi_size = [85.0,56.0,screen_rear_keepout-screen_display_depth];
screen_pi_position = [panel_module_centers[0][0],panel_module_centers[0][1],
                      screen_display_position[2]-screen_pi_size[2]];

// Measured rear bodies for the lower control modules. Coordinates match the
// production hole layout in apache_2800_chassis.scad.
lower_y = panel_module_centers[1][1];
safety_positions = [[-120.0,lower_y,study_deck_underside_z-safety_toggle_rear_size[2]],
                    [ -76.0,lower_y,study_deck_underside_z-safety_toggle_rear_size[2]]];
safety_sizes = [safety_toggle_rear_size,safety_toggle_rear_size];
key_positions = [[-22.0,lower_y,study_deck_underside_z-key_switch_rear_size[2]],
                 [ 22.0,lower_y,study_deck_underside_z-key_switch_rear_size[2]]];
key_sizes = [key_switch_rear_size,key_switch_rear_size];
rocker_positions = [[-22.0,lower_y-23.0,study_deck_underside_z-rocker_total_rear_depth],
                    [ 22.0,lower_y-23.0,study_deck_underside_z-rocker_total_rear_depth]];
rocker_size = [rocker_hole_diameter,rocker_hole_diameter,rocker_total_rear_depth];
rocker_sizes = [rocker_size,rocker_size];
socket_positions = [for (p=activity_socket_local_positions)
    [utility_module_center[0]+p[0],lower_y+p[1],
     study_deck_underside_z-activity_socket_rear_depth]];
socket_size = [activity_socket_flange_diameter,activity_socket_flange_diameter,
               activity_socket_rear_depth];
socket_sizes = [for (p=socket_positions) socket_size];

component_positions = concat([fuse_block_position,floor_pi_position],
                             converter_positions,
                             [screen_display_position,screen_pi_position],
                             safety_positions,key_positions,rocker_positions,
                             socket_positions);
component_sizes = concat([fuse_block_size,floor_pi_size],
                         converter_sizes,
                         [screen_display_size,screen_pi_size],
                         safety_sizes,key_sizes,rocker_sizes,socket_sizes);
component_names = concat(["FUSE6","PI_FLOOR"],converter_names,
                         ["SCREEN_DISPLAY","SCREEN_PI",
                          "SAFETY1","SAFETY2","KEY1","KEY2",
                          "ROCKER1","ROCKER2","SOCKET1","SOCKET2",
                          "SOCKET3","SOCKET4"]);

function component_inside_chassis_xy(p, s, clearance = 0) =
    abs(p[0]) + s[0]/2 + clearance <= chassis_outer_x/2 - chassis_rail_width &&
    abs(p[1]) + s[1]/2 + clearance <= chassis_outer_y/2 - chassis_rail_width;

function aabb_separated(p1, s1, p2, s2, clearance = 0) =
    p1[0] + s1[0]/2 + clearance <= p2[0] - s2[0]/2 ||
    p2[0] + s2[0]/2 + clearance <= p1[0] - s1[0]/2 ||
    p1[1] + s1[1]/2 + clearance <= p2[1] - s2[1]/2 ||
    p2[1] + s2[1]/2 + clearance <= p1[1] - s1[1]/2 ||
    p1[2] + s1[2] + clearance <= p2[2] ||
    p2[2] + s2[2] + clearance <= p1[2];

// Derived thermal estimate: 1 CFM carries about 0.569 W/K near room conditions.
minimum_ideal_cfm = estimated_heat_watts / (0.569 * allowed_internal_rise_c);
design_cfm = minimum_ideal_cfm * airflow_safety_factor;
derated_fan_cfm = recommended_fan_nominal_cfm * filter_and_grille_derating;

assert(chassis_outer_x < case_floor_clear_x && chassis_outer_y < case_floor_clear_y,
       "Chassis envelope exceeds the modeled clear floor.");
assert(fan_size + 12 < lower_outer_height,
       "Fan station does not fit the placeholder lower-wall height.");
assert(exhaust_z + fan_air_cutout_diameter/2 <= study_control_panel_z,
       "Exhaust opening intrudes above the electronics cavity.");
assert(exhaust_z + fan_hole_pitch/2 <= study_control_panel_z,
       "Upper exhaust mounting holes intrude into the panel-deck zone.");
assert(len(converter_positions) <= fuse_block_circuits,
       "Populated converter count exceeds available fused circuits.");
for (i = [0:len(component_positions) - 1])
    assert(component_inside_chassis_xy(component_positions[i],
                                       component_sizes[i]),
           str(component_names[i],
               " exceeds the rectangular chassis clear boundary."));
for (i = [0:len(component_positions) - 2],
     j = [i + 1:len(component_positions) - 1])
    assert(aabb_separated(component_positions[i], component_sizes[i],
                          component_positions[j], component_sizes[j],
                          component_names[i] == "SCREEN_DISPLAY" &&
                          component_names[j] == "SCREEN_PI"
                              ? 0 : component_clearance),
           str("Component clearance violation: ", component_names[i],
               " versus ", component_names[j]));
