/*
  APACHE 2800 removable equipment tray, revision 0.3.

  The tray does not pierce the APACHE case floor. Two X1C-printable halves sit
  on the existing chassis seam bosses, replace the side seam joiners, and are
  tied together by narrow front/rear cross-joiners. Override `part` from the
  OpenSCAD CLI for exports.
*/
include <../case-airflow-study/airflow_params.scad>

part = "assembly_preview";
// [assembly_preview,tray_complete,tray_left,tray_right,tray_cross_joiner,fit_coupon]

tray_width = 291.0;
tray_depth = 214.0;
tray_thickness = equipment_tray_thickness;
tray_corner_radius = 15.0;
tray_split_gap = 0.40;
tray_edge_frame = 7.0;
tray_vent_pitch_x = 38.0;
tray_vent_pitch_y = 28.0;
tray_vent_size = [28.0,8.0];

// The external 12 V supply removes the former internal PSU and its heat/height
// penalty. The fuse block moves slightly toward center for rear-edge clearance.
tray_fuse_position = [-91.0,40.0];
tray_pi_position = [92.0,38.0];
tray_converter_positions = [for (p=converter_positions) [p[0],p[1]]];

// Component attachment.
fuse_hole_diameter = 5.0;
pi_hole_diameter = 2.8;
converter_hole_diameter = 4.6;

// Existing chassis seam-insert locations converted from the production
// front-origin Y coordinate to this tray's centered coordinate system.
front_mount_y = seam_pad_wall_offset-chassis_outer_depth/2;
rear_mount_y = chassis_outer_depth/2-seam_pad_wall_offset;
side_mount_x = chassis_outer_width/2-seam_pad_wall_offset;
side_mount_ys = [for (y=[chassis_split_y-joiner_hole_spacing/2,
                         chassis_split_y+joiner_hole_spacing/2])
                    y-chassis_outer_depth/2];
tray_mount_points = concat(
    [for (x=[-joiner_hole_spacing/2,joiner_hole_spacing/2])
        [x,front_mount_y]],
    [for (x=[-joiner_hole_spacing/2,joiner_hole_spacing/2])
        [x,rear_mount_y]],
    [for (x=[-side_mount_x,side_mount_x],y=side_mount_ys) [x,y]]
);
tray_mount_clearance_diameter = mounting_screw_diameter+0.3;

// The tray rests directly on the eight seam bosses. The left/right tray halves
// replace the side seam joiners. Narrow cross-joiners sit above the tray at the
// front/rear seam bosses and use the same M3 holes.
chassis_mount_plane = equipment_tray_install_above_floor;
tray_install_z = chassis_mount_plane;
tray_top_plane = tray_install_z+tray_thickness;
tray_cross_joiner_size = [joiner_hole_spacing+16.0,14.0,joiner_thickness];

eps2 = 0.02;

function point_near_any(p,points,r,i=0) =
    i >= len(points) ? false :
    ((p[0]-points[i][0])*(p[0]-points[i][0])+
     (p[1]-points[i][1])*(p[1]-points[i][1]) < r*r ? true :
     point_near_any(p,points,r,i+1));

fuse_mount_points = [for (dx=[-fuse_block_hole_pitch[0]/2,
                               fuse_block_hole_pitch[0]/2],
                          dy=[-fuse_block_hole_pitch[1]/2,
                               fuse_block_hole_pitch[1]/2])
                        [tray_fuse_position[0]+dx,tray_fuse_position[1]+dy]];
pi_mount_points = [for (dx=[-floor_pi_hole_pitch[0]/2,
                             floor_pi_hole_pitch[0]/2],
                        dy=[-floor_pi_hole_pitch[1]/2,
                             floor_pi_hole_pitch[1]/2])
                      [tray_pi_position[0]+dx,tray_pi_position[1]+dy]];
converter_mount_points = [for (p=tray_converter_positions,
                               dy=[-converter_mount_pitch/2,
                                    converter_mount_pitch/2]) [p[0],p[1]+dy]];
all_feature_points = concat(tray_mount_points,fuse_mount_points,
                            pi_mount_points,converter_mount_points);

module centered_rounded_rect_2d(w,d,r) {
    rr=min(r,min(w,d)/2-eps2);
    hull() for(x=[-w/2+rr,w/2-rr],y=[-d/2+rr,d/2-rr])
        translate([x,y]) circle(r=rr);
}

module rounded_slot_2d(size) {
    r=min(size[0],size[1])/2;
    if(size[0] >= size[1])
        hull() for(x=[-size[0]/2+r,size[0]/2-r])
            translate([x,0]) circle(r=r,$fn=20);
    else
        hull() for(y=[-size[1]/2+r,size[1]/2-r])
            translate([0,y]) circle(r=r,$fn=20);
}

module tray_text_cut(txt,x,y,z,rotation=0,size=4,depth=0.45) {
    translate([x,y,z-depth]) rotate([0,0,rotation])
        linear_extrude(height=depth+eps2)
            text(txt,size=size,halign="center",valign="center");
}

module tray_blank() {
    linear_extrude(height=tray_thickness)
        centered_rounded_rect_2d(tray_width,tray_depth,tray_corner_radius);
}

module tray_vents() {
    for(x=[-tray_width/2+tray_edge_frame+12:tray_vent_pitch_x:
            tray_width/2-tray_edge_frame-7],
        y=[-tray_depth/2+tray_edge_frame+7:tray_vent_pitch_y:
            tray_depth/2-tray_edge_frame-7])
        if(!point_near_any([x,y],all_feature_points,9.0))
            translate([x,y,-eps2]) linear_extrude(height=tray_thickness+2*eps2)
                square(tray_vent_size,center=true);
}

module round_holes(points,d) {
    for(p=points) translate([p[0],p[1],-eps2])
        cylinder(h=tray_thickness+2*eps2,d=d);
}

module tray_complete_geometry() {
    difference() {
        tray_blank();
        tray_vents();
        round_holes(tray_mount_points,tray_mount_clearance_diameter);
        round_holes(fuse_mount_points,fuse_hole_diameter);
        round_holes(pi_mount_points,pi_hole_diameter);
        round_holes(converter_mount_points,converter_hole_diameter);
    }
}

module tray_half(side=-1,label_text="L") {
    difference() {
        intersection() {
            tray_complete_geometry();
            if(side < 0)
                translate([-tray_width/2-1,-tray_depth/2-1,-1])
                    cube([tray_width/2-tray_split_gap/2+1,
                          tray_depth+2,tray_thickness+2]);
            else
                translate([tray_split_gap/2,-tray_depth/2-1,-1])
                    cube([tray_width/2-tray_split_gap/2+1,
                          tray_depth+2,tray_thickness+2]);
        }
        tray_text_cut(str("TRAY-",label_text," R5"),side*30,
                      -tray_depth/2+11,tray_thickness,0,5);
        tray_text_cut("F ^",side*82,-tray_depth/2+11,
                      tray_thickness,0,3.5);
        // Two seam witness marks must meet when the halves are aligned.
        for(y=[-70,70])
            translate([-6,y-0.4,tray_thickness-0.45]) cube([12,0.8,0.47]);
    }
}

module tray_cross_joiner() {
    difference() {
        translate([-tray_cross_joiner_size[0]/2,-tray_cross_joiner_size[1]/2,0])
            cube(tray_cross_joiner_size);
        for(x=[-joiner_hole_spacing/2,joiner_hole_spacing/2])
            translate([x,0,-eps2]) cylinder(h=tray_cross_joiner_size[2]+2*eps2,
                                            d=mounting_screw_diameter+0.3);
        tray_text_cut("TRAY-J",0,0,tray_cross_joiner_size[2],0,2.6,0.5);
        translate([-0.35,-tray_cross_joiner_size[1]/2,
                   tray_cross_joiner_size[2]-0.5])
            cube([0.7,tray_cross_joiner_size[1],0.52]);
    }
}

module installed_cross_joiners() {
    for(y=[front_mount_y,rear_mount_y])
        translate([0,y,tray_top_plane]) tray_cross_joiner();
}

module component_envelopes() {
    z=tray_top_plane;
    color([0.20,0.42,0.75,0.72])
        translate([tray_fuse_position[0]-fuse_block_size[0]/2,
                   tray_fuse_position[1]-fuse_block_size[1]/2,z])
            cube(fuse_block_size);
    color([0.35,0.70,0.35,0.75])
        translate([tray_pi_position[0]-floor_pi_size[0]/2,
                   tray_pi_position[1]-floor_pi_size[1]/2,z])
            cube(floor_pi_size);
    for(i=[0:len(tray_converter_positions)-1])
        color([0.80,0.52,0.18,0.78])
            translate([tray_converter_positions[i][0]-converter_sizes[i][0]/2,
                       tray_converter_positions[i][1]-converter_sizes[i][1]/2,z])
                cube(converter_sizes[i]);
}

module chassis_reference() {
    color([0.18,0.18,0.20,0.28])
        linear_extrude(height=bottom_rail_height) difference() {
            centered_rounded_rect_2d(chassis_outer_width,chassis_outer_depth,
                                     chassis_corner_radius);
            centered_rounded_rect_2d(chassis_outer_width-2*(chassis_wall_thickness+4),
                                     chassis_outer_depth-2*(chassis_wall_thickness+4),
                                     max(2,chassis_corner_radius-(chassis_wall_thickness+4)));
        }
    color([0.22,0.22,0.24,0.45])
        for(p=tray_mount_points)
            translate([p[0],p[1],bottom_rail_height])
                cylinder(h=heatset_insert_depth+2.0,d=boss_outer_diameter);
}

module assembly_preview() {
    chassis_reference();
    color([0.86,0.69,0.12]) translate([0,0,tray_install_z]) {
        tray_half(-1,"L");
        tray_half(1,"R");
    }
    color([0.12,0.42,0.68]) installed_cross_joiners();
    component_envelopes();
}

module fit_coupon() {
    // Verifies tray thickness, M2.5/M3/M4.8 holes and the vent bridge.
    difference() {
        cube([80,32,tray_thickness]);
        for(x=[12,28,44]) translate([x,10,-eps2])
            cylinder(h=tray_thickness+2*eps2,d=[pi_hole_diameter,
                     mounting_screw_diameter+0.3,fuse_hole_diameter][floor((x-12)/16)]);
        translate([20,24,-eps2]) linear_extrude(height=tray_thickness+2*eps2)
            rounded_slot_2d(tray_vent_size);
        tray_text_cut("TRAY COUPON R5",55,24,tray_thickness,0,2.7,0.45);
    }
}

assert(tray_width/2 <= printer_bed_x && tray_depth <= printer_bed_y,
       "Tray half exceeds the Bambu X1 Carbon build area.");
assert(tray_width < chassis_inner_width && tray_depth < chassis_inner_depth,
       "Tray exceeds the production chassis inner envelope.");
assert(tray_width <= chassis_outer_width-2*(chassis_wall_thickness+4)+0.01 &&
       tray_depth <= chassis_outer_depth-2*(chassis_wall_thickness+4)+0.01,
       "Elevated tray exceeds the chassis lower-rail inner opening.");
for(i=[0:len(tray_converter_positions)-1])
    assert(abs(tray_converter_positions[i][0])+converter_sizes[i][0]/2 <= tray_width/2-2 &&
           abs(tray_converter_positions[i][1])+converter_sizes[i][1]/2 <= tray_depth/2-2,
           str("Converter ",i+1," exceeds the tray footprint."));
assert(abs(tray_fuse_position[0])+fuse_block_size[0]/2 <= tray_width/2-2 &&
       abs(tray_fuse_position[1])+fuse_block_size[1]/2 <= tray_depth/2-2,
       "Fuse block exceeds the tray footprint.");
assert(abs(tray_pi_position[0])+floor_pi_size[0]/2 <= tray_width/2-2 &&
       abs(tray_pi_position[1])+floor_pi_size[1]/2 <= tray_depth/2-2,
       "Floor Pi/GPIO assembly exceeds the tray footprint.");

if(part=="assembly_preview") assembly_preview();
else if(part=="tray_complete") tray_complete_geometry();
else if(part=="tray_left") tray_half(-1,"L");
else if(part=="tray_right") tray_half(1,"R");
else if(part=="tray_cross_joiner") tray_cross_joiner();
else if(part=="fit_coupon") fit_coupon();

echo(str("EQUIPMENT TRAY: ",tray_width," x ",tray_depth," x ",tray_thickness," mm"));
echo(str("PRINTED HALVES: ",tray_width/2-tray_split_gap/2," x ",tray_depth," mm"));
echo(str("TRAY INSTALL/TOP ABOVE CASE FLOOR: ",tray_install_z," / ",tray_top_plane," mm"));
echo("INTERNAL PSU REMOVED: EXTERNAL 12 V / 15 A SUPPLY AND XT60 ENTRY PENDING MEASUREMENT");
