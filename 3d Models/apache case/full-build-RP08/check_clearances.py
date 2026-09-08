"""Read actual RP02/RF02 dimensions; check conservative rear AABBs, not CFD/STEP."""
from pathlib import Path
import ast, re, json

root=Path(__file__).parent
rear=(root/'rear_power.scad').read_text()
air=(root/'../case-airflow-study/airflow_params.scad').read_text()
rf=(root/'../recessed-fuse-study/recessed_insert.scad').read_text()
production=(root/'../model_params.scad').read_text()
def evaluate(node):
    if isinstance(node,ast.Constant) and isinstance(node.value,(int,float)): return node.value
    if isinstance(node,ast.List): return [evaluate(v) for v in node.elts]
    if isinstance(node,ast.UnaryOp) and isinstance(node.op,ast.USub): return -evaluate(node.operand)
    if isinstance(node,ast.BinOp):
        left,right=evaluate(node.left),evaluate(node.right)
        if isinstance(node.op,ast.Add): return left+right
        if isinstance(node.op,ast.Sub): return left-right
        if isinstance(node.op,ast.Mult): return left*right
        if isinstance(node.op,ast.Div): return left/right
    if isinstance(node,ast.Name): return literal(air+'\n'+production,node.id)
    raise ValueError(ast.dump(node))
def literal(text,name):
    match=re.search(r'(?m)^'+re.escape(name)+r'\s*=\s*([^;]+);',text)
    assert match, name
    return evaluate(ast.parse(match[1].strip(),mode='eval').body)
r=lambda name:literal(rear,name)
a=lambda name:literal(air,name)
f=lambda name:literal(rf,name)
face=r('case_outer_rear_y')+r('plate_t')
z=r('center_z')
def box(x,y,z,w,d,h): return [[x-w/2,y-d,z-h/2],[x+w/2,y,z+h/2]]
pb=r('power_body'); sb=r('switch_body'); wire=r('wire_allowance')
regions={
 'XT_service':box(r('power_x'),face,z,40,pb[2]+wire,42),
 'switch_service':box(r('switch_x'),face,z,30,sb[2]+wire,36),
 'dial_service':box(r('selector_x'),face-r('plate_t'),z,r('selector_window'),a('dial_body_depth')+wire,r('selector_window')),
}
xy=f('fuse_xy'); base=f('fuse_base'); pi=a('floor_pi_size')
fixed={
 'fuse':[[xy[0]-42,xy[1]-62,base],[xy[0]+42,xy[1]+62,base+40]],
 'floor_pi':[[92-pi[0]/2,38-pi[1]/2,17.5],[92+pi[0]/2,38+pi[1]/2,17.5+pi[2]]],
 # Screen Pi assumed centered on the measured screen; placement is provisional.
 'screen_pi':[[-42.5,10.275,37],[42.5,66.275,65.96]],
}
checks=[]
for i,(name,b) in enumerate(regions.items()):
    for other,c in list(regions.items())[i+1:]:
        overlap=[min(b[1][axis],c[1][axis])-max(b[0][axis],c[0][axis]) for axis in range(3)]
        assert not all(v>0 for v in overlap), (name,other,overlap)
        checks.append(dict(pair=[name,other],axis_overlap_mm=overlap))
for name,b in regions.items():
    for other,c in fixed.items():
        overlap=[min(b[1][i],c[1][i])-max(b[0][i],c[0][i]) for i in range(3)]
        assert not all(v>0 for v in overlap), (name,other,overlap)
        checks.append(dict(pair=[name,other],axis_overlap_mm=overlap,
                           separated_on_axes=['XYZ'[i] for i,v in enumerate(overlap) if v<=0]))
assert re.search(r'deck_z\s*=\s*equipment_tray_install_above_floor\s*;',rf)
assert re.search(r'deck_t\s*=\s*equipment_tray_thickness\s*;',rf)
tray_top=a('equipment_tray_install_above_floor')+a('equipment_tray_thickness')
assert min(b[0][2] for b in regions.values())-tray_top>=2
assert r('selector_x')-r('selector_window')/2-(xy[0]+42)>=2
report=dict(method='Conservative axis-aligned rear service envelopes; no physical-fit claim',
            regions=regions,fixed=fixed,checks=checks,
            dial_service_to_fuse_x_gap_mm=r('selector_x')-r('selector_window')/2-(xy[0]+42),
            minimum_rear_service_to_tray_z_gap_mm=min(b[0][2] for b in regions.values())-tray_top,
            carrier_nut_to_tray_z_gap_mm=24-5-tray_top,
            exclusions=['Real hinge/rib geometry','Terminal lugs and wire bending beyond 15 mm assumption',
                        'Fan geometry and heat performance','Unresolved tray perimeter fit',
                        'Lid clearance and final screen retention'])
(root/'exports/clearances.json').write_text(json.dumps(report,indent=2))
print('PASS: rear service envelopes clear fuse and both Pi envelopes; dial/fuse X gap',report['dial_service_to_fuse_x_gap_mm'])
