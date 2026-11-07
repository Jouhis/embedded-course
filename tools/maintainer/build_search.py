"""Build the course search index (assets/search/), read by assets/search.js.

Usage:
  python tools/maintainer/build_search.py              keyword index only (assets/search/index.json)
  python tools/maintainer/build_search.py --semantic   also the embedding vectors (assets/search/vectors.bin);
                                            needs Node and `npm ci` in tools/maintainer/search first

Every lesson, lab, checkpoint and bench lab in the manifest, and every reference sheet, is split
into sections at each <h2>/<h3> (outside widgets). Glossary terms (<dt id>) are sections of their
own. Quizzes, scripts, SVG, widgets and CircuitJS netlists are left out, so search never shows a
quiz answer. assets/search/ is generated: it is git-ignored and built again on every deploy.

Section anchors: a heading without an id gets one from its text (slug() below). assets/search.js
gives the headings the same ids in the page, with the same rule, so the two must stay in step.
"""
import argparse
import json
import re
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assets" / "search"
PASSAGES = ROOT / "build" / "search-passages.json"   # input for tools/maintainer/search/embed.mjs

SKIP_TAGS = {"head", "script", "style", "svg", "nav", "template", "button"}
SKIP_CLASSES = {"widget", "circuitjs", "pager", "complete-bar"}
PASSAGE_WORDS = 180       # the model reads about 256 tokens; longer sections are split


def slug(text):
    """Must match slug() in assets/search.js."""
    s = re.sub(r"[^A-Za-z0-9]+", "-", text).strip("-").lower()
    return s or "section"


class Sections(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip = []            # [tag, depth] of the element being skipped, innermost last
        self.sections = []        # {"h": heading, "a": anchor, "x": [text]}
        self.title = ""
        self.used = set()
        self.in_head = None       # "h1" / "h2" / "dt" while reading a heading
        self.head_id = None
        self.head_text = []
        self.cur = {"h": "", "a": "", "x": []}

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if self.skip:
            if tag == self.skip[-1][0]:
                self.skip[-1][1] += 1
            return
        classes = set((a.get("class") or "").split())
        if tag in SKIP_TAGS or classes & SKIP_CLASSES:
            self.skip.append([tag, 1])
            return
        if tag in ("h1", "h2", "h3") or (tag == "dt" and a.get("id")):
            self.in_head, self.head_id, self.head_text = tag, a.get("id"), []
        elif tag in ("p", "li", "tr", "br", "pre", "dd", "td", "th", "div"):
            self.text(" ")

    def handle_endtag(self, tag):
        if self.skip:
            if tag == self.skip[-1][0]:
                self.skip[-1][1] -= 1
                if self.skip[-1][1] == 0:
                    self.skip.pop()
            return
        if tag == self.in_head:
            text = " ".join("".join(self.head_text).split())
            if tag == "h1":
                self.title = text
            else:
                anchor = self.head_id
                if not anchor:
                    base = anchor = slug(text)
                    n = 2
                    while anchor in self.used:
                        anchor, n = f"{base}-{n}", n + 1
                self.used.add(anchor)
                self.flush()
                self.cur = {"h": text, "a": anchor, "x": []}
            self.in_head = None

    def handle_data(self, data):
        if self.skip:
            return
        if self.in_head:
            self.head_text.append(data)
        else:
            self.text(data)

    def text(self, s):
        self.cur["x"].append(s)

    def flush(self):
        body = " ".join("".join(self.cur["x"]).split())
        if body or self.cur["h"]:
            self.sections.append({"h": self.cur["h"], "a": self.cur["a"], "x": body})

    def done(self):
        self.flush()
        return self.title, self.sections


def manifest_items():
    text = (ROOT / "assets" / "manifest.js").read_text(encoding="utf-8")
    m = json.loads(text[text.index("{"):text.rindex("}") + 1])
    items = [i for p in m["parts"] for i in p["items"]] + m.get("bench", [])
    for i in items:
        if not i.get("published"):
            continue
        kind, n = i["kind"], i.get("number")
        label = {"lesson": f"Lesson {n}", "bench": f"Bench lab {n}", "lab": "Lab",
                 "checkpoint": "Checkpoint"}.get(kind, kind.title())
        yield "lessons/" + i["file"], label, i["title"]


def pages():
    yield from manifest_items()
    for f in sorted((ROOT / "reference").glob("*.html")):
        if f.name != "index.html":
            yield "reference/" + f.name, "Reference", None


def build():
    docs, passages = [], []
    for path, label, title in pages():
        file = ROOT / path
        if not file.exists():
            continue
        p = Sections()
        p.feed(file.read_text(encoding="utf-8"))
        page_title, sections = p.done()
        title = title or page_title
        for s in sections:
            if not s["x"] and not s["h"]:
                continue
            d = len(docs)
            docs.append({"u": path + ("#" + s["a"] if s["a"] else ""), "l": label, "t": title,
                         "h": s["h"], "x": s["x"]})
            words = s["x"].split()
            head = f"{title}. {s['h']}." if s["h"] else f"{title}."
            for k in range(0, max(len(words), 1), PASSAGE_WORDS):
                passages.append({"d": d, "x": head + " " + " ".join(words[k:k + PASSAGE_WORDS])})
    return docs, passages


def main(argv):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--semantic", action="store_true", help="also build the embedding vectors (Node)")
    a = ap.parse_args(argv)

    docs, passages = build()
    OUT.mkdir(parents=True, exist_ok=True)
    index = {"version": 1, "docs": docs}
    (OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")),
                                    encoding="utf-8")
    size = (OUT / "index.json").stat().st_size
    print(f"search index: {len(docs)} sections, {size / 1e6:.1f} MB -> assets/search/index.json", flush=True)

    if not a.semantic:
        (OUT / "vectors.bin").unlink(missing_ok=True)
        (OUT / "vectors.json").unlink(missing_ok=True)
        return 0
    PASSAGES.parent.mkdir(parents=True, exist_ok=True)
    PASSAGES.write_text(json.dumps(passages, ensure_ascii=False), encoding="utf-8")
    embed = ROOT / "tools" / "maintainer" / "search" / "embed.mjs"
    if not (ROOT / "tools" / "maintainer" / "search" / "node_modules").exists():
        print("Run `npm ci` in tools/maintainer/search first (needs Node).", file=sys.stderr)
        return 1
    return subprocess.call(["node", str(embed), str(PASSAGES), str(OUT)])


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
