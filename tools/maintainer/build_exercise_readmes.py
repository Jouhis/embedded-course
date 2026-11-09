"""Write a README.md into every exercise folder: what the exercise is, its steps, which files
you change, and how you know you are done. Generated from the lesson pages and the projects, so
edit those (not the READMEs) and run this again.

  python tools/maintainer/build_exercise_readmes.py           write every README
  python tools/maintainer/build_exercise_readmes.py --check   fail if any README is missing or stale

Where it goes: projects/<id>/starter/README.md, the folder the learner opens in VS Code. A project
without a starter (a demo to run, or a bench project) gets projects/<id>/README.md.

What goes in it:
- The lesson's title and a link to it on the course site.
- The lesson section that walks through the project: its opening paragraphs, its numbered steps
  and its hints. That is the <h2> section of the project's own lesson that names
  projects/<id> and has an <ol class="steps">. SECTION below overrides the choice.
- The files the exercise touches: the starter files that differ from the solution, the files only
  the solution has, and how many TODO(learner) markers each starter file holds.
- The pass line (// EXPECT: in main.c), when the project has one.
"""
import html
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LESSONS = ROOT / "lessons"
SITE = "https://jouhis.github.io/embedded-course/lessons/"

# Projects the rule above gets wrong, or that more than one lesson uses:
# project -> [(lesson number, <h2> text), ...] in the order the learner meets them.
SECTION = {
    "0087-freertos-tasks": [("0087", "Try it: three tasks on the Blue Pill"),
                            ("0089", "Try it in the FreeRTOS project")],
    "0093-stack-and-timing": [("0092", "Try it: measure the stacks"),
                              ("0093", "Try it: time the tasks and check the bound")],
    "0118-dryer-modbus-bootloader": [("0118", "Try it: the register that starts the dryer"),
                                     ("0119", "Try it: the bootloader in the simulator")],
}


# Projects whose work is in another project's starter (the host-test projects compile the
# firmware's application files), or that continue a previous lesson's work in the same folder.
# project -> [(path from the starter folder, note)]
FILES = {
    "0115-dryer-host-tests": [("../../0116-dryer-drivers/starter/app/ntc.c",
                               "the tests here compile this file")],
    "0116-dryer-drivers": [("app/safety.c", "and `app/ntc.c` from lesson 115, if you haven't "
                                            "done it yet")],
    "0117-dryer-host-tests": [("../../0117-dryer-rtos-pid/starter/app/controller.c",
                               "the tests here compile this file")],
}
SCENARIO = re.compile(r"\.ya?ml$")   # Wokwi CI scenarios (press-button.yaml), not learner work


def git_files(folder):
    out = subprocess.run(["git", "ls-files", "-z", "--", str(folder)], cwd=ROOT,
                         capture_output=True, text=True, check=True).stdout
    return sorted(Path(p).relative_to(folder.relative_to(ROOT)).as_posix()
                  for p in out.split("\0") if p)


def lesson_for(project, key=None):
    key = key or project.split("-")[0]
    hits = sorted(LESSONS.glob(f"{key}-*.html"))
    return hits[0] if hits else None


def sections(text):
    """(heading, body) for each <h2> section."""
    parts = re.split(r"(?=<h2[^>]*>)", text)
    out = []
    for p in parts:
        m = re.match(r"<h2[^>]*>(.*?)</h2>", p, flags=re.S)
        if m:
            out.append((strip(m.group(1)), p[m.end():]))
    return out


def pick_sections(project):
    """[(lesson path, lesson title, heading, body)] for the project's step-by-step sections."""
    if project in SECTION:
        out = []
        for key, want in SECTION[project]:
            les = lesson_for(project, key)
            text = les.read_text(encoding="utf-8")
            hb = next(((h, b) for h, b in sections(text) if h == want), None)
            if hb is None:
                raise SystemExit(f"{project}: no section '{want}' in {les.name}")
            out.append((les, lesson_title(les, text)) + hb)
        return out
    les = lesson_for(project)
    if not les:
        return []
    text = les.read_text(encoding="utf-8")
    hb = pick_section(project, text)
    return [(les, lesson_title(les, text)) + hb] if hb else []


def lesson_title(les, text):
    m = re.search(r"<title>(.*?)</title>", text, flags=re.S)
    return strip(m.group(1)).split(" · ")[0].split(" | ")[0] if m else les.stem


def pick_section(project, lesson_text):
    secs = sections(lesson_text)
    ref = f"projects/{project}"
    cands = [(h, b) for h, b in secs
             if re.search(re.escape(ref) + r"(?![\w-])", b) and '<ol class="steps">' in b]
    if not cands:
        return None
    return max(cands, key=lambda hb: len(re.findall(re.escape(ref) + r"(?![\w-])", hb[1])))


# ---- a small HTML-to-Markdown converter for lesson prose ------------------------------------

def strip(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s)).strip()


def inline(s):
    s = re.sub(r"<span class=\"sidenote\">(.*?)</span>", r" (\1)", s, flags=re.S)
    s = re.sub(r"<code[^>]*>(.*?)</code>", lambda m: "`" + html.unescape(re.sub(r"<[^>]+>", "", m.group(1))) + "`", s, flags=re.S)
    s = re.sub(r"<(strong|b)>(.*?)</\1>", r"**\2**", s, flags=re.S)
    s = re.sub(r"<(em|i)>(.*?)</\1>", r"*\2*", s, flags=re.S)
    s = re.sub(r'<a [^>]*href="([^"]+)"[^>]*>(.*?)</a>', lambda m: f"[{m.group(2)}]({link(m.group(1))})", s, flags=re.S)
    s = re.sub(r"<br\s*/?>", "  \n", s)
    s = re.sub(r"<(?!/?kbd\b)[^>]+>", "", s)          # keep <kbd>; Markdown renders it
    s = html.unescape(s)
    return re.sub(r"[ \t]*\n[ \t]*", " ", s).strip()


def link(href):
    if href.startswith(("http://", "https://", "#")):
        return href if not href.startswith("#") else href
    if href.startswith("../"):
        return "https://jouhis.github.io/embedded-course/" + href[3:]
    return SITE + href


def pre_block(m):
    lang = re.search(r'language-(\w+)', m.group(0))
    code = html.unescape(re.sub(r"<[^>]+>", "", m.group(1)))
    return f"\n```{lang.group(1) if lang else ''}\n{code.rstrip()}\n```\n"


def block(s, indent=""):
    """Paragraphs, lists and code blocks to Markdown lines."""
    s = re.sub(r"<!--.*?-->", "", s, flags=re.S)
    s = re.sub(r"<(svg|figure|table|script|style)\b.*?</\1>", "", s, flags=re.S)
    s = re.sub(r"<pre[^>]*>\s*<code[^>]*>(.*?)</code>\s*</pre>", lambda m: "\0PRE" + pre_block(m) + "\0", s, flags=re.S)
    out = []
    pos = 0
    for m in re.finditer(r"<(ol|ul)\b[^>]*>(.*?)</\1>", s, flags=re.S):
        out += paragraphs(s[pos:m.start()], indent)
        items = re.findall(r"<li\b[^>]*>(.*?)</li>", m.group(2), flags=re.S)
        for n, it in enumerate(items, 1):
            mark = f"{n}. " if m.group(1) == "ol" else "- "
            body = paragraphs(it, indent + " " * len(mark))
            if body:
                body[0] = indent + mark + body[0].lstrip()
                out += body
        out.append("")
        pos = m.end()
    out += paragraphs(s[pos:], indent)
    return out


def paragraphs(s, indent):
    out = []
    for chunk in re.split(r"\0", s):
        if chunk.startswith("PRE"):
            out += [indent + l if l else "" for l in chunk[3:].strip("\n").split("\n")]
            out.append("")
            continue
        for p in re.split(r"</?p\b[^>]*>|<div[^>]*>|</div>", chunk):
            t = inline(p)
            if t:
                out += [indent + t, ""]
    while out and out[-1] == "" and indent:
        out.pop()
    return out


def section_markdown(body):
    body = body.split('<div class="win">')[0]
    hints = re.findall(r"<details>\s*<summary>(.*?)</summary>(.*?)</details>", body, flags=re.S)
    body = re.sub(r"<details>.*?</details>", "", body, flags=re.S)
    # The solution pointer and the quiz are not exercise steps.
    body = re.split(r'<div class="widget', body)[0]
    lines = block(body)
    lines = [l for l in lines if not re.match(r"The reference solution is in", l)]
    hint_md = []
    for summ, h in hints:
        hint_md += ["<details>", f"<summary>{strip(summ)}</summary>", ""] + block(h) + ["</details>", ""]
    return lines, hint_md


# ---- facts from the project ----------------------------------------------------------------

def changed_files(starter, solution):
    s_files = set(git_files(starter)) - {"README.md"}
    o_files = set(git_files(solution)) - {"README.md"}
    skip = re.compile(r"(^|/)(\.vscode|build|target)/")
    changed = sorted(f for f in s_files & o_files if not skip.search(f)
                     and (todo_count(starter / f)
                          or code_only((starter / f).read_bytes(), f) != code_only((solution / f).read_bytes(), f)))
    new = sorted(f for f in o_files - s_files if not skip.search(f) and not SCENARIO.search(f))
    return changed, new


def code_only(data, name):
    """The file without comments and white space, so comment-only differences don't count."""
    t = data.decode("utf-8", errors="replace")
    if re.search(r"\.(c|h|rs|ld|S|s|dts|overlay)$", name):
        t = re.sub(r"/\*.*?\*/", "", t, flags=re.S)
        t = re.sub(r"//[^\n]*", "", t)
    if re.search(r"(CMakeLists\.txt|\.cmake|\.conf|\.toml|\.ya?ml|Kconfig)$", name):
        t = re.sub(r"#[^\n]*", "", t)
    return re.sub(r"\s+", "", t)


def todo_count(path):
    try:
        return len(re.findall(r"TODO\(learner\)", path.read_text(encoding="utf-8", errors="replace")))
    except OSError:
        return 0


def pass_line(folders):
    for f in folders:
        for src in sorted(f.glob("*.c")) + sorted(f.glob("src/*.rs")) + sorted(f.glob("src/*.c")):
            t = src.read_text(encoding="utf-8", errors="replace")
            m = re.search(r"//\s*EXPECT:\s*(.+)", t)
            if m:
                return "expect", m.group(1).strip()
            m = re.search(r"//\s*SIM:\s*skip\s*(.*)", t)
            if m:
                return "skip", m.group(1).strip()
    return None, None


# ---- the README ----------------------------------------------------------------------------

def readme(project):
    pdir = ROOT / "projects" / project
    starter, solution = pdir / "starter", pdir / "solution"
    has_starter = starter.is_dir() and git_files(starter)
    lesson = lesson_for(project)
    text = lesson.read_text(encoding="utf-8") if lesson else ""
    title = lesson_title(lesson, text) if lesson else project
    secs = pick_sections(project)
    lines = [f"# {title}: the exercise", "",
             "<!-- Generated by tools/maintainer/build_exercise_readmes.py from the lesson page. "
             "Edit the lesson, then run the script. -->", ""]
    used = list(dict.fromkeys((les, t) for les, t, _, _ in secs)) or ([(lesson, title)] if lesson else [])
    if used:
        links = " and ".join(f"[{t}]({SITE}{les.name})" for les, t in used)
        many = len(used) > 1
        lines += [f"Lesson{'s' if many else ''}: {links}. Read {'them' if many else 'it'} first: the "
                  f"steps below refer to {'their' if many else 'its'} diagrams and worked examples.", ""]

    hints = []
    if secs:
        for les, t, head, body in secs:
            steps, h = section_markdown(body)
            hints += h
            num = les.stem.split("-")[0]
            prefix = (f"Lesson {int(num)}: " if num.isdigit() else f"{num}: ") if len(used) > 1 else ""
            lines += [f"## {prefix}{head}", ""] + steps
    else:
        # Staged lessons (bench labs, labs) spread the work over several sections: name them.
        ref = f"projects/{project}"
        task = re.compile(r"^(Stage|Part|Step|Try it|On the board|Build|Acceptance)\b", re.I)
        staged = [h for h, b in (sections(text) if lesson else [])
                  if task.match(h) and h != "Step-by-step work"]
        lines += ["## What to do", ""]
        if staged:
            lines += ["The lesson walks through this project in these sections, in order:", ""]
            lines += [f"- {h}" for h in staged] + [""]
        elif has_starter and any(todo_count(f) for f in starter.rglob("*") if f.is_file()):
            lines += ["Read the lesson, then fill in the places marked `TODO(learner)` in the files "
                      "below: each one says what to write.", ""]
        else:
            lines += ["The lesson above explains what this project shows; read it with the code open.", ""]

    if has_starter and solution.is_dir():
        changed, new = changed_files(starter, solution)
        if project in FILES:
            changed, new = [f for f, _ in FILES[project]], []
        notes = dict(FILES.get(project, []))
        if changed or new:
            lines += ["## Files you work on", ""]
            for f in changed:
                n = todo_count((starter / f).resolve())
                note = [notes[f]] if notes.get(f) else []
                if n:
                    note.insert(0, f"{n} place{'s' if n != 1 else ''} marked `TODO(learner)`")
                lines.append(f"- `{f}`" + (f" ({'; '.join(note)})" if note else ""))
            for f in new:
                lines.append(f"- `{f}`: a new file (it is not in the starter yet)")
            lines.append("")
            if any(f.endswith("diagram.json") for f in changed + new):
                lines += ["The circuit is part of the exercise: `diagram.json` changes too.", ""]

    kind, val = pass_line([solution, starter, pdir])
    if kind == "expect":
        lines += ["## Done when", "", f"The serial monitor prints `{val}`.", ""]
    elif kind == "skip":
        lines += ["## Done when", "", "This project is not checked in the simulator "
                  f"({val.rstrip('.') or 'build only'}). The lesson says what to look for.", ""]

    if hints:
        lines += ["## Hints", ""] + hints
    if has_starter and solution.is_dir():
        lines += ["## Solution", "",
                  "`../solution` has a finished version. Try first, compare after.", ""]
    text = re.sub(r"\n{3,}", "\n\n", "\n".join(lines).strip("\n") + "\n")
    return text, (starter if has_starter else pdir) / "README.md"


def main(argv):
    check = "--check" in argv
    projects = sorted(p.name for p in (ROOT / "projects").iterdir()
                      if p.is_dir() and git_files(p))
    stale = 0
    for p in projects:
        text, dest = readme(p)
        old = dest.read_text(encoding="utf-8") if dest.exists() else None
        if old == text:
            continue
        if check:
            print(f"stale: {dest.relative_to(ROOT).as_posix()}")
            stale += 1
        else:
            dest.write_bytes(text.encode("utf-8"))
            print(f"wrote {dest.relative_to(ROOT).as_posix()}")
    if check:
        print(f"{len(projects) - stale}/{len(projects)} exercise READMEs up to date"
              + ("" if not stale else "; run python tools/maintainer/build_exercise_readmes.py"))
    return 1 if stale else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
