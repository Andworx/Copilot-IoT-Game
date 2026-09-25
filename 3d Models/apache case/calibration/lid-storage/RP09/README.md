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
2. `exports/lid_storage_carrier_R.stl` — the right frame half and common tray.
3. `exports/lid_storage_cable_insert.stl` — four pockets for flat-coiled
   6-inch cables.
4. `exports/lid_storage_accessory_key_insert.stl` — general adapter, key, and
   spare-item pockets.
5. `exports/lid_storage_cover_base.stl` — the common screw-down cover.
6. `exports/lid_storage_cover_logo.stl` — the contrasting Andworx/Field Kit
   inlay.

Two optional blank parts are also included:

- `exports/lid_storage_cover_blank.stl` has the same outline and six mounting
  holes as the branded cover, but no text or logo pockets. Use it as the source
  for future text or graphics.
- `exports/lid_storage_left_design_plate_blank.stl` is an 85 x 196 x 1.6 mm
  border plate with a 73 x 174 mm switch opening. Its four M3 holes align with
  the raised bosses on the left frame. Add designs only to the border; do not
  reduce the central safety-switch opening until physical closure testing proves
  the smaller opening safe.

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

The carrier, inserts, and cover form a nominal 23.4 mm stack from the lid
floor. The left third has no floor or cover. The cover uses six M3 clearance
holes over 4.0 mm heat-set-insert pilots in the carrier. Install the cover
inserts before loading anything, and use short screws that cannot bottom out in
the carrier.

This remains a test assembly. Before closing the lid, verify that every cable
coil sits below the carrier rim, the adapter and keys cannot rock above the rim,
and the cover lies flat without preload. Close the lid gently without engaging
the latches for the first test.

## Intended final architecture

The final cassette will use the four-boss frame as a permanent mounting
interface and divide the 255 x 183 mm rib opening into three bays. Viewed with
the open lid in the same orientation as the supplied photograph, they are:

- left: a permanently open safety-switch garage;
- centre: flat-coil cable storage with positive clips for the 6-inch leads; and
- right: a lidded adapter/key cartridge.

The two storage bays can share one removable cover. Its visible face becomes
the Andworx advertising panel while the entire left bay remains open. The
switch witness test still determines the final size and edge clearances of that
left cutout; the named bay is not permission to skip the closure test.

The nominal storage depth is limited to 28 mm. This leaves room for a 2-3 mm
base/cover and a 3-5 mm clearance allowance within the measured 35 mm lid.
Physical witness results override this nominal value.

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
