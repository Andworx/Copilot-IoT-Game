"""Validate dimensions, sources, IDs, and layout hooks in the left-panel SVG."""
from pathlib import Path
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
SVG_FILE = ROOT / "left_panel_iot_cloud_overlay.svg"
NS = {"svg": "http://www.w3.org/2000/svg"}

root = ET.parse(SVG_FILE).getroot()
assert root.get("width") == "85mm"
assert root.get("height") == "196mm"
assert root.get("viewBox") == "0 0 85 196"

ids = [node.get("id") for node in root.iter() if node.get("id")]
assert len(ids) == len(set(ids)), "Duplicate SVG ids"
id_set = set(ids)
references = set()
for node in root.iter():
    for value in node.attrib.values():
        references.update(re.findall(r"url\(#([^)]+)\)", value))
assert references <= id_set, sorted(references - id_set)

expected_logos = {
    "logo-iot", "logo-events", "logo-functions", "logo-signalr",
    "logo-dataverse", "logo-pages", "logo-apps", "logo-copilot",
}
assert expected_logos <= id_set, sorted(expected_logos - id_set)
assert "alignment-guide" in id_set
assert next(node for node in root.iter() if node.get("id") == "alignment-guide").get("style") == "display:none"

text = " ".join((node.text or "") for node in root.findall(".//svg:text", NS))
for label in ("COPILOT IoT GAME", "IoT HUB", "EVENT HUBS", "AZURE FUNCTIONS",
              "SIGNALR", "DATAVERSE", "POWER PAGES", "POWER APPS",
              "COPILOT", "STUDIO", "ANDWORX FIELD KIT"):
    assert label in text, label

metadata = root.find("svg:metadata", NS)
assert metadata is not None and "MicrosoftCloudLogos" in (metadata.text or "")
print("PASS: 85 x 196 mm, eight source logos, unique IDs, resolved references")
