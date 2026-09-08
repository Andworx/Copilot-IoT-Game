# RP08 installation guides

- `electronics-placement.html` is the RP08 component-placement and wire-routing
  guide, including the staggered converter positions and shared power drop.
  Open it in a browser; it has no external dependencies.
- `output/pdf/rear-drill-guide-letter.pdf` is the one-page US Letter rear case
  template. Print with **Actual size / 100%**. Never use Fit, Shrink, Scale to
  margins, or borderless expansion.
- `output/pdf/rear-drill-guide-geometry.json` is the machine-readable dimensional
  record generated with the PDF.
- `generate_drill_guide.py` is the ReportLab source.

The red PDF trim boundary is the measured 132.55 x 75.62 mm flat rear envelope.
Measure the 100 mm calibration bar and 25 mm square, then verify the real recess
itself is 132.55 x 75.62 mm. If either check fails, stop. Cut the paper on the red line,
tape it to the real case, and dry-fit the printed carrier and all components before
making holes. The page is an outside-rear view: XT60 left, switch center, dial right.

The rear drill guide geometry is regenerated from the measured recess and RP08
carrier. This release does not remove the physical gates. The approximate imported
case model does not prove every hinge/rib clearance, and the original case seal is not
preserved automatically after cutting. Keep the case unpowered while drilling.
