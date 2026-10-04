"""Split cover logos into flat colour layers for multi-colour inlay printing.

OpenSCAD 2021 imports an SVG as one filled silhouette and ignores colour, so each
drawable element of every logo in logos.json is written to its own SVG
(generated/<name>/e<i>.svg, 1 user unit = 1 mm). Elements are kept in paint order.
Fluent-style shading overlays (gradients with transparent stops, or translucent
fills) are dropped; every remaining element gets one flat colour, and colours are
merged to at most maxColors per logo so a cover fits a 4-slot AMS (cover base +
logo colours). OpenSCAD then computes each colour's visible region as the element
minus everything painted above it.

Outputs:
  generated/logo_data.scad  LOGOS table included by plinko_bucket_sensor.scad
  generated/logos.json      names, titles and colours for export_parts.ps1

Run from anywhere: python build_logo_layers.py
"""

import copy
import json
import re
import shutil
from pathlib import Path
from xml.etree import ElementTree as ET

SVG_NS = "http://www.w3.org/2000/svg"
XLINK_NS = "http://www.w3.org/1999/xlink"
ET.register_namespace("", SVG_NS)
DRAWABLE = {"path", "rect", "circle", "ellipse", "polygon", "polyline"}
SKIP_CONTAINERS = {"defs", "clipPath", "mask", "title", "desc", "metadata", "style", "symbol"}
OPAQUE = 0.95

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
OUT = HERE / "generated"


def local(tag):
    return tag.split("}", 1)[-1]


def style_props(el):
    props = {}
    for part in (el.get("style") or "").split(";"):
        if ":" in part:
            key, value = part.split(":", 1)
            props[key.strip()] = value.strip()
    return props


def prop(el, name):
    return style_props(el).get(name, el.get(name))


def parse_colour(value):
    value = (value or "").strip().lower()
    named = {"black": "#000000", "white": "#ffffff"}
    value = named.get(value, value)
    if re.fullmatch(r"#[0-9a-f]{3}", value):
        value = "#" + "".join(c * 2 for c in value[1:])
    if re.fullmatch(r"#[0-9a-f]{6}", value):
        return tuple(int(value[i:i + 2], 16) for i in (1, 3, 5))
    return None


def gradients(root):
    found = {}
    for el in root.iter():
        if local(el.tag) in ("linearGradient", "radialGradient") and el.get("id"):
            found[el.get("id")] = el

    def stops(el, depth=0):
        own = [s for s in el if local(s.tag) == "stop"]
        href = el.get(f"{{{XLINK_NS}}}href") or el.get("href")
        if not own and href and depth < 5 and href[1:] in found:
            return stops(found[href[1:]], depth + 1)
        return own

    result = {}
    for gid, el in found.items():
        colours, opaque = [], True
        for stop in stops(el):
            colour = parse_colour(prop(stop, "stop-color") or "#000000")
            opacity = float(prop(stop, "stop-opacity") or 1)
            opaque &= opacity >= OPAQUE
            if colour:
                colours.append(colour)
        if colours:
            mean = tuple(sum(c[i] for c in colours) / len(colours) for i in range(3))
            result[gid] = (mean, opaque)
    return result


def collect(root, grads):
    """Yield (ancestor transforms, element, colour) in paint order."""
    items = []

    def walk(el, transforms, fill, opacity):
        name = local(el.tag)
        if name in SKIP_CONTAINERS:
            return
        fill = prop(el, "fill") or fill
        opacity *= float(prop(el, "opacity") or 1) * float(prop(el, "fill-opacity") or 1)
        if name in DRAWABLE:
            colour = None
            if fill and fill.startswith("url("):
                gid = fill[fill.index("#") + 1:fill.rindex(")")]
                mean, opaque = grads.get(gid, (None, False))
                colour = mean if opaque else None
            elif fill != "none":
                colour = parse_colour(fill or "#000000")
            if colour and opacity >= OPAQUE:
                items.append((transforms, el, colour))
            return
        own = el.get("transform")
        child_transforms = transforms + [own] if own else transforms
        for child in el:
            walk(child, child_transforms, fill, opacity)

    walk(root, [], None, 1.0)
    return items


def quantise(colours, k):
    """Deterministic k-means in RGB. Returns (centres, assignment per colour)."""
    distinct = list(dict.fromkeys(colours))
    k = min(k, len(distinct))
    dist = lambda a, b: sum((a[i] - b[i]) ** 2 for i in range(3))
    centres = [distinct[0]]
    while len(centres) < k:
        centres.append(max(distinct, key=lambda c: min(dist(c, m) for m in centres)))
    for _ in range(25):
        assign = [min(range(k), key=lambda j: dist(c, centres[j])) for c in colours]
        for j in range(k):
            members = [c for c, a in zip(colours, assign) if a == j]
            if members:
                centres[j] = tuple(sum(m[i] for m in members) / len(members) for i in range(3))
    # Renumber groups by first appearance so layer 1 is the bottom-most colour.
    order = list(dict.fromkeys(assign))
    remap = {old: new for new, old in enumerate(order)}
    return [centres[old] for old in order], [remap[a] for a in assign]


def hex_colour(c):
    return "#" + "".join(f"{round(v):02x}" for v in c)


def element_svg(view_box, transforms, el):
    _, _, width, height = (float(v) for v in view_box.split())
    root = ET.Element(f"{{{SVG_NS}}}svg", {
        "width": f"{width}mm", "height": f"{height}mm", "viewBox": view_box})
    parent = root
    for transform in transforms:
        parent = ET.SubElement(parent, f"{{{SVG_NS}}}g", {"transform": transform})
    shape = copy.deepcopy(el)
    for attr in ("fill", "style", "clip-path", "mask", "filter", "opacity", "fill-opacity"):
        shape.attrib.pop(attr, None)
    shape.set("fill", "#000000")
    parent.append(shape)
    return ET.ElementTree(root)


def main():
    manifest = json.loads((HERE / "logos.json").read_text(encoding="utf-8"))
    default_k = manifest.get("maxColors", 3)
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()

    table, summary = [], []
    for logo in manifest["logos"]:
        source = REPO / logo["source"]
        root = ET.parse(source).getroot()
        view_box = root.get("viewBox") or f"0 0 {root.get('width')} {root.get('height')}"
        min_x, min_y, width, height = (float(v) for v in view_box.split())
        if min_x or min_y:
            raise SystemExit(f"{logo['name']}: viewBox must start at 0 0")
        items = collect(root, gradients(root))
        if not items:
            raise SystemExit(f"{logo['name']}: no opaque elements found")
        centres, groups = quantise([c for _, _, c in items], logo.get("maxColors", default_k))

        folder = OUT / logo["name"]
        folder.mkdir()
        for i, (transforms, el, _) in enumerate(items):
            element_svg(view_box, transforms, el).write(folder / f"e{i}.svg", xml_declaration=False)

        colours = [hex_colour(c) for c in centres]
        table.append(f'  ["{logo["name"]}", "{logo["title"]}", [{width:g}, {height:g}], '
                     f'[{", ".join(json.dumps(c) for c in colours)}], [{", ".join(map(str, groups))}]]')
        summary.append({"name": logo["name"], "title": logo["title"], "family": logo["family"],
                        "colours": colours, "elements": len(items)})
        print(f"{logo['name']:16} {len(items):2} elements -> {len(colours)} colours {' '.join(colours)}")

    (OUT / "logo_data.scad").write_text(
        "// Generated by build_logo_layers.py from logos.json - do not edit.\n"
        "// [name, title, [width, height] in SVG units, layer colours, colour group per element]\n"
        "LOGOS = [\n" + ",\n".join(table) + "\n];\n", encoding="utf-8")
    (OUT / "logos.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
