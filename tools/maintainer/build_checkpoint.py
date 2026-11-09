"""Write a checkpoint page's questions from its source file.

  python tools/maintainer/build_checkpoint.py            every tools/maintainer/checkpoints/cpNN.py
  python tools/maintainer/build_checkpoint.py cp03       one

A source file defines GOAL and SOURCES (HTML; SOURCES links the primary sources) QUESTIONS, the premade checkpoint; cpNN_bank*.py files each define BANK, more questions for the tests a learner
builds (ten per lesson in all, counted by each question's first lesson). Both are lists of
  (lessons, prompt, [right, wrong, wrong, wrong], why)
with the right option first; the build spreads the right answer over the four authored positions
(assets/checkpoint.js shuffles them again for the learner). The page keeps its title and subtitle;
everything after the subtitle up to </main> is written here. Then run check_course.py.
"""
import json
import re
import runpy
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "tools" / "maintainer" / "checkpoints"
sys.path.insert(0, str(ROOT / "tools" / "maintainer"))
from check_course import checkpoint_target  # noqa: E402


def manifest():
    text = (ROOT / "assets" / "manifest.js").read_text(encoding="utf-8")
    return json.loads(text[text.index("{"): text.rindex("}") + 1])


def build(cp):
    src = runpy.run_path(str(SRC / f"{cp}.py"))
    data = manifest()
    part = next(p for p in data["parts"] if any(i["id"] == cp for i in p["items"]))
    item = next(i for i in part["items"] if i["id"] == cp)
    lessons = [i for i in part["items"] if i["kind"] == "lesson"]
    page = ROOT / "lessons" / item["file"]
    raw = page.read_bytes().decode("utf-8")
    crlf = "\r\n" in raw
    t = raw.replace("\r\n", "\n")

    qs = []
    bank = [q for f in sorted(SRC.glob(f"{cp}_bank*.py")) for q in runpy.run_path(str(f))["BANK"]]
    tagged = [(q, True) for q in src["QUESTIONS"]] + [(q, False) for q in bank]
    for n, ((tags, prompt, options, why), premade) in enumerate(tagged):
        k = (n * 7 + 1) % 4                      # spread the right answer over the four positions
        opts = options[1:]
        opts.insert(k, options[0])
        q = {"prompt": prompt, "options": opts, "answer": k, "lessons": [f"{int(x):04d}" for x in tags]}
        if premade:
            q["set"] = True
        q["why"] = why
        qs.append(q)
    body = json.dumps({"questions": qs}, ensure_ascii=False, indent=1)
    body = body.replace("</", "<\\/")
    n = sum(1 for q in qs if q.get("set"))
    nxt = data["parts"][data["parts"].index(part) + 1] if part is not data["parts"][-1] else None
    first, last = lessons[0]["number"], lessons[-1]["number"]
    block = f'''
  <div class="goal">
    {src["GOAL"].strip()}
  </div>

  <p>
    The checkpoint has {n} multiple-choice questions on lessons {first} to {last}, one at a time. Each question draws on one to three of those lessons, and the result estimates how well each lesson has stuck, so you know what to go over again{f" before Part {nxt['number']}" if nxt else ""}. Answer from memory and keep going: speed is fine. When you do not know, press <em>I don't know</em>, because a lucky guess hides a lesson you should revisit. The right answers, with explanations, come at the end.
  </p>

  <p>
    Below the checkpoint you can also build your own test from the bank of {len(qs)} questions: pick the lessons you want, for example the ones the checkpoint marked <em>Go over again</em> after you have reread them, and choose how many questions to answer.
  </p>

  <div class="widget checkpoint">
    <script type="application/json">
{body}
    </script>
  </div>

  <div class="source">
    {src["SOURCES"].strip()}
  </div>

  <div class="ask">
    Ask your teacher (the AI agent in this workspace) to work on your result with you. Try: "My Part {part['number']} checkpoint marked these lessons <em>Go over again</em>: [list them]. Quiz me on them one question at a time, and when I miss one, tell me which section of the lesson to reread."
  </div>
'''
    a = t.index('<p class="subtitle">')
    sub = (f'<p class="subtitle">How well have lessons {first} to {last} stuck? A quick test, one question '
           f'at a time, with a result for every lesson of Part {part['number']}.</p>')
    t = t[:a] + sub + t[t.index("</p>", a) + 4:]
    a = t.index("</p>", a) + 4
    b = t.index("</main>")
    t = t[:a] + "\n" + block + t[b:]
    if "checkpoint.js" not in t:
        t = t.replace('<script src="../assets/course.js"></script>',
                      '<script src="../assets/course.js"></script>\n<script src="../assets/checkpoint.js"></script>')
    page.write_bytes((t.replace("\n", "\r\n") if crlf else t).encode("utf-8"))
    target = checkpoint_target(len(lessons))
    print(f"{item['file']}: {n} questions (target {target}) for lessons {first}-{last}")


def main(argv):
    names = argv or sorted(p.stem for p in SRC.glob("cp[0-9][0-9].py"))
    for cp in names:
        build(cp)


if __name__ == "__main__":
    main(sys.argv[1:])
