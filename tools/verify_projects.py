"""Build every Wokwi project, lint its diagram.json (part types and pin names, via wokwi-cli lint),
and check that wokwi.toml points at files that exist.

  python tools/verify_projects.py [--clean] [--sim] [filter]

  --clean   rebuild from scratch
  --sim     also run each *solution* (or single) project in Wokwi (needs WOKWI_CLI_TOKEN).
            The expected serial text is read from a line "// EXPECT: <text>" in main.c or main.rs, if present.
  filter    only projects whose path contains this text (e.g. 0047 or lab02)
"""
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def project_dirs():
    for toml in sorted((ROOT / "projects").rglob("wokwi.toml")):
        if "build" not in toml.parts:
            yield toml.parent
    for toml in sorted((ROOT / "templates").glob("*/wokwi.toml")):
        yield toml.parent


def main(argv):
    clean, sim = "--clean" in argv, "--sim" in argv
    filt = next((a for a in argv if not a.startswith("--")), "")
    results = []
    for d in project_dirs():
        rel = d.relative_to(ROOT).as_posix()
        if filt and filt not in rel:
            continue
        cmd = [sys.executable, "-I", str(ROOT / "tools" / "build.py"), str(d)] + (["--clean"] if clean else [])
        rc = subprocess.call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        problems = [] if rc == 0 else [f"build failed (rc {rc}); run: python tools/build.py {rel}"]
        toml = (d / "wokwi.toml").read_text(encoding="utf-8")
        for key in ("firmware", "elf"):
            m = re.search(rf"^{key}\s*=\s*['\"]([^'\"]+)['\"]", toml, re.M)
            if m and rc == 0 and not (d / m.group(1)).exists():
                problems.append(f"{key} file missing: {m.group(1)}")
        cli = Path.home() / ".wokwi" / "bin" / ("wokwi-cli.exe" if os.name == "nt" else "wokwi-cli")
        if cli.exists():
            lint = subprocess.run([str(cli), "lint", str(d)], capture_output=True, text=True, encoding="utf-8", errors="replace")
            for line in (lint.stdout + lint.stderr).splitlines():
                is_error = "✗" in line or "[invalid" in line
                is_error_text = "error" in line.lower() and "Found" not in line and "0 error" not in line
                if is_error or is_error_text:
                    problems.append("lint: " + line.strip())
        if sim and rc == 0 and not problems and d.name != "starter":
            main_c = next((f for pat in ("main.c", "main.rs") for f in d.rglob(pat) if "target" not in f.parts and "build" not in f.parts), None)
            expect = None
            if main_c:
                e = re.search(r"//\s*EXPECT:\s*(.+)", main_c.read_text(encoding="utf-8"))
                expect = e.group(1).strip() if e else None
            sim_cmd = [sys.executable, "-I", str(ROOT / "tools" / "sim.py"), str(d), "--timeout", "20000"] + (["--expect", expect] if expect else [])
            res = subprocess.run(sim_cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
            src = res.returncode
            log = d / "build" / "sim" / "last-run.txt"
            log.parent.mkdir(parents=True, exist_ok=True)
            log.write_text(res.stdout + res.stderr, encoding="utf-8")
            if src:
                problems.append(f"simulation failed (rc {src})" + (f", expected {expect!r}" if expect else "")
                                + f"; log: {log.relative_to(ROOT).as_posix()}")
        results.append((rel, problems))
        print(("FAIL " if problems else "ok   ") + rel + "".join(f"\n     {p}" for p in problems), flush=True)
    bad = sum(1 for _, p in results if p)
    print(f"\n{len(results) - bad}/{len(results)} projects ok")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
