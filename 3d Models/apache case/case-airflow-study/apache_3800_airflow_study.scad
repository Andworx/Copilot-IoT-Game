/*
  Parametric APACHE 3800 enclosure/airflow placement study.

  This is a reference envelope and collision/thermal planning model, not a
  printable replacement case and not a drilling template.
*/

include <airflow_params.scad>

part = "assembly_open";
// [assembly_open,assembly_closed,airflow_section,electronics_layout,port_layout,rear_port_layout,case_lower_reference,case_lid_reference]

eps = 0.02;

module rounded_rect_centered(w, d, r) {
    rr = min(r, min(w, d)/2 - eps);
    hull()
        for (x = [-w/2 + rr, w/2 - rr],
             y = [-d/2 + rr, d/2 - rr])
            translate([x, y]) circle(r = rr);
}

module rounded_prism(w, d, h, r, z = 0) {
    translate([0, 0, z])
        linear_extrude(height = h)
            rounded_rect_centered(w, d, r);
}

module centered_ring(w, d, h, r, t, z = 0) {
    translate([0, 0, z])
        linear_extrude(height = h)
            difference() {
                rounded_rect_centered(w, d, r);
                rounded_rect_centered(w - 2*t, d - 2*t, max(1, r - t));
            }
}

module tapered_inner_cavity() {
    hull() {
        translate([0, 0, case_base_thickness])
            linear_extrude(height = eps)
                rounded_rect_centered(case_floor_clear_x,
                                      case_floor_clear_y,
                                      case_floor_radius);
        translate([0, 0, lower_outer_height])
            linear_extrude(height = eps)
                rounded_rect_centered(case_inner_x_top,
                                      case_inner_y_top,
                                      case_inner_top_radius);
    }
}

module fan_holes_x(side = 1, cy = 0, cz = 45) {
    x = side * case_outer_x/2;
    translate([x, cy, cz])
        rotate([0, 90, 0])
            cylinder(h = 70, d = fan_air_cutout_diameter, center = true);
    for (dy = [-fan_hole_pitch/2, fan_hole_pitch/2],
         dz = [-fan_hole_pitch/2, fan_hole_pitch/2])
        translate([x, cy + dy, cz + dz])
            rotate([0, 90, 0])
                cylinder(h = 70, d = fan_fastener_diameter, center = true);
}

module service_port_holes() {
    // Rear long wall, below the hinge: fused inlet and round control dial.
    translate([power_inlet_x, case_outer_y/2, power_inlet_z])
        cube([power_cutout_x, 70, power_cutout_z], center = true);
    translate([dial_x, case_outer_y/2, dial_z])
        rotate([90, 0, 0])
            cylinder(h = 70, d = dial_panel_hole_diameter, center = true);
}

module lower_case(cut_ports = true) {
    difference() {
        rounded_prism(case_outer_x, case_outer_y, lower_outer_height,
                      case_outer_corner_radius);
        tapered_inner_cavity();
        if (cut_ports) {
            fan_holes_x(-1, intake_y, intake_z);
            fan_holes_x(1, exhaust_y, exhaust_z);
            service_port_holes();
        }
    }
}

module lid_reference() {
    // Simplified hollow lid envelope; foam, ribs, gasket, and hinge are keepouts.
    difference() {
        rounded_prism(case_outer_x, case_outer_y, lid_outer_height,
                      case_outer_corner_radius);
        translate([0, 0, 8])
            rounded_prism(case_inner_x_top, case_inner_y_top,
                          lid_outer_height + 1,
                          case_inner_top_radius);
    }
}

module lid_at_angle(angle = -105) {
    translate([0, case_outer_y/2, lower_outer_height])
        rotate([angle, 0, 0])
            translate([0, -case_outer_y/2, 0])
                lid_reference();
}

module chassis_envelope(show_panel = true) {
    color([0.88, 0.55, 0.10, 0.88])
        centered_ring(chassis_outer_x, chassis_outer_y, chassis_height,
                      chassis_corner_radius, chassis_rail_width,
                      chassis_floor_z);
    if (show_panel)
        fixed_panel_reference();
}

module component_block(position, size, tint, label = "", label_size = 7) {
    color(tint)
        translate([position[0] - size[0]/2,
                   position[1] - size[1]/2,
                   position[2]])
            cube(size);
    if (label != "")
        color([0.04, 0.04, 0.05, 1.0])
            translate([position[0], position[1], position[2] + size[2] + 0.05])
                linear_extrude(height = 0.45)
                    text(label, size = label_size,
                         halign = "center", valign = "center");
}

module electronics_floor_envelopes() {
    component_block(psu_position, psu_size,
                    [0.65, 0.65, 0.68, 0.90], "PSU");
    component_block(fuse_block_position, fuse_block_size,
                    [0.12, 0.35, 0.82, 0.88], "FUSE6");
    for (i = [0:len(converter_positions) - 1])
        component_block(converter_positions[i], converter_size,
                        [0.85, 0.55, 0.12, 0.90],
                        i < 3 ? str("DC",i + 1)
                              : str("DC",i - 2,"/DC",i + 1," STACK"),4);
}

module pi_envelopes() {
    for (i = [0:len(pi_positions) - 1])
        component_block(pi_positions[i], pi_size,
                        i == 0 ? [0.15, 0.65, 0.25, 0.38]
                               : [0.15, 0.48, 0.75, 0.38],
                        str("PI", i + 1));
}

module panel_keepout_outlines() {
    keepout_labels = ["SCREEN REAR", "ROTARY REAR",
                      "SWITCH REAR", "UTILITY REAR"];
    for (i = [0:len(panel_keepout_positions) - 1]) {
        tint = i == 0 ? [0.55, 0.20, 0.75, 1.0]
                      : [0.10, 0.55, 0.75, 1.0];
        color(tint)
            translate([panel_keepout_positions[i][0],
                       panel_keepout_positions[i][1],
                       control_panel_z + 0.1])
                linear_extrude(height = 0.8)
                    difference() {
                        square([panel_keepout_sizes[i][0],
                                panel_keepout_sizes[i][1]], center = true);
                        square([panel_keepout_sizes[i][0] - 2.0,
                                panel_keepout_sizes[i][1] - 2.0],
                               center = true);
                    }
        color([0.04, 0.04, 0.05, 1.0])
            translate([panel_keepout_positions[i][0],
                       panel_keepout_positions[i][1]
                           + panel_keepout_sizes[i][1]/2 - 6,
                       control_panel_z + 1.0])
                linear_extrude(height = 0.45)
                    text(keepout_labels[i], size = 5,
                         halign = "center", valign = "center");
    }
}

module fixed_panel_reference() {
    color([0.14, 0.22, 0.30, 0.25])
        translate([0, 0, control_panel_z-fixed_panel_thickness])
            linear_extrude(height = fixed_panel_thickness)
                rounded_rect_centered(fixed_panel_size[0],
                                      fixed_panel_size[1], 7);
    for (i = [0:len(panel_module_centers) - 1])
        color(i == 0 ? [0.40, 0.16, 0.65, 0.72]
                     : [0.10, 0.48, 0.68, 0.72])
            translate([panel_module_centers[i][0],
                       panel_module_centers[i][1],control_panel_z])
                linear_extrude(height = panel_module_sizes[i][2])
                    rounded_rect_centered(panel_module_sizes[i][0],
                                          panel_module_sizes[i][1], 5);
}

module electronics_envelopes() {
    electronics_floor_envelopes();
    pi_envelopes();
    for (i = [0:len(panel_keepout_positions) - 1])
        component_block(panel_keepout_positions[i],panel_keepout_sizes[i],
                        [0.45, 0.18, 0.72, 0.16],
                        str("PANEL",i + 1));
}

module fan_mockup(side = 1, cy = 0, cz = 45, intake = false) {
    x = side * (case_outer_x/2 - fan_thickness/2 - 2);
    color(intake ? [0.15, 0.55, 0.95, 0.82] : [0.95, 0.35, 0.12, 0.82])
        translate([x, cy, cz])
            cube([fan_thickness, fan_size, fan_size], center = true);
    color([0.1, 0.1, 0.1, 0.9])
        translate([side * (case_outer_x/2 + 2), cy, cz])
            rotate([0, 90, 0])
                cylinder(h = 4, d = fan_air_cutout_diameter, center = true);
}

module service_hardware_mockups() {
    color([0.12, 0.12, 0.14, 0.92])
        translate([power_inlet_x, case_outer_y/2 + 5, power_inlet_z])
            cube([power_face_x, 10, power_face_z], center = true);
    // Selector body projects inward; shaft and knob project outward.
    color([0.72, 0.72, 0.68, 0.72])
        translate([dial_x, case_outer_y/2 - dial_body_depth/2, dial_z])
            rotate([90, 0, 0])
                cylinder(h = dial_body_depth, d = dial_body_diameter,
                         center = true);
    color([0.72, 0.72, 0.68, 0.95])
        translate([dial_x, case_outer_y/2 + dial_shaft_length/2, dial_z])
            rotate([90, 0, 0])
                cylinder(h = dial_shaft_length, d = dial_shaft_diameter,
                         center = true);
    color([0.18, 0.18, 0.20, 0.95])
        translate([dial_x,
                   case_outer_y/2 + dial_shaft_length - dial_knob_depth/2,
                   dial_z])
            rotate([90, 0, 0])
                cylinder(h = dial_knob_depth, d = dial_knob_diameter,
                         center = true);
}

module rear_service_panel_reference() {
    // Photo-derived planning envelope only: recessed panel between inner ribs.
    color([0.10, 0.55, 0.95, 0.24])
        translate([0, case_outer_y/2 + 1.5, rear_service_panel_center_z])
            cube([rear_service_panel_clear_width, 3,
                  rear_service_panel_clear_height], center = true);
    for (x = [-rear_service_rib_x, rear_service_rib_x])
        color([0.95, 0.45, 0.08, 0.55])
            translate([x, case_outer_y/2 + 2.5, rear_service_panel_center_z])
                cube([8, 5, rear_service_panel_clear_height + 18], center = true);
}

module arrow_between(p1, p2, d = 4, tint = [0.1, 0.8, 1.0, 0.85]) {
    v = p2 - p1;
    length = norm(v);
    axis = cross([0, 0, 1], v);
    angle = acos(v[2]/length);
    color(tint)
        translate(p1)
            rotate(a = angle, v = axis)
                union() {
                    cylinder(h = max(1, length - 9), d = d);
                    translate([0, 0, max(1, length - 9)])
                        cylinder(h = min(9, length), d1 = d*2.2, d2 = 0);
                }
}

module airflow_path() {
    p0 = [-case_outer_x/2 - 12, intake_y, intake_z];
    p1 = [-120, intake_y, 34];
    p2 = [-35, -30, 41];
    p3 = [52, 22, 47];
    p4 = [132, exhaust_y, exhaust_z];
    p5 = [case_outer_x/2 + 12, exhaust_y, exhaust_z];
    arrow_between(p0, p1, 4, [0.10, 0.55, 1.0, 0.9]);
    arrow_between(p1, p2, 4, [0.10, 0.72, 0.95, 0.9]);
    arrow_between(p2, p3, 4, [0.25, 0.82, 0.72, 0.9]);
    arrow_between(p3, p4, 4, [0.95, 0.62, 0.12, 0.9]);
    arrow_between(p4, p5, 4, [0.95, 0.30, 0.10, 0.9]);
}

module front_hardware_keepouts() {
    // Visual warnings only: actual handle/latch locations must be measured.
    color([0.95, 0.1, 0.5, 0.30]) {
        translate([0, -case_outer_y/2 - 12, 30])
            cube([130, 24, 52], center = true);
        for (x = [-118, 118])
            translate([x, -case_outer_y/2 - 8, 68])
                cube([48, 18, 45], center = true);
    }
}

module open_study(show_shell = true, show_panel = true) {
    if (show_shell)
        color([0.06, 0.07, 0.08, 0.36]) lower_case(true);
    color([0.08, 0.09, 0.10, 0.24]) lid_at_angle(-105);
    chassis_envelope(show_panel);
    electronics_envelopes();
    fan_mockup(-1, intake_y, intake_z, true);
    fan_mockup(1, exhaust_y, exhaust_z, false);
    service_hardware_mockups();
    airflow_path();
}

module closed_study() {
    color([0.06, 0.07, 0.08, 0.72]) lower_case(true);
    color([0.08, 0.09, 0.10, 0.72])
        translate([0, 0, lower_outer_height]) lid_reference();
    fan_mockup(-1, intake_y, intake_z, true);
    fan_mockup(1, exhaust_y, exhaust_z, false);
    service_hardware_mockups();
    front_hardware_keepouts();
}

echo(str("CATALOG OUTER: ", case_outer_x, " x ", case_outer_y,
         " x ", case_total_height, " mm"));
echo(str("CHASSIS STUDY: ", chassis_outer_x, " x ", chassis_outer_y,
         " x ", chassis_height, " mm"));
echo(str("IDEAL AIRFLOW: ", minimum_ideal_cfm, " CFM"));
echo(str("DESIGN AIRFLOW: ", design_cfm, " CFM"));
echo(str("DERATED ", recommended_fan_nominal_cfm, " CFM FAN: ",
         derated_fan_cfm, " CFM"));
echo(str("SIX CONVERTERS AT 25 W OUTPUT AND 90% EFFICIENCY: ",
         converter_full_load_loss_watts, " W CONVERTER LOSS"));

if (part == "assembly_open") open_study(true, true);
else if (part == "assembly_closed") closed_study();
else if (part == "airflow_section") open_study(false, false);
else if (part == "electronics_layout") {
    chassis_envelope(false);
    electronics_floor_envelopes();
    pi_envelopes();
    panel_keepout_outlines();
}
else if (part == "port_layout" || part == "rear_port_layout") {
    color([0.10, 0.11, 0.12, 0.58]) lower_case(true);
    fan_mockup(-1, intake_y, intake_z, true);
    fan_mockup(1, exhaust_y, exhaust_z, false);
    if (part == "rear_port_layout") rear_service_panel_reference();
    service_hardware_mockups();
    front_hardware_keepouts();
}
else if (part == "case_lower_reference") lower_case(true);
else if (part == "case_lid_reference") lid_reference();
else assert(false, str("Unknown part: ", part));
