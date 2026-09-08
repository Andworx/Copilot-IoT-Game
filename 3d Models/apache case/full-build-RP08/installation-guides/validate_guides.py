"""Cross-check the rear drill guide and RP08 electronics placement guide."""
from pathlib import Path
from html.parser import HTMLParser
from pypdf import PdfReader
import ast, json, re, sys

ROOT=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parent
SOURCE=ROOT.parent/'rear_power.scad'
PDF=ROOT/'output'/'pdf'/'rear-drill-guide-letter.pdf'
GEOM=ROOT/'output'/'pdf'/'rear-drill-guide-geometry.json'
HTML=ROOT/'electronics-placement.html'

def literal(path,name):
    text=path.read_text()
    match=re.search(r'(?m)^'+re.escape(name)+r'\s*=\s*([^;]+);',text)
    assert match,name
    return ast.literal_eval(match.group(1).strip())

geom=json.loads(GEOM.read_text())
env_w,env_h=literal(SOURCE,'rear_recess_measured')
env_z=literal(SOURCE,'center_z')
assert geom['rear_flat_envelope_mm']==[env_w,env_h]
carrier_size=literal(SOURCE,'carrier_size')
assert geom['carrier_outline_mm']==[(env_w-carrier_size[0])/2,(env_h-carrier_size[1])/2,*carrier_size]

# Outside rear view reverses global model X. Vertical origin is envelope bottom.
center_z=literal(SOURCE,'center_z')
for label,source_name in [('XT60 SERVICE','power_x'),('MASTER SWITCH','switch_x'),('DIAL','selector_x')]:
    expected=[env_w/2-literal(SOURCE,source_name),center_z-(env_z-env_h/2)]
    assert geom['controls'][label]['center']==expected,(label,expected)

reader=PdfReader(str(PDF)); assert len(reader.pages)==1
box=reader.pages[0].mediabox
assert abs(float(box.width)-612)<0.01 and abs(float(box.height)-792)<0.01
assert geom['calibration_bar_mm']==100.0
assert geom['print_scale']=='100 percent / Actual size'

class Check(HTMLParser):
    def __init__(self): super().__init__(); self.ids=set(); self.links=[]; self.scripts=[]; self.capture=False
    def handle_starttag(self,tag,attrs):
        values=dict(attrs)
        if values.get('id'): self.ids.add(values['id'])
        if tag=='a' and values.get('href'): self.links.append(values['href'])
        if tag=='script' and values.get('id')=='layout-data': self.capture=True
    def handle_endtag(self,tag):
        if tag=='script': self.capture=False
    def handle_data(self,data):
        if self.capture: self.scripts.append(data)

check=Check(); check.feed(HTML.read_text())
assert 'layout-data' in check.ids and len(check.scripts)==1
layout=json.loads(check.scripts[0])
expected={'fuse':(-91,30,6),'floor-pi':(92,38,17.5),'usb-c-1':(-128,-65.5,17.5),
          'usb-c-2':(-88,-74,17.5),'micro-usb':(-54,-73.5,17.5),
          'power-drop':(-30,-52,None),'rear-dial':(-30,None,45),
          'rear-switch':(1,None,45),'rear-xt60':(36,None,45)}
for component in layout['components']:
    x,y,z=expected[component['id']]
    assert component['x']==x and component.get('y')==y
    if z is not None: assert component['z']==z
assert layout['revision']=='RP08-IG01'
for href in check.links:
    if '://' not in href and not (ROOT/href).resolve().exists(): raise AssertionError(('broken link',href))
assert len(layout['routes'])==7
print('PASS: one-page Letter PDF, CAD-linked geometry, HTML data, routes, and local links')
