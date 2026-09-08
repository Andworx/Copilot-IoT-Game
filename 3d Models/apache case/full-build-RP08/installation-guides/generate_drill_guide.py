"""Generate the RP08 one-page, true-size US Letter rear drill guide."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.colors import HexColor, black, white
from pypdf import PdfReader
import json

MM = 72.0 / 25.4
ROOT = Path(__file__).resolve().parent
OUT = ROOT / "output" / "pdf"
PDF = OUT / "rear-drill-guide-letter.pdf"
META = OUT / "rear-drill-guide-geometry.json"

PAGE_W, PAGE_H = letter
ENV_W, ENV_H = 132.55, 75.62
X0 = (PAGE_W - ENV_W * MM) / 2
Y0 = 480.0

# Coordinates are in mm from the lower-left of the measured rear flat envelope,
# as viewed from OUTSIDE the case.
carrier = ((ENV_W-128.0)/2, (ENV_H-60.0)/2, 128.0, 60.0)
control_y = ENV_H/2
controls = {
    "XT60 SERVICE": {"center": (ENV_W/2-36.0, control_y), "shape": "rounded_rect", "size": (38.0, 40.0)},
    "MASTER SWITCH": {"center": (ENV_W/2-1.0, control_y), "shape": "rounded_rect", "size": (30.0, 36.0)},
    "DIAL": {"center": (ENV_W/2+30.0, control_y), "shape": "circle", "diameter": 31.0},
}
recess_bottom_z = 45.0-ENV_H/2
carrier_mounts = [(ENV_W/2-x, z-recess_bottom_z) for x in (-59.0,59.0) for z in (24.0,66.0)]

def pt(x_mm, y_mm):
    return X0 + x_mm * MM, Y0 + y_mm * MM

def cross(c, x, y, size=3.0):
    px, py = pt(x, y)
    s = size * MM
    c.line(px - s, py, px + s, py)
    c.line(px, py - s, px, py + s)

def dim_h(c, x1, x2, y, label):
    a, py = pt(x1, y); b, _ = pt(x2, y)
    c.line(a, py, b, py)
    for x in (a, b):
        c.line(x, py - 3, x, py + 3)
    c.setFont("Helvetica", 7)
    c.drawCentredString((a+b)/2, py+4, label)

def dim_v(c, x, y1, y2, label):
    px, a = pt(x, y1); _, b = pt(x, y2)
    c.line(px, a, px, b)
    for y in (a, b):
        c.line(px-3, y, px+3, y)
    c.saveState(); c.translate(px-5, (a+b)/2); c.rotate(90)
    c.setFont("Helvetica", 7); c.drawCentredString(0, 0, label); c.restoreState()

OUT.mkdir(parents=True, exist_ok=True)
c = canvas.Canvas(str(PDF), pagesize=letter, pageCompression=0)
c.setTitle("RP08 Apache 2800 Rear Drill Guide - US Letter")
c.setAuthor("Copilot-IoT-Game RP08")
try:
    c.setViewerPreference("PrintScaling", "None")
except Exception:
    pass

# Header.
c.setFillColor(HexColor("#17243a")); c.rect(0, PAGE_H-68, PAGE_W, 68, fill=1, stroke=0)
c.setFillColor(white); c.setFont("Helvetica-Bold", 17)
c.drawString(42, PAGE_H-31, "RP08 REAR DRILL GUIDE")
c.setFont("Helvetica", 9)
c.drawString(42, PAGE_H-48, "APACHE 2800 | OUTSIDE REAR VIEW | US LETTER 8.5 x 11 in")
c.setFillColor(HexColor("#ffce54")); c.setFont("Helvetica-Bold", 9)
c.drawRightString(PAGE_W-42, PAGE_H-43, "PRINT ACTUAL SIZE / 100%")

# Scale verification.
c.setStrokeColor(black); c.setFillColor(black); c.setLineWidth(1)
bar_x, bar_y = 52, PAGE_H-82
c.line(bar_x, bar_y, bar_x+100*MM, bar_y)
c.line(bar_x, bar_y-5, bar_x, bar_y+5); c.line(bar_x+100*MM, bar_y-5, bar_x+100*MM, bar_y+5)
c.setFont("Helvetica-Bold", 8); c.drawCentredString(bar_x+50*MM, bar_y+7, "100.0 mm CALIBRATION - MEASURE BEFORE USE")
sq_x = PAGE_W-122; sq_y=112
c.rect(sq_x, sq_y, 25*MM, 25*MM, fill=0, stroke=1)
c.setFont("Helvetica", 7); c.drawCentredString(sq_x+12.5*MM, sq_y-10, "25.0 mm square")

# Estimated flat rear envelope / paper trim line.
c.setStrokeColor(HexColor("#d74242")); c.setLineWidth(1.4); c.setDash(6, 3)
c.rect(X0, Y0, ENV_W*MM, ENV_H*MM, fill=0, stroke=1)
c.setDash(); c.setFillColor(HexColor("#b02020")); c.setFont("Helvetica-Bold", 7)
c.drawCentredString(PAGE_W/2, Y0+ENV_H*MM+6, "RED DASH = PAPER TRIM LINE | MEASURED FLAT RECESS 132.55 x 75.62 mm")

# Carrier outline and datums.
c.setStrokeColor(HexColor("#52657c")); c.setLineWidth(1.0)
cx, cy, cw, ch = carrier
c.roundRect(*pt(cx, cy), cw*MM, ch*MM, 3*MM, fill=0, stroke=1)
c.setDash(2, 3); c.setStrokeColor(HexColor("#8a96a3"))
c.line(*pt(0,control_y), *pt(ENV_W,control_y)); c.line(*pt(ENV_W/2,0), *pt(ENV_W/2,ENV_H)); c.setDash()
c.setFillColor(HexColor("#52657c")); c.setFont("Helvetica-Bold", 7)
c.drawString(*pt(4, ENV_H-5), "GRAY = RP08 CARRIER OUTLINE (128 x 60 mm)")
c.setFont("Helvetica", 6.5); c.drawRightString(*pt(ENV_W-2,2), "BOTTOM OF REAR FLAT")

# Main case openings.
c.setStrokeColor(black); c.setFillColor(black); c.setLineWidth(1.4)
for name, spec in controls.items():
    x, y = spec["center"]
    if spec["shape"] == "circle":
        px, py = pt(x,y); c.circle(px,py,spec["diameter"]*MM/2,fill=0,stroke=1)
    else:
        w,h = spec["size"]; px,py=pt(x-w/2,y-h/2)
        c.roundRect(px,py,w*MM,h*MM,0.4*MM,fill=0,stroke=1)
    cross(c,x,y,2.5)
    px,py=pt(x,y); c.setFont("Helvetica-Bold",7); c.drawCentredString(px,py+21*MM,name)

# Fastener holes. Only the four carrier holes are drilled in the case.
c.setLineWidth(1.0)
for x,y in carrier_mounts:
    px,py=pt(x,y); c.circle(px,py,3.5*MM/2,fill=0,stroke=1); cross(c,x,y,2.7)
c.setFont("Helvetica",6.5)
c.drawString(*pt(4, 2), "4x CARRIER: drill 3.5 mm | XT60 fasteners attach to carrier only")

# Dimensions around trim boundary.
c.setStrokeColor(black); c.setFillColor(black); c.setLineWidth(0.6)
dim_h(c,0,ENV_W,-4,"132.55 mm - VERIFY ON CASE")
dim_v(c,-4,0,ENV_H,"75.62 mm - VERIFY")

# Key and sequence.
text_y=445
c.setFillColor(HexColor("#17243a")); c.setFont("Helvetica-Bold",10)
c.drawString(46,text_y,"CUT / DRILL KEY")
c.setFont("Helvetica",8); c.setFillColor(black)
lines=[
 "Solid black outlines: remove case material. Crosses: center-punch locations.",
 "Red dashed outline: cut the PAPER only. Gray outline: final carrier footprint.",
 "Case service openings: XT60 38 x 40; switch 30 x 36; dial body clearance dia 31.",
 "The printed carrier provides the finished XT60 opening, approved 23.6 x 29.8 switch grip,",
 "and 9.67 mm dial bushing with a 19 x 2 mm shoulder pocket. Do not enlarge carrier openings.",
]
for i,line in enumerate(lines): c.drawString(46,text_y-16-i*12,line)

box_y=288
c.setFillColor(HexColor("#fff2cc")); c.setStrokeColor(HexColor("#c68a00")); c.roundRect(42,box_y,528,76,7,fill=1,stroke=1)
c.setFillColor(HexColor("#6d4800")); c.setFont("Helvetica-Bold",9)
c.drawString(54,box_y+58,"STOP GATE - VERIFY THE TWO MEASURED CASE DATUMS BEFORE DRILLING")
c.setFont("Helvetica",8)
warnings=[
 "1. Measure the red trim box on paper: 132.55 x 75.62 mm. Reject any scaled print.",
 "2. Cut out the paper, tape it into the real rear recess, then dry-fit the printed carrier and hardware.",
 "3. Confirm no contact with hinge barrels, ribs, lid, tray, fuse cover, nuts, terminals, or wire bends.",
 "4. Drill small pilots first; use suitable plastic-cutting tools and edge support. Deburr and add edge protection.",
]
for i,line in enumerate(warnings): c.drawString(54,box_y+43-i*12,line)

c.setFillColor(HexColor("#17243a")); c.setFont("Helvetica-Bold",9)
c.drawString(46,260,"INSTALLATION ORDER")
c.setFillColor(black); c.setFont("Helvetica",8)
steps=[
 "A. Verify paper scale and real recess size. B. Mark only the four 3.5 mm carrier centers.",
 "C. Temporarily locate the carrier with removable tape or two pilot holes; recheck lid and hinge clearance.",
 "D. Transfer component openings; cut undersize, then file/ream to fit. E. Install grommets/edge protection as needed.",
 "F. Fit XT60, switch and dial to the carrier before final mounting; keep the case unpowered during all work.",
]
for i,line in enumerate(steps): c.drawString(46,244-i*13,line)

c.setStrokeColor(HexColor("#d8dde3")); c.line(42,82,PAGE_W-42,82)
c.setFillColor(HexColor("#52657c")); c.setFont("Helvetica",7)
c.drawString(42,66,"RP08-DG01 | 2026-09-06 | Units mm | Carrier center: model X 0, Z 45")
c.drawRightString(PAGE_W-42,66,"Page 1 of 1 | Do not use Fit-to-page")
c.setFillColor(HexColor("#b02020")); c.setFont("Helvetica-Bold",7)
c.drawCentredString(PAGE_W/2,48,"CUTTING THE CASE VOIDS ITS ORIGINAL ENVIRONMENTAL RATING UNLESS THE FINAL INSTALLATION IS SEALED AND TESTED.")
c.showPage(); c.save()

# Structural and scale checks.
reader=PdfReader(str(PDF))
assert len(reader.pages)==1
mb=reader.pages[0].mediabox
assert abs(float(mb.width)-612)<0.01 and abs(float(mb.height)-792)<0.01
assert 0 < X0 and X0+ENV_W*MM < PAGE_W
assert Y0 > 0 and Y0+ENV_H*MM < PAGE_H
geometry={
 "revision":"RP08-DG01","page":"US Letter 8.5 x 11 in","print_scale":"100 percent / Actual size",
 "rear_flat_envelope_mm":[ENV_W,ENV_H],"carrier_outline_mm":carrier,
 "controls":controls,"carrier_mounts_mm":carrier_mounts,"carrier_hole_diameter_mm":3.5,
 "calibration_bar_mm":100.0,"calibration_square_mm":25.0,
 "view":"outside rear; page left corresponds to positive model X",
 "status":"measured-case candidate - verify paper scale, hinges, ribs and hardware before drilling"
}
META.write_text(json.dumps(geometry,indent=2))
print(PDF)
