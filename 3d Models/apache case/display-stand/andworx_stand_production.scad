// ============================================================
// ANDWORX APACHE 2800 CASE — 45-DEGREE DISPLAY STAND
// PRODUCTION ASSEMBLY
//
// CNC-cut wood base, split into 2 mirrored halves (too wide for most
// single-piece CNC stock) joined by dowels + a removable underside
// batten, + two removable 3D-printed risers + a removable lid-prop
// post + a single two-color 3D-printed logo sign that SLIDES INTO AN
// ANGLED SLOT in a small block on the base, standing up at the same
// 45-degree tilt_angle as the case/ramp -- a small echo of the case's
// own angle, cleaner than a separate vertical nameplate wall.
//
// Everything that bolts on uses 1/4"-20 wood threaded inserts (the
// hardware the user already has on hand), so the whole stand knocks
// down for shipping: 2 base halves, 2 risers, lid prop, and the
// joiner batten all separate with nothing but a hex key. The sign
// block (glued+doweled to the joined base -- see the "BASE SPLIT"
// note) and the logo sign itself (slides into the block's slot, held
// by friction/depth rather than glued) are the only two non-bolted
// connections in the whole assembly.
//
// Reuses case_display_stand.scad's proven ramp/cleat/fin math
// (cradle_bracket(), bracket_fin(), the toe/peak/dir2/nrm2 vectors,
// and case_ghost()) for the riser shape and the case-safety math.
// That file's own base_foot/rail/center_joiner/M3-insert logic is
// SUPERSEDED here by the CNC base and 1/4" hardware below -- this
// file does not call those modules.
// ============================================================

use <case_display_stand.scad>
use <logo_letters/andworx_letters.scad>

// ---------- PART SELECTOR ----------
// One of: "preview_assembly", "base_right", "base_left", "sign_block",
// "joiner_batten", "riser_right", "riser_left", "lid_prop",
// "sign_panel_base", "sign_panel_letters", "coupon_cleat"
part = "preview_assembly";
show_ghost = true;

// ============================================================
// Shared riser/case geometry, duplicated from case_display_stand.scad
// (kept in sync by hand -- see that file for the derivation/comments;
// `use<>` does not expose top-level variables across files, only
// modules, so these numbers must match its own for the two files'
// geometry to actually align).
// ============================================================
tilt_angle      = 45;
ramp_slope_len  = 130;
front_margin    = 55;
rear_margin     = 90;
bracket_width   = 42;
foot_thickness  = 14;
fin_thickness   = 6;
fin_height      = 35;
riser_margin    = 20;
case_width      = 419.1;
case_depth      = 330.2;
case_corner_radius = 24.0;
inset_from_corner  = case_corner_radius + 12;

hr = ramp_slope_len * cos(tilt_angle);
vr = ramp_slope_len * sin(tilt_angle);
foot_depth  = front_margin + hr + rear_margin;
stand_span  = case_width - 2 * inset_from_corner;
half_span   = stand_span / 2;
riser_x_min = max(0, front_margin - riser_margin);
riser_x_max = min(foot_depth, front_margin + hr + riser_margin);
riser_len   = riser_x_max - riser_x_min;
riser_peak_height = foot_thickness + vr;
riser_insert_inset = 12;
riser_attach_x = [riser_x_min + riser_insert_inset, riser_x_max - riser_insert_inset];
riser_attach_y_local = bracket_width / 2; // in the riser's own local frame

dir2 = [cos(tilt_angle), sin(tilt_angle)];  // unit vector up-slope, in XZ -- same as case_display_stand.scad's
nrm2 = [-sin(tilt_angle), cos(tilt_angle)]; // unit vector, ramp surface outward normal, in XZ -- ditto

// ============================================================
// HARDWARE — 1/4"-20 wood threaded inserts + bolts
// MEASURE_BEFORE_BUILD / VERIFY_HARDWARE: these are common generic
// dimensions for a 1/4"-20 threaded wood insert and a 1/4"-20 socket
// head cap screw. The user's specific inserts may need a different
// pilot hole or install depth -- check the actual hardware (and test
// in a scrap block) before drilling the real base.
// ============================================================
insert_pilot_d       = 9.5;  // mm (~3/8"), VERIFY_HARDWARE: pilot hole for the threaded insert
insert_install_depth = 13;   // mm (~0.5"), VERIFY_HARDWARE: how deep the insert seats
bolt_clearance_d      = 7.2; // mm, clearance hole through the printed flange (1/4" = 6.35mm + play)
bolt_head_d           = 11.5; // mm, 1/4"-20 SHCS head (~9.5mm) + clearance
bolt_head_recess      = 7.5;  // mm, counterbore depth so the bolt head sits flush/below the surface

overlap_eps = 0.2;

$fn = $preview ? 32 : 64;

// ============================================================
// BASE PLAQUE (CNC) — geometry
// ============================================================
base_thickness     = 19.05; // mm, 3/4" hardwood/plywood stock
base_half_width    = half_span + bracket_width + fin_thickness + 15; // mm, margin beyond the risers/fins
base_corner_fillet = 45;    // mm, generous rounded corners -- no sharp corners, softer/friendlier silhouette

// ============================================================
// SIGN BLOCK + SLOT-MOUNTED LOGO SIGN
// The Andworx sign is a flat panel that slides into an angled slot
// and stands up at the SAME 45-degree tilt_angle as the case/ramp --
// a small echo of the case's own angle right in front of it, instead
// of a separate vertical nameplate wall. The slot lives in a compact
// standalone block (glued+doweled to the joined base, like the old
// fascia, but now only as wide as the sign itself rather than the
// full base width -- see the "BASE SPLIT" note for why this piece
// isn't split like the two base halves: the sign sits centered on
// the Y=0 seam, so it has to stay in one piece).
//
// Geometry: sign_p0 is the point on the block's top surface where the
// slot opens. The BURIED tab goes from sign_p0 sign_tab_depth back
// along -dir2 (down and toward the front, into the block's solid
// material); the EXPOSED sign (pill + letters) starts at sign_p0 and
// continues sign_pill_h further along +dir2, in open air above the
// block -- no material needs cutting there, since it's already above
// the top surface.
// ============================================================
sign_tab_depth    = 22;  // mm, buried insertion depth (along the slot)
sign_slot_open_margin = 3; // mm, slot cut extends this far past the surface opening too, for a clean edge (no razor-thin sliver right at the opening)
sign_slot_thickness = 5; // mm, slot channel width (panel thickness + clearance)
sign_panel_t      = 4;   // mm, panel thickness (constant through tab + pill background)
sign_letter_relief = 2;  // mm, navy letters raised above the panel's front face
sign_panel_fillet = 1.5; // mm, rounds the panel's exposed top corners (the buried tab's corners don't matter, hidden in the slot) -- no sharp edges. Must stay under sign_panel_t/2 (2mm): rounded()'s erode step (offset delta=-fillet) wipes out a shape entirely if the fillet is >= half its narrowest dimension, which a 4mm fillet on a 4mm-thick panel did (an empty export, not a bad one -- "Current top level object is empty").

logo_cap_height       = 26;    // mm, target letter cap height
logo_raw_cap_height   = 134.3; // mm, A's cap height in the extracted vector data
logo_raw_word_width   = 1040.4; // mm, full "ANDWORX" bbox width in the extracted vector data
logo_scale            = logo_cap_height / logo_raw_cap_height;
logo_word_w           = logo_raw_word_width * logo_scale;
pill_pad_x            = 15; // mm
pill_pad_y            = 10; // mm
pill_w                = logo_word_w + 2 * pill_pad_x;  // mm, exposed sign width
pill_h                = logo_cap_height + 2 * pill_pad_y; // mm, exposed sign height (above the slot)
sign_panel_total_h    = sign_tab_depth + pill_h; // mm, full panel height, tab to letters-top

sign_block_width  = pill_w + 40; // mm, margin each side of the slot for solid material
sign_block_depth  = 55;  // mm (X)
sign_block_height = 30;  // mm, tall enough for sign_tab_depth's buried offset with margin below
sign_block_fillet = 8;   // mm, rounded corners -- no sharp edges
sign_block_dowel_d = 6;  // mm
sign_block_dowel_depth = 12; // mm, into the base and into the block, each side
sign_block_dowel_y = pill_w * 0.3; // mm, one dowel per half, off-center so each lands within its own base half

// sign_p0, in the block's own local (X,Z) frame: positioned so the
// buried tab (extending sign_tab_depth back along -dir2) and the
// slot-open margin both stay safely inside the block's footprint.
sign_p0_local = [sign_block_depth * 0.64, sign_block_height];

andworx_cyan   = [122, 211, 225] / 255; // #7AD3E1, unused elsewhere -- available for accent details
andworx_purple = [123, 83, 218] / 255;  // #7B53DA, ditto

// accent groove (flair): a shallow reveal line between the sign block
// and the risers, echoing the brand's pill motif. Paint it, or leave
// it as a shadow line -- either works.
groove_x       = front_margin - 22; // mm
groove_width   = 7;  // mm
groove_depth   = 2.2; // mm

andworx_navy   = [42, 51, 128] / 255;   // #2A3380
andworx_yellow = [243, 235, 74] / 255;  // #F3EB4A
wood_color     = [0.45, 0.30, 0.18];
riser_color    = [0.08, 0.08, 0.09];

// ============================================================
// LID PROP — geometry
// MEASURE_BEFORE_BUILD: the case's hinge location and lid depth were
// not in this project's measured records (only the closed-case
// catalogue exterior, 419.1 x 330.2 x 171.45mm, is on file). This
// post is deliberately built with THREE stepped notches instead of
// one fixed height, so it can be test-fit against the real case and
// the right notch chosen, rather than trusting an unmeasured guess.
// Cut/sand down the post afterward once the right notch is confirmed,
// or leave the extra height -- it doesn't interfere with anything.
//
// Why this exists at all: the case's lid, opened ~180 degrees
// relative to the base tray so it lies flat when the BASE is flat on
// a table, no longer lies flat once the base itself is tilted to 45
// degrees on this stand -- opened the same relative amount, the lid
// now points up and back into open air instead of resting on
// anything, hinged only at one edge. Without a prop it can swing
// back toward closed under its own weight, right onto the control
// panel or someone's hands.
// ============================================================
lid_prop_x_center = foot_depth - 50; // mm, single X position for both mounting bolts (within the rear_margin flat zone)
lid_prop_y_offset = 8; // mm, the 2 bolts sit at +/-this Y offset from center (see base-split note below) -- a mirror-symmetric pair, like the base halves themselves, so neither bolt lands on the seam and base_left()'s mirror() reproduces the correct hole automatically
lid_prop_post_w   = 34;  // mm, post width (Y)
lid_prop_post_t   = 22;  // mm, post thickness (X)
lid_prop_notch_heights = [70, 100, 130]; // mm, above the base top -- test-fit and pick one
lid_prop_notch_depth  = 16; // mm, how deep each notch cradle is
lid_prop_fillet   = 5;   // mm

// ============================================================
// BASE SPLIT — the base plaque is ~473mm wide, too big for most CNC
// beds/stock in one piece, so it's cut as two mirrored halves joined
// at the Y=0 centerline: 2 alignment dowels plus an underside batten
// bolted into 4 more threaded inserts (removable, same 1/4"-20
// hardware as everything else -- also means the base itself packs
// flatter for shipping, not just the risers/lid prop). The fascia
// (and its logo pocket) is NOT split -- it's a separate full-width
// face plate glued and doweled onto the joined base's front edge,
// because the logo pocket sits centered exactly on the seam and
// splitting it would cut the wordmark in half.
// ============================================================
seam_dowel_d       = 8;   // mm, alignment dowel diameter
seam_dowel_depth   = 15;  // mm, how far the dowel sinks into EACH half (30mm dowel total)
seam_dowel_x        = [70, foot_depth - 70]; // mm, 2 dowel positions along the seam
seam_batten_x       = [60, foot_depth - 60]; // mm, 2 X positions where the batten has a bolt pair
seam_batten_y_inset = 30; // mm, each batten bolt sits this far off the seam on its own half
seam_batten_width   = 2 * seam_batten_y_inset + 30; // mm, Y span of the batten
seam_batten_length  = (seam_batten_x[1] - seam_batten_x[0]) + 40; // mm, X span of the batten
seam_batten_thickness = 13; // mm, bolt_head_recess (7.5) leaves ~5.5mm of solid wall above the counterbore

// ============================================================
// 2D helpers (mirrors case_display_stand.scad's conventions)
// ============================================================
module rounded(fillet) {
    offset(r = fillet) offset(delta = -fillet) children();
}

module rounded_rect_2d(w, d, r) {
    hull() {
        for (x = [r, w - r])
            for (y = [r, d - r])
                translate([x, y]) circle(r = r);
    }
}

module stadium_2d(w, h) {
    r = h / 2;
    hull() {
        translate([r, r]) circle(r = r);
        translate([w - r, r]) circle(r = r);
    }
}

module extrude_up(h) {
    linear_extrude(height = h) children();
}

// Local copy of case_display_stand.scad's extrude_profile_along_y():
// extrudes a (depth,height) profile along real Y instead of Z. Kept
// as our OWN module (not called cross-file) after cross-file
// children()-passing to that module produced non-deterministic,
// inconsistent geometry here (the same call reproduced with an
// identical inline copy gave different bounding boxes on different
// runs -- an OpenSCAD 2021.01 `use<>` + children() fragility, not a
// geometry bug in the math itself). See case_display_stand.scad's
// own copy for the full derivation of why this specific
// rotate+translate combination is correct.
module extrude_profile_along_y_local(width) {
    translate([0, width, 0])
        rotate([90, 0, 0])
            linear_extrude(height = width)
                children();
}

// ============================================================
// RISER (3D-printed, removable via 2x 1/4"-20 bolts into the base)
// Reuses cradle_bracket()+bracket_fin() from case_display_stand.scad
// for the actual ramp/cleat/fin shape (already rounded there), crops
// it to the compact riser footprint, and adds fresh 1/4" bolt holes
// (the M3 holes baked into that file's own ramp_riser() are for its
// now-superseded rail/joiner system, not used here).
// ============================================================
module riser() {
    difference() {
        intersection() {
            cradle_bracket();
            translate([riser_x_min, -10, -1])
                cube([riser_len, bracket_width + fin_thickness + 20, riser_peak_height + fin_height + 50]);
        }

        for (x = riser_attach_x) {
            translate([x, riser_attach_y_local, foot_thickness - bolt_head_recess])
                cylinder(h = bolt_head_recess + 0.1, d = bolt_head_d);
            translate([x, riser_attach_y_local, -0.1])
                cylinder(h = foot_thickness + 0.2, d = bolt_clearance_d);
        }
    }
}

module riser_right() {
    color(riser_color)
    translate([0, half_span, 0])
        riser();
}

module riser_left() {
    color(riser_color)
    translate([0, -half_span, 0])
        mirror([0, 1, 0])
            riser();
}

// ============================================================
// CNC BASE PLAQUE -- split into two mirrored halves, see the
// "BASE SPLIT" params above for the joinery rationale.
// ============================================================

// Half-width plan shape: square at the seam edge (Y=0, left as a
// straight mating face) and rounded only at the outer corners
// (Y=base_half_width) -- rounding the seam edge would leave a gap
// once the two halves are joined.
module base_half_2d() {
    r = base_corner_fillet;
    hull() {
        translate([0, 0]) square([0.01, 0.01]);
        translate([foot_depth - 0.01, 0]) square([0.01, 0.01]);
        translate([r, base_half_width - r]) circle(r = r);
        translate([foot_depth - r, base_half_width - r]) circle(r = r);
    }
}

// One riser's 2 mounting inserts (this half only).
module riser_insert_holes_half() {
    for (x = riser_attach_x)
        translate([x, half_span + riser_attach_y_local, base_thickness - insert_install_depth])
            cylinder(h = insert_install_depth + 0.1, d = insert_pilot_d);
}

// This half's one lid-prop bolt (offset off the seam -- see
// lid_prop_y_offset). mirror([0,1,0]) in base_left() correctly
// reproduces the second bolt at the same X, opposite Y, since
// lid_prop()'s own two bolts are a true mirror-symmetric pair too.
module lid_prop_insert_hole_half() {
    translate([lid_prop_x_center, lid_prop_y_offset, base_thickness - insert_install_depth])
        cylinder(h = insert_install_depth + 0.1, d = insert_pilot_d);
}

// 2 alignment-dowel blind holes, bored INTO this half from the Y=0
// seam face.
module seam_dowel_holes_half() {
    for (x = seam_dowel_x)
        translate([x, 0, base_thickness / 2])
            rotate([-90, 0, 0])
                cylinder(h = seam_dowel_depth + 0.1, d = seam_dowel_d);
}

// 2 threaded-insert holes (this half) for the underside splice
// batten, bored UP from the bottom face.
module seam_batten_insert_holes_half() {
    for (x = seam_batten_x)
        translate([x, seam_batten_y_inset, insert_install_depth - 0.1])
            rotate([180, 0, 0])
                cylinder(h = insert_install_depth + 0.1, d = insert_pilot_d);
}

// 1 alignment-dowel blind hole for the separate sign block, bored UP
// from this half's TOP surface (the block sits on top of the base
// near the front, not against the front edge).
module sign_block_dowel_hole_half() {
    translate([sign_block_depth / 2, sign_block_dowel_y, base_thickness - sign_block_dowel_depth])
        cylinder(h = sign_block_dowel_depth + 0.1, d = sign_block_dowel_d);
}

// This half's slice of the accent groove -- naturally clips to
// Y=[0,base_half_width] since that's this module's own valid range;
// the two halves' grooves line up visually once joined.
module accent_groove_half() {
    translate([groove_x - groove_width / 2, -1, base_thickness - groove_depth])
        cube([groove_width, base_half_width + 2, groove_depth + 0.1]);
}

// One base half (the "right" side, Y from 0 at the seam out to
// +base_half_width). Mirror for the left half, same as the risers.
module base_half() {
    color(wood_color)
    difference() {
        extrude_up(base_thickness) base_half_2d();
        riser_insert_holes_half();
        lid_prop_insert_hole_half();
        seam_dowel_holes_half();
        seam_batten_insert_holes_half();
        sign_block_dowel_hole_half();
        accent_groove_half();
    }
}

module base_right() {
    base_half();
}

module base_left() {
    mirror([0, 1, 0])
        base_half();
}

// ============================================================
// SIGN BLOCK -- compact standalone block (glued+doweled to the joined
// base, NOT split, since it sits centered on the seam) with an angled
// slot cut into it. The sign slides into the slot from the top
// surface opening and leans back at tilt_angle, matching the case.
//
// sign_p0 (world XZ, at Y=0) is the slot's surface-opening point:
// sign_p0_local translated to sit centered on the block. The slot's
// buried run goes from sign_p0 back along -dir2 by sign_tab_depth
// (into the block's solid material); a further sign_slot_open_margin
// past sign_p0 along +dir2 keeps the opening edge from being a
// razor-thin sliver. Built with centered_offset_quad_2d() -- a
// rectangle straddling the p0-p1 centerline by +/-thickness/2 along
// nrm2 -- the same dir2/nrm2 vector-arithmetic technique already
// proven for the ramp/cleat/fin, deliberately NOT rotate(), since
// every rotate() used for orienting flat 2D content onto a tilted
// plane elsewhere in this project needed real debugging to get the
// sign right (see the "hard-won implementation notes" in README.md).
// ============================================================
// The block/panel's own local X and Z are never translated when
// placed (only Y, to center the block -- see sign_block()), so
// sign_p0_local IS the XZ position to build everything from directly.
sign_p0 = sign_p0_local;

module centered_offset_quad_2d(p0, p1, thickness) {
    polygon(points = [
        p0 - nrm2 * thickness / 2,
        p1 - nrm2 * thickness / 2,
        p1 + nrm2 * thickness / 2,
        p0 + nrm2 * thickness / 2,
    ]);
}

module sign_slot_2d() {
    slot_p0 = sign_p0 - dir2 * sign_tab_depth;
    slot_p1 = sign_p0 + dir2 * sign_slot_open_margin;
    centered_offset_quad_2d(slot_p0, slot_p1, sign_slot_thickness);
}

module sign_block_2d() {
    rounded_rect_2d(sign_block_depth, sign_block_width, sign_block_fillet);
}

module sign_block() {
    color(wood_color)
    translate([0, -sign_block_width / 2, 0])
    difference() {
        extrude_up(sign_block_height) sign_block_2d();
        extrude_profile_along_y_local(sign_block_width) sign_slot_2d();
        for (y = [sign_block_width / 2 - sign_block_dowel_y, sign_block_width / 2 + sign_block_dowel_y])
            translate([sign_block_depth / 2, y, -0.1])
                cylinder(h = sign_block_dowel_depth + 0.1, d = sign_block_dowel_d);
    }
}

// Underside splice: bolts the two base halves together across the
// center seam with 4x 1/4"-20 bolts (2 per half) into the threaded
// inserts bored by seam_batten_insert_holes_half(). Removable, like
// the risers and lid prop -- the base itself packs flat for shipping
// too, not just what bolts onto it.
// Local Z=0 is the OUTWARD (bottom, bolt-head-accessible) face; local
// Z=seam_batten_thickness is the face that presses up against the
// base's underside. Bolts go in from below (counterbore at Z=0) and
// thread up into the base's inserts.
module joiner_batten() {
    color(riser_color)
    translate([seam_batten_x[0] - 20, -seam_batten_width / 2, 0])
    difference() {
        extrude_up(seam_batten_thickness)
            rounded_rect_2d(seam_batten_length, seam_batten_width, 6);

        for (x = seam_batten_x)
            for (y = [seam_batten_y_inset, -seam_batten_y_inset]) {
                translate([x - (seam_batten_x[0] - 20), y + seam_batten_width / 2, -0.1])
                    cylinder(h = bolt_head_recess + 0.1, d = bolt_head_d);
                translate([x - (seam_batten_x[0] - 20), y + seam_batten_width / 2, bolt_head_recess - 0.1])
                    cylinder(h = seam_batten_thickness - bolt_head_recess + 0.2, d = bolt_clearance_d);
            }
    }
}

// 2 loose alignment dowels, 30mm x 8mm -- generic hardware-store dowel
// pins, not a printed part; listed here only so the geometry (and
// therefore the correct length) is documented in one place.
module seam_dowel_reference() {
    color([0.8, 0.6, 0.3])
    cylinder(h = 2 * seam_dowel_depth, d = seam_dowel_d, center = true);
}

// ============================================================
// LID PROP (3D-printed, removable via 2x 1/4"-20 bolts into the base)
// A rounded post with three stepped notch heights -- test-fit against
// the real case and use the notch that holds the lid open at a safe,
// comfortable angle; the unused notches are harmless.
// ============================================================
module lid_prop_post_2d() {
    rounded_rect_2d(lid_prop_post_t, lid_prop_post_w, lid_prop_fillet);
}

module lid_prop() {
    color(riser_color)
    translate([lid_prop_x_center - lid_prop_post_t / 2, -lid_prop_post_w / 2, 0])
    difference() {
        union() {
            extrude_up(foot_thickness) lid_prop_post_2d();
            translate([0, 0, foot_thickness])
                extrude_up(max(lid_prop_notch_heights) + lid_prop_notch_depth)
                    lid_prop_post_2d();
        }

        // three stepped notches on the rear face, shortest reachable
        // first -- each is a simple rounded cradle a bolted-on lid
        // edge can rest in
        for (h = lid_prop_notch_heights)
            translate([lid_prop_post_t - lid_prop_notch_depth, lid_prop_post_w * 0.15, foot_thickness + h])
                rotate([-90, 0, 0])
                    linear_extrude(height = lid_prop_post_w * 0.7)
                        rounded(4) square([lid_prop_notch_depth + 1, 14], center = false);

        // 2 bolt holes, a mirror-symmetric pair at +/-lid_prop_y_offset
        // off the post's own centerline (local Y = post_w/2) -- matches
        // lid_prop_insert_hole_half()'s single hole plus base_left()'s
        // mirror() exactly, so neither bolt lands on the base's center
        // seam. LOCAL coordinates (this module is already translated
        // to lid_prop_x_center - post_t/2).
        for (dy = [-lid_prop_y_offset, lid_prop_y_offset]) {
            translate([lid_prop_post_t / 2, lid_prop_post_w / 2 + dy, foot_thickness - bolt_head_recess])
                cylinder(h = bolt_head_recess + 0.1, d = bolt_head_d);
            translate([lid_prop_post_t / 2, lid_prop_post_w / 2 + dy, -0.1])
                cylinder(h = foot_thickness + 0.2, d = bolt_clearance_d);
        }
    }
}

// ============================================================
// SIGN PANEL — single two-color print (blank tab + pill background in
// yellow, raised letters in navy), two STL exports at the SAME
// position for AMS multi-color slicing as one print job / one
// physical part. Slides into sign_block()'s slot and leans back at
// tilt_angle, held by friction/depth rather than glue.
// ============================================================

// Blank tab (buried in the slot) + pill background (exposed above the
// block), one continuous constant-thickness slab. Built with the same
// dir2/nrm2 point-arithmetic + extrude_profile_along_y_local()
// technique already proven for the ramp/cleat/fin -- no rotate()
// needed for this part, since it's just a flat rectangle in the
// dir2-nrm2 plane, not a shape that needs re-orienting from a
// different native plane the way the letters do below.
module sign_panel_base_2d() {
    p_bottom = sign_p0 - dir2 * sign_tab_depth;
    p_top = sign_p0 + dir2 * pill_h;
    rounded(sign_panel_fillet)
        centered_offset_quad_2d(p_bottom, p_top, sign_panel_t);
}

module sign_panel_base() {
    color(andworx_yellow)
    translate([0, -pill_w / 2, 0])
        extrude_profile_along_y_local(pill_w)
            sign_panel_base_2d();
}

// Raised letters, placed with an EXPLICIT transform matrix built
// directly from the already-trusted dir2/nrm2 vectors, rather than a
// chained rotate()+mirror() guess-and-check (the approach used -- and
// twice miscorrected -- for the old vertical fascia; see the
// "hard-won implementation notes" in README.md). The map is:
//   world_X = sign_p0.x + dir2.x*ty + nrm2.x*tz
//   world_Y = tx                      (word is already zero-centered)
//   world_Z = sign_p0.y + dir2.y*ty + nrm2.y*tz
// dir2 and nrm2 are an orthonormal pair with the 2x2 [dir2;nrm2]
// determinant = +1 (verified: cos^2(45)+sin^2(45)=1), and the Y row
// passes tx through unchanged, so the full 3x3 linear part is a
// proper rotation -- no reflection, so no unwanted letter-mirroring
// is possible by construction, unlike the rotate()-chain approach.
// The translation column adds pill_h/2 along dir2 (centers the word
// vertically within the exposed pill area, matching the old design's
// pill_h/2 offset) and sign_panel_t/2 along nrm2 (starts the letters
// flush with the panel's own front face, so they rise OUT of it
// rather than starting buried inside it).
module sign_letters() {
    // Starts overlap_eps BEHIND the panel's front face (tz=0 would sit
    // exactly coincident with it) so the union is a true volumetric
    // overlap, not a merely coincident face -- without this, the
    // combined sign_panel_assembly() exported as 9 disconnected
    // bodies despite each piece being individually correct and
    // dimensionally matching hand-calculated expectations. Likely
    // floating-point precision in the multmatrix's cos(45)/sin(45)
    // terms failing to land the two faces at bit-identical
    // coordinates, unlike the old design's plain axis-aligned
    // linear_extrude(), which fused fine without needing this.
    origin = sign_p0 + dir2 * (pill_h / 2) + nrm2 * (sign_panel_t / 2 - overlap_eps);
    M = [
        [0, dir2[0], nrm2[0], origin[0]],
        [1, 0,       0,       0],
        [0, dir2[1], nrm2[1], origin[1]],
        [0, 0,       0,       1],
    ];
    // mirror([0,1,0]) on the source 2D word: verified empirically (not
    // just the determinant argument above, which only rules out the
    // multmatrix itself introducing a reflection -- it says nothing
    // about which direction the word's own ty axis needs to run to
    // match this matrix's ty->+dir2 convention). Without it, letters
    // rendered upside-down (individually flipped top-to-bottom) while
    // the left-to-right word ORDER was already correct, isolating it
    // to a ty-direction mismatch rather than the tx/order mapping.
    color(andworx_navy)
    multmatrix(M)
        linear_extrude(height = sign_letter_relief + overlap_eps)
            scale([logo_scale, logo_scale, 1])
                mirror([0, 1, 0])
                    andworx_word_2d();
}

module sign_panel_assembly() {
    sign_panel_base();
    sign_letters();
}

// ============================================================
// FULL ASSEMBLY (preview only)
// ============================================================
module case_ghost_mockup() {
    translate([0, 0, base_thickness])
        case_ghost();
}

module full_assembly() {
    base_right();
    base_left();
    translate([0, 0, base_thickness])
        sign_block();
    translate([0, 0, -seam_batten_thickness])
        joiner_batten();
    riser_right();
    riser_left();
    lid_prop();
    translate([0, 0, base_thickness])
        sign_panel_assembly();
    if (show_ghost) case_ghost_mockup();
}

// ============================================================
// PART SELECTOR
// ============================================================
if (part == "riser_right") {
    riser_right();
} else if (part == "riser_left") {
    riser_left();
} else if (part == "base_right") {
    base_right();
} else if (part == "base_left") {
    base_left();
} else if (part == "sign_block") {
    sign_block();
} else if (part == "joiner_batten") {
    joiner_batten();
} else if (part == "lid_prop") {
    lid_prop();
} else if (part == "sign_panel_base") {
    sign_panel_base();
} else if (part == "sign_panel_letters") {
    sign_letters();
} else if (part == "coupon_cleat") {
    // riser() stays in the same (uncropped) X frame as cradle_bracket()
    // -- its own footprint runs riser_x_min..riser_x_max, NOT 0..riser_len
    // -- so this box is centered on front_margin (the toe), not on 0.
    intersection() {
        riser();
        translate([front_margin - 25, -5, -1])
            cube([50, bracket_width + 10, 200]);
    }
} else {
    full_assembly();
}
