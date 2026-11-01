"""Run a course project headlessly in the Wokwi simulator and check its serial output.

  python tools/sim.py <project-dir> [--expect TEXT] [--fail-text TEXT] [--scenario FILE] [--timeout MS] [--build]
  python tools/sim.py --all-templates

Needs the WOKWI_CLI_TOKEN environment variable (create one at https://wokwi.com/dashboard/ci).
Exit code 0 when the expected text appears (or, without --expect, when the run finishes cleanly).
"""
import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CLI = Path.home() / ".wokwi" / "bin" / ("wokwi-cli.exe" if os.name == "nt" else "wokwi-cli")
TEMPLATE_EXPECT = {
    "pico-sdk": "LED on",
    "stm32-cmsis": "LED on",
    "stm32-hal": "LED on",
    "stm32-freertos": "Hello from a FreeRTOS task",
    "zephyr-pico": "LED toggled",
    "zephyr-bluepill": "LED toggled",
}


def token():
    t = os.environ.get("WOKWI_CLI_TOKEN")
    if not t and sys.platform == "win32":
        import winreg  # setx writes here; already-running shells don't see it yet
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as k:
                t = winreg.QueryValueEx(k, "WOKWI_CLI_TOKEN")[0]
        except OSError:
            t = None
    return t


def sim_config(project: Path) -> Path:
    """wokwi.toml sets gdbServerPort for VS Code debugging, and wokwi-cli then pauses until GDB
    attaches (even with --gdb-server-port 0). So simulate from build/sim/, with a copy of wokwi.toml
    that has no gdbServerPort line and absolute paths to the firmware, ELF and chip files."""
    import re
    out = project / "build" / "sim"
    out.mkdir(parents=True, exist_ok=True)
    lines = []
    for line in (project / "wokwi.toml").read_text(encoding="utf-8").splitlines():
        if line.strip().startswith("gdbServerPort"):
            continue
        m = re.match(r"^(\s*\w+\s*=\s*)'([^']+)'(.*)$", line)
        if m and (project / m.group(2)).exists():
            # wokwi-cli joins every path to the project folder, even absolute ones: use relative paths.
            rel = Path(os.path.relpath((project / m.group(2)).resolve(), out.resolve())).as_posix()
            line = f"{m.group(1)}'{rel}'{m.group(3)}"
        lines.append(line)
    (out / "wokwi.toml").write_text("\n".join(lines) + "\n", encoding="utf-8")
    return out


def simulate(project: Path, expect, timeout, build, scenario=None, fail_text=None):
    if build:
        rc = subprocess.call([sys.executable, str(ROOT / "tools" / "build.py"), str(project)])
        if rc:
            return rc
    tok = token()
    if not tok:
        print("WOKWI_CLI_TOKEN is not set. Create a token at https://wokwi.com/dashboard/ci")
        return 2
    cli = str(CLI) if CLI.exists() else shutil.which("wokwi-cli")
    run_dir = sim_config(project)
    cmd = [cli, str(run_dir), "--diagram-file", str(project / "diagram.json"), "--timeout", str(timeout)]
    if scenario:
        # A Wokwi automation scenario (YAML) presses buttons, sets inputs and waits for serial text.
        cmd += ["--scenario", str(Path(scenario).resolve())]
    if fail_text:
        cmd += ["--fail-text", fail_text]
    if expect:
        cmd += ["--expect-text", expect]
    elif not scenario:
        cmd += ["--timeout-exit-code", "0"]   # no expectation: running until the timeout is a pass
    env = dict(os.environ, WOKWI_CLI_TOKEN=tok)
    print("$", " ".join(cmd), flush=True)
    return subprocess.call(cmd, env=env)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("project", nargs="?")
    ap.add_argument("--expect", help="text that must appear on the serial monitor")
    ap.add_argument("--fail-text", help="fail as soon as this text appears (for example HardFault)")
    ap.add_argument("--scenario", help="Wokwi scenario YAML that drives inputs, for example a button press")
    ap.add_argument("--timeout", type=int, default=10000, help="simulated milliseconds (default 10000)")
    ap.add_argument("--build", action="store_true", help="build before simulating")
    ap.add_argument("--all-templates", action="store_true", help="simulate every template in templates/")
    a = ap.parse_args()
    if a.all_templates:
        results = {}
        for name, text in TEMPLATE_EXPECT.items():
            print(f"\n=== {name}")
            results[name] = simulate(ROOT / "templates" / name, text, a.timeout, True)
        print("\n" + "\n".join(f"{'PASS' if rc == 0 else 'FAIL'} {n}" for n, rc in results.items()))
        return 0 if all(rc == 0 for rc in results.values()) else 1
    if not a.project:
        ap.error("give a project directory or --all-templates")
    return simulate(Path(a.project).resolve(), a.expect, a.timeout, a.build, a.scenario, a.fail_text)


if __name__ == "__main__":
    sys.exit(main())
