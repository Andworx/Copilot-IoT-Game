# RP09 face-text calibration

This folder contains the small print-first coupon for the RP09 high-contrast
face lettering. It uses the exact M3 production title font, size, pocket depth,
clearance, and proud height.

For AMS/multi-material printing, load `exports/text_coupon_base.stl` and
`exports/text_coupon_text.stl` together as parts of one object and assign a
light, opaque filament to the text. Keep both files at their original position.

For a manual color change, print `exports/text_coupon_layer_swap.stl` and swap
filament at Z = 3.20 mm.

Pass criteria:

- all letters are filled and legible at normal viewing distance;
- the text color is cleanly separated from the base;
- the 0.40 mm proud lettering does not peel under a fingernail; and
- no scaling or XY compensation is required.

Record the filament colors, nozzle size, layer height, and physical result here
before promoting RP09.
