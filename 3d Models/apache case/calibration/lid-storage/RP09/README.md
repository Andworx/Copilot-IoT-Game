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

Print only these three files initially:

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

## Intended final architecture

The final cassette will use the four-boss frame as a permanent mounting
interface and divide the 255 x 183 mm rib opening into three removable bays:

- flat-coil cable storage with positive clips for the 6-inch leads;
- a lidded adapter/key cartridge; and
- an empty safety-switch garage wherever the witness test locates the covers.

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

