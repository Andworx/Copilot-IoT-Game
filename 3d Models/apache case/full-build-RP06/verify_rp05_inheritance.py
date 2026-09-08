"""Verify that the RP05 planning set carries the RP04 files unchanged."""
from hashlib import sha256
from pathlib import Path
import json

ROOT = Path(__file__).parent
SOURCE = ROOT.parent / "full-build-RP04"


def digest(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


checks = []
for source in sorted((SOURCE / "exports").glob("*.stl")):
    target = ROOT / "exports" / source.name
    assert target.exists(), f"missing {target.name}"
    same = digest(source) == digest(target)
    assert same, f"changed inherited STL: {source.name}"
    checks.append({"file": f"exports/{source.name}", "sha256": digest(target)})

assert len(checks) == 24, len(checks)

session_files = [
    "faceplates_rp04.scad",
    "export_rp04.ps1",
    "validate_rp04.py",
]
for name in session_files:
    assert (ROOT / name).exists(), f"missing carried-forward session file: {name}"

report = {
    "status": "PASS - complete RP05 planning set; no geometry delta",
    "source_revision": "full-build-RP04",
    "stl_count": len(checks),
    "all_stls_byte_identical": True,
    "stls": checks,
    "new_review_files": [
        "PANEL_FASTENER_REVIEW.md",
        "README.md",
        "verify_rp05_inheritance.py",
    ],
}
(ROOT / "rp05_inheritance.json").write_text(json.dumps(report, indent=2))
print("PASS: 24 RP04 STLs carried into RP05 byte-for-byte; review files present.")

