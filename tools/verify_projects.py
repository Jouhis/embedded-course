"""Build every Wokwi project, lint its diagram.json (part types and pin names, via wokwi-cli lint),
check that wokwi.toml points at files that exist, and check that every runnable project says how
to tell that it works.

  python tools/verify_projects.py [--clean] [--sim] [--skip KINDS] [--summary FILE] [filter]

  --clean         rebuild from scratch
  --sim           also run each solution (or single-folder) project in Wokwi (needs WOKWI_CLI_TOKEN)
  --skip KINDS    comma-separated project kinds not to build: zephyr, rust, pico, cmake
                  (cmake is STM32 and host). CI uses --skip zephyr,rust.
  --summary FILE  also write the results as a Markdown table (GitHub step summary)
  --no-host-tests don't run the host unit tests (CMake projects without wokwi.toml, built with --test)
  filter          only projects whose path contains this text (e.g. 0047 or lab02)

How a project says it works: a comment in its main.c (or src/main.rs), at the top or on the line
that prints the pass text.

  // EXPECT: QUEUE OK            the serial text that means the run passed (required)
  // SIM-SCENARIO: press.yaml    a Wokwi scenario that drives inputs (a button press), relative
                                 to the project folder; it can do its own wait-serial checks
  // SIM: skip <reason>          build only; the reason is printed in the results

A solution (or single-folder project) with none of these is reported as a problem, so every new
project gets a pass line. Starter folders are built and linted but never simulated.

FreeRTOS projects on the STM32 are build-only without a SIM line: Wokwi's STM32 core has no working
interrupt masking, so FreeRTOS cannot run there (see CHANGELOG, 0.0.3 known issues).
"""
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from build import detect  # noqa: E402  (same folder; detect() names the project kind)
from sim import TEMPLATE_EXPECT  # noqa: E402  (templates keep their pass lines there)

FREERTOS_STM32_REASON = "FreeRTOS cannot run on Wokwi's STM32 core (CHANGELOG 0.0.3, known issues)"


def project_dirs():
    for toml in sorted((ROOT / "projects").rglob("wokwi.toml")):
        if "build" not in toml.parts and "target" not in toml.parts:
            yield toml.parent
    for toml in sorted((ROOT / "templates").glob("*/wokwi.toml")):
        yield toml.parent


def host_test_dirs():
    """Host unit-test projects: a CMakeLists.txt and no wokwi.toml. Only solutions: the starters
    have failing tests on purpose, for the learner to fix."""
    for cml in sorted((ROOT / "projects").glob("*/solution/CMakeLists.txt")):
        if not (cml.parent / "wokwi.toml").exists():
            yield cml.parent
    yield ROOT / "templates" / "host-test"


def main_source(d: Path):
    for name in ("main.c", "src/main.rs", "src/main.c", "main.rs"):
        f = d / name
        if f.exists():
            return f
    return None


def directives(d: Path):
    """Return (expect, scenario, skip_reason) for a project folder."""
    expect = scenario = skip = None
    src = main_source(d)
    if src:
        head = src.read_text(encoding="utf-8", errors="replace")
        if m := re.search(r"//\s*EXPECT:\s*(.+)", head):
            expect = m.group(1).strip()
        if m := re.search(r"//\s*SIM-SCENARIO:\s*(\S+)", head):
            scenario = d / m.group(1).strip()
        if m := re.search(r"//\s*SIM:\s*skip\b\s*(.*)", head):
            skip = m.group(1).strip() or "marked build-only"
    if expect is None and d.parent.name == "templates":
        expect = TEMPLATE_EXPECT.get(d.name)
    cmake = d / "CMakeLists.txt"
    if skip is None and cmake.exists() and "stm32_use_freertos" in cmake.read_text(encoding="utf-8"):
        skip = FREERTOS_STM32_REASON
    return expect, scenario, skip


def lint(d: Path):
    cli = Path.home() / ".wokwi" / "bin" / ("wokwi-cli.exe" if os.name == "nt" else "wokwi-cli")
    if not cli.exists():
        return []
    res = subprocess.run([str(cli), "lint", str(d)], capture_output=True, text=True, encoding="utf-8", errors="replace")
    problems = []
    for line in (res.stdout + res.stderr).splitlines():
        is_error = "✗" in line or "[invalid" in line
        is_error_text = "error" in line.lower() and "Found" not in line and "0 error" not in line
        if is_error or is_error_text:
            problems.append("lint: " + line.strip())
    return problems


def simulate(d: Path, rel: str, expect, scenario):
    cmd = [sys.executable, "-I", str(ROOT / "tools" / "sim.py"), str(d), "--timeout", "20000",
           "--fail-text", "HardFault"]
    if expect:
        cmd += ["--expect", expect]
    if scenario:
        cmd += ["--scenario", str(scenario)]
    res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    log = d / "build" / "sim" / "last-run.txt"
    log.parent.mkdir(parents=True, exist_ok=True)
    log.write_text(res.stdout + res.stderr, encoding="utf-8")
    if "quota" in (res.stdout + res.stderr).lower():
        return ["simulation not run: the Wokwi CI minute quota is used up"]
    if res.returncode:
        return [f"simulation failed (rc {res.returncode})" + (f", expected {expect!r}" if expect else "")
                + f"; log: {log.relative_to(ROOT).as_posix()}"]
    return []


def main(argv):
    clean, sim = "--clean" in argv, "--sim" in argv
    skip_kinds, summary, rest = set(), None, []
    it = iter(argv)
    for a in it:
        if a == "--skip":
            skip_kinds = set(next(it, "").split(","))
        elif a == "--summary":
            summary = Path(next(it, "summary.md"))
        elif not a.startswith("--"):
            rest.append(a)
    filt = rest[0] if rest else ""

    results = []   # (rel, status, notes)
    for d in project_dirs():
        rel = d.relative_to(ROOT).as_posix()
        if filt and filt not in rel:
            continue
        kind = detect(d)
        if kind in skip_kinds:
            results.append((rel, "skipped", [f"{kind} toolchain not used in this run"]))
            print(f"skip {rel} ({kind})", flush=True)
            continue
        cmd = [sys.executable, "-I", str(ROOT / "tools" / "build.py"), str(d)] + (["--clean"] if clean else [])
        rc = subprocess.call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        problems = [] if rc == 0 else [f"build failed (rc {rc}); run: python tools/build.py {rel}"]
        toml = (d / "wokwi.toml").read_text(encoding="utf-8")
        for key in ("firmware", "elf"):
            m = re.search(rf"^{key}\s*=\s*['\"]([^'\"]+)['\"]", toml, re.M)
            if m and rc == 0 and not (d / m.group(1)).exists():
                problems.append(f"{key} file missing: {m.group(1)}")
        problems += lint(d)

        notes = []
        runnable = d.name != "starter"
        if runnable:
            expect, scenario, skip = directives(d)
            if scenario and not scenario.exists():
                problems.append(f"SIM-SCENARIO file missing: {scenario.relative_to(ROOT).as_posix()}")
            if skip:
                notes.append(f"build-only: {skip}")
            elif not expect and not scenario:
                problems.append("no pass line: add '// EXPECT: <serial text>' (or '// SIM: skip <reason>') "
                                "to main.c")
            elif sim and not problems:
                problems += simulate(d, rel, expect, scenario)
        status = "FAIL" if problems else ("ok" if not notes else "build-only")
        results.append((rel, status, problems + notes))
        print(f"{status:<10} {rel}" + "".join(f"\n           {p}" for p in problems + notes), flush=True)

    if "--no-host-tests" not in argv and "cmake" not in skip_kinds:
        for d in host_test_dirs():
            rel = d.relative_to(ROOT).as_posix()
            if filt and filt not in rel:
                continue
            cmd = [sys.executable, "-I", str(ROOT / "tools" / "build.py"), str(d), "--test"] + (["--clean"] if clean else [])
            res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
            passed = re.findall(r"\d+% tests passed.*", res.stdout)
            note = passed[-1].strip() if passed else ""
            problems = [] if res.returncode == 0 else [f"host tests failed (rc {res.returncode}); run: python tools/build.py {rel} --test"]
            status = "FAIL" if problems else "ok"
            results.append((rel, status, problems + ([note] if note else [])))
            print(f"{status:<10} {rel}" + "".join(f"\n           {x}" for x in problems + ([note] if note else [])), flush=True)

    bad = sum(1 for _, s, _ in results if s == "FAIL")
    counts = {s: sum(1 for _, x, _ in results if x == s) for s in ("ok", "build-only", "skipped", "FAIL")}
    line = ", ".join(f"{n} {s}" for s, n in counts.items() if n)
    print(f"\n{len(results)} projects: {line}" + ("" if sim else " (simulation not run; add --sim)"))
    if summary:
        rows = ["| Project | Result | Notes |", "| --- | --- | --- |"]
        rows += [f"| `{r}` | {s} | {'; '.join(n).replace('|', '/')} |" for r, s, n in results]
        summary.write_text(f"### Projects: {line}\n\n" + "\n".join(rows) + "\n", encoding="utf-8")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
