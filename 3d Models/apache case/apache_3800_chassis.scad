/*
  Fully parametric structural foundation for an APACHE 3800 IoT demo case.

  Choose `part` below or override it from the CLI:
    openscad -D 'part="assembly_open"' -o preview.png apache_3800_chassis.scad
*/
include <model_params.scad>

part = "assembly_closed";
// [assembly_closed,assembly_open,assembly_service,assembly_exploded,chassis_complete,chassis_front_left,chassis_front_right,chassis_rear_left,chassis_rear_right,panel_complete,panel_left,panel_right,front_bezel,front_bezel_left,front_bezel_right,hinge_fitcheck,chassis_joiner_x,chassis_joiner_y,panel_joiner,bezel_joiner,fit_test_frame_complete,fit_test_front_left,fit_test_front_right,fit_test_rear_left,fit_test_rear_right,fit_test_pin_joiner_x,fit_test_pin_joiner_y,hinge_insert_coupon]

eps = 0.02;

// ---------- Generic geometry ----------
module rounded_rect_2d(w,d,r) {
    rr = min(r, min(w,d)/2-eps);
    hull() for (x=[-w/2+rr,w/2-rr], y=[rr,d-rr]) translate([x,y]) circle(r=rr);
}

module rounded_plate(w,d,h,r,z=0,y=0) {
    translate([0,y,z]) linear_extrude(height=h) rounded_rect_2d(w,d,r);
}

module vertical_hole(x,y,z0,h,d) {
    translate([x,y,z0-eps]) cylinder(h=h+2*eps,d=d);
}

module insert_boss(x,y,z0,h,axis="z") {
    if (axis == "z") difference() {
        translate([x,y,z0]) cylinder(h=h,d=boss_outer_diameter);
        vertical_hole(x,y,z0,h,heatset_insert_diameter);
    }
}

module gusset_x(x,y,z,w=3.2,d=18,h=18,mirror_x=false) {
    // Triangular prism, printable without supports.
    translate([x,y,z]) rotate([90,0,90])
        linear_extrude(height=w) polygon(points=[[0,0],[d,0],[0,h]]);
}

module rounded_ring(w,d,h,r,t,z0=0) {
    translate([0,0,z0]) linear_extrude(height=h) difference() {
        rounded_rect_2d(w,d,r);
        translate([0,t]) rounded_rect_2d(w-2*t,d-2*t,max(1,r-t));
    }
}

function smoothstep01(v) = v*v*(3-2*v);

module tapered_ring_slice(w,d,r,t,inset0,inset1,z0,z1) {
    difference() {
        hull() {
            translate([0,inset0,z0]) linear_extrude(height=eps)
                rounded_rect_2d(w-2*inset0,d-2*inset0,max(2,r-inset0));
            translate([0,inset1,z1-eps]) linear_extrude(height=eps)
                rounded_rect_2d(w-2*inset1,d-2*inset1,max(2,r-inset1));
        }
        hull() {
            translate([0,inset0+t,z0-eps]) linear_extrude(height=eps*2)
                rounded_rect_2d(w-2*inset0-2*t,d-2*inset0-2*t,
                                max(1,r-inset0-t));
            translate([0,inset1+t,z1-eps]) linear_extrude(height=eps*2)
                rounded_rect_2d(w-2*inset1-2*t,d-2*inset1-2*t,
                                max(1,r-inset1-t));
        }
    }
}

module tapered_rounded_ring(w,d,h,r,t,inset,z0=0) {
    // Multi-stage smoothstep expansion: tangent is nearly vertical at the
    // flat floor and upper wall, eliminating the hard straight-ramp breaks.
    render(convexity=10) union() for(i=[0:bevel_curve_steps-1]) {
        t0=i/bevel_curve_steps;
        t1=(i+1)/bevel_curve_steps;
        inset0=inset*(1-smoothstep01(t0));
        inset1=inset*(1-smoothstep01(t1));
        tapered_ring_slice(w,d,r,t,inset0,inset1,
                           z0+h*t0,z0+h*t1+eps);
    }
}

module hole_pair_x(cx,cy,z0,h,spacing=16,d=heatset_insert_diameter) {
    for (x=[cx-spacing/2,cx+spacing/2]) vertical_hole(x,cy,z0,h,d);
}

// ---------- Chassis ----------
module chassis_shell() {
    difference() {
        union() {
            // Above the reinforced curved bottom rail, a thin vertical wall
            // keeps the service cavity open. The lower rail alone owns Z=0 to
            // the bevel height, avoiding coincident internal surfaces.
            rounded_ring(chassis_outer_width,chassis_outer_depth,
                         chassis_height-case_bottom_bevel_height,
                         chassis_corner_radius,chassis_wall_thickness,
                         case_bottom_bevel_height);

            // Bottom and top rails distribute loads without a massive solid floor.
            tapered_rounded_ring(chassis_outer_width,chassis_outer_depth,
                                 case_bottom_bevel_height,chassis_corner_radius,
                                 chassis_wall_thickness+4,case_bottom_bevel_inset);
            if(bottom_rail_height > case_bottom_bevel_height)
                rounded_ring(chassis_outer_width,chassis_outer_depth,
                             bottom_rail_height-case_bottom_bevel_height,
                             chassis_corner_radius,chassis_wall_thickness+4,
                             case_bottom_bevel_height);
            rounded_ring(chassis_outer_width,chassis_outer_depth,top_rail_height,
                         chassis_corner_radius,chassis_wall_thickness+support_ledge_width,
                         chassis_height-top_rail_height);

            // Fixed front hinge rail. Bezel remains a separate removable part.
            translate([-chassis_inner_width/2,front_bezel_depth,chassis_height-top_rail_height])
                cube([chassis_inner_width,
                      hinge_offset+hinge_leaf_width+hinge_barrel_diameter/2,
                      top_rail_height]);

            gas_mounts_chassis_solid();
            actuator_mount_chassis_solid();
            seam_insert_pads();
        }

        // Recess the fixed hinge leaf so its upper face is flush with the deck.
        translate([-hinge_length/2-hinge_end_clearance,
                   front_bezel_depth+hinge_offset,
                   chassis_height-hinge_leaf_thickness-hinge_pocket_clearance])
            cube([hinge_length+2*hinge_end_clearance,
                  hinge_leaf_width+hinge_pocket_clearance,
                  hinge_leaf_thickness+hinge_pocket_clearance+eps]);

        // Hinge insert pilots, installed from the top after printing.
        for (x=hinge_fastener_xs())
            vertical_hole(x,
                          front_bezel_depth+hinge_offset+hinge_leaf_width/2,
                          chassis_height-heatset_insert_depth,
                          heatset_insert_depth+eps,
                          heatset_insert_diameter);

        // Generous rounded cable pass-through at hinge centreline.
        translate([-cable_route_width/2,
                   hinge_pin_y-cable_route_depth/2,
                   deck_underside_z-cable_bend_clearance])
            cube([cable_route_width,cable_route_depth,
                  panel_thickness+cable_bend_clearance+2*eps]);

        gas_mounts_chassis_holes();
        actuator_mount_chassis_holes();
        seam_insert_holes();

        // Bezel screws pass through the removable bezel into inserts in the
        // chassis front wall; no fastener is trapped when the panel is open.
        for (x=[-chassis_inner_width/2+18,chassis_inner_width/2-18])
            vertical_hole(x,front_bezel_depth/2,
                          chassis_height-heatset_insert_depth,
                          heatset_insert_depth+eps,
                          heatset_insert_diameter);
    }
}

function hinge_fastener_xs() =
    [for(i=[0:hinge_screw_count-1])
        -hinge_length/2+12+i*(hinge_length-24)/(hinge_screw_count-1)];

module gas_mounts_chassis_solid() {
    for (side=[-1,1]) {
        cx = side*(chassis_inner_width/2-gas_strut_mount_offset);
        cy = hinge_pin_y+gas_strut_mount_y_chassis;
        translate([cx-gas_strut_pad_width/2,cy-gas_strut_pad_depth/2,bottom_rail_height])
            cube([gas_strut_pad_width,gas_strut_pad_depth,gas_strut_pad_thickness]);
        // Two ribs tie each pad into the nearby side wall.
        for (dy=[-gas_strut_pad_depth/2+3,gas_strut_pad_depth/2-6])
            translate([side<0 ? -chassis_inner_width/2 : cx,
                       cy+dy,bottom_rail_height])
                cube([abs(cx-(side<0 ? -chassis_inner_width/2 : chassis_inner_width/2)),3.2,12]);
    }
}

module gas_mounts_chassis_holes() {
    for (side=[-1,1]) {
        cx=side*(chassis_inner_width/2-gas_strut_mount_offset);
        cy=hinge_pin_y+gas_strut_mount_y_chassis;
        hole_pair_x(cx,cy,bottom_rail_height,gas_strut_pad_thickness+eps,
                    gas_strut_hole_spacing);
    }
}

module actuator_mount_chassis_solid() {
    cy=chassis_outer_depth-actuator_mount_offset;
    translate([-actuator_pad_width/2,cy-actuator_pad_depth/2,bottom_rail_height])
        cube([actuator_pad_width,actuator_pad_depth,actuator_pad_thickness]);
    for (x=[-actuator_pad_width/2,actuator_pad_width/2-3.2])
        translate([x,cy+actuator_pad_depth/2-3.2,bottom_rail_height])
            cube([3.2,chassis_outer_depth-(cy+actuator_pad_depth/2),16]);
}

module actuator_mount_chassis_holes() {
    cy=chassis_outer_depth-actuator_mount_offset;
    hole_pair_x(0,cy,bottom_rail_height,actuator_pad_thickness+eps,
                actuator_hole_spacing);
}

module seam_insert_pads() {
    // Pads flank both split axes. Joiners are installed from the open cavity.
    for (x=[-joiner_hole_spacing/2,joiner_hole_spacing/2],
         y=[seam_pad_wall_offset,chassis_outer_depth-seam_pad_wall_offset])
        translate([x,y,bottom_rail_height]) cylinder(h=heatset_insert_depth+2,d=boss_outer_diameter);
    for (y=[chassis_split_y-joiner_hole_spacing/2,
            chassis_split_y+joiner_hole_spacing/2],
         x=[-chassis_outer_width/2+seam_pad_wall_offset,
            chassis_outer_width/2-seam_pad_wall_offset])
        translate([x,y,bottom_rail_height]) cylinder(h=heatset_insert_depth+2,d=boss_outer_diameter);
}

module seam_insert_holes() {
    for (x=[-joiner_hole_spacing/2,joiner_hole_spacing/2],
         y=[seam_pad_wall_offset,chassis_outer_depth-seam_pad_wall_offset])
        vertical_hole(x,y,bottom_rail_height,heatset_insert_depth+2+eps,heatset_insert_diameter);
    for (y=[chassis_split_y-joiner_hole_spacing/2,
            chassis_split_y+joiner_hole_spacing/2],
         x=[-chassis_outer_width/2+seam_pad_wall_offset,
            chassis_outer_width/2-seam_pad_wall_offset])
        vertical_hole(x,y,bottom_rail_height,heatset_insert_depth+2+eps,heatset_insert_diameter);
}

// ---------- Fixed front bezel ----------
module front_bezel() {
    difference() {
        union() {
            translate([-chassis_inner_width/2,0,deck_underside_z])
                cube([chassis_inner_width,front_bezel_depth,front_bezel_thickness]);
            // Under-bezel ribs make the strip feel like equipment trim, not a loose plate.
            for (x=[-chassis_inner_width/2+12,chassis_inner_width/2-15])
                translate([x,4,deck_underside_z-panel_rib_height])
                    cube([3,front_bezel_depth-8,panel_rib_height]);
            for (x=[-chassis_inner_width/2+18,chassis_inner_width/2-18])
                translate([x,front_bezel_depth/2,deck_underside_z-heatset_insert_depth])
                    cylinder(h=heatset_insert_depth,d=boss_outer_diameter);
            // Centre-seam bosses accept a removable underside joiner so the
            // split bezel is rigid without glue.
            for (x=[-joiner_hole_spacing/2,joiner_hole_spacing/2])
                translate([x,front_bezel_depth/2,
                           deck_underside_z-joiner_thickness])
                    cylinder(h=joiner_thickness,d=boss_outer_diameter);
        }
        for (x=[-chassis_inner_width/2+18,chassis_inner_width/2-18])
            vertical_hole(x,front_bezel_depth/2,
                          deck_underside_z-heatset_insert_depth,
                          heatset_insert_depth+panel_thickness+eps,
                          mounting_screw_diameter);
        for (x=[-joiner_hole_spacing/2,joiner_hole_spacing/2])
            vertical_hole(x,front_bezel_depth/2,
                          deck_underside_z-joiner_thickness,
                          min(heatset_insert_depth,joiner_thickness)+eps,
                          heatset_insert_diameter);
    }
}

// ---------- Moving control panel ----------
module control_panel() {
    difference() {
        union() {
            rounded_plate(panel_width,panel_depth,panel_thickness,
                          panel_corner_radius,deck_underside_z,panel_front_y);
            panel_ribs();
            panel_hinge_bosses();
            gas_mounts_panel_solid();
            actuator_mount_panel_solid();
            panel_split_bosses();
        }

        // Moving hinge-leaf recess in the panel top.
        translate([-hinge_length/2-hinge_end_clearance,
                   panel_front_y,
                   chassis_height-hinge_leaf_thickness-hinge_pocket_clearance])
            cube([hinge_length+2*hinge_end_clearance,
                  hinge_leaf_width+hinge_pocket_clearance,
                  hinge_leaf_thickness+hinge_pocket_clearance+eps]);

        // Clearance through the panel skin; insert pilot only in the boss.
        for (x=hinge_fastener_xs()) {
            vertical_hole(x,panel_front_y+hinge_leaf_width/2,
                          deck_underside_z,
                          panel_thickness+eps,
                          mounting_screw_diameter);
            vertical_hole(x,panel_front_y+hinge_leaf_width/2,
                          deck_underside_z-panel_rib_height-boss_extra_depth,
                          min(heatset_insert_depth,panel_rib_height+boss_extra_depth)+eps,
                          heatset_insert_diameter);
        }

        // Wiring relief opens to the front edge and provides a broad bend radius.
        translate([-cable_route_width/2,panel_front_y-eps,
                   deck_underside_z-panel_rib_height-boss_extra_depth-eps])
            cube([cable_route_width,cable_route_depth,
                  panel_thickness+panel_rib_height+boss_extra_depth+2*eps]);

        gas_mounts_panel_holes();
        actuator_mount_panel_holes();
        panel_split_holes();
    }
}

module panel_ribs() {
    z0=deck_underside_z-panel_rib_height;
    inset=10;
    // Perimeter rib frame.
    translate([-panel_width/2+inset,panel_front_y+inset,z0])
        cube([panel_width-2*inset,panel_rib_thickness,panel_rib_height]);
    translate([-panel_width/2+inset,panel_back_y-inset-panel_rib_thickness,z0])
        cube([panel_width-2*inset,panel_rib_thickness,panel_rib_height]);
    for(x=[-panel_width/2+inset,panel_width/2-inset-panel_rib_thickness])
        translate([x,panel_front_y+inset,z0])
            cube([panel_rib_thickness,panel_depth-2*inset,panel_rib_height]);
    // Longitudinal and transverse ribs; module surface remains blank.
    for(x=[-panel_width/4,0,panel_width/4])
        translate([x-panel_rib_thickness/2,panel_front_y+24,z0])
            cube([panel_rib_thickness,panel_depth-42,panel_rib_height]);
    translate([-panel_width/2+inset,panel_front_y+panel_depth*0.53,z0])
        cube([panel_width-2*inset,panel_rib_thickness,panel_rib_height]);
}

module panel_hinge_bosses() {
    z0=deck_underside_z-panel_rib_height-boss_extra_depth;
    for (x=hinge_fastener_xs())
        translate([x,panel_front_y+hinge_leaf_width/2,z0])
            cylinder(h=panel_rib_height+boss_extra_depth,d=boss_outer_diameter);
}

module gas_mounts_panel_solid() {
    cy=panel_back_y-gas_strut_mount_y_panel;
    z0=deck_underside_z-panel_rib_height-gas_strut_pad_thickness;
    for(side=[-1,1]) {
        cx=side*(panel_width/2-gas_strut_mount_offset);
        translate([cx-gas_strut_pad_width/2,cy-gas_strut_pad_depth/2,z0])
            cube([gas_strut_pad_width,gas_strut_pad_depth,gas_strut_pad_thickness]);
    }
}

module gas_mounts_panel_holes() {
    cy=panel_back_y-gas_strut_mount_y_panel;
    z0=deck_underside_z-panel_rib_height-gas_strut_pad_thickness;
    for(side=[-1,1])
        hole_pair_x(side*(panel_width/2-gas_strut_mount_offset),cy,z0,
                    min(heatset_insert_depth,gas_strut_pad_thickness)+eps,
                    gas_strut_hole_spacing,heatset_insert_diameter);
}

module actuator_mount_panel_solid() {
    cy=panel_back_y-actuator_mount_offset;
    z0=deck_underside_z-panel_rib_height-actuator_pad_thickness;
    translate([-actuator_pad_width/2,cy-actuator_pad_depth/2,z0])
        cube([actuator_pad_width,actuator_pad_depth,actuator_pad_thickness]);
}

module actuator_mount_panel_holes() {
    cy=panel_back_y-actuator_mount_offset;
    z0=deck_underside_z-panel_rib_height-actuator_pad_thickness;
    hole_pair_x(0,cy,z0,min(heatset_insert_depth,actuator_pad_thickness)+eps,
                actuator_hole_spacing,heatset_insert_diameter);
}

module panel_split_bosses() {
    z0=deck_underside_z-panel_rib_height-joiner_thickness;
    for(y=[panel_front_y+panel_depth*0.32,panel_front_y+panel_depth*0.68],
        x=[-joiner_hole_spacing/2,joiner_hole_spacing/2])
        translate([x,y,z0]) cylinder(h=joiner_thickness+panel_rib_height,d=boss_outer_diameter);
}

module panel_split_holes() {
    z0=deck_underside_z-panel_rib_height-joiner_thickness;
    for(y=[panel_front_y+panel_depth*0.32,panel_front_y+panel_depth*0.68],
        x=[-joiner_hole_spacing/2,joiner_hole_spacing/2])
        vertical_hole(x,y,z0,min(heatset_insert_depth,joiner_thickness+panel_rib_height)+eps,
                      heatset_insert_diameter);
}

// ---------- Fit-check metal hinge ----------
module hinge_fixed_leaf() {
    color("#222222") translate([-hinge_length/2,
             front_bezel_depth+hinge_offset,
             chassis_height-hinge_leaf_thickness])
        cube([hinge_length,hinge_leaf_width,hinge_leaf_thickness]);
}

module hinge_moving_leaf() {
    color("#222222") translate([-hinge_length/2,panel_front_y,
             chassis_height-hinge_leaf_thickness])
        cube([hinge_length,hinge_leaf_width,hinge_leaf_thickness]);
}

module hinge_barrel() {
    color("#111111") translate([-hinge_length/2,hinge_pin_y,hinge_axis_z])
        rotate([0,90,0]) cylinder(h=hinge_length,d=hinge_barrel_diameter);
}

module hinge_complete_closed() {
    hinge_fixed_leaf(); hinge_moving_leaf(); hinge_barrel();
}

// ---------- Screw-fastened split joiners ----------
module joiner_plate(length=joiner_hole_spacing+16, along="x") {
    difference() {
        if(along=="x") translate([-length/2,-joiner_width/2,0])
            cube([length,joiner_width,joiner_thickness]);
        else translate([-joiner_width/2,-length/2,0])
            cube([joiner_width,length,joiner_thickness]);
        if(along=="x") for(x=[-joiner_hole_spacing/2,joiner_hole_spacing/2])
            vertical_hole(x,0,0,joiner_thickness,mounting_screw_diameter);
        else for(y=[-joiner_hole_spacing/2,joiner_hole_spacing/2])
            vertical_hole(0,y,0,joiner_thickness,mounting_screw_diameter);
    }
}

module panel_joiner() { joiner_plate(along="x"); }

module bezel_joiner() { joiner_plate(along="x"); }

module fit_test_pin_joiner(along="x") {
    // Print pins-up, then flip and press into the sample frame's existing
    // insert holes. This locks the test dimensions without brass inserts.
    pin_d=max(2.5,heatset_insert_diameter-fit_test_pin_clearance);
    plate_length=joiner_hole_spacing+14;
    plate_width=16;
    union() {
        if(along=="x") {
            translate([-plate_length/2,-plate_width/2,0])
                cube([plate_length,plate_width,fit_test_joiner_thickness]);
            for(x=[-joiner_hole_spacing/2,joiner_hole_spacing/2])
                translate([x,0,fit_test_joiner_thickness])
                    cylinder(h=fit_test_pin_height,d=pin_d);
        } else {
            translate([-plate_width/2,-plate_length/2,0])
                cube([plate_width,plate_length,fit_test_joiner_thickness]);
            for(y=[-joiner_hole_spacing/2,joiner_hole_spacing/2])
                translate([0,y,fit_test_joiner_thickness])
                    cylinder(h=fit_test_pin_height,d=pin_d);
        }
    }
}

// ---------- Low-cost validation parts ----------
module fit_test_frame() {
    difference() {
        union() {
            // Exact production outer footprint and lower rail geometry, but
            // only 12 mm high to minimize material before dimensions are proven.
            tapered_rounded_ring(chassis_outer_width,chassis_outer_depth,
                                 case_bottom_bevel_height,chassis_corner_radius,
                                 chassis_wall_thickness+4,case_bottom_bevel_inset);
            if(fit_test_frame_height > case_bottom_bevel_height)
                rounded_ring(chassis_outer_width,chassis_outer_depth,
                             fit_test_frame_height-case_bottom_bevel_height,
                             chassis_corner_radius,chassis_wall_thickness+4,
                             case_bottom_bevel_height);
            // Reproduce the production seam insert pads and locations.
            for (x=[-joiner_hole_spacing/2,joiner_hole_spacing/2],
                 y=[seam_pad_wall_offset,chassis_outer_depth-seam_pad_wall_offset])
                translate([x,y,0]) cylinder(h=fit_test_frame_height,
                                            d=boss_outer_diameter);
            for (y=[chassis_split_y-joiner_hole_spacing/2,
                    chassis_split_y+joiner_hole_spacing/2],
                 x=[-chassis_outer_width/2+seam_pad_wall_offset,
                    chassis_outer_width/2-seam_pad_wall_offset])
                translate([x,y,0]) cylinder(h=fit_test_frame_height,
                                            d=boss_outer_diameter);
        }
        for (x=[-joiner_hole_spacing/2,joiner_hole_spacing/2],
             y=[seam_pad_wall_offset,chassis_outer_depth-seam_pad_wall_offset])
            vertical_hole(x,y,fit_test_frame_height-heatset_insert_depth,
                          heatset_insert_depth+eps,heatset_insert_diameter);
        for (y=[chassis_split_y-joiner_hole_spacing/2,
                chassis_split_y+joiner_hole_spacing/2],
             x=[-chassis_outer_width/2+seam_pad_wall_offset,
                chassis_outer_width/2-seam_pad_wall_offset])
            vertical_hole(x,y,fit_test_frame_height-heatset_insert_depth,
                          heatset_insert_depth+eps,heatset_insert_diameter);
    }
}

module fit_test_quadrant(front=true,left=true) {
    seam_half=split_joint_clearance/2;
    intersection() {
        fit_test_frame();
        translate([left ? -chassis_outer_width/2-1 : seam_half,
                   front ? -1 : chassis_split_y,-1])
            cube([left ? chassis_outer_width/2+1-seam_half : chassis_outer_width/2+1,
                  front ? chassis_split_y+1 : chassis_outer_depth-chassis_split_y+1,
                  fit_test_frame_height+2]);
    }
}

module hinge_insert_coupon() {
    coupon_depth=hinge_leaf_width+12;
    coupon_height=max(8,heatset_insert_depth+2);
    difference() {
        translate([-hardware_coupon_width/2,0,0])
            cube([hardware_coupon_width,coupon_depth,coupon_height]);
        // Actual leaf recess and clearance.
        translate([-hardware_coupon_width/2+5,6,
                   coupon_height-hinge_leaf_thickness-hinge_pocket_clearance])
            cube([hardware_coupon_width-10,hinge_leaf_width,
                  hinge_leaf_thickness+hinge_pocket_clearance+eps]);
        // Two representative M3 paths: insert from bottom, screw from top.
        for(x=[-20,20]) {
            vertical_hole(x,6+hinge_leaf_width/2,0,
                          heatset_insert_depth,heatset_insert_diameter);
            vertical_hole(x,6+hinge_leaf_width/2,heatset_insert_depth-eps,
                          coupon_height-heatset_insert_depth+2*eps,
                          mounting_screw_diameter);
        }
    }
}

// ---------- Split cutters ----------
module chassis_quadrant(front=true,left=true) {
    seam_half=split_joint_clearance/2;
    intersection() {
        chassis_shell();
        translate([left ? -chassis_outer_width/2-1 : seam_half,
                   front ? -1 : chassis_split_y,
                   -1])
            cube([left ? chassis_outer_width/2+1-seam_half : chassis_outer_width/2+1,
                  front ? chassis_split_y+1 : chassis_outer_depth-chassis_split_y+1,
                  chassis_height+2]);
    }
}

module panel_half(left=true) {
    intersection() {
        control_panel();
        translate([left ? -panel_width/2-20 : 0,panel_front_y-20,
                   deck_underside_z-panel_rib_height-actuator_pad_thickness-2])
            cube([panel_width/2+20,panel_depth+40,
                  panel_thickness+panel_rib_height+actuator_pad_thickness+4]);
    }
}

module bezel_half(left=true) {
    intersection() {
        front_bezel();
        translate([left ? -chassis_inner_width/2-1 : 0,-1,
                   deck_underside_z-panel_rib_height-heatset_insert_depth-1])
            cube([chassis_inner_width/2+1,front_bezel_depth+2,
                  panel_thickness+panel_rib_height+heatset_insert_depth+2]);
    }
}

// ---------- Assembly transforms ----------
module moving_panel(angle=0) {
    translate([0,hinge_pin_y,hinge_axis_z]) rotate([angle,0,0])
        translate([0,-hinge_pin_y,-hinge_axis_z]) {
            color("#30343A") control_panel();
            hinge_moving_leaf();
        }
}

module assembly(angle=0, exploded=false) {
    color("#585D63") chassis_shell();
    translate([0,exploded ? -18 : 0,exploded ? 22 : 0])
        color("#1D252C") front_bezel();
    hinge_fixed_leaf(); hinge_barrel();
    if(exploded)
        translate([0,0,55]) moving_panel(angle);
    else moving_panel(angle);
}

// ---------- Part selector ----------
if(part=="assembly_closed") assembly(0,false);
else if(part=="assembly_open") assembly(panel_deploy_angle,false);
else if(part=="assembly_service") assembly(panel_service_angle,false);
else if(part=="assembly_exploded") assembly(18,true);
else if(part=="chassis_complete") chassis_shell();
else if(part=="chassis_front_left") chassis_quadrant(true,true);
else if(part=="chassis_front_right") chassis_quadrant(true,false);
else if(part=="chassis_rear_left") chassis_quadrant(false,true);
else if(part=="chassis_rear_right") chassis_quadrant(false,false);
else if(part=="panel_complete") control_panel();
else if(part=="panel_left") panel_half(true);
else if(part=="panel_right") panel_half(false);
else if(part=="front_bezel") front_bezel();
else if(part=="front_bezel_left") bezel_half(true);
else if(part=="front_bezel_right") bezel_half(false);
else if(part=="hinge_fitcheck") hinge_complete_closed();
else if(part=="chassis_joiner_x") joiner_plate(along="x");
else if(part=="chassis_joiner_y") joiner_plate(along="y");
else if(part=="panel_joiner") panel_joiner();
else if(part=="bezel_joiner") bezel_joiner();
else if(part=="fit_test_frame_complete") fit_test_frame();
else if(part=="fit_test_front_left") fit_test_quadrant(true,true);
else if(part=="fit_test_front_right") fit_test_quadrant(true,false);
else if(part=="fit_test_rear_left") fit_test_quadrant(false,true);
else if(part=="fit_test_rear_right") fit_test_quadrant(false,false);
else if(part=="fit_test_pin_joiner_x") fit_test_pin_joiner("x");
else if(part=="fit_test_pin_joiner_y") fit_test_pin_joiner("y");
else if(part=="hinge_insert_coupon") hinge_insert_coupon();
else assert(false,str("Unknown part selector: ",part));

echo(str("CHASSIS: ",chassis_outer_width," x ",chassis_outer_depth," x ",chassis_height," mm"));
echo(str("PANEL: ",panel_width," x ",panel_depth," x ",panel_thickness," mm"));
echo(str("HINGE AXIS: Y=",hinge_pin_y," Z=",hinge_axis_z," mm"));
