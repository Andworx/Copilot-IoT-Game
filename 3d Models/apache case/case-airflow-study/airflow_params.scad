/* APACHE 3800 enclosure and airflow-study parameters, millimetres/degrees. */

$fn = 48;
inch = 25.4;

// Official Harbor Freight catalogue envelope. Specifications are approximate.
case_outer_x = 16.5 * inch;       // 419.10 mm, long axis
case_outer_y = 13.0 * inch;       // 330.20 mm, front-to-rear axis
case_total_height = 6.75 * inch;  // 171.45 mm
case_inner_x_top = 14.875 * inch; // 377.825 mm
case_inner_y_top = 10.625 * inch; // 269.875 mm
case_inner_height = 6.125 * inch; // 155.575 mm

// MEASURE_BEFORE_DRILL: case split and molded floor/wall geometry.
lower_outer_height = 98.0;
lid_outer_height = case_total_height - lower_outer_height;
case_outer_corner_radius = 34.0;
case_inner_top_radius = 27.0;
case_base_thickness = 7.0;
case_floor_clear_x = 316.3875; // final-fit width plus 5 mm per side
case_floor_clear_y = 239.45;   // final-fit depth plus 5 mm per side
case_floor_radius = 26.5;

// Confirmed/candidate removable chassis envelope.
chassis_outer_x = 306.3875;
chassis_outer_y = 229.45;
chassis_corner_radius = 21.5;
chassis_height = 70.0;
chassis_rail_width = 7.2;
chassis_floor_z = case_base_thickness;
control_panel_z = chassis_floor_z + chassis_height;

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
// Ordered FILSHU B0FZQ866Z3 IEC320 C14/fuse/switch module. The listing's
// drawing is rotated 90 degrees here so the module fits the low rear panel.
// Verify the delivered part with calipers before producing a drilling template.
power_face_x = 66.6;
power_face_z = 31.8;
power_cutout_x = 56.1;
power_cutout_z = 27.9;
power_body_depth = 30.0;
dial_x = -45.0; // exterior rear-view right
dial_z = 42.0;
// Ordered FOCMKEAS B0F9KTRGV5 RS26 2P6T six-position selector.
// The common RS26 panel bushing is 3/8-32; use a small clearance hole here.
// Verify the delivered bushing, anti-rotation washer, nut, and knob with calipers.
dial_panel_hole_diameter = 9.8;
dial_body_diameter = 28.6;
dial_body_depth = 18.0; // inferred from 38 mm overall less 20 mm shaft
dial_shaft_diameter = 6.0;
dial_shaft_length = 20.0;
dial_knob_diameter = 18.0; // placeholder until the included knob is measured
dial_knob_depth = 14.0;

// Electronics envelopes and collision-checked planning locations.
// Positions are [center X, center Y, bottom Z]. These remain planning values;
// mounting holes, cable bends, rounded-corner clearance, and service paths must
// be checked against the delivered components before brackets are designed.
psu_size = [159.0, 97.0, 30.0];
psu_position = [40.0, 44.0, chassis_floor_z + 4.0];

pi_size = [85.0, 56.0, 22.0];
pi_positions = [
    [ 0.0, -42.0, chassis_floor_z + 5.0],
    [90.0, -42.0, chassis_floor_z + 5.0]
];

// Blue Sea Systems 5025, rotated 90 degrees in plan. Manufacturer drawing:
// 124.31 x 84.20 x 38.57 mm; 98.58 x 63.50 mm mounting-hole spacing.
fuse_block_size = [84.20, 124.31, 38.57];
fuse_block_position = [-100.0, 44.0, chassis_floor_z];
fuse_block_circuits = 6;

// PlusRoc PR4A070 body is approximately 46 x 32 x 18 mm. The 68 mm X
// envelope deliberately reserves unverified mounting ears and lead exits.
converter_size = [68.0, 32.0, 18.0];
converter_positions = [
    [-74.0, -90.0, chassis_floor_z + 1.0],
    [  0.0, -90.0, chassis_floor_z + 1.0],
    [ 74.0, -90.0, chassis_floor_z + 1.0],
    [-74.0, -90.0, chassis_floor_z + 23.0],
    [  0.0, -90.0, chassis_floor_z + 23.0],
    [ 74.0, -90.0, chassis_floor_z + 23.0]
];
converter_max_output_watts = 25.0;
converter_efficiency_assumption = 0.90;
converter_full_load_loss_watts = fuse_block_circuits *
    converter_max_output_watts * (1 / converter_efficiency_assumption - 1);

component_clearance = 4.0;

// Fixed-panel module envelopes. Y values convert the production panel's
// front-origin coordinates into this study's centered coordinate system.
// Candidate-derived panel: production Rev 3 remains 225.55 mm deep until the
// 229.45 mm chassis fit result is explicitly promoted.
fixed_panel_size = [296.9875, 220.05, 5.0];
fixed_panel_thickness = fixed_panel_size[2];
screen_model = "official_touch_display_7_original";
screen_body_size = screen_model == "touch_display_2_7"
                     ? [189.5,120.0] : [192.96,110.76];
screen_rear_keepout = screen_model == "touch_display_2_7" ? 19.0 : 20.0;
panel_module_centers = [
    [0.0, 155.5 - chassis_outer_y/2],
    [-98.0, 45.0 - chassis_outer_y/2],
    [0.0, 45.0 - chassis_outer_y/2],
    [98.0, 45.0 - chassis_outer_y/2]
];
panel_module_sizes = [[220.0,146.0,3.2],[90.0,74.0,3.2],
                      [90.0,74.0,3.2],[90.0,74.0,3.2]];
// SCREEN_REAR reserves the original official 7-inch display assembly without
// a Raspberry Pi attached to its rear standoffs. Pi envelopes remain on the
// floor. The delivered screen depth and FFC bend still require a physical test.
panel_keepout_sizes = [[screen_body_size[0],screen_body_size[1],screen_rear_keepout],
                       [90.0,74.0,18.0],[90.0,74.0,16.0],
                       [90.0,74.0,16.0]];
panel_keepout_positions = [
    [panel_module_centers[0][0],panel_module_centers[0][1],
     control_panel_z-fixed_panel_thickness-panel_keepout_sizes[0][2]],
    [panel_module_centers[1][0],panel_module_centers[1][1],
     control_panel_z-fixed_panel_thickness-panel_keepout_sizes[1][2]],
    [panel_module_centers[2][0],panel_module_centers[2][1],
     control_panel_z-fixed_panel_thickness-panel_keepout_sizes[2][2]],
    [panel_module_centers[3][0],panel_module_centers[3][1],
     control_panel_z-fixed_panel_thickness-panel_keepout_sizes[3][2]]
];

component_positions = concat([psu_position, fuse_block_position],
                             pi_positions, converter_positions,
                             panel_keepout_positions);
component_sizes = concat([psu_size, fuse_block_size],
                         [for (p = pi_positions) pi_size],
                         [for (p = converter_positions) converter_size],
                         panel_keepout_sizes);
component_names = ["PSU", "FUSE6", "PI1", "PI2",
                   "DC1", "DC2", "DC3", "DC4", "DC5", "DC6",
                   "SCREEN_REAR", "ROTARY_REAR", "SWITCH_REAR",
                   "UTILITY_REAR"];

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
assert(exhaust_z + fan_air_cutout_diameter/2 <= control_panel_z,
       "Exhaust opening intrudes above the electronics cavity.");
assert(exhaust_z + fan_hole_pitch/2 <= control_panel_z,
       "Upper exhaust mounting holes intrude into the panel-deck zone.");
assert(len(converter_positions) == fuse_block_circuits,
       "Provide one converter envelope for every modeled fused circuit.");
for (i = [0:len(component_positions) - 1])
    assert(component_inside_chassis_xy(component_positions[i],
                                       component_sizes[i]),
           str(component_names[i],
               " exceeds the rectangular chassis clear boundary."));
for (i = [0:len(component_positions) - 2],
     j = [i + 1:len(component_positions) - 1])
    assert(aabb_separated(component_positions[i], component_sizes[i],
                          component_positions[j], component_sizes[j],
                          i >= 10 && j >= 10 ? 0 : component_clearance),
           str("Component clearance violation: ", component_names[i],
               " versus ", component_names[j]));
