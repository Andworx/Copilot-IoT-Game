// Plinko Pi case (Raspberry Pi 3 Model B + screw-terminal breakout), mounted on the back of the board.
//
// - Base: the Pi screws down onto four standoffs. The base's flat back sits against the board and two
//   wings (one each side) carry slots that go over the existing screws that hold down the pegs.
// - Lid: sits on the open (outer) side and is held by four M3 screws into heat-set inserts in the corners.
// - Cables enter through a wide slot in the top wall (the GPIO side, where the terminals are) and are
//   strain-relieved with zip ties through slots next to it.
// - Openings: micro-USB power, SD card, and (optional) the USB/Ethernet end.
//
// Coordinates: the Pi PCB's lower-left corner is the origin, X along the 85 mm side, Y along the 56 mm side
// (the GPIO header is on the top, +Y, edge), Z up from the case floor. All dimensions in mm.
//
// MEASURE / CONFIRM (placeholders, marked with *): breakout board size and height, the spacing and size of
// the peg screws the wings go over. Use `part = "wing_test"` to check the screws before anything else.

/* [Part] */
part = "assembly"; // [assembly, base, lid, fit_tray, wing_test]

/* [Raspberry Pi 3 Model B - published mechanical drawing] */
pi_l = 85.0;
pi_w = 56.0;
pi_t = 1.4;                       // PCB thickness
pi_hole_x = 58.0;                 // mounting holes: 58 x 49 mm, 3.5 mm in from the left and bottom edges
pi_hole_y = 49.0;
pi_hole_off = 3.5;
pi_screw_hole_d = 2.2;            // pilot hole for M2.5 into the standoffs (self-tapping)
pi_gpio_x0 = 7.1;                 // 2 x 20 header, along the top edge
pi_gpio_x1 = 57.9;
pi_usbc_x = 10.6;                 // micro-USB power, bottom edge, centred here
pi_usbc_w = 9.0;                  // cutout width
pi_sd_y = 28.0;                   // SD card, left edge, centred here
pi_eth_usb_y0 = 2.5;              // USB x2 + Ethernet block, right edge
pi_eth_usb_y1 = 54.0;
pi_overhang_right = 2.5;          // connectors stick out past the right PCB edge

/* [Screw-terminal breakout *] */
bo_x0 = pi_gpio_x0 - 1.5;         // footprint over the header
bo_x1 = pi_gpio_x1 + 1.5;
bo_over_y = 3.0;                  // how far the breakout overhangs the top PCB edge
bo_h = 22.0;                      // height above the PCB top (header + terminals) *
top_clear = 2.0;                  // headroom above the tallest part

/* [Case] */
wall = 2.4;
floor_t = 2.4;
lid_t = 2.4;
standoff_h = 5.0;                 // PCB underside clearance (solder joints, SD card)
standoff_d = 6.0;
corner_margin = 7.0;              // extra room all round, in which the lid-screw posts sit
post_d = 7.5;
insert_hole_d = 4.0;              // M3 heat-set insert (same as the sensor body)
lid_screw_d = 3.4;
vent_w = 1.6;
cable_slot_x0 = 12;               // cable entry along the top wall
cable_slot_x1 = 78;
cable_slot_h = 9;                 // height of the cable slot, from the floor + standoffs
tie_slot_w = 4.0;                 // zip-tie slots either side of the cable entry
tie_slot_h = 1.8;
open_usb_end = true;              // cut a window over the USB / Ethernet end

/* [Wings *] */
screw_spacing = 150.0;            // centre-to-centre of the two peg screws to mount on *
screw_shank_d = 4.0;              // diameter of the screw the slot goes over *
screw_head_d = 8.0;               // head, for the underside pocket *
screw_head_h = 2.5;               // how high the head stands off the board *
slot_extra = 8.0;                 // slot length beyond the shank, to forgive spacing errors
wing_t = 3.6;
wing_w = 24;

$fn = 48;
eps = 0.01;

// ============================================================
// DERIVED
// ============================================================
in_x0 = -corner_margin;
in_x1 = pi_l + corner_margin;
in_y0 = -corner_margin;
in_y1 = pi_w + corner_margin;
in_w = in_x1 - in_x0;
in_d = in_y1 - in_y0;
out_x0 = in_x0 - wall;
out_y0 = in_y0 - wall;
out_w = in_w + 2 * wall;
out_d = in_d + 2 * wall;
pcb_z = floor_t + standoff_h;                 // PCB underside
inner_h = standoff_h + pi_t + max(bo_h, 17) + top_clear;
body_h = floor_t + inner_h;                   // wall top (lid sits on it)
wing_len = (screw_spacing - out_w) / 2 + wing_w / 2 + 2;
wing_x_screw = screw_spacing / 2;             // from the case centre
case_cx = (in_x0 + in_x1) / 2;
case_cy = (in_y0 + in_y1) / 2;

post_xs = [in_x0 + post_d / 2 - 0.2, in_x1 - post_d / 2 + 0.2];
post_ys = [in_y0 + post_d / 2 - 0.2, in_y1 - post_d / 2 + 0.2];

assert(out_w + 2 * wing_len <= 250, "Case plus wings exceeds the build plate");
assert(screw_spacing > out_w, "Peg screws are closer together than the case is wide");
echo(str("Case ", out_w, " x ", out_d, " x ", body_h + lid_t, " mm; wings to ", out_w + 2 * wing_len, " mm; PCB top at Z = ", pcb_z + pi_t));

module label_text(txt, size = 4) text(txt, size = size, halign = "center", valign = "center", font = "Liberation Sans:style=Bold");

// ============================================================
// BASE
// ============================================================
module wing(side) {
  // side = -1 (left) or +1 (right); the slot is centred on the peg screw.
  x_edge = side < 0 ? out_x0 : out_x0 + out_w;
  x_screw = case_cx + side * wing_x_screw;
  x_end = x_screw + side * (wing_w / 2 + 2);
  x_a = min(x_edge, x_end);
  w = abs(x_end - x_edge);
  difference() {
    translate([x_a, case_cy - wing_w / 2, 0]) cube([w, wing_w, wing_t]);
    // Slot over the screw (long in X so the spacing need not be exact).
    hull() for (dx = [-slot_extra / 2, slot_extra / 2])
      translate([x_screw + dx, case_cy, -eps]) cylinder(d = screw_shank_d + 0.6, h = wing_t + 2 * eps);
    // Head pocket on the board side so the case sits flat against the board.
    hull() for (dx = [-slot_extra / 2, slot_extra / 2])
      translate([x_screw + dx, case_cy, -eps]) cylinder(d = screw_head_d + 0.8, h = screw_head_h + eps);
  }
}

module standoffs() {
  for (x = [pi_hole_off, pi_hole_off + pi_hole_x], y = [pi_hole_off, pi_hole_off + pi_hole_y])
    translate([x, y, floor_t - eps]) difference() {
      cylinder(d = standoff_d, h = standoff_h + eps);
      translate([0, 0, 0.8]) cylinder(d = pi_screw_hole_d, h = standoff_h);
    }
}

module base() {
  difference() {
    union() {
      // Shell: floor and walls.
      translate([out_x0, out_y0, 0]) cube([out_w, out_d, body_h]);
      for (side = [-1, 1]) wing(side);
    }
    // Interior.
    translate([in_x0, in_y0, floor_t]) cube([in_w, in_d, inner_h + eps]);
    // Wings were unioned with the shell: carve their slots again after the interior (they sit outside it).
    // Cable entry: wide slot in the top (+Y) wall, above the standoff height.
    translate([cable_slot_x0, in_y1 - eps, floor_t + standoff_h + 2])
      cube([cable_slot_x1 - cable_slot_x0, wall + 2 * eps, cable_slot_h]);
    // Zip-tie slots (vertical through the wall) either side of the entry.
    for (x = [cable_slot_x0 - tie_slot_w - 3, cable_slot_x1 + 3])
      translate([x, in_y1 - eps, floor_t + standoff_h + 4]) cube([tie_slot_w, wall + 2 * eps, tie_slot_h + 6]);
    // Micro-USB power (bottom -Y wall).
    translate([pi_usbc_x - pi_usbc_w / 2, out_y0 - eps, pcb_z - 2])
      cube([pi_usbc_w, wall + 2 * eps, 7.5]);
    // SD card (left -X wall), below the board level.
    translate([out_x0 - eps, pi_sd_y - 7, floor_t + 1]) cube([wall + 2 * eps, 14, standoff_h + pi_t + 1]);
    // USB / Ethernet end window (right +X wall).
    if (open_usb_end)
      translate([in_x1 - eps, pi_eth_usb_y0, pcb_z]) cube([wall + 2 * eps, pi_eth_usb_y1 - pi_eth_usb_y0, 17]);
    // Lid-screw holes: M3 heat-set inserts in the corner posts, from the top.
    for (x = post_xs, y = post_ys)
      translate([x, y, body_h - 9]) cylinder(d = insert_hole_d, h = 9 + eps);
    // Vent slots in the floor under the Pi.
    for (i = [0 : 5])
      translate([20 + i * 8, 10, -eps]) cube([vent_w, 30, floor_t + 2 * eps]);
    // Case name, recessed on the underside.
    translate([case_cx, in_y1 - 8, 0.5]) mirror([1, 0, 0]) rotate([0, 0, 0]) linear_extrude(0.6)
      label_text("PLINKO PI", 5);
  }
  standoffs();
  // Corner posts for the lid screws.
  for (x = post_xs, y = post_ys)
    translate([x, y, floor_t - eps]) difference() {
      cylinder(d = post_d, h = inner_h + eps);
      translate([0, 0, inner_h - 9]) cylinder(d = insert_hole_d, h = 9 + 2 * eps);
    }
}

// ============================================================
// LID
// ============================================================
module lid() {
  difference() {
    translate([out_x0, out_y0, 0]) cube([out_w, out_d, lid_t]);
    for (x = post_xs, y = post_ys)
      translate([x, y, -eps]) cylinder(d = lid_screw_d, h = lid_t + 2 * eps);
    // Countersinks for the M3 heads.
    for (x = post_xs, y = post_ys)
      translate([x, y, lid_t - 1.6]) cylinder(d1 = lid_screw_d, d2 = 6.4, h = 1.6 + eps);
    // Vent slots over the terminals.
    for (i = [0 : 7])
      translate([bo_x0 + 4 + i * 7, pi_w - 6, -eps]) cube([vent_w, 12, lid_t + 2 * eps]);
    translate([case_cx, case_cy - 14, 0.4]) mirror([1, 0, 0]) linear_extrude(0.6 + eps) label_text("Plinko Pi", 5);
  }
}

// ============================================================
// TESTS
// ============================================================
// Pi footprint tray: floor, standoffs, low walls with the port cut-outs. Confirms the Pi, the ports and
// the standoff holes. The breakout and lid are not part of this.
module fit_tray() {
  difference() {
    union() {
      translate([-4, -4, 0]) cube([pi_l + 8 + 2, pi_w + 8, floor_t + standoff_h + 5]);
    }
    translate([-2, -2, floor_t]) cube([pi_l + 4 + 2, pi_w + 4, standoff_h + 6]);
    translate([pi_usbc_x - pi_usbc_w / 2, -4 - eps, floor_t + standoff_h - 2]) cube([pi_usbc_w, 4 + 2 * eps, 8]);
    translate([-4 - eps, pi_sd_y - 7, floor_t + 1]) cube([4 + 2 * eps, 14, 10]);
  }
  for (x = [pi_hole_off, pi_hole_off + pi_hole_x], y = [pi_hole_off, pi_hole_off + pi_hole_y])
    translate([x, y, floor_t - eps]) difference() {
      cylinder(d = standoff_d, h = standoff_h + eps);
      translate([0, 0, 0.8]) cylinder(d = pi_screw_hole_d, h = standoff_h);
    }
}

// Wing slot test: a plate with the two mounting slots at the real screw spacing and the head pockets.
// Hold it to the board over the peg screws; adjust screw_spacing / screw_shank_d / screw_head_d until
// it drops over them.
module wing_test() {
  difference() {
    translate([-screw_spacing / 2 - wing_w / 2 - 2, -wing_w / 2, 0]) cube([screw_spacing + wing_w + 4, wing_w, wing_t]);
    for (side = [-1, 1]) {
      hull() for (dx = [-slot_extra / 2, slot_extra / 2])
        translate([side * screw_spacing / 2 + dx, 0, -eps]) cylinder(d = screw_shank_d + 0.6, h = wing_t + 2 * eps);
      hull() for (dx = [-slot_extra / 2, slot_extra / 2])
        translate([side * screw_spacing / 2 + dx, 0, -eps]) cylinder(d = screw_head_d + 0.8, h = screw_head_h + eps);
    }
    translate([0, 0, wing_t - 0.5]) linear_extrude(0.6) label_text(str("SPACING ", screw_spacing), 5);
  }
}

// ============================================================
// OUTPUT
// ============================================================
module pi_mock() {
  color("seagreen") translate([0, 0, pcb_z]) cube([pi_l, pi_w, pi_t]);
  color("silver") translate([pi_gpio_x0, pi_w - 5, pcb_z + pi_t]) cube([pi_gpio_x1 - pi_gpio_x0, 5, 8.5]);
  color("orange", 0.7) translate([bo_x0, pi_w - 5, pcb_z + pi_t]) cube([bo_x1 - bo_x0, 5 + bo_over_y, bo_h]);
}

if (part == "base") base();
else if (part == "lid") translate([0, 0, 0]) lid();
else if (part == "fit_tray") fit_tray();
else if (part == "wing_test") wing_test();
else {
  base();
  pi_mock();
  color("white", 0.5) translate([0, 0, body_h + 10]) lid();
}
