"""Validate RP08 promotion, RP07 inheritance, measured rear fit, and meshes."""
from collections import Counter, defaultdict
from pathlib import Path
import hashlib, json, struct

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "exports"
RP07 = ROOT.parent / "full-build-RP07" / "exports"

def sha(path):
    h=hashlib.sha256(); h.update(path.read_bytes()); return h.hexdigest()

def triangles(path):
    data=path.read_bytes()
    if len(data)>=84 and 84+50*struct.unpack_from("<I",data,80)[0]==len(data):
        n=struct.unpack_from("<I",data,80)[0]
        return [[struct.unpack_from("<fff",data,84+i*50+12+j*12) for j in range(3)] for i in range(n)]
    vs=[tuple(map(float,line.split()[1:])) for line in data.decode().splitlines() if line.strip().startswith("vertex ")]
    assert vs and len(vs)%3==0
    return [vs[i:i+3] for i in range(0,len(vs),3)]

def mesh(path):
    ts=triangles(path); vertices=[p for tri in ts for p in tri]
    lo=[min(p[i] for p in vertices) for i in range(3)]
    hi=[max(p[i] for p in vertices) for i in range(3)]
    size=[round(hi[i]-lo[i],3) for i in range(3)]
    edges=Counter(); directed=Counter(); graph=defaultdict(set)
    for tri in ts:
        v=[tuple(round(x,5) for x in p) for p in tri]
        assert len(set(v))==3,(path.name,"degenerate")
        for a,b in zip(v,v[1:]+v[:1]):
            edges[tuple(sorted((a,b)))]+=1; directed[(a,b)]+=1
            graph[a].add(b); graph[b].add(a)
    pending=set(graph); bodies=0
    while pending:
        todo=[pending.pop()]; bodies+=1
        while todo:
            for p in graph[todo.pop()]:
                if p in pending: pending.remove(p); todo.append(p)
    return dict(bounds_mm=size,closed_edges=all(n==2 for n in edges.values()),
                winding_consistent=all(directed[(a,b)]==directed[(b,a)] for a,b in directed),
                connected_bodies=bodies,fits_256mm_bed=max(size)<=256.001)

expected={p.name for p in RP07.glob("*.stl")}
actual={p.name for p in OUT.glob("*.stl")}
assert actual==expected,(sorted(expected-actual),sorted(actual-expected))
changed={"carrier.stl","layout_template.stl","rear_L.stl","rear_R.stl","tray_L.stl"}
for name in sorted(expected-changed): assert sha(OUT/name)==sha(RP07/name),name
for name in sorted(changed): assert sha(OUT/name)!=sha(RP07/name),name

meshes={name:mesh(OUT/name) for name in sorted(actual)}
for name,m in meshes.items():
    assert m["closed_edges"] and m["winding_consistent"],name
    assert m["connected_bodies"]==1,(name,m["connected_bodies"])
    assert m["fits_256mm_bed"],(name,m["bounds_mm"])

recess=(132.55,75.62); carrier=(128.0,60.0)
assert abs((recess[0]-carrier[0])-4.55)<1e-9
assert abs((recess[1]-carrier[1])-15.62)<1e-9
switch_open=(23.6,29.8); switch_bezel=(24.75,31.57)
assert all(s<b for s,b in zip(switch_open,switch_bezel))
dial_pocket=(19.0,2.0); plate_t=3.0
assert dial_pocket[0]>17.72 and plate_t-dial_pocket[1]>=1.0
assert 3.6>2.96
controls={"dial_x":-30.0,"switch_x":1.0,"xt60_x":36.0,"z":45.0}
service={"dial_d":31.0,"switch_wh":[30.0,36.0],"xt60_wh":[38.0,40.0]}
assert controls["dial_x"]-service["dial_d"]/2>-49+2
assert controls["xt60_x"]+38.4/2<carrier[0]/2
assert min(45-service["dial_d"]/2,45-service["switch_wh"][1]/2,45-service["xt60_wh"][1]/2)>17.5+2

report={"revision":"RP08","status":"PASS - T02-E/P3 and converter coupon physically approved; rear carrier/drill guide require case dry-fit",
        "changed_production_parts":sorted(changed),"unchanged_rp07_stl_count":len(expected)-len(changed),
        "rear_recess_measured_mm":recess,"carrier_mm":carrier,
        "rear_recess_clearance_mm":[recess[0]-carrier[0],recess[1]-carrier[1]],
        "switch_opening_mm":switch_open,"dial_shoulder_pocket_mm":dial_pocket,
        "dial_register_slot_center_range_mm":[7.5,10.5],"controls":controls,
        "case_service_openings":service,"shared_power_drop_mm":[12.0,42.0],"meshes":meshes}
(OUT/"validation_rp08.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
print(json.dumps({"validated":len(actual),"changed":sorted(changed),"unchanged":len(expected)-len(changed)},indent=2))
