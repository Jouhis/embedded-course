"""Create a lesson project from a verified template.

  python tools/new_project.py <lesson-id> <slug> <template> [--single]

  lesson-id  e.g. 0051
  slug       e.g. gpio-output        -> projects/0051-gpio-output/
  template   one of: pico-sdk, stm32-cmsis, stm32-hal, stm32-freertos, zephyr-pico, zephyr-bluepill
  --single   create one folder (no starter/solution split), e.g. for demos

Each created folder is a complete Wokwi project: sources, diagram.json, wokwi.toml and
.vscode/ (Ctrl+Shift+B builds through tools/build.py; F5 attaches GDB to the simulator).
Edit the starter and solution afterwards; the template's blink code is only a starting point.
"""
import json
import os
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / "templates"
GDB = r"C:\Program Files (x86)\Arm GNU Toolchain arm-none-eabi\14.2 rel1\bin\arm-none-eabi-gdb.exe"


def vscode_files(dest: Path):
    rel_tools = Path(os.path.relpath(ROOT / "tools", dest)).as_posix()
    vs = dest / ".vscode"
    vs.mkdir(exist_ok=True)
    if not (dest / "wokwi.toml").exists():
        # Host unit-test project (template host-test): build and run the tests, no Wokwi or GDB server.
        tasks = {"version": "2.0.0", "tasks": [
            {"label": "Build and run unit tests", "type": "shell", "command": "python",
             "args": [f"${{workspaceFolder}}/{rel_tools}/build.py", "${workspaceFolder}", "--test"],
             "group": {"kind": "test", "isDefault": True}, "problemMatcher": ["$gcc"]}]}
        (vs / "tasks.json").write_text(json.dumps(tasks, indent=2), encoding="utf-8")
        return
    toml = (dest / "wokwi.toml").read_text(encoding="utf-8")
    elf = re.search(r"elf\s*=\s*'([^']+)'", toml).group(1)
    tasks = {
        "version": "2.0.0",
        "tasks": [
            {"label": "Build firmware", "type": "shell", "command": "python",
             "args": [f"${{workspaceFolder}}/{rel_tools}/build.py", "${workspaceFolder}"],
             "group": {"kind": "build", "isDefault": True}, "problemMatcher": ["$gcc"]},
            {"label": "Clean build", "type": "shell", "command": "python",
             "args": [f"${{workspaceFolder}}/{rel_tools}/build.py", "${workspaceFolder}", "--clean"],
             "problemMatcher": ["$gcc"]},
        ],
    }
    launch = {
        "version": "0.2.0",
        "configurations": [{
            "name": "Debug in Wokwi (GDB)",
            "type": "cppdbg",
            "request": "launch",
            "program": f"${{workspaceFolder}}/{elf}",
            "cwd": "${workspaceFolder}",
            "MIMode": "gdb",
            "miDebuggerPath": GDB,
            "miDebuggerServerAddress": "localhost:3333",
            "stopAtConnect": True,
        }],
    }
    (vs / "tasks.json").write_text(json.dumps(tasks, indent=2), encoding="utf-8")
    (vs / "launch.json").write_text(json.dumps(launch, indent=2), encoding="utf-8")


def copy_template(template: Path, dest: Path):
    shutil.copytree(template, dest, ignore=shutil.ignore_patterns("build", ".vscode", "target"))
    cml = dest / "CMakeLists.txt"
    if not cml.exists():          # Cargo (Rust) template: nothing to rewrite
        vscode_files(dest)
        return
    text = cml.read_text(encoding="utf-8")
    common = Path(os.path.relpath(TEMPLATES / "common", dest)).as_posix()
    text = text.replace("${CMAKE_CURRENT_SOURCE_DIR}/../common/", f"${{CMAKE_CURRENT_SOURCE_DIR}}/{common}/")
    text = text.replace("include(../common/", f"include({common}/")
    third_party = Path(os.path.relpath(ROOT / "third_party", dest)).as_posix()
    text = text.replace("${CMAKE_CURRENT_LIST_DIR}/../../third_party", f"${{CMAKE_CURRENT_LIST_DIR}}/{third_party}")
    cml.write_text(text, encoding="utf-8")
    vscode_files(dest)


def main(argv):
    if len(argv) < 3:
        print(__doc__)
        return 1
    lesson, slug, tmpl = argv[0], argv[1], argv[2]
    single = "--single" in argv
    template = TEMPLATES / tmpl
    if not template.is_dir() or tmpl in ("common",):
        print(f"Unknown template {tmpl!r}. Choose from: " +
              ", ".join(p.name for p in TEMPLATES.iterdir() if p.is_dir() and p.name != "common"))
        return 1
    if not re.fullmatch(r"(\d{4}|lab\d{2}|cp\d{2})", lesson):
        print("lesson-id must look like 0051, lab03 or cp02")
        return 1
    base = ROOT / "projects" / f"{lesson}-{slug}"
    if base.exists():
        print(f"{base} already exists")
        return 1
    targets = [base] if single else [base / "starter", base / "solution"]
    for t in targets:
        t.parent.mkdir(parents=True, exist_ok=True)
        copy_template(template, t)
        print(f"created {t.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
