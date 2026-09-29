"""Compose the RP09 left design-plate cloud architecture from source logos."""
from __future__ import annotations

import argparse
import copy
import re
from pathlib import Path
import xml.etree.ElementTree as ET

SVG = "http://www.w3.org/2000/svg"
INK = "http://www.inkscape.org/namespaces/inkscape"
ET.register_namespace("", SVG)
ET.register_namespace("inkscape", INK)

UPSTREAM_REPOSITORY = "https://github.com/loryanstrant/MicrosoftCloudLogos"
UPSTREAM_COMMIT = "217772d2906bc9870d08dfe5a8d9c2fa86645006"

LOGOS = {
    "iot": "logos/azure-iot-hub/10182-icon-service-iot-hub.svg",
    "events": "logos/azure-event-hubs/00039-icon-service-event-hubs.svg",
    "functions": "logos/azure-functions/10029-icon-service-function-apps.svg",
    "signalr": "logos/azure-signalr-service/10052-icon-service-signalr.svg",
    "dataverse": "logos/dataverse/dataverse-scalable.svg",
    "pages": "logos/power-pages/powerpages-scalable.svg",
    "apps": "logos/power-apps/powerapps-scalable.svg",
    "copilot": "logos/copilot-studio/copilotstudio-scalable.svg",
}


def svg_tag(name: str) -> str:
    return f"{{{SVG}}}{name}"


def prefix_ids(element: ET.Element, prefix: str) -> None:
    mapping: dict[str, str] = {}
    # Keep the wrapper's stable logo-* id; prefix only imported source ids.
    for node in list(element.iter())[1:]:
        old = node.get("id")
        if old:
            mapping[old] = f"{prefix}-{old}"
            node.set("id", mapping[old])
    if not mapping:
        return
    for node in element.iter():
        for key, value in list(node.attrib.items()):
            updated = value
            for old, new in mapping.items():
                updated = updated.replace(f"url(#{old})", f"url(#{new})")
                updated = updated.replace(f"#{old}", f"#{new}")
            node.set(key, updated)


def add_logo(parent: ET.Element, source: Path, name: str,
             x: float, y: float, size: float) -> None:
    root = ET.parse(source).getroot()
    viewbox = [float(value) for value in root.get("viewBox", "0 0 96 96").split()]
    _, _, width, height = viewbox
    scale = size / max(width, height)
    tx = x + (size - width * scale) / 2 - viewbox[0] * scale
    ty = y + (size - height * scale) / 2 - viewbox[1] * scale
    group = ET.SubElement(parent, svg_tag("g"), {
        "id": f"logo-{name}",
        "transform": f"translate({tx:.4f} {ty:.4f}) scale({scale:.6f})",
        "data-source": LOGOS[name],
    })
    for child in root:
        group.append(copy.deepcopy(child))
    prefix_ids(group, name)


def add_text(parent: ET.Element, value: str, x: float, y: float,
             size: float, weight: str = "700", fill: str = "#ffffff",
             spacing: float = 0.0) -> None:
    node = ET.SubElement(parent, svg_tag("text"), {
        "x": str(x), "y": str(y), "fill": fill,
        "font-family": "Arial, Liberation Sans, sans-serif",
        "font-size": str(size), "font-weight": weight,
        "text-anchor": "middle", "letter-spacing": str(spacing),
    })
    node.text = value


def add_path(parent: ET.Element, d: str, dashed: bool = False) -> None:
    attrs = {
        "d": d, "fill": "none", "stroke": "#9ca3af",
        "stroke-width": "0.8", "stroke-linecap": "round",
        "stroke-linejoin": "round", "marker-end": "url(#flow-arrow)",
    }
    if dashed:
        attrs["stroke-dasharray"] = "2.2 1.6"
    ET.SubElement(parent, svg_tag("path"), attrs)


def build_svg(logo_root: Path, output: Path) -> None:
    missing = [path for path in LOGOS.values() if not (logo_root / path).is_file()]
    if missing:
        raise FileNotFoundError(f"Missing source logos under {logo_root}: {missing}")

    root = ET.Element(svg_tag("svg"), {
        "width": "85mm", "height": "196mm", "viewBox": "0 0 85 196",
        "version": "1.1", "role": "img",
        "aria-label": "Copilot IoT Game Microsoft cloud architecture",
    })
    title = ET.SubElement(root, svg_tag("title"))
    title.text = "Copilot IoT Game — Microsoft cloud architecture"
    description = ET.SubElement(root, svg_tag("desc"))
    description.text = (
        "Transparent 85 by 196 millimetre overlay for the RP09 left design plate. "
        "Panel telemetry flows from Azure IoT Hub to Event Hubs and Azure Functions, "
        "then to SignalR and Power Pages, Dataverse and Power Apps, and Copilot Studio."
    )
    metadata = ET.SubElement(root, svg_tag("metadata"))
    metadata.text = (
        f"Logo source: {UPSTREAM_REPOSITORY} commit {UPSTREAM_COMMIT}. "
        "Microsoft logos remain property of Microsoft Corporation."
    )

    defs = ET.SubElement(root, svg_tag("defs"))
    marker = ET.SubElement(defs, svg_tag("marker"), {
        "id": "flow-arrow", "viewBox": "0 0 6 6", "refX": "5.2",
        "refY": "3", "markerWidth": "4", "markerHeight": "4",
        "orient": "auto-start-reverse", "markerUnits": "strokeWidth",
    })
    ET.SubElement(marker, svg_tag("path"), {
        "d": "M0 0 L6 3 L0 6 Z", "fill": "#9ca3af",
    })

    guide = ET.SubElement(root, svg_tag("g"), {
        "id": "alignment-guide", "style": "display:none",
        f"{{{INK}}}groupmode": "layer", f"{{{INK}}}label": "Alignment guide (hidden)",
    })
    ET.SubElement(guide, svg_tag("rect"), {
        "x": "0.25", "y": "0.25", "width": "84.5", "height": "195.5",
        "rx": "5", "fill": "none", "stroke": "#ff00ff", "stroke-width": "0.5",
    })
    for x in (17.5, 67.5):
        for y in (4.0, 192.0):
            ET.SubElement(guide, svg_tag("circle"), {
                "cx": str(x), "cy": str(y), "r": "1.7",
                "fill": "none", "stroke": "#ff00ff", "stroke-width": "0.4",
            })

    flow = ET.SubElement(root, svg_tag("g"), {
        "id": "flow", f"{{{INK}}}groupmode": "layer",
        f"{{{INK}}}label": "Architecture flow",
    })
    add_path(flow, "M42.5 38 L42.5 48")
    add_path(flow, "M42.5 64 L42.5 75")
    add_path(flow, "M42.5 91 L42.5 99 L20.5 99 L20.5 104")
    add_path(flow, "M42.5 99 L64.5 99 L64.5 104")
    add_path(flow, "M20.5 119 L14.5 136")
    add_path(flow, "M64.5 119 L42.5 136")
    add_path(flow, "M42.5 99 C42.5 124 70.5 120 70.5 136", dashed=True)

    logos = ET.SubElement(root, svg_tag("g"), {
        "id": "approved-logos", f"{{{INK}}}groupmode": "layer",
        f"{{{INK}}}label": "Microsoft Cloud logos",
    })
    placements = {
        "iot": (35.0, 23.0, 15.0),
        "events": (35.0, 49.0, 15.0),
        "functions": (35.0, 76.0, 15.0),
        "signalr": (13.5, 105.0, 14.0),
        "dataverse": (57.5, 105.0, 14.0),
        "pages": (7.5, 137.0, 14.0),
        "apps": (35.5, 137.0, 14.0),
        "copilot": (63.5, 137.0, 14.0),
    }
    for name, (x, y, size) in placements.items():
        add_logo(logos, logo_root / LOGOS[name], name, x, y, size)

    labels = ET.SubElement(root, svg_tag("g"), {
        "id": "labels", f"{{{INK}}}groupmode": "layer",
        f"{{{INK}}}label": "Labels",
    })
    add_text(labels, "COPILOT IoT GAME", 42.5, 11.5, 5.2, spacing=0.18)
    add_text(labels, "CONNECTED CLOUD DEMO", 42.5, 17.0, 2.2,
             weight="600", fill="#9ca3af", spacing=0.22)
    add_text(labels, "IoT HUB", 42.5, 42.3, 2.6)
    add_text(labels, "EVENT HUBS", 42.5, 68.3, 2.6)
    add_text(labels, "AZURE FUNCTIONS", 42.5, 95.0, 2.6)
    add_text(labels, "SIGNALR", 20.5, 123.0, 2.4)
    add_text(labels, "DATAVERSE", 64.5, 123.0, 2.4)
    add_text(labels, "POWER PAGES", 14.5, 155.0, 2.2)
    add_text(labels, "POWER APPS", 42.5, 155.0, 2.2)
    add_text(labels, "COPILOT", 70.5, 155.0, 2.2)
    add_text(labels, "STUDIO", 70.5, 158.0, 2.2)
    add_text(labels, "REAL-TIME  •  LOW-CODE  •  AI", 42.5, 171.5, 2.35,
             weight="600", fill="#9ca3af", spacing=0.12)
    add_text(labels, "ANDWORX FIELD KIT", 42.5, 180.0, 3.5, spacing=0.25)

    ET.indent(root, space="  ")
    output.parent.mkdir(parents=True, exist_ok=True)
    ET.ElementTree(root).write(output, encoding="utf-8", xml_declaration=True)


def build_print_mask(source: Path, output: Path) -> None:
    """Create a geometry-only, single-colour SVG for OpenSCAD import."""
    root = ET.parse(source).getroot()
    keep = {"defs", "flow", "approved-logos"}
    for child in list(root):
        local_name = child.tag.rsplit("}", 1)[-1]
        if local_name in {"title", "desc", "metadata"}:
            root.remove(child)
        elif local_name == "g" and child.get("id") not in keep:
            root.remove(child)

    for node in root.iter():
        fill = node.get("fill")
        if fill and fill != "none":
            node.set("fill", "#000000")
        stroke = node.get("stroke")
        if stroke and stroke != "none":
            node.set("stroke", "#000000")
        if node.tag == svg_tag("stop"):
            node.set("stop-color", "#000000")

    root.set("aria-label", "RP09 left plate printable cloud geometry")
    ET.indent(root, space="  ")
    ET.ElementTree(root).write(output, encoding="utf-8", xml_declaration=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--logo-root", type=Path, required=True)
    parser.add_argument("--output", type=Path,
                        default=Path(__file__).with_name("left_panel_iot_cloud_overlay.svg"))
    parser.add_argument(
        "--print-mask", type=Path,
        default=Path(__file__).with_name("left_panel_iot_cloud_print_mask.svg"),
    )
    args = parser.parse_args()
    build_svg(args.logo_root, args.output)
    build_print_mask(args.output, args.print_mask)
    print(args.output.resolve())
    print(args.print_mask.resolve())


if __name__ == "__main__":
    main()
