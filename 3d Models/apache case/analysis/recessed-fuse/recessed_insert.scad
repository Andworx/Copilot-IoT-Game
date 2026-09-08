// RF02 candidate. Units mm, centered XY, physical interior floor Z=0.
// Outer case contact is inherited unchanged from production Rev 5.
include <../airflow/airflow_params.scad>
use <../../apache_2800_chassis.scad>
use <../equipment-tray/equipment_tray.scad>
part="assembly";
$fn=48;
e=0.02;
split_y=chassis_split_y-chassis_outer_depth/2;
gap=0.4;
fuse_xy=[-91,30];
fuse_base=6;
fuse_points=[for(x=[-31.5,31.5],y=[-46.5,46.5]) fuse_xy+[x,y]];
deck_w=291;
deck_d=214;
deck_z=equipment_tray_install_above_floor;
deck_t=equipment_tray_thickness;
// 4 mm body clearance per side; terminal/lug space still requires physical test.
pocket=[92,132];
pilot=2.7; // candidate M3 plastic-thread pilot, NOT the production heatset pilot
bridge_x=-70;
bridge_ys=[split_y-10,split_y+10];
mounts=concat(
 [for(x=[-17,17],y=[-chassis_outer_depth/2+11,chassis_outer_depth/2-11]) [x,y]],
 [for(x=[-chassis_outer_width/2+11,chassis_outer_width/2-11],
      y=[split_y-17,split_y+17]) [x,y]]);
pi_points=[for(x=[-floor_pi_hole_pitch[0]/2,floor_pi_hole_pitch[0]/2],
               y=[-floor_pi_hole_pitch[1]/2,floor_pi_hole_pitch[1]/2]) [92+x,38+y]];
dc_points=[for(p=converter_positions,y=[-converter_mount_pitch/2,converter_mount_pitch/2]) [p[0],p[1]+y]];
function near(p,ps,r,i=0)=i>=len(ps)?false:norm(p-ps[i])<r?true:near(p,ps,r,i+1);
module rr(w,d,r) { hull() for(x=[-w/2+r,w/2-r],y=[-d/2+r,d/2-r]) translate([x,y]) circle(r=r); }
module label(s,p,z,size=3) { translate([p[0],p[1],z-0.45]) linear_extrude(0.47) text(s,size=size,halign="center",valign="center"); }
module bar(a,b,w,h) { hull() for(p=[a,b]) translate([p[0],p[1],0]) cylinder(d=w,h=h); }
module lower_skeleton() {
 difference() {
  union() {
   // Flat-on-bed support ribs fuse into the inherited bottom rail.
   for(y=[fuse_xy[1]-46.5,fuse_xy[1]+46.5]) bar([-136,y],[-55,y],12,3);
   bar([bridge_x,-22],[bridge_x,82],12,6);
   for(p=fuse_points) translate([p[0],p[1],0]) cylinder(d=12,h=fuse_base);
   for(y=[-65,65]) bar([48,y],[136,y],12,3);
   // Inward service rail on right, joined to both right corner ribs.
   bar([55,-65],[55,65],10,3);
  }
  // Blind pilots leave 1.5 mm minimum solid floor; choose screw length after measurement.
  for(p=concat(fuse_points,[for(y=bridge_ys)[bridge_x,y]]))
   translate([p[0],p[1],1.5]) cylinder(d=pilot,h=5);
  for(s=[-1,1]) {
   label(s<0?"LOW-FR RF02":"LOW-RR RF02",[96,s*65],3,2.8);
  }
  // Paired marks line up across the left and right lower seam.
  for(x=[bridge_x,55]) translate([x-3,split_y-4,x==bridge_x?5.55:2.55]) cube([6,8,0.47]);
  // Right rail tie slots; rounded to avoid sharp internal corners.
  for(y=[-42,42]) translate([55,y,-e]) linear_extrude(3+2*e) rr(3,8,1);
 }
}
module quadrant_clip(front,left,height=100) {
 translate([left?-170:gap/2,front?-130:split_y+gap/2,-e])
 cube([left?170-gap/2:170,front?130+split_y-gap/2:130,height]);
}
module corner(front,left,test=false) {
 difference() {
  intersection() {
   union() {
    translate([0,-chassis_outer_depth/2,0]) chassis_shell();
    lower_skeleton();
   }
   quadrant_clip(front,left,test?16:100);
  }
  // R5 labels remain correct for outer geometry; RF02 identifies the added structure.
  translate([0,-chassis_outer_depth/2,0]) chassis_quadrant_marks(front,left);
  label(str(test?"T":"",front?"F":"R",left?"L":"R","02"),
    [left?bridge_x:96,front?-16.5:76.5],left?6:3,2.3);
 }
}
module pocket_cut() {
 translate([fuse_xy[0],fuse_xy[1],-e]) linear_extrude(deck_t+2*e) rr(pocket[0],pocket[1],2);
}
module deck(left) {
 difference() {
  intersection() {
   linear_extrude(deck_t) rr(deck_w,deck_d,15);
   translate([left?-160:gap/2,-120,-1]) cube([left?160-gap/2:160,240,5]);
  }
  pocket_cut();
  for(p=mounts) translate([p[0],p[1],-e]) cylinder(d=3.5,h=deck_t+2*e);
  for(p=pi_points) translate([p[0],p[1],-e]) cylinder(d=2.8,h=deck_t+2*e);
  for(p=dc_points) translate([p[0],p[1],-e]) cylinder(d=4.6,h=deck_t+2*e);
  // Keep the entire left pocket perimeter solid; vents cannot sever its thin rail.
  for(x=[-20:32:115],y=[-75:28:85])
   if(!near([x,y],concat(mounts,pi_points,dc_points),17))
    translate([x,y,-e]) linear_extrude(deck_t+2*e) rr(18,5,2);
  // Cable exits beside the pocket, clear of converter bodies and their fasteners.
  for(y=[-42,-62]) translate([-30,y,-e]) linear_extrude(deck_t+2*e) rr(12,5,2);
  label(left?"TRAY-L RF02":"TRAY-R RF02",[left?-65:65,-98],deck_t,3.5);
  label("FRONT",[left?-25:25,-88],deck_t,2.5);
  for(y=[-65,65]) translate([-5,y-0.4,deck_t-0.45]) cube([10,0.8,0.47]);
 }
}
module lower_joiner() {
 difference() {
  linear_extrude(2) rr(12,32,2);
  for(y=[-10,10]) translate([0,y,-e]) cylinder(d=3.4,h=2+2*e);
  label("LF-LR",[0,0],2,2);
  translate([-6,-0.35,1.55]) cube([12,0.7,0.47]);
 }
}
module assembly() {
 for(f=[true,false],l=[true,false]) color([0.55,0.58,0.62,0.35]) corner(f,l);
 color("gold") translate([0,0,deck_z]) { deck(true); deck(false); }
 color("steelblue") translate([bridge_x,split_y,6]) lower_joiner();
 for(y=[-chassis_outer_depth/2+11,chassis_outer_depth/2-11])
  color("steelblue") translate([0,y,deck_z+deck_t]) tray_cross_joiner();
 color([0.2,0.4,0.8,0.8]) translate([fuse_xy[0]-42,fuse_xy[1]-62,fuse_base]) cube(fuse_block_size);
 color("green") translate([92-floor_pi_size[0]/2,38-floor_pi_size[1]/2,deck_z+deck_t]) cube(floor_pi_size);
 for(i=[0:len(converter_positions)-1]) color("orange")
  translate([converter_positions[i][0]-converter_sizes[i][0]/2,
             converter_positions[i][1]-converter_sizes[i][1]/2,deck_z+deck_t]) cube(converter_sizes[i]);
 // Screen-mounted Pi; physical floor origin removes the airflow study's offset.
 color([0.2,0.8,0.3,0.45]) translate([screen_pi_position[0]-screen_pi_size[0]/2,
  screen_pi_position[1]-screen_pi_size[1]/2,screen_pi_position[2]-chassis_floor_z]) cube(screen_pi_size);
}
assert(fuse_base+fuse_block_size[2]<deck_underside_z,"Fuse exceeds deck underside");
assert(fuse_xy[0]+42 < -screen_pi_size[0]/2-2,"Screen Pi lateral allowance lost");
assert(deck_z>8,"Lower joiner leaves no cable gap");
for(i=[0:len(converter_positions)-1])
 assert(fuse_xy[1]-62-(converter_positions[i][1]+converter_sizes[i][1]/2)>=2,
        "Fuse body too close to converter");
assert(fuse_xy[1]-pocket[1]/2-(-70+converter_mount_pitch/2+4.6/2)>=3,
       "Insufficient tray material behind converter mounting hole");
echo("RF02: fuse top=46, panel underside=72, gap=26; body-to-screen-Pi X gap=6.5");
if(part=="assembly") assembly();
else if(part=="shell_FL") corner(true,true);
else if(part=="shell_FR") corner(true,false);
else if(part=="shell_RL") corner(false,true);
else if(part=="shell_RR") corner(false,false);
else if(part=="test_FL") corner(true,true,true);
else if(part=="test_RL") corner(false,true,true);
else if(part=="tray_L") deck(true);
else if(part=="tray_R") deck(false);
else if(part=="lower_joiner") lower_joiner();
else if(part=="tray_joiner") tray_cross_joiner();
