// APACHE 2800 RP09 lid-storage calibration.
// Test geometry only: do not treat this as a production release.
// All dimensions are millimetres.

part = "layout";
$fn = 64;

// User measurements.  The boss pitch is intentionally isolated here so the
// next coupon can be adjusted without changing any other geometry.
boss_pitch = [274, 200];
between_ribs = [255, 183];
measured_lid_depth = 35;

frame_thickness = 3.2;
rail_width = 12;
boss_pad_diameter = 16;
m3_clearance_diameter = 3.4;
m3_head_diameter = 6.6;
m3_head_recess = 1.5;
frame_overhang = 8;
puzzle_radius = 4;
puzzle_clearance = 0.25;
label_depth = 0.5;

// Visual concept dimensions.  These are not yet approved storage geometry.
usable_storage_depth = 28;
module_gap = 4;
module_width = (between_ribs[0] - 2 * module_gap) / 3;
module_height = between_ribs[1];

font_bold = "Liberation Sans:style=Bold";

module rounded_rect_2d(size, radius) {
    offset(r = radius)
        square([size[0] - 2 * radius, size[1] - 2 * radius], center = true);
}

module recessed_label(value, position = [0, 0], size = 3.5, rotation = 0) {
    translate([position[0], position[1], frame_thickness - label_depth])
        rotate([0, 0, rotation])
            linear_extrude(label_depth + 0.02)
                text(value, size = size, font = font_bold,
                     halign = "center", valign = "center");
}

module boss_hole(x, y) {
    translate([x, y, -0.05])
        cylinder(h = frame_thickness + 0.1, d = m3_clearance_diameter);
    translate([x, y, frame_thickness - m3_head_recess])
        cylinder(h = m3_head_recess + 0.05, d = m3_head_diameter);
}

module half_frame_2d(side = -1) {
    // side -1 is left; side +1 is right.
    difference() {
        union() {
            // Outer vertical rail and boss pads.
            translate([side * boss_pitch[0] / 2, 0])
                square([rail_width, boss_pitch[1] + 2 * frame_overhang], center = true);
            for (y = [-boss_pitch[1] / 2, boss_pitch[1] / 2])
                translate([side * boss_pitch[0] / 2, y])
                    circle(d = boss_pad_diameter);

            // Top and bottom rails run to the centre seam.
            for (y = [-boss_pitch[1] / 2, boss_pitch[1] / 2])
                translate([side * boss_pitch[0] / 4, y])
                    square([boss_pitch[0] / 2, rail_width], center = true);

            // Left half carries two round alignment tongues.
            if (side < 0)
                for (y = [-boss_pitch[1] / 2, boss_pitch[1] / 2])
                    translate([2, y]) circle(r = puzzle_radius);
        }

        // Right half receives the alignment tongues with printable clearance.
        if (side > 0)
            for (y = [-boss_pitch[1] / 2, boss_pitch[1] / 2])
                translate([2, y]) circle(r = puzzle_radius + puzzle_clearance);
    }
}

module frame_half(side = -1) {
    difference() {
        linear_extrude(frame_thickness) half_frame_2d(side);
        for (y = [-boss_pitch[1] / 2, boss_pitch[1] / 2])
            boss_hole(side * boss_pitch[0] / 2, y);
        recessed_label(side < 0 ? "LID FIT L  RP09" : "LID FIT R  RP09",
                       [side * 68, -boss_pitch[1] / 2], 3.2);
        recessed_label("HINGE", [side * 105, -boss_pitch[1] / 2], 2.6);
        recessed_label("LATCH", [side * 105, boss_pitch[1] / 2], 2.6);
    }
}

module rib_envelope_reference() {
    color([0.2, 0.55, 0.9, 0.18])
        linear_extrude(0.5)
            difference() {
                square(between_ribs, center = true);
                square([between_ribs[0] - 2, between_ribs[1] - 2], center = true);
            }
}

module storage_concept() {
    // Three removable bays demonstrate the intended modular architecture.
    // Whichever bay receives the safety-switch witness mark becomes the open
    // switch garage; the remaining bays become storage cartridges.
    labels = ["CABLES", "ADAPTERS / KEYS", "SWITCH GARAGE"];
    for (i = [-1, 0, 1]) {
        x = i * (module_width + module_gap);
        color(i == 1 ? [0.95, 0.75, 0.1, 0.28] : [0.15, 0.2, 0.5, 0.28])
            translate([x, 0, frame_thickness])
                difference() {
                    linear_extrude(usable_storage_depth)
                        rounded_rect_2d([module_width, module_height], 5);
                    translate([0, 0, 2.4])
                        linear_extrude(usable_storage_depth)
                            rounded_rect_2d([module_width - 5,
                                             module_height - 5], 3.5);
                }
        color([1, 1, 1])
            translate([x, 0, frame_thickness + usable_storage_depth + 0.05])
                linear_extrude(0.4)
                    text(labels[i + 1], size = 5, font = font_bold,
                         halign = "center", valign = "center");
    }
}

module locator_tile() {
    // A small reusable tile for painter's tape or modelling clay.  Print
    // several and temporarily tape them to the lid floor to locate protruding
    // controls; never force the lid closed against a rigid tile.
    difference() {
        linear_extrude(1.2) rounded_rect_2d([50, 50], 3);
        for (x = [-20 : 10 : 20])
            translate([x, 0, -0.05]) cube([0.6, 44, 1.3], center = true);
        for (y = [-20 : 10 : 20])
            translate([0, y, -0.05]) cube([44, 0.6, 1.3], center = true);
        translate([0, 18, 0.7])
            linear_extrude(0.55)
                text("10 mm GRID", size = 3, font = font_bold,
                     halign = "center", valign = "center");
    }
}

module branding_base() {
    // A multi-colour advertising proof, not yet the final cassette cover.
    difference() {
        linear_extrude(2.4) rounded_rect_2d([120, 60], 5);
        translate([0, 3, 1.75])
            linear_extrude(0.7)
                offset(delta = 0.18)
                    scale([0.076, 0.076]) andworx_word_2d();
        translate([0, -20, 1.75])
            linear_extrude(0.7)
                text("FIELD KIT", size = 6.5, font = font_bold,
                     halign = "center", valign = "center");
    }
}

module branding_insert() {
    union() {
        translate([0, 3, 0])
            linear_extrude(0.9)
                scale([0.076, 0.076]) andworx_word_2d();
        translate([0, -20, 0])
            linear_extrude(0.9)
                text("FIELD KIT", size = 6.5, font = font_bold,
                     halign = "center", valign = "center");
    }
}

module layout() {
    rib_envelope_reference();
    color([0.12, 0.12, 0.14]) frame_half(-1);
    color([0.12, 0.12, 0.14]) frame_half(1);
    storage_concept();
}

// OpenSCAD requires the logo module before it is referenced.  `use` imports
// only modules/functions and avoids rendering anything from the source file.
use <../../../display-stand/logo_letters/andworx_letters.scad>

if (part == "layout") layout();
else if (part == "frame_left") frame_half(-1);
else if (part == "frame_right") frame_half(1);
else if (part == "locator_tile") locator_tile();
else if (part == "branding_base") branding_base();
else if (part == "branding_insert") branding_insert();
else assert(false, str("Unknown part: ", part));
