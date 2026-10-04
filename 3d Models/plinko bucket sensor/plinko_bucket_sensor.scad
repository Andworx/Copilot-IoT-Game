// Plinko bucket sensor insert (issue #128) - IR break beam.
//
// One insert per Plinko bucket. It sits on the bucket floor; a landed puck rests
// on its top surface and breaks an IR beam running across the bucket just above
// that surface. The beam clears again when the puck is picked up. The insert has
// no LEDs: the chase lights run on the Plinko display page (Power Pages).
//
// - Body (PLA): a tower at each end holds one half of an Adafruit 2167 IR break
//   beam pair (emitter left, receiver right) in a pocket open to the rear face,
//   so the backboard keeps them in and their wires go straight out the back.
//   The receiver looks through a narrow aperture tube to reject light reflected
//   off the acrylic and backboard. Slides into the bucket from the front with the
//   acrylic removed; two M3 screws from behind the backboard go into heat-set
//   inserts in the rear face.
// - Cover (PLA): swappable face plate held on by disc magnets and located by two
//   pins, one per logo in logos/logos.json (Microsoft, Power Platform, Azure).
//   The logo is a 0.6 mm multi-colour inlay in the cover face (base + up to 3-4
//   colour parts for the AMS), or with logo_style = "cutout" a single-colour
//   cut-through showing the body colour.
//
// Coordinates: X = across the bucket (left divider to right divider),
// Y = 0 at the cover front (behind the acrylic) to shell_d at the rear face
// (against the backboard), Z = 0 on the bucket floor. Dimensions in mm.
//
// Print orientation: body on its back (rear face down); cover face down, with its
// colour parts loaded as parts of the same object. Neither needs supports.

/* [Part] */
part = "assembly"; // [assembly, exploded, section, cover_set, body, cover, cover_colour, print_plate]

/* [Bucket slot - board numbers 2026-09-30 (4 x 5 x 0.5 in); MEASURE] */
slot_w = 101.6;         // gap between the two bucket dividers (X)
slot_gap = 12.7;        // front acrylic to backboard (Y); see the echoed minimum
side_clear = 0.4;       // clearance to each divider
front_clear = 0.5;      // clearance to the acrylic
face_h = 25.0;          // height of the top surface the puck rests on

/* [Puck - 1.5 in diameter, lighter than an AA battery] */
puck_d = 38.1;
puck_t = 6.0;           // thickness - UNKNOWN, mockup only

/* [Body] */
end_block_w = 8.5;      // solid ends: magnets, heat-set inserts

/* [IR break beam - Adafruit 2167 (3 mm), housing 20 x 10 x 8 mm; confirm orientation] */
ir_l = 20.0;            // housing length along the beam (LED on the inner end, wires out the outer end)
ir_h = 10.0;            // housing height (Z)
ir_w = 8.0;             // housing thickness (Y)
ir_clear = 0.4;         // pocket clearance, total
beam_h = 8.0;           // beam centre above the top surface
ir_wire_space = 3.0;    // room at the outer end for the wires to bend out the back
ir_wall_out = 1.2;      // tower wall against the divider
tx_wall_in = 1.5;       // emitter tower inner wall
tx_hole_d = 3.4;        // emitter window
rx_wall_in = 5.0;       // receiver tower inner wall = aperture tube length
rx_aperture_d = 2.5;    // receiver window; smaller rejects more stray light
ir_roof = 1.6;          // tower material above the pocket
tower_slope_rise = 6.0; // tower top rises this much toward the divider so pucks roll off

/* [Cover] */
cover_t = 3.1;          // magnet pocket + 1 mm skin
cover_gap = 0.2;        // between cover back and body front
cover_top_clear = 0.2;  // cover top sits this far below the top surface
mag_d = 6.0;            // disc magnet diameter (6 x 2 mm default)
mag_h = 2.0;            // disc magnet thickness
mag_fit = 0.15;         // added to magnet diameter for a glue-in pocket
mag_depth = 2.1;        // pocket depth in body and cover
mag_x_inset = 4.25;     // magnet centre from each side
mag_z_inset = 5.0;      // magnet centre from bottom and top
align_pin_d = 3.0;
align_pin_h = 2.0;
align_pin_clear = 0.3;
align_pin_x_inset = 14.0;
align_pin_z = 4.0;

/* [Logo - see logos/logos.json; run logos/build_logo_layers.py after changing it] */
logo = "power-apps";    // [microsoft, power-platform, power-apps, power-automate, power-pages, dataverse, ai-builder, copilot, azure, azure-functions, azure-iot-hub, azure-signalr, none]
logo_style = "inlay";   // [inlay, cutout] inlay: multi-colour logo in the cover face (AMS); cutout: logo cut through, body colour shows
logo_size = 18.0;       // logo fits in this square
logo_inlay_depth = 0.6; // inlay thickness at the cover front (3 layers at 0.2 mm)
logo_colour = 0;        // part = "cover_colour": which logo colour layer to export
logo_clean = 0.05;      // removes slivers thinner than 2x this (mm) from the logo layers

/* [Heat-set inserts - M3 x 5.7 typical] */
insert_hole_d = 4.0;
insert_depth = 6.5;

$fn = 48;
eps = 0.01;

include <logos/generated/logo_data.scad>;

// ============================================================
// DERIVED
// ============================================================
shell_w = slot_w - 2 * side_clear;
shell_d = slot_gap - front_clear;
z_top = face_h;
body_y0 = cover_t + cover_gap;               // body front face (below the top surface)
cover_top = z_top - cover_top_clear;
logo_z = cover_top / 2;
insert_z = z_top / 2;

beam_z = z_top + beam_h;
ir_pocket_h = ir_h + ir_clear;
ir_pocket_w = ir_w + ir_clear;
ir_pocket_y0 = shell_d - ir_pocket_w;        // pocket opens to the rear face
beam_y = ir_pocket_y0 + ir_pocket_w / 2;     // assumes the LED is centred on the housing end
tower_in_h = beam_z + ir_pocket_h / 2 + ir_roof;
tower_out_h = tower_in_h + tower_slope_rise;
tx_w = ir_wall_out + ir_wire_space + ir_l + ir_clear + tx_wall_in;
rx_w = ir_wall_out + ir_wire_space + ir_l + ir_clear + rx_wall_in;
flat_w = shell_w - tx_w - rx_w;
min_slot_gap = ir_pocket_w + 2.0 + front_clear;

mag_xs = [mag_x_inset, shell_w - mag_x_inset];
mag_zs = [mag_z_inset, z_top - mag_z_inset];
align_xs = [align_pin_x_inset, shell_w - align_pin_x_inset];

assert(slot_gap >= min_slot_gap, str("Slot gap too small for the IR housings: need ", min_slot_gap, " mm"));
assert(ir_pocket_y0 >= 2.0, "IR pocket front wall too thin");
assert(ir_pocket_y0 >= body_y0 - 1, "Cover too thick for the slot");
assert(flat_w >= puck_d + 2, str("Towers leave only ", flat_w, " mm for the puck"));
assert(beam_h > ir_pocket_h / 2, "Beam too low: IR housing would sit below the top surface");
assert(beam_h < puck_d - 8, "Beam too high to be blocked reliably by a resting puck");
assert(logo == "none" || logo_size < cover_top - 4, "Logo does not fit the cover");
assert(mag_x_inset + (mag_d + mag_fit) / 2 < end_block_w - 0.5, "Magnets do not fit the end blocks");

echo(str("Insert ", shell_w, " x ", shell_d, " x ", z_top, " mm (towers to ", tower_out_h, "); minimum slot gap ", min_slot_gap));
echo(str("Towers ", tx_w, " (emitter) / ", rx_w, " (receiver) mm; puck area ", flat_w, " mm; beam ", beam_h, " mm above the top at Y ", beam_y));
echo(str("Backboard holes (X from left divider, Z from floor): emitter wires ", side_clear + ir_wall_out + ir_wire_space / 2, ", ", beam_z,
         "; receiver wires ", side_clear + shell_w - ir_wall_out - ir_wire_space / 2, ", ", beam_z,
         "; M3 screws ", side_clear + end_block_w / 2, " and ", side_clear + shell_w - end_block_w / 2, ", ", insert_z));

// ============================================================
// LOGO (2D, in the face plane: X across, Y up)
// ============================================================
// LOGOS rows: [name, title, [width, height], colours, colour group per element].
function logo_entry(name) = LOGOS[search([name], LOGOS)[0]];
function logo_colours(name) = name == "none" ? [] : logo_entry(name)[3];

module logo_element(name, i) import(str("logos/generated/", name, "/e", i, ".svg"));

// Logo centred on the origin and scaled into logo_size. layer = -1 gives the whole
// silhouette; otherwise the visible part of that colour: each element minus every
// element painted above it.
module logo_2d(name = logo, layer = -1) {
  if (name != "none") {
    e = logo_entry(name);
    groups = e[4];
    n = len(groups);
    // Shapes in these icons share edges, leaving zero-width slivers and pinholes that
    // would make non-manifold STLs: close (grow, shrink) then open (shrink, grow).
    offset(delta = logo_clean) offset(delta = -logo_clean)
    offset(delta = -logo_clean) offset(delta = logo_clean)
      scale(logo_size / max(e[2])) translate(-e[2] / 2)
        if (layer < 0) offset(delta = logo_clean / 4) for (i = [0 : n - 1]) logo_element(name, i);
        else for (i = [0 : n - 1]) if (groups[i] == layer)
          difference() {
            logo_element(name, i);
            for (j = [i + 1 : 1 : n - 1]) logo_element(name, j);
          }
  }
}

// Extrude a 2D shape (X across, Y up) along +Y of the model, centred across the insert at height z.
module face_extrude(y0, depth, z) {
  translate([shell_w / 2, y0 + depth, z]) rotate([90, 0, 0]) linear_extrude(depth) children();
}

// Extrude a 2D XZ profile through the full depth of the insert.
module xz_extrude(y0 = 0, depth = shell_d) {
  translate([0, y0 + depth, 0]) rotate([90, 0, 0]) linear_extrude(depth) children();
}

// ============================================================
// BODY
// ============================================================
module tower_profile(x_out, x_in) {
  // Top slopes down from the divider side so a puck landing on it rolls into the bucket.
  polygon([[x_out, z_top - eps], [x_in, z_top - eps], [x_in, tower_in_h], [x_out, tower_out_h]]);
}

// IR pocket for one tower. inner = x of the tower's inner face, dir = +1 (left tower) or -1 (right).
module ir_pocket(inner, dir, wall_in, window_d) {
  pocket_len = ir_l + ir_clear + ir_wire_space;
  x_in = inner - dir * wall_in;               // inner end of the pocket
  x0 = min(x_in, x_in - dir * pocket_len);
  translate([x0, ir_pocket_y0, beam_z - ir_pocket_h / 2]) cube([pocket_len, ir_pocket_w + eps, ir_pocket_h]);
  translate([min(inner, x_in) - eps, beam_y, beam_z]) rotate([0, 90, 0])
    cylinder(d = window_d, h = wall_in + 2 * eps, $fn = 24);
}

module body() {
  difference() {
    union() {
      translate([0, body_y0, 0]) cube([shell_w, shell_d - body_y0, z_top]);
      xz_extrude() tower_profile(0, tx_w);
      xz_extrude() tower_profile(shell_w, shell_w - rx_w);
    }

    ir_pocket(tx_w, 1, tx_wall_in, tx_hole_d);
    ir_pocket(shell_w - rx_w, -1, rx_wall_in, rx_aperture_d);

    // M3 heat-set inserts in the rear face, one per end.
    for (x = [end_block_w / 2, shell_w - end_block_w / 2])
      translate([x, shell_d + eps, insert_z]) rotate([90, 0, 0])
        cylinder(d = insert_hole_d, h = insert_depth + eps);

    // Cover magnets and alignment-pin holes.
    for (x = mag_xs, z = mag_zs)
      translate([x, body_y0 - eps, z]) rotate([-90, 0, 0]) cylinder(d = mag_d + mag_fit, h = mag_depth + eps);
    for (x = align_xs)
      translate([x, body_y0 - eps, align_pin_z]) rotate([-90, 0, 0])
        cylinder(d = align_pin_d + align_pin_clear, h = align_pin_h + 0.5 + eps);
  }
}

// ============================================================
// COVER (modelled in place: front at Y = 0)
// ============================================================
module cover() {
  difference() {
    union() {
      cube([shell_w, cover_t, cover_top]);
      for (x = align_xs)
        translate([x, cover_t - eps, align_pin_z]) rotate([-90, 0, 0])
          cylinder(d = align_pin_d, h = cover_gap + align_pin_h + eps);
    }
    if (logo_style == "cutout") face_extrude(-eps, cover_t + 2 * eps, logo_z) logo_2d();
    else face_extrude(-eps, logo_inlay_depth + eps, logo_z) logo_2d();
    for (x = mag_xs, z = mag_zs)
      translate([x, cover_t - mag_depth, z]) rotate([-90, 0, 0]) cylinder(d = mag_d + mag_fit, h = mag_depth + eps);
  }
}

// One colour layer of the logo inlay, filling the recess at the cover front.
module cover_colour(k) face_extrude(0, logo_inlay_depth, logo_z) logo_2d(logo, k);

// Cover with its logo in colour, for previews only.
module cover_coloured(name = logo) {
  colours = logo_colours(name);
  color("dimgray") translate([0, eps, 0]) cube([shell_w, cover_t, cover_top]);
  for (k = [0 : 1 : len(colours) - 1])
    color(colours[k]) face_extrude(-0.3, 0.3, logo_z) logo_2d(name, k);
}

// ============================================================
// REFERENCE MOCKUPS (not printed)
// ============================================================
module ir_mock(inner, dir, wall_in) {
  x_in = inner - dir * (wall_in + ir_clear / 2);
  x0 = min(x_in, x_in - dir * ir_l);
  color("black") translate([x0, ir_pocket_y0 + ir_clear / 2, beam_z - ir_h / 2]) cube([ir_l, ir_w, ir_h]);
  color("dimgray") translate([dir > 0 ? x0 - 3 : x0 + ir_l, beam_y - 0.5, beam_z - 0.5]) cube([3, 1, 1]);
}

module beam_mock() {
  color("red", 0.8) translate([tx_w, beam_y, beam_z]) rotate([0, 90, 0]) cylinder(d = 1.2, h = flat_w, $fn = 12);
}

module magnet_mocks() {
  color("gray") for (x = mag_xs, z = mag_zs) {
    translate([x, body_y0, z]) rotate([-90, 0, 0]) cylinder(d = mag_d, h = mag_h);
    translate([x, cover_t - mag_h, z]) rotate([-90, 0, 0]) cylinder(d = mag_d, h = mag_h);
  }
}

module puck_mock(x = shell_w / 2) {
  color("gold", 0.9) translate([x, (slot_gap - front_clear - puck_t) / 2, z_top + puck_d / 2])
    rotate([-90, 0, 0]) cylinder(d = puck_d, h = puck_t);
}

module assembly(explode = 0) {
  color("white") body();
  translate([0, -explode, 0]) cover_coloured();
  ir_mock(tx_w, 1, tx_wall_in);
  ir_mock(shell_w - rx_w, -1, rx_wall_in);
  if (explode == 0) { beam_mock(); puck_mock(); }
}

// Every logo in logos.json on its own cover, viewed from the front.
module cover_set(columns = 3) {
  for (i = [0 : len(LOGOS) - 1])
    translate([(i % columns) * (shell_w + 10), 0, -floor(i / columns) * (cover_top + 10)])
      cover_coloured(LOGOS[i][0]);
}

module print_flat_body() translate([0, 0, shell_d]) rotate([-90, 0, 0]) body();
// Cover base and colour layers share this transform so they load aligned in the slicer.
module print_flat_cover() rotate([90, 0, 0]) cover();
module print_flat_cover_colour(k) rotate([90, 0, 0]) cover_colour(k);

// ============================================================
// OUTPUT
// ============================================================
if (part == "body") print_flat_body();
else if (part == "cover") print_flat_cover();
else if (part == "cover_colour") print_flat_cover_colour(logo_colour);
else if (part == "cover_set") cover_set();
else if (part == "logo_layer_2d") logo_2d(logo, logo_colour);   // debugging: export as SVG/DXF
else if (part == "print_plate") {
  print_flat_body();
  translate([0, -8, 0]) {
    print_flat_cover();
    if (logo_style == "inlay") for (k = [0 : 1 : len(logo_colours(logo)) - 1]) print_flat_cover_colour(k);
  }
}
else if (part == "exploded") assembly(18);
else if (part == "section") {
  // Rear view: IR housings in their pockets and the beam.
  color("steelblue") body();
  ir_mock(tx_w, 1, tx_wall_in);
  ir_mock(shell_w - rx_w, -1, rx_wall_in);
  beam_mock();
  puck_mock(shell_w / 2 + 12);
}
else assembly();
