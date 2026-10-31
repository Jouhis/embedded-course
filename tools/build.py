"""Build any course project: Pico SDK, STM32 (CMSIS/HAL/FreeRTOS) or Zephyr.

The project type is detected automatically:
  Cargo.toml present                   -> embedded Rust (cargo, lesson 108)
  prj.conf present                     -> Zephyr   (board from wokwi diagram: pico -> rpi_pico, bluepill -> stm32_min_dev)
  CMakeLists.txt calls pico_sdk_init() -> Pico SDK
  otherwise                            -> plain CMake with the ARM toolchain (STM32)

Usage:
  python tools/build.py <project-dir> [--clean] [--release] [--test]
  python tools/build.py --check          # verify that every tool is installed

The output always lands in <project-dir>/build, which is where wokwi.toml looks.
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

HOME = Path.home()
DEFAULTS = {
    "arm_gcc": [Path(r"C:\Program Files (x86)\Arm GNU Toolchain arm-none-eabi\14.2 rel1\bin")],
    "ninja": [HOME / r"AppData\Local\Microsoft\WinGet\Packages\Ninja-build.Ninja_Microsoft.Winget.Source_8wekyb3d8bbwe"],
    "host_gcc": [HOME / r"AppData\Local\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin"],
    "pico_sdk": HOME / ".pico-sdk" / "sdk" / "2.3.1",
    "zephyr_ws": HOME / "zephyrproject",
}


def find_tool(exe, extra_dirs):
    found = shutil.which(exe)
    if found:
        return Path(found).parent
    for d in extra_dirs:
        for cand in sorted(Path(d).parent.glob(Path(d).name)) if "*" in str(d) else [Path(d)]:
            if (cand / (exe + ".exe")).exists() or (cand / exe).exists():
                return cand
    return None


def environment():
    env = os.environ.copy()
    paths = []
    gcc = find_tool("arm-none-eabi-gcc", DEFAULTS["arm_gcc"] +
                    list(Path(r"C:\Program Files (x86)").glob("Arm GNU Toolchain arm-none-eabi/*/bin")))
    ninja = find_tool("ninja", DEFAULTS["ninja"])
    host = find_tool("gcc", DEFAULTS["host_gcc"])   # host compiler: unit tests (Part 6) and the SDK's pioasm
    for p in (gcc, ninja, host):
        if p:
            paths.append(str(p))
    env["PATH"] = os.pathsep.join(paths + [env.get("PATH", "")])
    env.setdefault("PICO_SDK_PATH", str(DEFAULTS["pico_sdk"]))
    if gcc:
        env.setdefault("ZEPHYR_TOOLCHAIN_VARIANT", "gnuarmemb")
        env.setdefault("GNUARMEMB_TOOLCHAIN_PATH", str(gcc.parent))
    env.setdefault("ZEPHYR_BASE", str(DEFAULTS["zephyr_ws"] / "zephyr"))
    return env, gcc, ninja


def run(cmd, cwd, env):
    print("$", " ".join(str(c) for c in cmd), flush=True)
    return subprocess.call([str(c) for c in cmd], cwd=cwd, env=env)


def detect(project: Path):
    if (project / "prj.conf").exists():
        return "zephyr"
    if (project / "Cargo.toml").exists():
        return "rust"
    cml = (project / "CMakeLists.txt").read_text(encoding="utf-8") if (project / "CMakeLists.txt").exists() else ""
    if "pico_sdk_init" in cml:
        return "pico"
    if cml:
        return "cmake"
    return None


def zephyr_board(project: Path):
    try:
        parts = json.loads((project / "diagram.json").read_text(encoding="utf-8"))["parts"]
    except (OSError, ValueError, KeyError):
        return "rpi_pico"
    types = {p["type"] for p in parts}
    return "stm32_min_dev" if "board-stm32-bluepill" in types else "rpi_pico"


def build(project: Path, clean: bool, build_type: str = "Debug", test: bool = False) -> int:
    env, gcc, ninja = environment()
    if not gcc or not ninja:
        print("ARM toolchain or Ninja not found. Run: python tools/build.py --check")
        return 2
    kind = detect(project)
    build_dir = project / "build"
    if clean and build_dir.exists():
        shutil.rmtree(build_dir)

    if kind == "zephyr":
        venv_scripts = DEFAULTS["zephyr_ws"] / ".venv" / "Scripts"
        west = venv_scripts / "west.exe"
        if not west.exists():
            print(f"Zephyr workspace not found at {DEFAULTS['zephyr_ws']} (set up in lesson 92)")
            return 2
        env["PATH"] = str(venv_scripts) + os.pathsep + env["PATH"]
        return run([west, "build", "-p", "auto", "-b", zephyr_board(project), "-d", build_dir, project],
                   cwd=DEFAULTS["zephyr_ws"], env=env)

    if kind == "rust":
        # Embedded Rust (lesson 108): cargo builds for thumbv6m-none-eabi; the toolchain comes from
        # rust-toolchain.toml (stable-x86_64-pc-windows-gnu, which needs no Visual Studio linker).
        env["PATH"] = str(HOME / ".cargo" / "bin") + os.pathsep + env["PATH"]
        cargo = shutil.which("cargo", path=env["PATH"]) or "cargo"
        if clean:
            run([cargo, "clean"], cwd=project, env=env)
        rc = run([cargo, "build", "--release"], cwd=project, env=env)
        if rc == 0 and test:
            print("(no host tests for Rust projects here; see lesson 108)")
        return rc

    if kind in ("pico", "cmake"):
        cache = build_dir / "CMakeCache.txt"
        cached = cache.read_text(encoding="utf-8", errors="replace") if cache.exists() else ""
        if not (build_dir / "build.ninja").exists() or f"CMAKE_BUILD_TYPE:STRING={build_type}" not in cached:
            # Debug (-Og -g) by default, so stepping in GDB follows the source (lesson 54).
            rc = run(["cmake", "-S", project, "-B", build_dir, "-G", "Ninja", f"-DCMAKE_BUILD_TYPE={build_type}"],
                     cwd=project, env=env)
            if rc:
                return rc
        rc = run(["cmake", "--build", build_dir], cwd=project, env=env)
        if rc == 0 and test:
            # Host unit tests (lesson 80 on): run them with the host compiler's DLLs on PATH.
            rc = run(["ctest", "--test-dir", build_dir, "--output-on-failure"], cwd=project, env=env)
        return rc

    print(f"Don't know how to build {project} (no CMakeLists.txt or prj.conf)")
    return 2


def check() -> int:
    env, gcc, ninja = environment()
    rows = [
        ("ARM GCC (arm-none-eabi-gcc)", gcc),
        ("Ninja", ninja),
        ("CMake", shutil.which("cmake")),
        ("Git", shutil.which("git")),
        ("Host C compiler (MinGW gcc, needed from lesson 80 and for pioasm)", find_tool("gcc", DEFAULTS["host_gcc"])),
        ("cppcheck (needed from lesson 83)", shutil.which("cppcheck") or (Path(r"C:\Program Files\Cppcheck\cppcheck.exe") if Path(r"C:\Program Files\Cppcheck\cppcheck.exe").exists() else None)),
        ("Pico SDK", env["PICO_SDK_PATH"] if Path(env["PICO_SDK_PATH"], "pico_sdk_init.cmake").exists() else None),
        ("Wokwi CLI (optional, for automated checks)", (HOME / ".wokwi" / "bin" / "wokwi-cli.exe") if (HOME / ".wokwi" / "bin" / "wokwi-cli.exe").exists() else shutil.which("wokwi-cli")),
        ("Rust (cargo, needed for lesson 108; optional)", (HOME / ".cargo" / "bin") if (HOME / ".cargo" / "bin" / "cargo.exe").exists() else shutil.which("cargo")),
        ("Zephyr workspace (needed from lesson 92)", DEFAULTS["zephyr_ws"] if (DEFAULTS["zephyr_ws"] / "zephyr").exists() else None),
    ]
    ok = True
    for name, where in rows:
        mark = "OK " if where else ("optional" if "optional" in name or "Zephyr" in name else "MISSING")
        print(f"[{mark:7}] {name}: {where or ''}")
        if not where and "Zephyr" not in name and "optional" not in name:
            ok = False
    code = shutil.which("code")
    if code:
        exts = subprocess.run([code, "--list-extensions"], capture_output=True, text=True, shell=True).stdout.lower()
        for ext in ("wokwi.wokwi-vscode", "ms-vscode.cpptools", "marus25.cortex-debug"):
            present = ext in exts
            ok &= present
            print(f"[{'OK ' if present else 'MISSING':7}] VS Code extension {ext}")
    print("\nAll required tools found." if ok else "\nSome tools are missing: see lesson 1.")
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("project", nargs="?", help="project directory")
    ap.add_argument("--clean", action="store_true", help="delete the build directory first")
    ap.add_argument("--check", action="store_true", help="verify the toolchain installation")
    ap.add_argument("--release", action="store_true", help="optimised build (default: Debug, -Og -g)")
    ap.add_argument("--test", action="store_true", help="after building, run the unit tests with ctest (host-test projects)")
    a = ap.parse_args()
    if a.check:
        return check()
    if not a.project:
        ap.error("give a project directory or --check")
    return build(Path(a.project).resolve(), a.clean, "Release" if a.release else "Debug", a.test)


if __name__ == "__main__":
    sys.exit(main())
