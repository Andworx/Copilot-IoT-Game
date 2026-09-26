# RP09 lid-storage calibration

This is a fit-first prototype for an **Andworx Field Kit** cassette in the
APACHE 2800 lid. It is calibration work, not approved RP09 production geometry.

## Recorded measurements

- M3 lid-boss pitch: approximately 274 x 200 mm.
- Clear area between the major ribs: approximately 255 x 183 mm.
- Lid depth: approximately 35 mm.
- Adapter length: approximately 45 mm.
- Key length: approximately 34 mm.
- Cable length: 152.4 mm (6 in).

Because the 274 mm boss spacing exceeds the 256 mm printer envelope, the fit
frame is split into left and right halves. Each half is about 145 x 216 mm and
fits the configured Bambu Lab X1 Carbon bed.

## Print first

Print these three low-material fit parts initially:

1. `exports/lid_fit_frame_L.stl`
2. `exports/lid_fit_frame_R.stl`
3. Two or three copies of `exports/switch_locator_tile.stl`

Use the same PETG profile planned for the final holder. Install the four M3
heat-set inserts with a temperature and depth stop appropriate for the selected
insert. Allow the case bosses to cool completely before fastening the frame.
Use M3 pan/button screws only long enough to fully engage the insert; confirm
the screw cannot bottom in or penetrate the moulded lid.

The two frame halves meet at round alignment tongues. This seam is only an
alignment feature: the four case screws carry the prototype.

## Fit and switch-location test

1. Confirm the left and right frame halves align with all four lid bosses
   without bending, spreading, or forcing either half.
2. Confirm the rails remain inside the gasket and do not rest on the raised
   moulded ribs.
3. Cover the face of each locator tile with painter's tape and a 2-3 mm layer
   of soft modelling clay, removable putty, or low-density foam.
4. Temporarily tape the tiles to the lid floor in the expected safety-switch
   area. Keep the printed face toward the lid and the soft witness material
   toward the controls.
5. Close the lid **gently by hand without latching it**. Stop immediately if
   hard resistance is felt; never use the latch to force the lid over a tile.
6. Open the lid and record the witness position relative to the tile's 10 mm
   grid and to the nearest boss. Repeat until the full two-switch envelope is
   mapped.
7. Also measure the deepest uncompressed witness. The final cassette must leave
   3-5 mm beyond that control envelope.

Report the measured boss pitch if either frame half misses a hole, and provide
a straight-on photograph of the installed frame plus the marked locator tiles.

## Printable storage prototype

After the two fit-frame halves align, print:

1. `exports/lid_storage_frame_L.stl` — the left perimeter, open switch garage,
   two seam tongues, and four design-plate mounting bosses.
2. `exports/lid_storage_carrier_R.stl` — the right frame half with a 34 mm
   total carrier well. The original 21 mm cavity remains in front of the frame,
   and an additional 13 mm extends behind the frame into the lid. All
   compartments are printed directly into it: the left storage bay has four
   cable cells, while the 82 mm-wide right bay has a 120 mm lower compartment
   and a 53.8 mm upper tray. The lower compartment has 33 mm clear depth.
3. `exports/lid_storage_cover_base.stl` — the common snap-fit cover.
4. `exports/lid_storage_cover_logo.stl` — the contrasting Andworx/Field Kit
   inlay.

The former cable and accessory insert STLs are obsolete. Their compartments
are now integrated into `lid_storage_carrier_R.stl` and must not be printed
separately.

Two optional blank parts are also included:

- `exports/lid_storage_cover_blank.stl` has the same outline and six mounting
  holes as the branded cover, but no text or logo pockets. Use it as the source
  for future text or graphics.
- `exports/lid_storage_left_design_plate_blank.stl` is an 85 x 196 x 1.6 mm
  solid plate with four M3 holes aligned to the raised bosses on the left frame.
  Its uninterrupted face is the source for future raised, recessed, painted,
  or multicolor artwork. Because it closes the former safety-switch opening,
  complete the closed-lid witness test before leaving it installed in service.

## Tool-free storage cover

Both the branded and blank storage covers use the same recessed-edge snap-fit
outline. Insert the thinned top edge beneath the fixed retaining rail, keep the
plate between the two reinforced side guides, and press the two recessed lower
pads until both bottom cantilevers click over the cover. A 20 mm finger notch
and matching carrier-wall scallop provide room to lift the lower edge during
removal. The top and side roots are 3.2 mm thick and overlap the carrier wall;
do not print an older cover without the matching edge recesses.

The six original M3 cover holes and heat-set-insert bosses remain available as
optional backup fasteners, but are not required for normal access. Test the
snap action before loading the carrier. The two narrow latch stems are intended
to flex only far enough for the 0.55 mm hooks to pass the cover; do not bend them
outward by hand. PETG is preferred for repeated cycling, although a well-tuned
PLA or PLA+ print should work for the initial fit test.

## Left/right seam hardware

The updated left frame has two 20 x 8 x 3.2 mm tongues. They slide into
three-sided pockets at the top and bottom of the right carrier; the case lid
closes the fourth side after installation. Each joint uses one M3 screw through
the tongue and pocket roof, with an M3 hex nut captured from the front. The
screw head is recessed into the tongue on the lid side.

Start with M3 x 12 mm countersunk screws and standard M3 nuts, but verify the
actual screw does not bottom out or protrude toward the lid. Insert both tongues
fully before installing either screw. The joint must pull together without
bending the long frame rails.

The mounting frame crosses the carrier depth. The carrier floor is 13 mm behind
the frame, toward the moulded lid, while the cavity continues 21 mm in front of
the frame to the removable cover. The standard 2.4 mm floor provides 31.6 mm
clear internal depth. Only the 82 x 120 mm lower-right compartment is locally
thinned to a 1.0 mm floor, providing 33 mm clear depth without increasing the
external carrier envelope. The cover face is 23.4 mm forward of the frame and
the reinforced snap guides reach 24.2 mm. Perform a clay or tape witness test
to confirm the new 13 mm rear extension clears the lid before latching the
case. The cover retains six M3 clearance holes over 4.0 mm heat-set-insert
pilots as optional backup fastening points.

This remains a test assembly. Before closing the lid, verify that every cable
coil sits below the integrated dividers, the adapter and keys cannot rock above
the rim, and the cover lies flat without preload. Close the lid gently without
engaging the case latches for the first test.

## Intended final architecture

The final cassette will use the four-boss frame as a permanent mounting
interface and divide the 255 x 183 mm rib opening into three bays. Viewed with
the open lid in the same orientation as the supplied photograph, they are:

- left: a permanently open safety-switch garage;
- centre: four printed-in flat-coil cable cells for the 6-inch leads; and
- right: an integrated 82 mm-wide bay with a 120 x 33 mm lower compartment and
  an upper tray.

The two storage bays can share one removable cover. Its visible face becomes
the Andworx advertising panel while the entire left bay remains open. The
switch witness test still determines the final size and edge clearances of that
left cutout; the named bay is not permission to skip the closure test.

The prototype carrier adds 13 mm behind the frame to the previously acceptable
21 mm front cavity, producing 34 mm total depth. Physical witness results
override the nominal dimensions; do not latch the case until the rear extension
and safety-switch garage have both passed a clay or tape witness test.

The final storage covers will use captured screws or sliding retainers so every
item remains secured when the lid is vertical or upside down. No cable, key, or
adapter may be able to fall onto the controls.

## Advertising proof

`andworx_field_kit_base.stl` and `andworx_field_kit_logo.stl` are an optional
two-colour appearance coupon. Print the base in navy/black and the logo insert
in Andworx yellow. The production cover will reuse the official vector-derived
wordmark only after the switch-garage position is known.

## Promotion gate

Do not design or print the full storage cassette until:

- the four-boss frame fits;
- the gasket and ribs remain clear;
- the safety-switch envelope is transferred into lid coordinates; and
- the maximum safe pocket depth is confirmed with the complete panel installed.
