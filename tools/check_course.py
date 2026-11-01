"""Validate lesson HTML files against the course rules.

Checks, per lesson file in lessons/:
  - data-lesson id and file name match assets/manifest.js
  - required sections exist (goal, win, interview, source, ask, quiz)
  - quiz JSON parses; multiple-choice options have equal word counts and similar
    character lengths (the teach skill's "no clues from formatting" rule)
  - local links and project folders exist; no template placeholders remain

Usage:  python tools/check_course.py [lesson-file ...]
Exit code 1 if any error was found.
"""
import html.parser
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LESSONS = ROOT / "lessons"
CHAR_SPREAD = 0.30          # longest option may be at most 30 % longer than the shortest
PLACEHOLDERS = ["LESSON TITLE", "ONE CONCRETE", "DESCRIBE THE CHANGE", "OBSERVABLE RESULT",
                "TITLE OF THE SINGLE", "SUGGESTED FOLLOW-UP", 'data-lesson="0000"', "TODO", "Lorem"]


def load_manifest():
    text = (ROOT / "assets" / "manifest.js").read_text(encoding="utf-8")
    data = json.loads(text[text.index("{"): text.rindex("}") + 1])
    return {i["file"]: i for p in data["parts"] for i in p["items"]}


class Scan(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.classes, self.links, self.quizzes = [], [], []
        self.body_lesson = None
        self._in_json = False
        self._buf = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        self.classes += (a.get("class") or "").split()
        if tag == "body":
            self.body_lesson = a.get("data-lesson")
        for key in ("href", "src"):
            if a.get(key):
                self.links.append(a[key])
        if tag == "script" and a.get("type") == "application/json":
            self._in_json, self._buf = True, []

    def handle_endtag(self, tag):
        if tag == "script" and self._in_json:
            self.quizzes.append("".join(self._buf))
            self._in_json = False

    def handle_data(self, data):
        if self._in_json:
            self._buf.append(data)


def strip_tags(s):
    return re.sub(r"<[^>]+>", "", s)


def check_quiz(raw, label, errors, warnings):
    try:
        spec = json.loads(raw)
    except json.JSONDecodeError as e:
        errors.append(f"{label}: invalid JSON ({e})")
        return 0
    qs = spec.get("questions", [])
    for n, q in enumerate(qs, 1):
        where = f"{label} Q{n}"
        t = q.get("type")
        if not q.get("prompt"):
            errors.append(f"{where}: missing prompt")
        if not q.get("why"):
            warnings.append(f"{where}: no 'why' explanation")
        if t == "mc":
            opts = q.get("options", [])
            if len(opts) < 3:
                errors.append(f"{where}: needs at least 3 options")
                continue
            if not isinstance(q.get("answer"), int) or not 0 <= q["answer"] < len(opts):
                errors.append(f"{where}: answer index out of range")
            plain = [strip_tags(o).strip() for o in opts]
            words = {len(o.split()) for o in plain}
            if len(words) > 1:
                errors.append(f"{where}: options differ in word count {[len(o.split()) for o in plain]} (in authored order): {plain}")
            lens = [len(o) for o in plain]
            if min(lens) and max(lens) - min(lens) > 3 and (max(lens) - min(lens)) / min(lens) > CHAR_SPREAD:
                errors.append(f"{where}: option lengths vary too much {lens} (in authored order): {plain}")
            if len(set(p.lower() for p in plain)) != len(plain):
                errors.append(f"{where}: duplicate options")
        elif t == "number":
            if not isinstance(q.get("answer"), (int, float)):
                errors.append(f"{where}: numeric answer missing")
        elif t == "text":
            if not q.get("accept"):
                errors.append(f"{where}: 'accept' list missing")
        else:
            errors.append(f"{where}: unknown type {t!r}")
    return len(qs)


def check_file(path, manifest):
    errors, warnings = [], []
    text = path.read_text(encoding="utf-8")
    item = manifest.get(path.name)
    if item is None:
        errors.append("file name not in manifest (check COURSE-PLAN.md / build_manifest.py)")
        return errors, warnings

    s = Scan()
    s.feed(text)
    if s.body_lesson != item["id"]:
        errors.append(f"<body data-lesson> is {s.body_lesson!r}, expected {item['id']!r}")

    for p in PLACEHOLDERS:
        if p in text.replace("TODO(learner)", ""):
            errors.append(f"template placeholder left in: {p!r}")

    required = {"lesson": ["goal", "win", "interview", "source", "ask", "quiz"],
                "lab": ["goal", "win", "source", "ask", "quiz"],
                "checkpoint": ["goal", "ask", "quiz"]}[item["kind"]]
    for cls in required:
        if cls not in s.classes:
            errors.append(f"missing required section .{cls}")

    total = sum(check_quiz(q, f"quiz {i + 1}", errors, warnings) for i, q in enumerate(s.quizzes))
    minimum = {"lesson": 4, "lab": 3, "checkpoint": 15}[item["kind"]]
    if total < minimum:
        errors.append(f"only {total} quiz questions (minimum {minimum} for a {item['kind']})")

    if "manifest.js" not in text or "course.js" not in text:
        errors.append("must load ../assets/manifest.js and ../assets/course.js")

    for link in s.links:
        if re.match(r"^(https?:|mailto:|#|data:)", link):
            continue
        target = (path.parent / link.split("#")[0]).resolve()
        if not target.exists():
            errors.append(f"broken local link: {link}")
        elif "#" in link and target.suffix == ".html" and target.name == "glossary.html":
            anchor = link.split("#", 1)[1]
            if f'id="{anchor}"' not in target.read_text(encoding="utf-8"):
                errors.append(f"glossary anchor not found: #{anchor} (run build_reference.py, or fix the spelling)")

    for proj in set(re.findall(r"projects/(\d{4}-[a-z0-9-]+)", text)):
        if not (ROOT / "projects" / proj).exists():
            errors.append(f"referenced project folder missing: projects/{proj}")

    hands_on = ("projects/" in text or "falstad.com/circuit" in text
                or re.search(r'class="widget (cpusim|bitreg|bitdrill|calc)', text)
                or re.search(r"<body[^>]*\bdata-concept\b", text))
    if item["kind"] == "lesson" and not item["conceptOnly"] and not hands_on and item["number"] >= 2:
        warnings.append("hands-on lesson references no Wokwi project (fine only for pure-theory lessons)")
    if item["kind"] in ("lesson", "lab"):
        import re as _re
        body = _re.sub(r"<script.*?</script>|<svg.*?</svg>|<pre.*?</pre>", " ", text, flags=_re.S)
        prose = len(_re.sub(r"<[^>]+>", " ", body).split())
        if prose < 2000:
            warnings.append(f"explainer is short ({prose} words of prose; the depth standard is about 2,500-3,500, LESSON-SPEC section 17)")
        heads = " | ".join(h.lower() for h in _re.findall(r"<h[23][^>]*>(.*?)</h[23]>", text, flags=_re.S))
        for need, words in (("common mistakes", ("mistake", "pitfall", "gotcha")),
                            ("summary", ("summary", "key points", "recap", "remember"))):
            if not any(w in heads for w in words):
                warnings.append(f"no '{need}' heading (<h2>/<h3>; LESSON-SPEC section 17)")

    if not re.search(r'href="https?://', text):
        errors.append("no external citation links")
    return errors, warnings


def main(argv):
    manifest = load_manifest()
    files = [Path(a) for a in argv] if argv else sorted(LESSONS.glob("*.html"))
    bad = 0
    for f in files:
        errors, warnings = check_file(f.resolve(), manifest)
        status = "FAIL" if errors else "ok  "
        print(f"{status} {f.name}")
        for e in errors:
            print(f"     error: {e}")
        for w in warnings:
            print(f"     warn:  {w}")
        bad += bool(errors)
    print(f"\n{len(files) - bad}/{len(files)} files pass")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
