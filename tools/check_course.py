"""Validate lesson HTML files against the course rules.

Checks, per lesson file in lessons/:
  - data-lesson id and file name match assets/manifest.js
  - required sections exist (goal, win, source, ask, quiz)
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
CHAR_SPREAD = 0.50          # longest option may be at most 50 % longer than the shortest
PLACEHOLDERS = ["LESSON TITLE", "ONE CONCRETE", "DESCRIBE THE CHANGE", "OBSERVABLE RESULT",
                "TITLE OF THE SINGLE", "SUGGESTED FOLLOW-UP", 'data-lesson="0000"', "TODO", "Lorem"]
# Languages bundled in assets/vendor/highlight (tools/vendor_highlight.py) plus the two course.js
# grammars (ld, kconfig). "plaintext" is for logs, tool output and worked arithmetic: never coloured.
CODE_LANGUAGES = {"c", "armasm", "bash", "powershell", "cmake", "dts", "ini", "rust", "markdown",
                  "yaml", "ld", "kconfig", "plaintext"}


def load_manifest():
    text = (ROOT / "assets" / "manifest.js").read_text(encoding="utf-8")
    data = json.loads(text[text.index("{"): text.rindex("}") + 1])
    return {i["file"]: i for i in [i for p in data["parts"] for i in p["items"]] + data.get("bench", [])}


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


# ---------- Formula answers: a port of the engine in assets/course.js ----------
# Keep the two in step: same normalisation, tokens, implicit multiplication and precedence.
import math as _math

_FUNCS = {"sqrt": _math.sqrt, "abs": abs, "ln": _math.log, "log10": _math.log10, "log2": _math.log2,
          "log": _math.log10, "exp": _math.exp, "sin": _math.sin, "cos": _math.cos, "tan": _math.tan}
_FUNC_NAMES = sorted(_FUNCS, key=len, reverse=True)


def _norm_formula(s):
    s = str(s)
    for i, d in enumerate("₀₁₂₃₄₅₆₇₈₉"):
        s = s.replace(d, str(i))
    for a, b in (("×", "*"), ("·", "*"), ("∙", "*"), ("⋅", "*"), ("÷", "/"), ("−", "-"), ("–", "-"),
                 ("—", "-"), ("**", "^"), ("²", "^2"), ("³", "^3"), ("√", "sqrt"), ("π", "pi"), (",", ".")):
        s = s.replace(a, b)
    return re.sub(r"[\s_]+", "", s)


def _tokenize(s, vars_):
    names = sorted(((v.replace("_", ""), v) for v in vars_), key=lambda n: len(n[0]), reverse=True)
    low, out, i = s.lower(), [], 0
    while i < len(s):
        m = re.match(r"(\d+\.?\d*|\.\d+)(e[+-]?\d+)?", s[i:], re.I)
        if m:
            out.append(("num", float(m.group(0))))
            i += len(m.group(0))
            continue
        if s[i] in "+-*/^()":
            out.append((s[i], None))
            i += 1
            continue
        hit = None
        for f in _FUNC_NAMES:
            if low.startswith(f, i) and s[i + len(f): i + len(f) + 1] == "(":
                hit = ("fn", f, len(f))
                break
        if not hit:
            hit = next((("var", n, len(k)) for k, n in names if s.startswith(k, i)), None)
        if not hit and low.startswith("pi", i):
            hit = ("num", _math.pi, 2)
        if not hit:
            hit = next((("var", n, len(k)) for k, n in names if low.startswith(k.lower(), i)), None)
        if not hit:
            return None
        out.append(hit[:2])
        i += hit[2]
    full = []
    for k, tok in enumerate(out):
        if k and full and full[-1][0] in ("num", "var", ")") and tok[0] in ("num", "var", "(", "fn"):
            full.append(("*", None))
        full.append(tok)
    return full


def compile_formula(text, vars_):
    toks = _tokenize(_norm_formula(text), vars_ or [])
    if not toks:
        return None
    pos = [0]

    def peek():
        return toks[pos[0]][0] if pos[0] < len(toks) else None

    def take():
        pos[0] += 1
        return toks[pos[0] - 1]

    def expr():
        f = term()
        while f and peek() in ("+", "-"):
            op, a, b = take()[0], f, term()
            if not b:
                return None
            f = (lambda a, b: lambda e: a(e) + b(e))(a, b) if op == "+" else (lambda a, b: lambda e: a(e) - b(e))(a, b)
        return f

    def term():
        f = unary()
        while f and peek() in ("*", "/"):
            op, a, b = take()[0], f, unary()
            if not b:
                return None
            f = (lambda a, b: lambda e: a(e) * b(e))(a, b) if op == "*" else (lambda a, b: lambda e: a(e) / b(e))(a, b)
        return f

    def unary():
        if peek() == "-":
            take()
            a = unary()
            return a and (lambda e: -a(e))
        if peek() == "+":
            take()
            return unary()
        return power()

    def power():
        a = primary()
        if a and peek() == "^":
            take()
            b = unary()
            return b and (lambda e: a(e) ** b(e))
        return a

    def primary():
        if pos[0] >= len(toks):
            return None
        kind, val = take()
        if kind == "num":
            return lambda e: val
        if kind == "var":
            return lambda e: e[val]
        if kind == "(":
            a = expr()
            if not a or peek() != ")":
                return None
            take()
            return a
        if kind == "fn" and peek() == "(":
            take()
            a = expr()
            if not a or peek() != ")":
                return None
            take()
            fn = _FUNCS[val]
            return lambda e: fn(a(e))
        return None

    f = expr()
    return f if f and pos[0] == len(toks) else None


def _safe(f, env):
    try:
        v = f(env)
        return v if isinstance(v, float) or isinstance(v, int) else float("nan")
    except (ZeroDivisionError, ValueError, OverflowError, TypeError):
        return float("nan")


def formula_matches(text, q):
    vars_ = q.get("vars") or []
    ref = compile_formula(q.get("answer", ""), vars_)
    if not ref:
        return False
    lo, hi = (q.get("range") or [0.5, 4])[:2]
    seed = [12345]

    def rand():
        seed[0] = (seed[0] * 1103515245 + 12345) % 2147483648
        return seed[0] / 2147483648

    envs = [{v: lo + (hi - lo) * rand() for v in vars_} for _ in range(8)]
    for side in [x for x in _norm_formula(text).split("=") if x]:
        f = compile_formula(side, vars_)
        if not f:
            continue
        compared, ok = 0, True
        for env in envs:
            a, b = _safe(f, env), _safe(ref, env)
            fa, fb = _math.isfinite(a), _math.isfinite(b)
            if not fa and not fb:
                continue
            if fa != fb or abs(a - b) > 1e-9 + 1e-6 * max(abs(a), abs(b)):
                ok = False
                break
            compared += 1
        if ok and compared >= 3:
            return True
    return False


BLAND_PROMPT = re.compile(r"^\s*(\d+\.\s*)?(in|from) lesson \d+[^?]*\b(what is|what's|what was|which|name)\b", re.I)


def strip_tags(s):
    return re.sub(r"<[^>]+>", "", s)


def check_quiz(raw, label, errors, warnings):
    """Validate one quiz widget; return the number of scored questions (reflect is not scored)."""
    try:
        spec = json.loads(raw)
    except json.JSONDecodeError as e:
        errors.append(f"{label}: invalid JSON ({e})")
        return 0
    qs = spec.get("questions", [])
    scored = 0
    for n, q in enumerate(qs, 1):
        where = f"{label} Q{n}"
        t = q.get("type")
        if not q.get("prompt"):
            errors.append(f"{where}: missing prompt")
        elif BLAND_PROMPT.search(strip_tags(q["prompt"])):
            warnings.append(f"{where}: recall-style prompt ('In lesson N, what is ...'): ask the learner to use the idea instead")
        if t != "reflect" and not q.get("why"):
            warnings.append(f"{where}: no 'why' explanation")
        if "hint" in q and not isinstance(q["hint"], str):
            errors.append(f"{where}: 'hint' must be a string")
        if t == "mc":
            opts = q.get("options", [])
            if len(opts) < 3:
                errors.append(f"{where}: needs at least 3 options")
                continue
            if not isinstance(q.get("answer"), int) or not 0 <= q["answer"] < len(opts):
                errors.append(f"{where}: answer index out of range")
            plain = [strip_tags(o).strip() for o in opts]
            lens = [len(o) for o in plain]
            if min(lens) and max(lens) - min(lens) > 3 and (max(lens) - min(lens)) / min(lens) > CHAR_SPREAD:
                errors.append(f"{where}: option lengths vary too much {lens} (in authored order): {plain}")
            if len(set(p.lower() for p in plain)) != len(plain):
                errors.append(f"{where}: duplicate options")
            fb = q.get("feedback")
            if fb is None:
                warnings.append(f"{where}: no per-option 'feedback' (one line per option saying why it is right or wrong)")
            elif not isinstance(fb, list) or len(fb) != len(opts) or not all(isinstance(x, str) and x for x in fb):
                errors.append(f"{where}: 'feedback' must be a list of {len(opts)} non-empty strings, one per option")
        elif t == "number":
            if not isinstance(q.get("answer"), (int, float)):
                errors.append(f"{where}: numeric answer missing")
            for w in q.get("wrong") or []:
                if not (isinstance(w, dict) and isinstance(w.get("answer"), (int, float)) and w.get("feedback")):
                    errors.append(f"{where}: number 'wrong' entries must be {{\"answer\": <number>, \"feedback\": \"...\"}}")
        elif t == "text":
            if not q.get("accept") and not q.get("contains"):
                errors.append(f"{where}: 'accept' (or 'contains') list missing")
        elif t == "formula":
            vars_ = q.get("vars")
            if not vars_ or not isinstance(vars_, list):
                errors.append(f"{where}: 'vars' list missing")
                continue
            if not compile_formula(q.get("answer", ""), vars_):
                errors.append(f"{where}: reference 'answer' does not parse: {q.get('answer')!r}")
                continue
            examples = q.get("examples") or []
            if len(examples) < 2:
                errors.append(f"{where}: give at least 2 'examples' (other ways a learner may write the answer)")
            for ex in examples:
                if not formula_matches(ex, q):
                    errors.append(f"{where}: example {ex!r} is not accepted as equal to {q['answer']!r}")
            for ex in q.get("wrong") or []:
                text = ex.get("answer", "") if isinstance(ex, dict) else ex
                if isinstance(ex, dict) and not compile_formula(text, vars_):
                    errors.append(f"{where}: 'wrong' answer {text!r} does not parse, so its feedback never shows")
                elif formula_matches(text, q):
                    errors.append(f"{where}: 'wrong' example {text!r} is accepted, but should not be")
        elif t == "reflect":
            if not q.get("answer"):
                errors.append(f"{where}: reflect needs a model 'answer'")
            continue
        else:
            errors.append(f"{where}: unknown type {t!r}")
        scored += 1
    return scored


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

    required = {"lesson": ["goal", "win", "source", "ask", "quiz"],
                "lab": ["goal", "win", "source", "ask", "quiz"],
                "bench": ["goal", "win", "source", "ask", "quiz"],
                "checkpoint": ["goal", "ask", "quiz"]}[item["kind"]]
    for cls in required:
        if cls not in s.classes:
            errors.append(f"missing required section .{cls}")

    total = sum(check_quiz(q, f"quiz {i + 1}", errors, warnings) for i, q in enumerate(s.quizzes))
    minimum = {"lesson": 3, "lab": 3, "bench": 3, "checkpoint": 10}[item["kind"]]
    if total < minimum:
        errors.append(f"only {total} scored quiz questions (minimum {minimum} for a {item['kind']})")

    if "manifest.js" not in text or "course.js" not in text:
        errors.append("must load ../assets/manifest.js and ../assets/course.js")

    # Code blocks: every <pre><code> names its language, so course.js can highlight it.
    # Quiz prompts hold code too, with the quotes escaped inside the JSON.
    for m in re.finditer(r'<pre><code(?: class=\\?"([^"\\]*)\\?")?>', text):
        lang = (m.group(1) or "").removeprefix("language-")
        if lang not in CODE_LANGUAGES:
            line = text.count("\n", 0, m.start()) + 1
            errors.append(f"line {line}: <pre><code> needs class=\"language-X\", X one of {', '.join(sorted(CODE_LANGUAGES))}"
                          + (f" (got {m.group(1)!r})" if m.group(1) else ""))

    # Callout boxes are block elements; inside a <p> as a <span> they break mid-line.
    for m in re.finditer(r'<span class="(goal|win|note|warning|source|ask)"', text):
        line = text.count("\n", 0, m.start()) + 1
        errors.append(f"line {line}: .{m.group(1)} is a box: use <div class=\"{m.group(1)}\"> outside the paragraph, not a <span>")

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

    for proj in set(re.findall(r"projects/((?:\d{4}|lab\d{2}|bench\d{2})-[a-z0-9-]+)", text)):
        if not (ROOT / "projects" / proj).exists():
            errors.append(f"referenced project folder missing: projects/{proj}")

    hands_on = ("projects/" in text or "falstad.com/circuit" in text
                or re.search(r'class="widget (cpusim|bitreg|bitdrill|calc)', text)
                or re.search(r"<body[^>]*\bdata-concept\b", text))
    if item["kind"] == "lesson" and not item["conceptOnly"] and not hands_on and item["number"] >= 2:
        warnings.append("hands-on lesson references no Wokwi project (fine only for pure-theory lessons)")
    if item["kind"] == "bench":
        # Bench labs: one hour on real hardware (COURSE-PLAN, Bench Track). They need a board-stage
        # section and must say that they are optional.
        low = text.lower()
        if "optional" not in low:
            errors.append("bench lab must say it is optional (COURSE-PLAN, Bench Track)")
        if not re.search(r"<h2[^>]*>[^<]*(board|bench)", text, flags=re.I):
            warnings.append("no <h2> for the board stage (a heading with 'board' or 'bench')")
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
    for tag in re.findall(r'<a\s[^>]*href="https?://[^"]*"[^>]*>', text):
        if 'target="_blank"' not in tag and "jouhis.github.io/embedded-course" not in tag:
            errors.append(f'external link must open in a new tab (add target="_blank" rel="noopener"): {tag}')
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
