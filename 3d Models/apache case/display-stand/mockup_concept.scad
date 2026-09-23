// ============================================================
// CONCEPT MOCKUP — CNC base + 3D-printed riser + inlaid logo
//
// NOT a production file. Purpose: show the mixed-material look
// (CNC-cut wood/hardboard base, 3D-printed riser, painted inlay
// letters) before building the real parts. Reuses the real riser
// geometry from case_display_stand.scad via use<> so proportions are
// accurate; the base/fascia/logo here are new sketch geometry only,
// not yet split into CNC toolpaths or real letter parts.
//
// Colors from Andworx-Brand-Guidelines-One-Pager.pdf: navy #2A3380
// (primary logo color) and yellow #F3EB4A, used together as one of
// the guide's approved "background variations" (yellow background,
// navy text) -- chosen here over the plain navy-on-white standard
// mark because it's the higher-contrast, more eye-catching option the
// guide itself sanctions, matching the "make it pop" goal.
//
// Letters: the REAL Andworx wordmark, extracted from the vector logo
// file the user supplied (AndworxLogo_Blue1.svg) into
// logo_letters/andworx_letters.scad as plain OpenSCAD polygons (one
// module per glyph, holes and the stylized double-chevron X included)
// -- see that file's header for the extraction method. This replaced
// an earlier Poppins Bold text() placeholder used before the vector
// file was available.
// ============================================================

use <case_display_stand.scad>
use <logo_letters/andworx_letters.scad>

// ---------- reuse the real stand's key numbers for accuracy ----------
// (kept in sync by hand for this mockup; case_display_stand.scad
// remains the source of truth for the actual riser/cleat/fin geometry)
foot_depth_mock = 236.924;
half_span_mock  = 173.55;
bracket_width_mock = 42;
fin_thickness_mock = 6;

// ---------- base plaque (CNC) ----------
base_thickness = 20;     // mm, CNC stock thickness (e.g. 3/4in hardwood/plywood)
base_half_width = half_span_mock + bracket_width_mock + fin_thickness_mock + 10; // mm, a little wider than the risers for a clean edge margin
corner_fillet = 10;      // mm, CNC-router roundover on the plaque's outer corners

// ---------- front nameplate fascia ----------
fascia_height = 46;      // mm, stands proud above the base top
fascia_thickness = 14;   // mm, front-to-back
pocket_depth = 2.2;      // mm, routed recess for the inlaid letters
pocket_margin_y = 24;    // mm, blank margin each side of the text inside the fascia
pocket_margin_z = 8;     // mm, blank margin above/below the text inside the fascia

logo_cap_height = 24;      // mm, target letter cap height
logo_raw_cap_height = 134.3; // mm, A's cap height in the extracted vector data (the scale reference)
logo_raw_word_width = 1040.4; // mm, full "ANDWORX" bbox width in the extracted vector data
logo_scale = logo_cap_height / logo_raw_cap_height;
letter_thickness = 4;    // mm, individual letter piece thickness
letter_proud = 0.6;      // mm, how far the painted letters sit proud of the recess floor

// Andworx brand colors (Andworx-Brand-Guidelines-One-Pager.pdf)
andworx_navy   = [42, 51, 128] / 255;  // #2A3380
andworx_cyan   = [122, 211, 225] / 255; // #7AD3E1
andworx_purple = [123, 83, 218] / 255;  // #7B53DA
andworx_yellow = [243, 235, 74] / 255;  // #F3EB4A

pill_pad_x = 14; // mm, yellow pill padding around the text, left/right
pill_pad_y = 9;  // mm, yellow pill padding around the text, top/bottom

$fn = 48;

module rounded_plate_2d(w, d, r) {
    hull() {
        for (x = [r, w - r])
            for (y = [r, d - r])
                translate([x, y]) circle(r = r);
    }
}

// Full-width CNC base: one piece, spans under both risers plus the
// front fascia nameplate. Replaces the two separate 3D-printed rails
// from the earlier revision -- CNC beds aren't limited to a 256mm
// build volume, so there's no need to split this.
module base_plaque() {
    color([0.42, 0.27, 0.16]) // walnut-ish
    translate([0, -base_half_width, 0])
        linear_extrude(height = base_thickness)
            rounded_plate_2d(foot_depth_mock, base_half_width * 2, corner_fillet);
}

module fascia_blank() {
    translate([-fascia_thickness, -base_half_width, 0])
        cube([fascia_thickness, base_half_width * 2, base_thickness + fascia_height]);
}

// Exact word width from the real vector letters (not an estimate).
logo_text_w = logo_raw_word_width * logo_scale;

module logo_pill_2d() {
    pill_w = logo_text_w + 2 * pill_pad_x;
    pill_h = logo_cap_height + 2 * pill_pad_y;
    hull() {
        translate([-pill_w / 2 + pill_h / 2, 0]) circle(d = pill_h);
        translate([pill_w / 2 - pill_h / 2, 0]) circle(d = pill_h);
    }
}

module logo_pocket() {
    pocket_w = base_half_width * 2 - 2 * pocket_margin_y;
    pocket_h = fascia_height - 2 * pocket_margin_z;
    translate([-fascia_thickness - 1, -pocket_w / 2, base_thickness + pocket_margin_z])
        cube([pocket_depth + 1, pocket_w, pocket_h]);
}

// Fascia is molded/machined from the same stock as the base plaque
// (kept a neutral wood tone) with a shallow recess routed for the
// yellow pill background -- one of the brand guide's approved
// "background variations" (yellow pill, navy text), chosen for
// contrast against the wood.
module fascia_with_pocket() {
    color([0.42, 0.27, 0.16])
    difference() {
        fascia_blank();
        logo_pocket();
    }
}

// Yellow pill inlay, recessed flush into the fascia pocket.
module logo_pill_inlay() {
    color(andworx_yellow)
    translate([-fascia_thickness + pocket_depth - 1.5, 0, base_thickness + fascia_height / 2])
        rotate([90, 0, 90])
            linear_extrude(height = 1.5 + pocket_depth)
                logo_pill_2d();
}

// Individual inlaid letters, painted navy (brand primary), traced
// from the real vector logo -- modeled here as one colored group for
// the mockup; the real version exports each glyph as its own small
// part to laser-cut/CNC/print and paint separately.
module logo_letters() {
    // mirror([0,1,0]) pre-compensates for the rotate below. Verified
    // empirically (not just derived) back when this used text():
    // without any mirror, "ANDWORX" rendered with each glyph flipped
    // top-to-bottom but in the correct left-to-right order (W
    // appeared as M -- W and M are vertical mirrors of each other,
    // which pinned this down as a vertical flip, not the horizontal
    // one a first guess would assume). Mirroring vertically before
    // extrusion cancels that flip without disturbing left-right
    // glyph order. Applies identically to any flat 2D shape run
    // through this transform chain, so it still applies now that the
    // 2D shape is the real vector wordmark instead of text().
    color(andworx_navy)
    translate([-fascia_thickness + pocket_depth - letter_thickness + letter_proud, 0, base_thickness + fascia_height / 2])
        rotate([90, 0, 90])
            linear_extrude(height = letter_thickness)
                mirror([0, 1, 0])
                    scale([logo_scale, logo_scale, 1])
                        andworx_word_2d();
}

module riser_pair_mockup() {
    color([0.08, 0.08, 0.09]) // matte black PETG placeholder
    translate([0, half_span_mock, base_thickness])
        ramp_riser();
    color([0.08, 0.08, 0.09])
    translate([0, -half_span_mock, base_thickness])
        mirror([0, 1, 0])
            ramp_riser();
}

module case_ghost_mockup() {
    // reuse the production file's case dimensions/toe math by calling
    // its case_ghost(), lifted by base_thickness to sit on the risers
    // now that they're raised off the table by the CNC base.
    translate([0, 0, base_thickness])
        case_ghost();
}

debug_mode = "full"; // "full" | "logo_only"

if (debug_mode == "logo_only") {
    logo_pill_inlay();
    logo_letters();
} else {
    base_plaque();
    fascia_with_pocket();
    logo_pill_inlay();
    logo_letters();
    riser_pair_mockup();
    if ($preview) case_ghost_mockup();
}
