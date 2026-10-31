"""Merge lesson authors' proposals (tools/proposals/*.md) into GLOSSARY.md and RESOURCES.md.

  python tools/merge_proposals.py [--dry-run] [proposal.md ...]   (default: every file in tools/proposals/)

Glossary: each term block (**Term**: ... _Avoid_: ...) goes to the end of the group that the nearest
preceding instruction line names, e.g. "Add these under `## RTOS`" or a new-group line "`## Peripherals`".
Unknown groups are created before "## Course method". Terms that already exist are skipped.

Resources: each "- [Title](url)" entry (with its indented lines) goes to the end of the "### Section"
named by the nearest preceding instruction line; if none of the named sections exist, a fallback is
chosen from the URL. Entries whose URL is already in RESOURCES.md are skipped.

Merged files are moved to tools/proposals/merged/. Afterwards run build_reference.py.
"""
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROPOSALS = ROOT / "tools" / "proposals"
TERM_HEAD = re.compile(r"^\*\*([^*\n]+)\*\*:\s*$")
ENTRY_HEAD = re.compile(r"^- \[[^\]]+\]\((https?://[^)\s]+)\)")


def split_sections(text):
    """Return (glossary_part, resources_part) of a proposal file."""
    g = re.search(r"^## GLOSSARY[^\n]*$", text, re.M)
    r = re.search(r"^## RESOURCES[^\n]*$", text, re.M)
    gl = text[g.end(): r.start() if r and r.start() > g.start() else len(text)] if g else ""
    if r:
        rest = text[r.end():]
        nxt = re.search(r"^## ", rest, re.M)
        rs = rest[: nxt.start()] if nxt else rest
    else:
        rs = ""
    return gl, rs


def glossary_terms(part):
    """Yield (group, block) pairs."""
    group, lines, i = None, part.splitlines(), 0
    while i < len(lines):
        line = lines[i]
        m = re.findall(r"`(## [^`]+)`", line)
        if m:
            group = m[-1][3:].strip()
        if TERM_HEAD.match(line):
            block = [line]
            i += 1
            while i < len(lines) and not TERM_HEAD.match(lines[i]) and not lines[i].startswith("#") \
                    and not re.search(r"`## [^`]+`", lines[i]):
                block.append(lines[i])
                if lines[i].startswith("_Avoid_"):
                    i += 1
                    break
                i += 1
            yield group, "\n".join(block).strip()
            continue
        i += 1


def resource_entries(part):
    """Yield (candidate_sections, url, block) triples."""
    sections, lines, i = [], part.splitlines(), 0
    while i < len(lines):
        line = lines[i]
        named = re.findall(r"`(### [^`]+)`|\*\*(### ?[^*]+|[A-Z][^*]+ sources|Tools|Books[^*]*)\*\*", line)
        if not line.startswith("- ") and ("Add" in line or "add" in line or "under" in line) and named:
            sections = [a or b for a, b in named]
        m = ENTRY_HEAD.match(line)
        if m:
            block = [line]
            i += 1
            while i < len(lines) and lines[i].startswith("  "):
                block.append(lines[i])
                i += 1
            yield sections, m.group(1), "\n".join(block)
            continue
        i += 1


def fallback_section(url):
    u = url.lower()
    if any(k in u for k in ("freertos", "zephyrproject", "raspberrypi", "st.com", "arm.com", "github.com/stmicro",
                            "github.com/raspberrypi", "state-machine.com", "invensense", "adafruit")):
        return "### Vendor primary sources"
    if any(k in u for k in ("doi.org", "acm.org", "ieee.org", "catless.ncl.ac.uk", "misra", "nxp.com/docs")):
        return "### Protocol and topic specifications"
    if any(k in u for k in ("cppreference", "gcc.gnu.org", "cmake.org", "cmsis", "sourceware.org", "pico-sdk",
                            "throwtheswitch", "meekrosoft", "doxygen", "git-scm", "trunkbased")):
        return "### Language and build references"
    if any(k in u for k in ("docs.wokwi.com", "sigrok", "cppcheck", "github.com/wokwi", "arm-none-eabi-gcc-action")):
        return "### Tools"
    return "### Free courses and tutorials"


def find_heading(doc, heading):
    """Index of the line that starts with `heading` (headings may carry extra text, e.g. a note in brackets)."""
    for m in __import__("re").finditer(r"^" + __import__("re").escape(heading) + r"(?:\s.*)?$", doc, __import__("re").M):
        return m.start()
    return -1


def append_to_section(doc, heading, block, level):
    """Append block at the end of the section `heading` (a '## ' or '### ' line)."""
    start = find_heading(doc, heading)
    if start == -1:
        return None
    stops = [doc.find("\n## ", start + 1)]
    if level == 3:
        stops.append(doc.find("\n### ", start + 1))
    stops = [s for s in stops if s != -1]
    end = min(stops) if stops else len(doc)
    return doc[:end].rstrip("\n") + "\n\n" + block + "\n" + doc[end:]


def main(argv):
    dry = "--dry-run" in argv
    files = [Path(a) for a in argv if not a.startswith("--")] or sorted(PROPOSALS.glob("*.md"))
    gpath, rpath = ROOT / "GLOSSARY.md", ROOT / "RESOURCES.md"
    gdoc, rdoc = gpath.read_text(encoding="utf-8"), rpath.read_text(encoding="utf-8")
    known = {t.lower() for t in re.findall(r"^\*\*([^*\n]+)\*\*:", gdoc, re.M)}
    n_terms = n_res = 0
    for f in files:
        gl, rs = split_sections(f.read_text(encoding="utf-8"))
        for group, block in glossary_terms(gl):
            name = TERM_HEAD.match(block.splitlines()[0]).group(1).strip()
            if name.lower() in known or "_Avoid_" not in block:
                continue
            group = group or "Firmware and tools"
            new = append_to_section(gdoc, "## " + group, block, 2)
            if new is None:
                gdoc = gdoc.replace("\n## Course method", f"\n## {group}\n\n{block}\n\n## Course method", 1)
            else:
                gdoc = new
            known.add(name.lower())
            n_terms += 1
        for sections, url, block in resource_entries(rs):
            if url in rdoc or ("st.com" in url and "rm0008" in url.lower()):
                continue
            names = [x if x.startswith("###") else "### " + x for x in sections]
            target = next((n for n in names if find_heading(rdoc, n) != -1), None)
            target = target or fallback_section(url)
            new = append_to_section(rdoc, target, block, 3)
            if new is None:
                new = append_to_section(rdoc, "### Tools", block, 3)
            rdoc = new
            n_res += 1
        print(f"{f.name}: merged")
    print(f"{n_terms} glossary terms, {n_res} resources" + (" (dry run, nothing written)" if dry else ""))
    if not dry:
        gpath.write_text(gdoc, encoding="utf-8")
        rpath.write_text(rdoc, encoding="utf-8")
        (PROPOSALS / "merged").mkdir(exist_ok=True)
        for f in files:
            if f.resolve().parent == PROPOSALS:
                shutil.move(str(f), PROPOSALS / "merged" / f.name)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
