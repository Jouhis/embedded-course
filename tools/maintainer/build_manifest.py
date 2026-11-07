"""Build assets/manifest.js from COURSE-PLAN.md.

The manifest is the single source of truth for lesson ids, titles, file names and
order. Lessons load it with a plain <script> tag (works from file:// without a server),
and course.js uses it for the navigation bar, prev/next links and the index page.

Usage:  python tools/maintainer/build_manifest.py   (re-run after adding lesson files)
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PLAN = ROOT / "COURSE-PLAN.md"
OUT = ROOT / "assets" / "manifest.js"


def slugify(text: str, max_words: int = 5) -> str:
    text = re.sub(r"[`*_'’]", "", text.lower())
    text = re.sub(r"\(.*?\)", "", text)
    text = text if text.startswith("capstone") else text.split(":")[0]  # keep only the head of "Title: details"
    words = re.findall(r"[a-z0-9]+", text)
    return "-".join(words[:max_words])


def clean_title(text: str) -> str:
    text = re.sub(r"\*\*|`", "", text).strip()
    for mark in ("💡", "⭐"):
        text = text.replace(mark, "")
    return text.strip()


def main() -> int:
    parts, current_part, current_section = [], None, None
    lab_n = cp_n = 0
    benches, in_bench, bench_part = [], False, None

    for raw in PLAN.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if line.startswith("## Every Lesson Includes"):
            break
        if line.startswith("## Bench Track"):
            in_bench = True
            continue
        if in_bench:
            # Bench labs: optional hands-on labs on real boards, listed in the Bench Track section and
            # kept out of the main outline. "Part 4" groups them by the part that unlocks them:
            # "- 🔬⭐ **Bench lab 7: The flaky LED strip** (after lesson 65). Details."
            m = re.match(r"^Part (\d+)$", line)
            if m:
                bench_part = int(m.group(1))
                continue
            # What a lab needs, as sub-lines under it: "  - Board: Pico 2 (Raspberry Pi Pico 2 with headers)".
            # The board's short name (before the bracket) goes into the lab's displayed name.
            m = re.match(r"^- (Board|Tools|Parts): (.+)$", line)
            if m and raw.startswith("  ") and benches:
                key, value = m.group(1).lower(), m.group(2).strip()
                benches[-1]["needs"][key] = value
                if key == "board":
                    benches[-1]["board"] = value.split(" (")[0]
                continue
            m = re.match(r"^- 🔬(⭐?) \*\*Bench lab (\d+): ([^*]+)\*\* \(after (lesson|Lab) (\d+)[^)]*\)\.\s*(.*)$", line)
            if m:
                star, n, name, kind, ref, rest = m.groups()
                n, ref = int(n), int(ref)
                benches.append({
                    "id": f"bench{n:02d}", "kind": "bench", "number": n,
                    "title": f"Bench lab {n}: {name.strip()}",
                    "detail": re.split(r"(?<=\.)\s", rest, maxsplit=1)[0],
                    "file": f"bench{n:02d}-{slugify(name)}.html",
                    "after": f"{kind} {ref}",
                    "afterId": f"{ref:04d}" if kind == "lesson" else f"lab{ref:02d}",
                    "afterPart": bench_part,
                    "section": None, "conceptOnly": False, "optional": True, "stretch": bool(star),
                    "board": "", "needs": {},
                })
            continue
        m = re.match(r"^## Part (\d+): (.+)$", line)
        if m:
            current_part = {"number": int(m.group(1)), "title": m.group(2), "items": []}
            parts.append(current_part)
            current_section = None
            continue
        m = re.match(r"^### (\d+\.\d+) (.+)$", line)
        if m:
            current_section = f"{m.group(1)} {m.group(2)}"
            continue
        if current_part is None:
            continue

        m = re.match(r"^(\d+)\. (.+)$", line)
        if m:
            num, body = int(m.group(1)), m.group(2)
            title = clean_title(body)
            short = title.split(":")[0].strip()
            if re.match(r"^Capstone \d+$", short):
                short = title  # "Capstone 3: drivers and unit tests" reads better whole
            paren = re.search(r"\s*\((.+)\)$", short)
            if paren:
                short = short[: paren.start()].strip()
            current_part["items"].append({
                "id": f"{num:04d}",
                "kind": "lesson",
                "number": num,
                "title": short,
                "detail": re.sub(r"^\((.*)\)$", r"\1", title[len(short):].strip().lstrip(":").strip()),
                "file": f"{num:04d}-{slugify(title)}.html",
                "section": current_section,
                "conceptOnly": "💡" in body,
                "optional": "⭐" in body,
            })
            continue

        m = re.match(r"^- 🔧 \*\*Lab (\d+)[^*]*\*\*:?\s*(.*)$", line)
        if m:
            lab_n = int(m.group(1))
            desc = clean_title(m.group(2)).lstrip(": ").strip()
            # Titles like 'Lab 2, "Trace one instruction":' keep the quoted name.
            q = re.search(r'"([^"]+)"', line)
            name = q.group(1) if q else desc.split(",")[0]
            current_part["items"].append({
                "id": f"lab{lab_n:02d}", "kind": "lab", "number": lab_n,
                "title": f"Lab {lab_n}: {name[0].upper() + name[1:]}", "detail": desc,
                "file": f"lab{lab_n:02d}-{slugify(name)}.html",
                "section": current_section, "conceptOnly": False, "optional": False,
            })
            continue

        m = re.match(r"^- 📝 \*\*Checkpoint (\d+)\*\*", line)
        if m:
            cp_n = int(m.group(1))
            current_part["items"].append({
                "id": f"cp{cp_n:02d}", "kind": "checkpoint", "number": cp_n,
                "title": f"Checkpoint {cp_n}", "detail": f"Mixed review exam for Part {current_part['number']}",
                "file": f"checkpoint{cp_n:02d}.html",
                "section": None, "conceptOnly": False, "optional": False,
            })

    for item in [i for p in parts for i in p["items"]] + benches:
        item["published"] = (ROOT / "lessons" / item["file"]).exists()

    ids = [i["id"] for p in parts for i in p["items"]]
    all_ids = ids + [b["id"] for b in benches]
    if len(all_ids) != len(set(all_ids)):
        print("Duplicate ids in plan", file=sys.stderr)
        return 1
    for b in benches:
        if not b["board"] or set(b["needs"]) != {"board", "tools", "parts"}:
            print(f"{b['title']}: needs Board, Tools and Parts lines under it", file=sys.stderr)
            return 1
        if b["afterId"] not in ids:
            print(f"{b['title']}: 'after {b['after']}' is not in the outline", file=sys.stderr)
            return 1

    OUT.write_text(
        "/* Generated by tools/maintainer/build_manifest.py from COURSE-PLAN.md. Do not edit by hand. */\n"
        "window.COURSE_MANIFEST = " + json.dumps({"parts": parts, "bench": benches}, ensure_ascii=False, indent=1) + ";\n",
        encoding="utf-8",
    )
    lessons = sum(1 for p in parts for i in p["items"] if i["kind"] == "lesson")
    print(f"Wrote {OUT.relative_to(ROOT)}: {len(parts)} parts, {lessons} lessons, {lab_n} labs, {cp_n} checkpoints, "
          f"{len(benches)} bench labs; "
          f"{sum(i['published'] for p in parts for i in p['items']) + sum(b['published'] for b in benches)} published")
    return 0


if __name__ == "__main__":
    sys.exit(main())
