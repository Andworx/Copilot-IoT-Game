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
measured_clearance_above_old_cover = 14;
derived_stack_envelope = 23.4 + measured_clearance_above_old_cover;

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

// Printable storage prototype.  The left third remains available for the
// design plate.  The centre and right compartments are integrated into one
// deep carrier so no removable tray inserts are required.
storage_wall = 2.4;
storage_floor = 2.4;
storage_height = 34;
// The mounting frame crosses the carrier depth: 13 mm projects behind the
// frame into the moulded lid and the proven 21 mm cavity remains in front.
storage_frame_z = 0;
storage_back_depth = 13;
storage_front_height = storage_height - storage_back_depth;
storage_back_z = storage_frame_z - storage_back_depth;
storage_cover_z = storage_frame_z + storage_front_height;
carrier_frame_overlap = 0.4;
storage_bay_width = module_width - 2;
storage_outer_size = [2 * storage_bay_width + module_gap, module_height - 2];
storage_center_x = (module_width + module_gap) / 2;
storage_bay_centers = [0, module_width + module_gap];
storage_internal_length = storage_outer_size[1] - 2 * storage_wall;
right_pocket_width = 82;
left_pocket_width = storage_outer_size[0] - 3 * storage_wall -
                    right_pocket_width;
left_pocket_center_local = -storage_outer_size[0] / 2 + storage_wall +
                           left_pocket_width / 2;
right_pocket_center_local = storage_outer_size[0] / 2 - storage_wall -
                            right_pocket_width / 2;
right_bottom_length = 120;
right_bottom_floor = 1.0;
right_bottom_clear_depth = storage_height - right_bottom_floor;
right_bottom_center_y = -storage_internal_length / 2 +
                        right_bottom_length / 2;
right_upper_length = storage_internal_length - right_bottom_length -
                     storage_wall;
right_divider_y = -storage_internal_length / 2 + right_bottom_length +
                  storage_wall / 2;
left_divider_y = [-44.65, 0, 44.65];
// Retained only so the legacy insert modules remain reproducible from source;
// they are no longer part of the printable assembly.
insert_size = [72, 167];
insert_floor = 1.2;
insert_wall = 1.6;
insert_height = 17;
cover_thickness = 2.4;
cover_clearance = 0.8;
cover_size = [storage_outer_size[0] - 2 * cover_clearance,
              storage_outer_size[1] - 2 * cover_clearance];
cover_fastener_x = [-79.35, 0, 79.35];
cover_fastener_y = [-86, 86];
cover_hole_diameter = 3.4;
cover_head_diameter = 6.6;
cover_insert_pilot = 4.0;
cover_boss_diameter = 9;
cover_insert_depth = 5.5;

// Tool-free cover retention.  The cover edges are locally recessed so strong,
// body-integrated rails can capture them without exceeding the measured lid
// envelope.  Side and top roots are 3.2 mm thick instead of the former 1.4 mm.
snap_vertical_clearance = 0.25;
snap_edge_recess_depth = 1.2;
snap_edge_band = 5;
snap_back_thickness = 3.2;
snap_top_lip_depth = 4.5;
snap_top_lip_height = 1.6;
snap_guide_height = cover_thickness + 0.8;
snap_latch_x = [-44, 44];
snap_latch_width = 12;
snap_latch_stem = 2.0;
snap_latch_height = 13;
snap_latch_interference = 0.55;
snap_release_diameter = 20;

// Positive left/right seam.  The left tongues slide into enclosed pockets on
// the right carrier and are locked by M3 screws with captive hex nuts.
seam_tongue_length = 20;
seam_tongue_width = 8;
seam_slot_clearance = 0.4;
seam_pocket_length = 24;
seam_pocket_width = 14;
seam_pocket_height = 9.8;
seam_fastener_x = 10;
seam_hole_diameter = 3.4;
seam_head_recess_diameter = 6.6;
seam_nut_diameter = 6.6;
seam_nut_depth = 2.6;

// Optional solid design plate over the left storage area.  The uninterrupted
// face accepts raised, recessed, painted, or multicolor artwork.
design_plate_center_x = -87;
design_plate_size = [85, 196];
design_plate_thickness = 1.6;
design_mount_x = [-112, -62];
design_mount_y = [-94, 94];
design_mount_boss_diameter = 9;
design_mount_boss_height = 6;
design_mount_pilot = 4.0;

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

module storage_frame_left_2d() {
    union() {
        translate([-boss_pitch[0] / 2, 0])
            square([rail_width, boss_pitch[1] + 2 * frame_overhang], center = true);
        for (y = [-boss_pitch[1] / 2, boss_pitch[1] / 2]) {
            translate([-boss_pitch[0] / 2, y]) circle(d = boss_pad_diameter);
            translate([-boss_pitch[0] / 4, y])
                square([boss_pitch[0] / 2, rail_width], center = true);
            // Rectangular tongue reaches into the enclosed right-hand pocket.
            translate([seam_tongue_length / 2 - 1, y])
                square([seam_tongue_length + 2, seam_tongue_width], center = true);
        }
    }
}

module storage_frame_left() {
    difference() {
        union() {
            linear_extrude(frame_thickness) storage_frame_left_2d();

            // Four raised insert bosses support interchangeable design plates.
            for (x = design_mount_x, y = design_mount_y)
                translate([x, y, frame_thickness])
                    cylinder(h = design_mount_boss_height,
                             d = design_mount_boss_diameter);
        }

        for (y = [-boss_pitch[1] / 2, boss_pitch[1] / 2]) {
            boss_hole(-boss_pitch[0] / 2, y);
            translate([seam_fastener_x, y, -0.05])
                cylinder(h = frame_thickness + 0.1, d = seam_hole_diameter);
            translate([seam_fastener_x, y, -0.05])
                cylinder(h = 1.65, d = seam_head_recess_diameter);
        }

        for (x = design_mount_x, y = design_mount_y)
            translate([x, y,
                       frame_thickness + design_mount_boss_height -
                       cover_insert_depth])
                cylinder(h = cover_insert_depth + 0.05,
                         d = design_mount_pilot);
    }
}

module storage_frame_right_2d() {
    union() {
        translate([boss_pitch[0] / 2, 0])
            square([rail_width, boss_pitch[1] + 2 * frame_overhang], center = true);
        for (y = [-boss_pitch[1] / 2, boss_pitch[1] / 2]) {
            translate([boss_pitch[0] / 2, y]) circle(d = boss_pad_diameter);
            translate([boss_pitch[0] / 4, y])
                square([boss_pitch[0] / 2, rail_width], center = true);
        }
    }
}

module cover_top_retainer() {
    edge_top = storage_cover_z + cover_thickness - snap_edge_recess_depth;
    lip_bottom = edge_top + snap_vertical_clearance;

    // The back overlaps the carrier wall by about 0.45 mm and extends upward
    // as one continuous 3.2 mm-thick root for the recessed-edge lip.
    translate([storage_center_x,
               cover_size[1] / 2 + snap_vertical_clearance +
               snap_back_thickness / 2,
               (storage_cover_z + lip_bottom + snap_top_lip_height) / 2])
        cube([cover_size[0] - 18, snap_back_thickness,
              lip_bottom + snap_top_lip_height - storage_cover_z],
             center = true);
    translate([storage_center_x,
               cover_size[1] / 2 - snap_top_lip_depth / 2 +
               snap_vertical_clearance,
               lip_bottom + snap_top_lip_height / 2])
        cube([cover_size[0] - 18, snap_top_lip_depth,
              snap_top_lip_height], center = true);
}

module cover_side_guides() {
    for (side = [-1, 1])
        translate([storage_center_x +
                   side * (cover_size[0] / 2 + snap_vertical_clearance +
                           snap_back_thickness / 2),
                   0,
                   storage_cover_z + snap_guide_height / 2])
            cube([snap_back_thickness, cover_size[1] - 34,
                  snap_guide_height], center = true);
}

module cover_snap_latch(local_x) {
    outside_y = -storage_outer_size[1] / 2 - 1.1;
    edge_top = storage_cover_z + cover_thickness - snap_edge_recess_depth;
    hook_bottom = edge_top + snap_vertical_clearance;
    stem_bottom = hook_bottom + snap_top_lip_height - snap_latch_height;

    // Bottom bridge anchors a stout, otherwise free-standing cantilever.
    translate([storage_center_x + local_x,
               -storage_outer_size[1] / 2,
               stem_bottom + 1.5])
        cube([snap_latch_width, 4.2, 3], center = true);
    translate([storage_center_x + local_x, outside_y,
               stem_bottom + snap_latch_height / 2])
        cube([snap_latch_width, snap_latch_stem, snap_latch_height],
             center = true);

    // Sloped hook cams outward while the cover is pressed into place, then
    // returns over the cover with 0.3 mm running clearance.
    hull() {
        translate([storage_center_x + local_x, outside_y,
                   hook_bottom + 1.1])
            cube([snap_latch_width, snap_latch_stem, 1.0], center = true);
        translate([storage_center_x + local_x,
                   -cover_size[1] / 2 + snap_latch_interference,
                   hook_bottom + 0.5])
            cube([snap_latch_width, 0.7, 1.0], center = true);
    }
}

module cover_snap_reliefs() {
    // Recessed top edge fits beneath the continuous top rail.
    translate([0, cover_size[1] / 2 - snap_edge_band / 2,
               cover_thickness - snap_edge_recess_depth / 2 + 0.05])
        cube([cover_size[0] - 16, snap_edge_band,
              snap_edge_recess_depth + 0.1], center = true);

    // Matching recessed pads receive the two lower snap hooks.
    for (x = snap_latch_x)
        translate([x, -cover_size[1] / 2 + snap_edge_band / 2,
                   cover_thickness - snap_edge_recess_depth / 2 + 0.05])
            cube([snap_latch_width + 3, snap_edge_band,
                  snap_edge_recess_depth + 0.1], center = true);
}

module seam_pocket(y) {
    translate([seam_pocket_length / 2 - 2, y, seam_pocket_height / 2])
        cube([seam_pocket_length, seam_pocket_width, seam_pocket_height],
             center = true);
}

module seam_pocket_cut(y) {
    // Open-bottom slot: the case lid is the fourth side of the assembled
    // pocket.  The slot stops 1.6 mm before the pocket's closed right end.
    translate([8.7, y, (frame_thickness + seam_slot_clearance) / 2 - 0.05])
        cube([seam_tongue_length + 3.4,
              seam_tongue_width + seam_slot_clearance,
              frame_thickness + seam_slot_clearance + 0.1], center = true);
    translate([seam_fastener_x, y, -0.05])
        cylinder(h = seam_pocket_height + 0.1, d = seam_hole_diameter);
    translate([seam_fastener_x, y,
               seam_pocket_height - seam_nut_depth])
        rotate([0, 0, 30])
            cylinder(h = seam_nut_depth + 0.05,
                     d = seam_nut_diameter, $fn = 6);
}

module left_design_plate_blank() {
    difference() {
        linear_extrude(design_plate_thickness)
            rounded_rect_2d(design_plate_size, 5);
        for (x = design_mount_x, y = design_mount_y)
            translate([x - design_plate_center_x, y, -0.05])
                cylinder(h = design_plate_thickness + 0.1,
                         d = cover_hole_diameter);
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
    labels = ["SWITCH GARAGE", "CABLES", "ADAPTERS / KEYS"];
    for (i = [-1, 0, 1]) {
        x = i * (module_width + module_gap);
        if (i == -1) {
            // The entire left bay stays open so the safety covers can project
            // into the lid.  The yellow outline is visualization only.
            color([0.95, 0.75, 0.1, 0.55])
                translate([x, 0, frame_thickness])
                    linear_extrude(0.4)
                        difference() {
                            rounded_rect_2d([module_width, module_height], 5);
                            rounded_rect_2d([module_width - 3,
                                             module_height - 3], 3.5);
                        }
        } else {
            color([0.15, 0.2, 0.5, 0.28])
                translate([x, 0, frame_thickness])
                    difference() {
                        linear_extrude(usable_storage_depth)
                            rounded_rect_2d([module_width, module_height], 5);
                        translate([0, 0, 2.4])
                            linear_extrude(usable_storage_depth)
                                rounded_rect_2d([module_width - 5,
                                                 module_height - 5], 3.5);
                    }
        }
        color(i == -1 ? [0.95, 0.75, 0.1] : [1, 1, 1])
            translate([x, 0, frame_thickness +
                       (i == -1 ? 0.45 : usable_storage_depth + 0.05)])
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

module storage_carrier_right() {
    // Right frame half plus the common two-bay carrier.  The open area to its
    // left is the safety-switch garage.
    difference() {
        union() {
            linear_extrude(frame_thickness) storage_frame_right_2d();
            for (y = [-boss_pitch[1] / 2, boss_pitch[1] / 2])
                seam_pocket(y);

            // The shared floor sits 13 mm behind the mounting plane.  The wall
            // continues 21 mm forward to the removable cover.  A 0.4 mm top
            // overlap keeps the wall and snap hardware one printable body.
            translate([storage_center_x, 0, storage_back_z])
                linear_extrude(storage_floor)
                    rounded_rect_2d(storage_outer_size, 5);
            translate([storage_center_x, 0, storage_back_z])
                linear_extrude(storage_height + carrier_frame_overlap)
                    difference() {
                        rounded_rect_2d(storage_outer_size, 5);
                        translate([left_pocket_center_local, 0])
                            rounded_rect_2d([left_pocket_width,
                                             storage_internal_length], 3);
                        translate([right_pocket_center_local, 0])
                            rounded_rect_2d([right_pocket_width,
                                             storage_internal_length], 3);
                    }

            // Printed-in cable cells replace the former removable left insert.
            for (y = left_divider_y)
                translate([storage_center_x + left_pocket_center_local, y,
                           storage_back_z + storage_floor +
                           (storage_height - storage_floor) / 2])
                    cube([left_pocket_width + 0.6, storage_wall,
                          storage_height - storage_floor], center = true);

            // The 82 mm right pocket has a 120 mm clear lower compartment;
            // the remaining 53.8 mm clear length forms the upper tray.
            translate([storage_center_x + right_pocket_center_local,
                       right_divider_y,
                       storage_back_z + storage_floor +
                       (storage_height - storage_floor) / 2])
                cube([right_pocket_width + 0.6, storage_wall,
                      storage_height - storage_floor], center = true);

            // Short bridges tie the tray to the frame rails without entering
            // the left safety-switch opening.
            for (y = [-1, 1])
                translate([storage_center_x,
                           y * (storage_outer_size[1] / 2 + 2),
                           frame_thickness / 2])
                    cube([storage_outer_size[0] + 1, 4.5, frame_thickness],
                         center = true);
            // Overlap both the carrier wall and perimeter rail by 0.5 mm so
            // the slicer receives one continuous right-hand structure.
            translate([storage_center_x + storage_outer_size[0] / 2 + 2.75,
                       0, frame_thickness / 2])
                cube([6.5, storage_outer_size[1] + 1, frame_thickness],
                     center = true);

            // Six insert bosses retain the removable cover.
            for (x = cover_fastener_x, y = cover_fastener_y)
                translate([storage_center_x + x, y, storage_back_z])
                    cylinder(h = storage_height + carrier_frame_overlap,
                             d = cover_boss_diameter);

            cover_top_retainer();
            cover_side_guides();
            for (x = snap_latch_x) cover_snap_latch(x);
        }

        // Heat-set insert pilots open from the cover side.
        for (x = cover_fastener_x, y = cover_fastener_y)
            translate([storage_center_x + x, y,
                       storage_cover_z - cover_insert_depth])
                cylinder(h = cover_insert_depth + carrier_frame_overlap + 0.05,
                         d = cover_insert_pilot);

        // Locally thin only the 82 x 120 mm lower-right floor to 1.0 mm.
        // This yields 33 mm clear internal depth without changing the
        // carrier's external 13 mm rear / 21 mm front envelope.
        translate([storage_center_x + right_pocket_center_local,
                   right_bottom_center_y,
                   storage_back_z + right_bottom_floor])
            linear_extrude(storage_floor - right_bottom_floor + 0.05)
                rounded_rect_2d([right_pocket_width,
                                 right_bottom_length], 3);

        for (y = [-boss_pitch[1] / 2, boss_pitch[1] / 2])
            boss_hole(boss_pitch[0] / 2, y);
        for (y = [-boss_pitch[1] / 2, boss_pitch[1] / 2])
            seam_pocket_cut(y);

        // Matching wall scallop provides access beneath the cover's finger
        // notch without opening either removable storage insert.
        translate([storage_center_x, -storage_outer_size[1] / 2,
                   storage_cover_z - 2.5])
            cube([snap_release_diameter + 5, 7, 5.2], center = true);
    }
}

module insert_shell() {
    difference() {
        linear_extrude(insert_height)
            rounded_rect_2d(insert_size, 4);
        translate([0, 0, insert_floor])
            linear_extrude(insert_height)
                rounded_rect_2d([insert_size[0] - 2 * insert_wall,
                                 insert_size[1] - 2 * insert_wall], 2.5);
    }
}

module cable_insert() {
    difference() {
        union() {
            linear_extrude(insert_floor)
                rounded_rect_2d(insert_size, 4);
            // Four individually retained flat-coil pockets.
            for (y = [-61.5, -20.5, 20.5, 61.5])
                translate([0, y, 0])
                    linear_extrude(insert_height)
                        difference() {
                            rounded_rect_2d([insert_size[0], 39], 4);
                            rounded_rect_2d([insert_size[0] - 2 * insert_wall,
                                             39 - 2 * insert_wall], 2.5);
                        }
        }
        // Finger notches make each cable coil removable after the cover is off.
        for (y = [-61.5, -20.5, 20.5, 61.5])
            translate([insert_size[0] / 2, y, insert_height - 5])
                rotate([0, 90, 0]) cylinder(h = 4, d = 12, center = true);
    }
}

module accessory_insert() {
    pockets = [[48, 68], [-12, 42], [-61, 40]];
    difference() {
        union() {
            linear_extrude(insert_floor)
                rounded_rect_2d(insert_size, 4);
            for (item = pockets)
                translate([0, item[0], 0])
                    linear_extrude(insert_height)
                        difference() {
                            rounded_rect_2d([insert_size[0], item[1]], 4);
                            rounded_rect_2d([insert_size[0] - 2 * insert_wall,
                                             item[1] - 2 * insert_wall], 2.5);
                        }
        }
        for (item = pockets)
            translate([insert_size[0] / 2, item[0], insert_height - 5])
                rotate([0, 90, 0]) cylinder(h = 4, d = 12, center = true);
    }
}

module storage_cover_base() {
    difference() {
        linear_extrude(cover_thickness)
            rounded_rect_2d(cover_size, 5);
        for (x = cover_fastener_x, y = cover_fastener_y) {
            translate([x, y, -0.05])
                cylinder(h = cover_thickness + 0.1, d = cover_hole_diameter);
            translate([x, y, cover_thickness - 1.5])
                cylinder(h = 1.55, d = cover_head_diameter);
        }
        translate([0, -cover_size[1] / 2, -0.05])
            cylinder(h = cover_thickness + 0.1, d = snap_release_diameter);
        cover_snap_reliefs();
        translate([0, 18, cover_thickness - 0.7])
            linear_extrude(0.72)
                offset(delta = 0.18)
                    scale([0.12, 0.12]) andworx_word_2d();
        translate([0, -8, cover_thickness - 0.7])
            linear_extrude(0.72)
                text("FIELD KIT", size = 9, font = font_bold,
                     halign = "center", valign = "center");
        for (item = [[-43, -48, "CABLES"],
                     [43, -48, "ADAPTERS / KEYS"]])
            translate([item[0], item[1], cover_thickness - 0.5])
                linear_extrude(0.52)
                    text(item[2], size = 4, font = font_bold,
                         halign = "center", valign = "center");
    }
}

module storage_cover_blank() {
    difference() {
        linear_extrude(cover_thickness)
            rounded_rect_2d(cover_size, 5);
        for (x = cover_fastener_x, y = cover_fastener_y) {
            translate([x, y, -0.05])
                cylinder(h = cover_thickness + 0.1, d = cover_hole_diameter);
            translate([x, y, cover_thickness - 1.5])
                cylinder(h = 1.55, d = cover_head_diameter);
        }
        translate([0, -cover_size[1] / 2, -0.05])
            cylinder(h = cover_thickness + 0.1, d = snap_release_diameter);
        cover_snap_reliefs();
    }
}

module storage_cover_logo() {
    union() {
        translate([0, 18, 0])
            linear_extrude(0.9)
                scale([0.12, 0.12]) andworx_word_2d();
        translate([0, -8, 0])
            linear_extrude(0.9)
                text("FIELD KIT", size = 9, font = font_bold,
                     halign = "center", valign = "center");
    }
}

module storage_assembly_preview() {
    color([0.12, 0.12, 0.14]) storage_frame_left();
    color([0.12, 0.12, 0.14]) storage_carrier_right();
    color([0.10, 0.12, 0.28, 0.8])
        translate([storage_center_x, 0, storage_cover_z + 14]) storage_cover_base();
    color([0.95, 0.92, 0.28])
        translate([storage_center_x, 0,
                   storage_cover_z + cover_thickness + 14]) storage_cover_logo();
    color([0.65, 0.68, 0.74])
        translate([design_plate_center_x, 0,
                   frame_thickness + design_mount_boss_height + 6])
            left_design_plate_blank();
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
else if (part == "storage_carrier_right") storage_carrier_right();
else if (part == "storage_frame_left") storage_frame_left();
else if (part == "cable_insert") cable_insert();
else if (part == "accessory_insert") accessory_insert();
else if (part == "storage_cover_base") storage_cover_base();
else if (part == "storage_cover_blank") storage_cover_blank();
else if (part == "storage_cover_logo") storage_cover_logo();
else if (part == "left_design_plate_blank") left_design_plate_blank();
else if (part == "storage_assembly_preview") storage_assembly_preview();
else assert(false, str("Unknown part: ", part));
