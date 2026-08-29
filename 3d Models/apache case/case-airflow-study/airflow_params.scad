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
exhaust_z = 54.0;

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

// Approximate electronics envelopes for airflow visualization only.
psu_size = [159.0, 97.0, 30.0];
pi_size = [85.0, 56.0, 22.0];
converter_size = [52.0, 32.0, 18.0];
terminal_size = [90.0, 24.0, 22.0];

// Derived thermal estimate: 1 CFM carries about 0.569 W/K near room conditions.
minimum_ideal_cfm = estimated_heat_watts / (0.569 * allowed_internal_rise_c);
design_cfm = minimum_ideal_cfm * airflow_safety_factor;
derated_fan_cfm = recommended_fan_nominal_cfm * filter_and_grille_derating;

assert(chassis_outer_x < case_floor_clear_x && chassis_outer_y < case_floor_clear_y,
       "Chassis envelope exceeds the modeled clear floor.");
assert(fan_size + 12 < lower_outer_height,
       "Fan station does not fit the placeholder lower-wall height.");
