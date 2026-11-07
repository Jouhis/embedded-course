"""Build assets/vendor/highlight/highlight.min.js from the official highlight.js browser build.

Usage: python -I tools/maintainer/vendor_highlight.py [VERSION]

Downloads @highlightjs/cdn-assets from the npm registry, takes the core plus only the languages
the lessons use, and writes one classic script (no ES module, so it loads from file:// too).
The course-specific grammars (linker script, Kconfig) and the theme live in assets/course.js
and assets/course.css, not here.
"""
import io
import json
import pathlib
import re
import sys
import tarfile
import urllib.request

VERSION = sys.argv[1] if len(sys.argv) > 1 else "11.12.0"
LANGUAGES = ["c", "armasm", "bash", "powershell", "cmake", "dts", "ini", "rust", "markdown", "yaml", "plaintext"]
ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "assets" / "vendor" / "highlight"


def main():
    meta = json.load(urllib.request.urlopen(f"https://registry.npmjs.org/@highlightjs/cdn-assets/{VERSION}"))
    data = urllib.request.urlopen(meta["dist"]["tarball"]).read()
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tar:
        read = lambda name: tar.extractfile(f"package/{name}").read().decode("utf-8")
        core = read("es/core.min.js")
        core, n = re.subn(r"export\{(\w+) as default\};?\s*$", r"window.hljs=\1;", core)
        if n != 1:
            sys.exit("core.min.js: could not find the ES module export to rewrite")
        parts = [core] + [read(f"languages/{lang}.min.js") for lang in LANGUAGES]
        licence = read("LICENSE")
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "highlight.min.js").write_text("\n".join(parts) + "\n", encoding="utf-8", newline="\n")
    (OUT / "LICENSE").write_text(licence, encoding="utf-8", newline="\n")
    (OUT / "VERSION").write_text(f"highlight.js {VERSION}: core + {', '.join(LANGUAGES)}\n", encoding="utf-8", newline="\n")
    print(f"wrote {OUT / 'highlight.min.js'} ({(OUT / 'highlight.min.js').stat().st_size} bytes)")


if __name__ == "__main__":
    main()
