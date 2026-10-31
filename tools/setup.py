"""One-command setup for the course on Windows, macOS and Linux.

  python tools/setup.py              core tools: enough for every Pico and STM32 lesson
  python tools/setup.py --zephyr     also the Zephyr workspace (lessons 92-96, lab 6; about 1-2 GB)
  python tools/setup.py --rust       also Rust for lesson 108
  python tools/setup.py --all        everything
  python tools/setup.py --dry-run    show what would be done, change nothing

Safe to run again: every step checks first and skips what is already there.
What it does (lesson 1 explains each tool):
  1. fetches the libraries in third_party/ (git submodules)
  2. installs Arm GCC, CMake, Ninja, a host C compiler and cppcheck with the system package
     manager: winget (Windows), Homebrew (macOS), apt or dnf (Linux; asks for your sudo password)
  3. downloads Pico SDK 2.3.1 to ~/.pico-sdk/sdk/2.3.1
  4. installs the VS Code extensions (Wokwi, C/C++, Cortex-Debug) if VS Code's `code` command exists
  5. runs `python tools/build.py --check` and test-builds the Pico and STM32 templates
"""
import argparse
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HOME = Path.home()
PICO_SDK = HOME / ".pico-sdk" / "sdk" / "2.3.1"
ZEPHYR_WS = HOME / "zephyrproject"
ZEPHYR_VERSION = "v4.5.0"
ZEPHYR_FILTER = "-.*,+cmsis.*,+hal_rpi_pico,+hal_stm32"
VSCODE_EXTENSIONS = ["wokwi.wokwi-vscode", "ms-vscode.cpptools", "marus25.cortex-debug"]
WINDOWS = os.name == "nt"
MAC = sys.platform == "darwin"

# tool -> package per package manager (None: not needed or comes with something else)
PACKAGES = {
    "arm-none-eabi-gcc": {"winget": "Arm.GnuArmEmbeddedToolchain", "brew": "--cask gcc-arm-embedded",
                          "apt": "gcc-arm-none-eabi libnewlib-arm-none-eabi libstdc++-arm-none-eabi-newlib",
                          "dnf": "arm-none-eabi-gcc-cs arm-none-eabi-newlib arm-none-eabi-gcc-cs-c++"},
    "cmake":   {"winget": "Kitware.CMake", "brew": "cmake", "apt": "cmake", "dnf": "cmake"},
    "ninja":   {"winget": "Ninja-build.Ninja", "brew": "ninja", "apt": "ninja-build", "dnf": "ninja-build"},
    "gcc":     {"winget": "BrechtSanders.WinLibs.POSIX.UCRT", "brew": None,   # macOS: Xcode command line tools
                "apt": "build-essential", "dnf": "gcc gcc-c++ make"},
    "cppcheck": {"winget": "Cppcheck.Cppcheck", "brew": "cppcheck", "apt": "cppcheck", "dnf": "cppcheck"},
}

DRY = False
problems = []


def say(msg):
    print(msg, flush=True)


def run(cmd, cwd=None, check=True, env=None):
    shown = " ".join(str(c) for c in cmd)
    if DRY:
        say(f"  would run: {shown}")
        return 0
    say(f"  $ {shown}")
    rc = subprocess.call([str(c) for c in cmd], cwd=cwd, env=env)
    if rc and check:
        problems.append(f"failed (exit {rc}): {shown}")
    return rc


def step(title):
    say(f"\n== {title}")


def tool_env():
    """PATH including the places tools/build.py knows about (winget does not refresh PATH for this shell)."""
    sys.path.insert(0, str(ROOT / "tools"))
    import build  # noqa: E402  (tools/build.py)
    env, _, _ = build.environment()
    return env


def have(tool, env=None):
    path = (env or os.environ).get("PATH")
    if shutil.which(tool, path=path):
        return True
    if WINDOWS and tool == "cppcheck":
        return Path(r"C:\Program Files\Cppcheck\cppcheck.exe").exists()
    return False


def package_manager():
    if WINDOWS:
        return "winget" if shutil.which("winget") else None
    if MAC:
        return "brew" if shutil.which("brew") else None
    for pm in ("apt", "dnf"):
        if shutil.which(pm if pm == "dnf" else "apt-get"):
            return pm
    return None


# ---------------------------------------------------------------- steps

def submodules():
    step("1. Libraries in third_party/ (git submodules)")
    if not shutil.which("git"):
        problems.append("git is not installed: install it first (https://git-scm.com), then run this again")
        return
    if not (ROOT / ".git").exists():
        say("  not a git clone; skipping (third_party/ must already be filled in)")
        return
    # Not --recursive: FreeRTOS has nested submodules the course does not need, and one fails to clone.
    run(["git", "submodule", "update", "--init"], cwd=ROOT)


def system_tools():
    step("2. Compilers and build tools")
    env = tool_env()
    missing = [t for t in PACKAGES if not have(t, env)]
    if MAC and "gcc" in missing:
        missing.remove("gcc")
        if not shutil.which("xcode-select") or subprocess.call(["xcode-select", "-p"], stdout=subprocess.DEVNULL,
                                                                stderr=subprocess.DEVNULL):
            say("  host compiler: installing the Xcode command line tools (a window will open)")
            run(["xcode-select", "--install"], check=False)
    if not missing:
        say("  all present")
        return
    pm = package_manager()
    if not pm:
        hint = ("install Homebrew from https://brew.sh" if MAC else
                "install App Installer (winget) from the Microsoft Store" if WINDOWS else
                "install them with your distribution's package manager")
        problems.append(f"missing {', '.join(missing)} and no supported package manager: {hint}")
        return
    pkgs = [PACKAGES[t][pm] for t in missing if PACKAGES[t][pm]]
    say(f"  missing: {', '.join(missing)}  (installing with {pm})")
    if pm == "winget":
        for p in pkgs:
            run(["winget", "install", "-e", "--id", p, "--accept-package-agreements", "--accept-source-agreements"])
    elif pm == "brew":
        for p in pkgs:
            run(["brew", "install"] + p.split())
    else:
        sudo = [] if os.geteuid() == 0 else ["sudo"]
        names = " ".join(pkgs).split()
        if pm == "apt":
            run(sudo + ["apt-get", "update"])
            run(sudo + ["apt-get", "install", "-y"] + names)
        else:
            run(sudo + ["dnf", "install", "-y"] + names)
    if WINDOWS:
        say("  note: open a new terminal afterwards so the new tools are on PATH (tools/build.py finds them anyway)")


def pico_sdk():
    step("3. Pico SDK 2.3.1")
    if (PICO_SDK / "pico_sdk_init.cmake").exists():
        say(f"  present: {PICO_SDK}")
        return
    if PICO_SDK.exists() and any(PICO_SDK.iterdir()):
        problems.append(f"{PICO_SDK} exists but is not a Pico SDK: move it away and run this again")
        return
    run(["git", "clone", "--depth", "1", "--branch", "2.3.1", "https://github.com/raspberrypi/pico-sdk", PICO_SDK])
    # Only TinyUSB is needed (USB serial); the Wi-Fi and Bluetooth stacks are large and unused.
    run(["git", "submodule", "update", "--init", "--depth", "1", "lib/tinyusb"], cwd=PICO_SDK)


def vscode_extensions():
    step("4. VS Code extensions")
    code = shutil.which("code")
    if not code:
        say("  VS Code's `code` command not found. Install VS Code (https://code.visualstudio.com), then either")
        say("  run this again or install these extensions by hand: " + ", ".join(VSCODE_EXTENSIONS))
        return
    out = subprocess.run([code, "--list-extensions"], capture_output=True, text=True).stdout.lower().split()
    todo = [e for e in VSCODE_EXTENSIONS if e.lower() not in out]
    if not todo:
        say("  all present")
    for e in todo:
        run([code, "--install-extension", e])


def zephyr():
    step("5. Zephyr workspace (optional, lessons 92-96)")
    venv = ZEPHYR_WS / ".venv"
    scripts = venv / ("Scripts" if WINDOWS else "bin")
    west = scripts / ("west.exe" if WINDOWS else "west")
    py = scripts / ("python.exe" if WINDOWS else "python")
    if (ZEPHYR_WS / "zephyr" / "west.yml").exists() and west.exists():
        say(f"  present: {ZEPHYR_WS}")
        return
    uv = shutil.which("uv")
    if not venv.exists():
        if uv:
            run([uv, "venv", venv])
        else:
            run([sys.executable, "-m", "venv", venv])
    if uv:
        run([uv, "pip", "install", "--python", py, "west"])
    else:
        run([py, "-m", "pip", "install", "--upgrade", "pip", "west"])
    if not (ZEPHYR_WS / ".west").exists():
        run([west, "init", "-m", "https://github.com/zephyrproject-rtos/zephyr", "--mr", ZEPHYR_VERSION, ZEPHYR_WS])
    run([west, "config", "manifest.project-filter", "--", ZEPHYR_FILTER], cwd=ZEPHYR_WS)
    run([west, "update"], cwd=ZEPHYR_WS)
    req = ZEPHYR_WS / "zephyr" / "scripts" / "requirements-base.txt"
    if uv:
        run([uv, "pip", "install", "--python", py, "-r", req])
    else:
        run([py, "-m", "pip", "install", "-r", req])


def rust():
    step("6. Rust (optional, lesson 108)")
    if not shutil.which("rustup") and not (HOME / ".cargo" / "bin").exists():
        if WINDOWS and shutil.which("winget"):
            run(["winget", "install", "-e", "--id", "Rustlang.Rustup", "--accept-package-agreements",
                 "--accept-source-agreements"])
        elif MAC and shutil.which("brew"):
            run(["brew", "install", "rustup"])
            run(["rustup-init", "-y", "--no-modify-path", "--profile", "minimal"])
        else:
            problems.append("Rust: install rustup from https://rustup.rs, then run this again with --rust")
            return
    rustup = shutil.which("rustup") or str(HOME / ".cargo" / "bin" / ("rustup.exe" if WINDOWS else "rustup"))
    # Windows: the GNU toolchain links with MinGW, so no Visual Studio is needed (see lesson 108).
    tc = ["--toolchain", "stable-x86_64-pc-windows-gnu"] if WINDOWS else []
    if WINDOWS:
        run([rustup, "toolchain", "install", "stable-x86_64-pc-windows-gnu", "--profile", "minimal"])
    run([rustup, "target", "add", "thumbv6m-none-eabi"] + tc)
    run([rustup, "component", "add", "llvm-tools"] + tc)


def verify():
    step("7. Check")
    py = [sys.executable, "-I", str(ROOT / "tools" / "build.py")]
    run(py + ["--check"], cwd=ROOT, check=False)
    for t in ("templates/pico-sdk", "templates/stm32-cmsis"):
        say(f"  test build: {t}")
        if DRY:
            continue
        rc = subprocess.call(py + [str(ROOT / t)], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        say("    ok" if rc == 0 else f"    FAILED: run `python tools/build.py {t}` to see why")
        if rc:
            problems.append(f"test build failed: {t}")


def main():
    global DRY
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--zephyr", action="store_true", help="also set up the Zephyr workspace (~1-2 GB)")
    ap.add_argument("--rust", action="store_true", help="also install Rust for lesson 108")
    ap.add_argument("--all", action="store_true", help="core tools plus Zephyr and Rust")
    ap.add_argument("--dry-run", action="store_true", help="show what would be done without changing anything")
    a = ap.parse_args()
    DRY = a.dry_run
    if sys.version_info < (3, 8):
        sys.exit("Python 3.8 or newer is needed")
    say(f"Course setup on {platform.system()} {platform.machine()}" + ("  (dry run)" if DRY else ""))

    submodules()
    system_tools()
    pico_sdk()
    vscode_extensions()
    if a.zephyr or a.all:
        zephyr()
    if a.rust or a.all:
        rust()
    verify()

    say("\n== Done" if not problems else "\n== Finished with problems:")
    for p in problems:
        say(f"  - {p}")
    if not problems:
        say("  Open the course: double-click 'Open course.cmd' (Windows) or run `python3 tools/serve.py`.")
        say("  Simulating needs a free Wokwi licence: in VS Code run 'Wokwi: Request a New License' once.")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
