// ============================================================
// APACHE 2800 CASE — 45-DEGREE DISPLAY STAND
//
// New presentation accessory. NOT part of the chassis production
// release (RP08) and NOT governed by the RPNN release workflow in
// MODELING_GIT_PLAN.md — that process is scoped to the electronics
// chassis. This stand cradles the OUTSIDE of the case, so it is
// independent of chassis revisions.
//
// Purpose: prop the case up at a comfortable interaction angle for a
// demo/presentation, with a hard mechanical stop (not just friction)
// so it cannot slide or tip while someone is pressing the touchscreen
// or switches on the control panel.
//
// Follows this project's MEASURE_BEFORE_PRINT convention: every
// parameter tagged below is a catalogue/reference value, not a
// physical measurement of the actual case. Confirm each one against
// the real, empty APACHE 2800 case before printing full-size parts.
// See display-stand/README.md for the verification checklist and
// print-splitting rationale.
// ============================================================

// ---------- PART SELECTOR ----------
// One of: "preview_assembly", "base_foot_right", "base_foot_left",
// "riser_right", "riser_left", "center_joiner", "coupon_cleat"
//
// Each end cradle prints as TWO parts (a flat wide "base_foot" plus a
// tall narrow "riser") instead of one large tall+wide bracket. The
// X1 Carbon is a CoreXY printer: its gantry needs clearance near the
// build-plate corners, so the *usable* footprint shrinks for taller
// prints. A single-piece bracket (236.9 x 221.5mm footprint, 128.6mm
// tall) was both near-full-bed-width AND tall at the same time, which
// Bambu Studio flagged. Splitting decouples the two: base_foot is
// wide but only foot_thickness tall (safe anywhere on the bed), and
// riser is tall but narrow (safe because its footprint is small), and
// they screw together after printing.
part = "preview_assembly";
show_ghost = true; // set false via -D 'show_ghost=false' for a structure-only preview

// ---------- CASE REFERENCE DIMENSIONS: MEASURE_BEFORE_PRINT ----------
// Source: 3d Models/apache case/DESIGN_DOCUMENT.md, "Case catalogue
// exterior" row (manufacturer listing, reference only).
case_width         = 419.1;  // MEASURE_BEFORE_PRINT: exterior width, left-right
case_depth         = 330.2;  // MEASURE_BEFORE_PRINT: exterior depth, front-back (closed)
case_height        = 171.45; // MEASURE_BEFORE_PRINT: exterior height, closed (reference only, not load-bearing here)
case_corner_radius = 24.0;   // reuses production chassis corner_radius as a conservative stand-in; verify on the real case

// ---------- DISPLAY ANGLE ----------
tilt_angle = 45; // degrees from horizontal; angle of the case bottom face / control panel

// ---------- CRADLE (per end bracket) ----------
ramp_slope_len  = 130; // mm, length of case-bearing ramp surface, measured along the incline
front_margin    = 55;  // mm, flat foot ahead of the ramp toe (carries the cleat, resists forward tip)
rear_margin     = 90;  // mm, flat foot behind the ramp peak (resists backward tip); sized so the case's own center of mass (cantilevered above the ramp's peak) still projects well inside this footprint -- see the cog_margin assert below
bracket_width   = 42;  // mm, Y-thickness of each end bracket's structural body
foot_thickness  = 14;  // mm, base slab / rail thickness
cleat_height    = 18;  // mm, positive stop above the ramp surface at the toe
cleat_reach_back  = 10; // mm, cleat footprint extending behind the toe (up-slope) for anchoring
cleat_reach_front = 15; // mm, cleat footprint extending past the toe (down-slope), the actual catch
fin_height      = 35;  // mm, outboard side-fin height above the ramp surface
fin_thickness   = 6;   // mm, outboard side-fin wall thickness

riser_fillet = 4; // mm, rounds convex edges of the ramp/cleat/fin profile (peak apex, cleat corners, fin top corners) -- no exposed sharp corners people can bump into at a booth

inset_from_corner = case_corner_radius + 12; // mm, keeps each bracket clear of the case's rounded corner

overlap_eps = 0.2; // mm, forces true volumetric overlap at part-to-part seams (fin/rail to main body) so unions are watertight instead of merely face-coincident

// ---------- CONNECTING RAIL + CENTER SPLICE ----------
// Ties the two end brackets to a fixed case_width spacing so they
// cannot creep apart or let the case slide out sideways.
joiner_plate_thickness = 6.0;   // mm
joiner_plate_half_width = 22.0; // mm, plate extends this far each side of the seam (world Y)
joiner_screw_d   = 3.4;  // mm, M3 clearance hole through the plate
insert_pilot_d   = 4.0;  // mm, heat-set insert pilot (matches production heatset_insert_diameter)
insert_depth     = 6.0;  // mm, heat-set insert seating depth (slightly deeper than the 5.5mm production value for extra hold in a thicker rail)
insert_edge_margin = 15; // mm, insert position measured in from the center seam
insert_x_margin  = 40;   // mm, insert position measured in from each end of the rail run

// ---------- BASE_FOOT / RISER SPLIT ----------
riser_margin = 20; // mm, riser footprint extends this far beyond the wedge (toe/peak) on each side -- keeps it compact for corner clearance while giving room for its attachment flange
riser_insert_inset = 12; // mm, riser attachment inserts sit this far in from each end of the riser's flange
riser_insert_depth = 6.0; // mm, matches insert_depth

// ---------- DERIVED ----------
hr = ramp_slope_len * cos(tilt_angle);              // horizontal run of the ramp
vr = ramp_slope_len * sin(tilt_angle);               // vertical rise of the ramp
foot_depth = front_margin + hr + rear_margin;        // total X footprint of one bracket+foot
stand_span = case_width - 2 * inset_from_corner;     // world-Y distance between the two brackets' inboard faces
half_span  = stand_span / 2;                         // rail run from center seam to each bracket

dir2 = [cos(tilt_angle), sin(tilt_angle)];           // unit vector up-slope, in XZ
nrm2 = [-sin(tilt_angle), cos(tilt_angle)];          // unit vector, ramp surface outward normal, in XZ
toe  = [front_margin, foot_thickness];               // ramp toe point, in XZ
peak = [front_margin + hr, foot_thickness + vr];     // ramp peak point, in XZ

riser_x_min = max(0, front_margin - riser_margin);
riser_x_max = min(foot_depth, front_margin + hr + riser_margin);
riser_len = riser_x_max - riser_x_min;
riser_peak_height = foot_thickness + vr; // riser's own tallest point, for build-volume checks

echo(str("foot_depth = ", foot_depth, " mm"));
echo(str("bracket peak height = ", foot_thickness + vr, " mm"));
echo(str("stand_span (case-facing) = ", stand_span, " mm"));
echo(str("half_span (rail run) = ", half_span, " mm"));
echo(str("riser footprint = ", riser_len, " x ", bracket_width + fin_thickness, " mm, height = ", riser_peak_height + fin_height, " mm"));

// Safety check: the case's own center of mass (taken at the mid-point
// of its depth, a conservative simplification since real hardware is
// front-loaded toward the control panel) must project down well
// inside the stand's table footprint, or the assembly can tip
// backward off the stand under its own weight. The case's
// front-bottom edge is anchored at the cleat/toe (see case_ghost()),
// so its CoG sits toe-slope-distance = case_depth/2 up the incline.
cog_x_from_front = front_margin + (case_depth / 2) * cos(tilt_angle);
cog_margin = foot_depth - cog_x_from_front;
echo(str("case CoG horizontal position from stand front = ", cog_x_from_front, " mm (stand foot_depth = ", foot_depth, " mm, margin = ", cog_margin, " mm)"));
assert(cog_margin > 20,
    "Case center of mass projects too close to (or behind) the stand's rear foot edge -- increase rear_margin or ramp_slope_len for tip-back safety margin.");

$fn = $preview ? 32 : 64;

// ============================================================
// 2D helpers
// ============================================================

// Quad standing "up" off a slope segment p0->p1, by height h along nrm2.
module offset_quad_2d(p0, p1, h) {
    polygon(points = [p0, p1, p1 + nrm2 * h, p0 + nrm2 * h]);
}

// Rounds only the CONVEX corners of a 2D shape (erode then dilate by
// the same radius) -- concave/reflex corners are left as-is, which is
// fine since those are interior notches, not the corners someone
// could actually bump against.
module rounded(fillet) {
    offset(r = fillet) offset(delta = -fillet) children();
}

// linear_extrude() always extrudes a 2D profile along Z, but every 2D
// profile in this file is authored as (depth, height) -- i.e. meant
// to be read as the XZ plane, extruded along Y (the bracket-width
// direction), to line up with the plain cube()-based rail/joiner
// geometry (which use real X/Y/Z directly). This wrapper does that
// correctly: rotate([90,0,0]) swaps the extrude axis (Z) and the
// profile's height axis (Y) but also negates one of them, so the
// following translate brings the part back to occupying world Y in
// [0, width], with world Z carrying the (correctly signed, positive
// up) profile height. Every profile extrusion in this file must go
// through this module, never linear_extrude() directly, or its
// geometry will be 90 degrees out of alignment with the rail/joiner
// parts and unions will silently fail to fuse.
module extrude_profile_along_y(width) {
    translate([0, width, 0])
        rotate([90, 0, 0])
            linear_extrude(height = width)
                children();
}

module bracket_base_ramp_2d() {
    polygon(points = [
        [0, 0],
        [foot_depth, 0],
        [foot_depth, foot_thickness],
        [front_margin + hr, foot_thickness],
        peak,
        toe,
        [0, foot_thickness],
    ]);
}

// Flat slab only, no wedge -- the full-length base_foot uses this
// instead of bracket_base_ramp_2d() so it stays low-profile along its
// whole length (the wedge lives on the separate riser part instead).
module base_slab_2d() {
    polygon(points = [
        [0, 0],
        [foot_depth, 0],
        [foot_depth, foot_thickness],
        [0, foot_thickness],
    ]);
}

// ============================================================
// 3D pieces
// ============================================================

// One end cradle: base slab + ramp wedge + cleat + outboard fin.
// Local frame: X = depth [0..foot_depth], Y = width [0..bracket_width]
// (fin sits further out at Y > bracket_width), Z = up. Origin is the
// bracket's front-bottom-inboard corner, sitting on the table.
module cradle_bracket() {
    // base slab + ramp wedge. Rounded (peak apex, toe-area corners) --
    // the fillet is applied to the whole profile, but riser_x_min/max
    // crop away the far corners (at X=0 and X=foot_depth) that aren't
    // part of the final riser anyway, so only the surviving peak/toe
    // corners matter in practice.
    extrude_profile_along_y(bracket_width)
        rounded(riser_fillet)
            bracket_base_ramp_2d();

    // positive stop at the ramp toe. Recessed overlap_eps into the
    // ramp solid (along -nrm2) so its base is a true volumetric
    // overlap with the wedge, not just a coincident edge. Rounded on
    // its exposed (non-embedded) corners.
    cleat_p0 = toe - dir2 * cleat_reach_back - nrm2 * overlap_eps;
    cleat_p1 = toe + dir2 * cleat_reach_front - nrm2 * overlap_eps;
    extrude_profile_along_y(bracket_width)
        rounded(riser_fillet)
            offset_quad_2d(cleat_p0, cleat_p1, cleat_height + overlap_eps);

    bracket_fin();
}

// Outboard side fin along the ramp, keeps the case from sliding
// sideways off the cradle. Recessed overlap_eps into the ramp solid
// (along -nrm2, into the wedge, and along Y, into the main body) so
// the union is a true volumetric merge, not just coincident
// faces/edges. The peak-side end is also pulled back along -dir2 by
// fin_end_inset: offsetting a point sitting exactly at the peak
// VERTEX along -nrm2 exits the wedge through its adjacent vertical
// edge (a convex-corner offset issue), so the fin footprint must stay
// strictly inside the hypotenuse edge, clear of both vertices.
module bracket_fin() {
    fin_end_inset = 3;
    translate([0, bracket_width - overlap_eps, 0])
        extrude_profile_along_y(fin_thickness + overlap_eps)
            rounded(riser_fillet)
                offset_quad_2d(
                    toe - nrm2 * overlap_eps,
                    peak - dir2 * fin_end_inset - nrm2 * overlap_eps,
                    fin_height + overlap_eps
                );
}

// X positions (in the base_foot/riser shared frame) for the 2 screws
// that attach the riser's flange to the base_foot, spaced across the
// riser's own footprint for resistance to the tipping/peeling moment
// the loaded case applies through the cleat.
riser_attach_x = [riser_x_min + riser_insert_inset, riser_x_max - riser_insert_inset];

// Flat, full-length foot: base_slab_2d (no wedge -- stays low-profile
// its whole length) + the rail run to the center seam, with insert
// pilot holes for both the center_joiner splice and the riser
// attachment screws. This is the "wide but short" half of the
// base_foot/riser split described at the part selector above.
module base_foot_with_inserts() {
    difference() {
        union() {
            extrude_profile_along_y(bracket_width)
                base_slab_2d();
            translate([0, -half_span, 0])
                cube([foot_depth, half_span + overlap_eps, foot_thickness]);
        }

        for (x = [insert_x_margin, foot_depth - insert_x_margin])
            translate([x, -half_span + insert_edge_margin, foot_thickness - insert_depth])
                cylinder(h = insert_depth + 0.1, d = insert_pilot_d);

        for (x = riser_attach_x)
            translate([x, bracket_width / 2, foot_thickness - riser_insert_depth])
                cylinder(h = riser_insert_depth + 0.1, d = insert_pilot_d);
    }
}

// Tall, narrow riser: ramp wedge + cleat + fin, cropped to a compact
// footprint (riser_x_min..riser_x_max) instead of running the full
// foot_depth, plus clearance holes matching riser_attach_x so it
// screws down onto the base_foot's inserts. Extracted from
// cradle_bracket() via intersection() rather than re-deriving the
// wedge/cleat/fin geometry a second time.
module ramp_riser() {
    difference() {
        intersection() {
            cradle_bracket();
            translate([riser_x_min, -10, -1])
                cube([riser_len, bracket_width + fin_thickness + 20, riser_peak_height + fin_height + 50]);
        }

        for (x = riser_attach_x)
            translate([x, bracket_width / 2, -0.1])
                cylinder(h = foot_thickness, d = joiner_screw_d);
    }
}

module stand_half() {
    base_foot_with_inserts();
    ramp_riser();
}

module stand_right() {
    translate([0, half_span, 0])
        stand_half();
}

module stand_left() {
    translate([0, -half_span, 0])
        mirror([0, 1, 0])
            stand_half();
}

module center_joiner() {
    difference() {
        translate([insert_x_margin - 15, -joiner_plate_half_width, foot_thickness])
            cube([
                (foot_depth - insert_x_margin) - (insert_x_margin - 15),
                joiner_plate_half_width * 2,
                joiner_plate_thickness,
            ]);

        for (x = [insert_x_margin, foot_depth - insert_x_margin])
            for (y = [insert_edge_margin, -insert_edge_margin])
                translate([x, y, foot_thickness - 0.1])
                    cylinder(h = joiner_plate_thickness + 0.2, d = joiner_screw_d);
    }
}

// Reference-only ghost of the case, resting on the two ramp surfaces,
// for visual verification. Not a printable part. Built with the same
// dir2/nrm2 vector math as the cleat and fin (not OpenSCAD rotate())
// so it is guaranteed to sit parallel to the ramp surface.
//
// The case's front-bottom edge is anchored at the cleat/toe (p0 =
// toe): the whole case overhangs only toward the BACK, cantilevered
// up and away from the table, which is safe. Anchoring it at the
// ramp's midpoint instead (an earlier version of this file) let the
// front corner project below table height -- a collision with the
// table, not a real support condition.
module case_ghost() {
    ghost_len = case_depth;
    ghost_h = 20; // nominal wall thickness shown, just for visual weight
    p0 = toe;
    p1 = toe + dir2 * ghost_len;
    color([0.2, 0.6, 0.9, 0.35])
        translate([0, -case_width / 2, 0])
            extrude_profile_along_y(case_width)
                offset_quad_2d(p0, p1, ghost_h);
}

// ============================================================
// PART SELECTOR
// ============================================================
if (part == "base_foot_right") {
    translate([0, half_span, 0])
        base_foot_with_inserts();
} else if (part == "base_foot_left") {
    translate([0, -half_span, 0])
        mirror([0, 1, 0])
            base_foot_with_inserts();
} else if (part == "riser_right") {
    translate([0, half_span, 0])
        ramp_riser();
} else if (part == "riser_left") {
    translate([0, -half_span, 0])
        mirror([0, 1, 0])
            ramp_riser();
} else if (part == "center_joiner") {
    center_joiner();
} else if (part == "coupon_cleat") {
    // Small printable coupon: just the toe/cleat region, to test-fit
    // the case's bottom-front edge before committing to a full print.
    intersection() {
        cradle_bracket();
        translate([max(0, front_margin - 25), -5, -1])
            cube([50, bracket_width + 10, 200]);
    }
} else {
    // preview_assembly: full stand + case ghost, for visual review only
    stand_right();
    stand_left();
    center_joiner(); // already computed in world-aligned coordinates
    if (show_ghost) case_ghost();
}
