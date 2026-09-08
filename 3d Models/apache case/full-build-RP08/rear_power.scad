// RP08 production rear controls. Physical case floor Z=0; rear is +Y.
include <../case-airflow-study/airflow_params.scad>
use <../recessed-fuse-study/recessed_insert.scad>
use <../apache_2800_chassis.scad>
use <../equipment-tray/equipment_tray.scad>
part="assembly";
$fn=48;
tol=0.2;
plate_t=3;
wall_estimate=1; // measured from APPROXIMATE imported STEP, not the real case
case_outer_rear_y=117.5;
face_y=case_outer_rear_y+plate_t;
center_z=45;
power_x=36;
switch_x=1;
selector_x=-30;
power_plate=[38.4,38.16,5.27];
power_pitch=[29.85,30.27];
power_measured_hole=4.93;
power_body=[14.2,22.12,28];
power_front=4;
switch_body=[21.56,27.02,30];
switch_bezel=[24.75,31.57];
switch_front=9.4;
switch_clip_gap_estimate=3.27; // not a guaranteed gripping range
wire_allowance=15; // provisional straight connector/bend envelope
carrier_center_x=0;
carrier_size=[128,60];
carrier_mounts=[for(x=[-59,59],z=[24,66]) [x,z]];
rear_recess_measured=[132.55,75.62];
switch_opening_rp08=[23.6,29.8];
dial_shoulder_pocket_rp08=[19.0,2.0];
dial_pin_slot_rp08=[3.6,6.6];
selector_window=31; // body diameter 27 plus 2 mm per side
selector_pin_angle=90; // trial pin at 12 o'clock; verify with coupon
module dial_holes(x,y,t) {
 hole(x,y,dial_panel_hole_diameter+2*tol,t);
 translate([x-dial_pin_slot_rp08[0]/2,y+7.5-dial_pin_slot_rp08[0]/2,-0.01])
  linear_extrude(t+0.02)
   round2(dial_pin_slot_rp08[0],dial_pin_slot_rp08[1],dial_pin_slot_rp08[0]/2);
 translate([x,y,-0.01])
  cylinder(d=dial_shoulder_pocket_rp08[0],h=dial_shoulder_pocket_rp08[1]+0.01);
}
module dial_coupon() {
 difference() {
  linear_extrude(plate_t) round2(42,44,3);
  dial_holes(0,0,plate_t);
  mark("DIAL RP02",0,-18,plate_t,2.5);
  mark("PIN UP",0,18,plate_t,2.5);
  translate([-0.35,20,plate_t-0.4]) cube([0.7,2,0.42]);
 }
}
module round2(w,h,r=2) { hull() for(x=[-w/2+r,w/2-r],y=[-h/2+r,h/2-r]) translate([x,y]) circle(r=r); }
module mark(txt,x,y,t,s=2.5) { translate([x,y,t-0.4]) linear_extrude(0.42) text(txt,size=s,halign="center",valign="center"); }
// Carrier local Z0 is the exterior after installation. Mirror lettering so
// it reads correctly when viewed from that face; retain inside identification.
module exterior_mark(txt,x,y,s=2.5) {
 translate([x,y,0.4]) rotate([0,180,0]) linear_extrude(0.42)
  text(txt,size=s,halign="center",valign="center");
}
module hole(x,y,d,t) { translate([x,y,-0.01]) cylinder(d=d,h=t+0.02); }
module slot(x,y,w,h,t) { translate([x,y,-0.01]) linear_extrude(t+0.02) round2(w,h,0.3); }
module xt_holes(x,y,t) {
 slot(x,y,power_body[0]+2*tol,power_body[1]+2*tol,t);
 for(dx=[-power_pitch[0]/2,power_pitch[0]/2],dy=[-power_pitch[1]/2,power_pitch[1]/2])
  hole(x+dx,y+dy,4.5,t); // M4 clearance, smaller than measured holes in supplied plate
}
module carrier(template=false) {
 t=template?1.2:plate_t;
 difference() {
  linear_extrude(t) round2(carrier_size[0],carrier_size[1],3);
  for(p=carrier_mounts) hole(p[0]-carrier_center_x,p[1]-center_z,3.5,t);
  if(template) {
   hole(selector_x-carrier_center_x,0,selector_window,t);
   slot(power_x-carrier_center_x,0,38,40,t);
   slot(switch_x-carrier_center_x,0,30,36,t);
  } else {
   dial_holes(selector_x-carrier_center_x,0,t);
   xt_holes(power_x-carrier_center_x,0,t);
   slot(switch_x-carrier_center_x,0,switch_opening_rp08[0],switch_opening_rp08[1],t);
  }
  mark(template?"LAYOUT ONLY RP08":"REAR RP08",0,-23,t,2.3);
  mark("XT60",power_x-carrier_center_x,23,t,2.4);
  mark("POWER",switch_x-carrier_center_x,22,t,2.4);
  mark("DIAL",selector_x-carrier_center_x,22,t,2.4);
  exterior_mark(template?"LAYOUT ONLY RP08":"REAR RP08",0,-23,2.3);
  exterior_mark("XT60",power_x-carrier_center_x,23,2.4);
  exterior_mark("POWER",switch_x-carrier_center_x,22,2.4);
  exterior_mark("DIAL",selector_x-carrier_center_x,22,2.4);
  // Recessed datum marks; shared with the shell/assembly X/Z datums.
  translate([-0.35,23,t-0.4]) cube([0.7,3,0.42]);
 }
}
module coupon(power=false,t=3) {
 difference() {
  linear_extrude(t) round2(power?50:40,power?50:46,3);
  if(power) xt_holes(0,0,t);
  else slot(0,0,switch_opening_rp08[0],switch_opening_rp08[1],t);
  mark(power?"XT RP08":str("SW ",t," RP08"),0,power?22:19,t,2.2);
  translate([-0.35,power?-25:-23,t-0.4]) cube([0.7,4,0.42]);
 }
}
// Removal envelopes through the INSERT ONLY, not automatic case drilling.
module rear_clearances() {
 translate([selector_x,face_y+20,center_z]) rotate([90,0,0])
  cylinder(d=selector_window,h=20+plate_t+dial_body_depth+wire_allowance);
 // Clip-access shell window is deliberately bigger than the carrier cutout.
 translate([switch_x-15,face_y-switch_body[2]-wire_allowance,center_z-18]) cube([30,65,36]);
 // One open service window includes the XT mounting nuts; no fragile webs between holes.
 translate([power_x-19,face_y-power_body[2]-wire_allowance,center_z-20]) cube([38,65,40]);
 // Four carrier nuts plus the four XT60 mounting nuts need internal access.
 for(p=concat(carrier_mounts,
       [for(dx=[-power_pitch[0]/2,power_pitch[0]/2],dz=[-power_pitch[1]/2,power_pitch[1]/2]) [power_x+dx,center_z+dz]]))
  translate([p[0],case_outer_rear_y+10,p[1]]) rotate([90,0,0]) cylinder(d=10,h=25);
}
module rear_shell(left) {
 difference() {
  corner(false,left);
  rear_clearances();
  // Clear identification on interior-facing rear wall, not a case-contact face.
  translate([left?-100:100,111.5,58]) rotate([90,0,0])
   linear_extrude(1.2) text(left?"RP08-L":"RP08-R",size=3,halign="center");
 }
}
module installed_plate() {
 translate([carrier_center_x,face_y,center_z]) rotate([90,0,0]) carrier();
}
module hardware_refs() {
 color("purple") translate([selector_x,face_y-plate_t,center_z]) rotate([90,0,0]) cylinder(d=dial_body_diameter,h=dial_body_depth);
 color("silver") translate([selector_x,face_y,center_z]) rotate([-90,0,0]) cylinder(d=dial_shaft_diameter,h=dial_shaft_length);
 // Knob depth is an inherited approximation, not a new measurement.
 color("purple") translate([selector_x,face_y+6,center_z]) rotate([-90,0,0]) cylinder(d=dial_knob_diameter,h=dial_knob_depth);
 color("gold") translate([power_x-power_plate[0]/2,face_y,center_z-power_plate[1]/2]) cube([power_plate[0],power_plate[2],power_plate[1]]);
 color("orange") translate([power_x-power_body[0]/2,face_y-power_body[2],center_z-power_body[1]/2]) cube([power_body[0],power_body[2],power_body[1]]);
 color("red") translate([switch_x-switch_bezel[0]/2,face_y,center_z-switch_bezel[1]/2]) cube([switch_bezel[0],switch_front,switch_bezel[1]]);
 color([0.2,0.2,0.2]) translate([switch_x-switch_body[0]/2,face_y-switch_body[2],center_z-switch_body[1]/2]) cube([switch_body[0],switch_body[2],switch_body[1]]);
}
module assembly_rear() {
 for(l=[true,false]) color([0.55,0.55,0.6,0.4]) corner(true,l);
 for(l=[true,false]) color([0.55,0.55,0.6,0.4]) rear_shell(l);
 color("gold") translate([0,0,15.5]) { deck(true); deck(false); }
 color([0.2,0.4,0.8,0.6]) translate([-133,-32,6]) cube([84,124,40]);
 color([0.3,0.7,0.3,0.5]) translate([92-floor_pi_size[0]/2,38-floor_pi_size[1]/2,17.5]) cube(floor_pi_size);
 color("silver") installed_plate();
 hardware_refs();
 for(i=[0:len(converter_positions)-1]) color("orange")
  translate([converter_positions[i][0]-converter_sizes[i][0]/2,converter_positions[i][1]-converter_sizes[i][1]/2,17.5]) cube(converter_sizes[i]);
 color([0.2,0.8,0.3,0.45]) translate([screen_pi_position[0]-screen_pi_size[0]/2,screen_pi_position[1]-screen_pi_size[1]/2,screen_pi_position[2]-chassis_floor_z]) cube(screen_pi_size);
}
module full_shell(front,left) {
 if(front) difference() {
  corner(true,left);
  mark(left?"FL RP02":"FR RP02",left?-70:96,left?-20:-69,left?6:3,2.1);
 } else rear_shell(left);
}
module full_tray(left) {
 difference() {
  deck(left);
  mark("RP08",left?-65:65,-92,2,2.3);
 }
}
module top_half(left) {
 // Bed at Z0; top-side down orientation may be selected in slicer.
 translate([0,-chassis_outer_depth/2,-(deck_underside_z-panel_rib_height)])
 difference() {
  panel_half(left);
  mark("RP02",left?-120:120,panel_back_y-10,chassis_height,2.5);
 }
}
module face(n) {
 sizes=[screen_module_size,rotary_module_size,switch_module_size,utility_module_size];
 difference() {
  if(n==0) screen_module_provisional();
  if(n==1) rotary_module_provisional();
  if(n==2) switch_module_provisional();
  if(n==3) utility_module_provisional();
  mark("RP02",0,-sizes[n][1]/2+9,module_plate_thickness,2);
 }
}
module exploded() {
 assembly_rear();
 color("silver") translate([0,0,105]) { top_half(true); top_half(false); }
 centers=[screen_module_center,rotary_module_center,switch_module_center,utility_module_center];
 for(n=[0:3]) color("lightgray") translate([centers[n][0],centers[n][1]-chassis_outer_depth/2,140]) face(n);
}
assert(selector_x-selector_window/2>-49+2,"Dial wiring crowds fuse");
assert(center_z-selector_window/2>17.5+2,"Dial clearance intersects tray");
assert(selector_x+selector_window/2<switch_x-15,"Dial and switch windows merge");
assert(center_z-18>17.5+2,"Rear window intersects tray");
assert(center_z-21>17.5+2,"XT window intersects tray");
assert(center_z+18<chassis_height-top_rail_height,"Switch cuts top rail");
assert(face_y-switch_body[2]-wire_allowance > 38+floor_pi_size[1]/2+2,"Rear wiring crowds floor Pi");
assert(switch_x-15>-49+2,"Rear switch crowds fuse");
assert(switch_opening_rp08[0]<switch_bezel[0] && switch_opening_rp08[1]<switch_bezel[1],"No switch bezel support");
assert(carrier_size[0] < rear_recess_measured[0] && carrier_size[1] < rear_recess_measured[1],"Carrier exceeds measured rear recess");
assert(power_x+power_plate[0]/2 < carrier_size[0]/2,"XT60 plate exceeds carrier");
assert(selector_x-dial_shoulder_pocket_rp08[0]/2 > -carrier_size[0]/2,"Dial exceeds carrier");
if(part=="assembly") assembly_rear();
else if(part=="exploded") exploded();
else if(part=="dial_coupon") dial_coupon();
else if(part=="shell_FL") full_shell(true,true);
else if(part=="shell_FR") full_shell(true,false);
else if(part=="tray_L") full_tray(true);
else if(part=="tray_R") full_tray(false);
else if(part=="panel_L") top_half(true);
else if(part=="panel_R") top_half(false);
else if(part=="screen_face") face(0);
else if(part=="safety_face") face(1);
else if(part=="switch_face") face(2);
else if(part=="activity_face") face(3);
else if(part=="lower_joiner") lower_joiner();
else if(part=="tray_joiner") tray_cross_joiner();
else if(part=="shell_joiner_x") joiner_plate(along="x");
else if(part=="shell_joiner_y") joiner_plate(along="y");
else if(part=="carrier") carrier();
else if(part=="layout_template") carrier(true);
else if(part=="xt_coupon") coupon(true,3);
else if(part=="switch_1") coupon(false,1);
else if(part=="switch_2") coupon(false,2);
else if(part=="switch_3") coupon(false,3);
else if(part=="switch_3_27") coupon(false,3.27);
else if(part=="rear_L") rear_shell(true);
else if(part=="rear_R") rear_shell(false);
