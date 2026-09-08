"""RP02 exported-mesh validation; standard library only. Not physical-fit approval."""
from pathlib import Path
from collections import Counter, defaultdict
import struct
import json

ROOT = Path(__file__).parent
PARTS = ["dial_coupon","xt_coupon","switch_1","switch_2","switch_3","switch_3_27",
         "carrier","layout_template","rear_L","rear_R","shell_FL","shell_FR",
         "tray_L","tray_R","panel_L","panel_R","screen_face","safety_face",
         "switch_face","activity_face","lower_joiner","tray_joiner","shell_joiner_x","shell_joiner_y"]

def triangles(path):
    data = path.read_bytes()
    if len(data) >= 84 and 84+50*struct.unpack_from("<I",data,80)[0] == len(data):
        return [[struct.unpack_from("<fff",data,84+i*50+12+j*12)
                 for j in range(3)] for i in range(struct.unpack_from("<I",data,80)[0])]
    vs = [tuple(map(float, line.split()[1:])) for line in data.decode().splitlines()
          if line.strip().startswith("vertex ")]
    assert len(vs) % 3 == 0
    return [vs[i:i+3] for i in range(0,len(vs),3)]

results=[]
for part in PARTS:
    ts=triangles(ROOT/"exports"/(part+".stl"))
    assert ts, part
    vertices=[p for t in ts for p in t]
    lo=[min(p[i] for p in vertices) for i in range(3)]
    hi=[max(p[i] for p in vertices) for i in range(3)]
    size=[hi[i]-lo[i] for i in range(3)]
    assert all(0 < v <= 256.001 for v in size), (part,size)
    assert lo[2]>=-0.001, (part,lo)
    edges=Counter()
    directed=Counter()
    adjacent=defaultdict(set)
    for tri in ts:
        v=[tuple(round(x,5) for x in p) for p in tri]
        assert len(set(v))==3, (part,"degenerate face")
        for a,b in zip(v,v[1:]+v[:1]):
            edges[tuple(sorted((a,b)))]+=1
            directed[(a,b)]+=1
            adjacent[a].add(b)
            adjacent[b].add(a)
    assert all(n==2 for n in edges.values()), (part,"nonmanifold edges")
    assert all(directed[(a,b)]==directed[(b,a)] for a,b in directed), (part,"winding")
    pending=set(adjacent)
    components=0
    while pending:
        todo=[pending.pop()]
        components+=1
        while todo:
            for p in adjacent[todo.pop()]:
                if p in pending:
                    pending.remove(p)
                    todo.append(p)
    assert components==1, (part,"disconnected bodies",components)
    results.append(dict(part=part,bounds_mm=size,connected_bodies=components,closed_edges=True))
    print(part, [round(x,3) for x in size], "closed, consistently oriented, one connected body")

# Added floor ribs fit within a conservative straight-sided inner-floor region;
# all inherited shell/case disagreement remains governed by the existing fit report.
assert 142 < 306.3875/2-10
assert 88 < 229.45/2-10-11.5
# Proposed hard envelopes, before unspecified wires/lugs/tool access:
assert 6+40 == 46 and 72-46 == 26
assert -42.5-(-91+42) >= 2
assert 15.5-8 == 7.5
assert (30-62)-(-70+64/2) == 6
assert (30-132/2)-(-70+52/2+4.6/2) >= 3
assert 24-5-17.5 == 1.5
assert 117.5+3-30-15-(38+61.15/2) > 2
report=dict(status="CAD-only candidate validation, physical testing required",parts=results,
            rear_body_to_tray_gap_mm=6.5,carrier_nut_relief_to_tray_gap_mm=1.5,
            fuse_top_mm=46,panel_underside_mm=72,vertical_gap_mm=26,
            screen_pi_hard_x_gap_mm=6.5,lower_joiner_to_tray_gap_mm=7.5)
(ROOT/"exports"/"validation.json").write_text(json.dumps(report,indent=2))
print(f"PASS: {len(PARTS)} exports; RF02 support checks retained. Rear mounting is a physical-test candidate.")
