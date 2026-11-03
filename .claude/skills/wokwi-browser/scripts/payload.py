"""Print a JavaScript call that runs one course project in the Wokwi browser editor.

  python -I .claude/skills/wokwi-browser/scripts/payload.py <project-dir> [options]

  --expect TEXT     serial text that means pass (default: the // EXPECT: line of the
                    solution next to it, so a starter is checked against its solution)
  --secs N          how long to wait for the text after the run starts (default 30)
  --diagram FILE    use this diagram.json instead of the project's (e.g. a draft layout)
  --no-diagram      send main.c only (keep the diagram already in the editor)

Paste the printed line into javascript_tool after browser-helpers.js is installed.
Only main.c and diagram.json are sent: the new-project page has just those two files.
"""
import argparse
import json
import re
from pathlib import Path


def expect_of(project: Path):
    candidates = [project / "main.c"]
    if project.name == "starter":
        candidates.insert(0, project.parent / "solution" / "main.c")
    for c in candidates:
        if c.exists():
            m = re.search(r"//\s*EXPECT:\s*(.+)", c.read_text(encoding="utf-8"))
            if m:
                return m.group(1).strip()
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--expect")
    ap.add_argument("--secs", type=int, default=30)
    ap.add_argument("--diagram")
    ap.add_argument("--no-diagram", action="store_true")
    a = ap.parse_args()
    project = Path(a.project)
    files = {"main.c": (project / "main.c").read_text(encoding="utf-8")}
    if not a.no_diagram:
        files["diagram.json"] = Path(a.diagram or project / "diagram.json").read_text(encoding="utf-8")
    expect = a.expect or expect_of(project)
    print(f"JSON.stringify(await window.__run({json.dumps(files)}, {json.dumps(expect)}, {a.secs}))")


main()
