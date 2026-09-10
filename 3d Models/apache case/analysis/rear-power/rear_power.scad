// RP01 measured hardware, candidate mount, physical case floor Z=0.
include <../airflow/airflow_params.scad>
use <../recessed-fuse/recessed_insert.scad>
part="assembly";
$fn=48;
tol=0.2;
plate_t=3;
wall_estimate=1; // measured from APPROXIMATE imported STEP, not the real case
case_outer_rear_y=117.5;
face_y=case_outer_rear_y+plate_t;
center_z=45;
power_x=48;
switch_x=0;
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
carrier_center_x=25;
carrier_size=[106,52];
carrier_mounts=[for(x=[-22,72],z=[24,66]) [x,z]];
module round2(w,h,r=2) { hull() for(x=[-w/2+r,w/2-r],y=[-h/2+r,h/2-r]) translate([x,y]) circle(r=r); }
module mark(txt,x,y,t,s=2.5) { translate([x,y,t-0.4]) linear_extrude(0.42) text(txt,size=s,halign="center",valign="center"); }
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
   slot(power_x-carrier_center_x,0,18.2,26.12,t);
   slot(switch_x-carrier_center_x,0,30,36,t);
   for(dx=[-power_pitch[0]/2,power_pitch[0]/2],dy=[-power_pitch[1]/2,power_pitch[1]/2])
    hole(power_x-carrier_center_x+dx,dy,4.5,t);
  } else {
   xt_holes(power_x-carrier_center_x,0,t);
   slot(switch_x-carrier_center_x,0,switch_body[0]+2*tol,switch_body[1]+2*tol,t);
  }
  mark(template?"LAYOUT ONLY RP01":"REAR RP01",0,-23,t,2.3);
  mark("XT60",23,23,t,2.4);
  mark("POWER",-25,22,t,2.4);
  // Recessed datum marks; shared with the shell/assembly X/Z datums.
  translate([-0.35,23,t-0.4]) cube([0.7,3,0.42]);
 }
}
module coupon(power=false,t=3) {
 difference() {
  linear_extrude(t) round2(power?50:40,power?50:46,3);
  if(power) xt_holes(0,0,t);
  else slot(0,0,switch_body[0]+2*tol,switch_body[1]+2*tol,t);
  mark(power?"XT RP01":str("SW ",t," RP01"),0,power?22:19,t,2.2);
  translate([-0.35,power?-25:-23,t-0.4]) cube([0.7,4,0.42]);
 }
}
// Removal envelopes through the INSERT ONLY, not automatic case drilling.
module rear_clearances() {
 // Clip-access shell window is deliberately bigger than the carrier cutout.
 translate([switch_x-15,face_y-switch_body[2]-wire_allowance,center_z-18]) cube([30,65,36]);
 // One open service window includes the XT mounting nuts; no fragile webs between holes.
 translate([power_x-20,face_y-power_body[2]-wire_allowance,center_z-21]) cube([40,65,42]);
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
   linear_extrude(1.2) text(left?"RP01-L":"RP01-R",size=3,halign="center");
 }
}
module installed_plate() {
 translate([carrier_center_x,face_y,center_z]) rotate([90,0,0]) carrier();
}
module hardware_refs() {
 color("gold") translate([power_x-power_plate[0]/2,face_y,center_z-power_plate[1]/2]) cube([power_plate[0],power_plate[2],power_plate[1]]);
 color("orange") translate([power_x-power_body[0]/2,face_y-power_body[2],center_z-power_body[1]/2]) cube([power_body[0],power_body[2],power_body[1]]);
 color("red") translate([switch_x-switch_bezel[0]/2,face_y,center_z-switch_bezel[1]/2]) cube([switch_bezel[0],switch_front,switch_bezel[1]]);
 color([0.2,0.2,0.2]) translate([switch_x-switch_body[0]/2,face_y-switch_body[2],center_z-switch_body[1]/2]) cube([switch_body[0],switch_body[2],switch_body[1]]);
}
module assembly_rear() {
 for(l=[true,false]) color([0.55,0.55,0.6,0.4]) rear_shell(l);
 color("gold") translate([0,0,15.5]) { deck(true); deck(false); }
 color([0.2,0.4,0.8,0.6]) translate([-133,-32,6]) cube([84,124,40]);
 color([0.3,0.7,0.3,0.5]) translate([92-floor_pi_size[0]/2,38-floor_pi_size[1]/2,17.5]) cube(floor_pi_size);
 color("silver") installed_plate();
 hardware_refs();
}
assert(center_z-18>17.5+2,"Rear window intersects tray");
assert(center_z-21>17.5+2,"XT window intersects tray");
assert(center_z+18<chassis_height-top_rail_height,"Switch cuts top rail");
assert(face_y-switch_body[2]-wire_allowance > 38+floor_pi_size[1]/2+2,"Rear wiring crowds floor Pi");
assert(switch_x-15>-49+2,"Rear switch crowds fuse");
assert(switch_body[0]+2*tol<switch_bezel[0],"No bezel support");
assert(plate_t<switch_clip_gap_estimate,"Coupon must verify actual clip engagement");
if(part=="assembly") assembly_rear();
else if(part=="carrier") carrier();
else if(part=="layout_template") carrier(true);
else if(part=="xt_coupon") coupon(true,3);
else if(part=="switch_1") coupon(false,1);
else if(part=="switch_2") coupon(false,2);
else if(part=="switch_3") coupon(false,3);
else if(part=="switch_3_27") coupon(false,3.27);
else if(part=="rear_L") rear_shell(true);
else if(part=="rear_R") rear_shell(false);
