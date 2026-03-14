from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / "index.html"
JS_DIR = ROOT / "assets" / "js"

ID_RE = re.compile(r'id="([^"]+)"')
SELECTOR_RE = re.compile(r"PianoApp\.\$\(\s*['\"]([^'\"]+)['\"]\s*\)")
MODAL_RE = re.compile(r"(?:openModal|closeModal)\(\s*['\"]([^'\"]+)['\"]\s*\)")
STYLE_RE = re.compile(r"style\s*=")

STALE_PATTERNS = {
    "state.settings.bpm": re.compile(r"\bstate\.settings\.bpm\b"),
    "allowArpeggio": re.compile(r"\ballowArpeggio\b"),
    "chordTogetherMs": re.compile(r"\bchordTogetherMs\b"),
    "chordWindowMs": re.compile(r"\bchordWindowMs\b"),
    "arpSel": re.compile(r"\barpSel\b"),
    "chordSel": re.compile(r"\bchordSel\b"),
    "shapeSel": re.compile(r"\bshapeSel\b"),
    "structureStrict": re.compile(r"\bstructureStrict\b"),
}


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def main() -> int:
    findings: list[str] = []

    html = read_text(HTML_PATH)
    html_ids = set(ID_RE.findall(html))

    referenced_ids: set[str] = set()
    for path in sorted(JS_DIR.glob("*.js")):
        text = read_text(path)
        referenced_ids.update(SELECTOR_RE.findall(text))
        referenced_ids.update(MODAL_RE.findall(text))

        for name, pattern in STALE_PATTERNS.items():
            if pattern.search(text):
                findings.append(f"stale reference `{name}` in {path.relative_to(ROOT)}")

    missing_ids = sorted(ref for ref in referenced_ids if ref not in html_ids)
    for missing in missing_ids:
        findings.append(f"missing HTML id `{missing}` referenced from JS")

    if STYLE_RE.search(html):
        findings.append("inline style attribute still present in index.html")

    storage_path = JS_DIR / "storage.js"
    if STYLE_RE.search(read_text(storage_path)):
        findings.append("inline style attribute still present in assets/js/storage.js")

    if findings:
        print("Static check failed:")
        for item in findings:
            print(f"- {item}")
        return 1

    print("Static check passed.")
    print(f"- HTML ids scanned: {len(html_ids)}")
    print(f"- JS selector refs scanned: {len(referenced_ids)}")
    print(f"- JS files scanned: {len(list(JS_DIR.glob('*.js')))}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
