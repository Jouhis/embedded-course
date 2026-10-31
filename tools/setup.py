"""One-command setup for the course on Windows, macOS and Linux.

  python tools/setup.py              core tools: enough for every Pico and STM32 lesson
  python tools/setup.py --zephyr     also the Zephyr workspace (lessons 92-96, lab 6; about 1-2 GB)
  python tools/setup.py --rust       also Rust for lesson 108
  python tools/setup.py --wokwi-cli  also the Wokwi CLI, for automated simulation checks
  python tools/setup.py --all        everything
  python tools/setup.py --portable   no package manager: download portable tools (no admin rights)
  python tools/setup.py --dry-run    show what would be done, change nothing

Safe to run again: every step checks first and skips what is already there.
What it does (lesson 1 explains each tool):
  1. fetches the libraries in third_party/ (git submodules)
  2. installs Arm GCC, CMake, Ninja, a host C compiler and cppcheck with the system package
     manager: winget (Windows), Homebrew (macOS), apt, dnf or pacman (Linux; asks for your sudo
     password). Without one, or with --portable, it downloads the official portable archives into
     ~/.embedded-course-tools instead: no admin rights needed
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
                          "dnf": "arm-none-eabi-gcc-cs arm-none-eabi-newlib arm-none-eabi-gcc-cs-c++",
                          "pacman": "arm-none-eabi-gcc arm-none-eabi-newlib"},
    "cmake":   {"winget": "Kitware.CMake", "brew": "cmake", "apt": "cmake", "dnf": "cmake", "pacman": "cmake"},
    "ninja":   {"winget": "Ninja-build.Ninja", "brew": "ninja", "apt": "ninja-build", "dnf": "ninja-build",
                "pacman": "ninja"},
    "gcc":     {"winget": "BrechtSanders.WinLibs.POSIX.UCRT", "brew": None,   # macOS: Xcode command line tools
                "apt": "build-essential", "dnf": "gcc gcc-c++ make", "pacman": "base-devel"},
    "cppcheck": {"winget": "Cppcheck.Cppcheck", "brew": "cppcheck", "apt": "cppcheck", "dnf": "cppcheck",
                 "pacman": "cppcheck"},
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
    for pm, exe in (("apt", "apt-get"), ("dnf", "dnf"), ("pacman", "pacman")):
        if shutil.which(exe):
            return pm
    return None


# ---------------------------------------------------------------- portable downloads
# Used when there is no package manager (or with --portable). Official archives, unpacked into
# ~/.embedded-course-tools, which tools/build.py also searches. No admin rights needed.

ARM_URL = ("https://developer.arm.com/-/media/Files/downloads/gnu/14.2.rel1/binrel/"
           "arm-gnu-toolchain-14.2.rel1-{}-arm-none-eabi.{}")
CMAKE_URL = "https://github.com/Kitware/CMake/releases/download/v4.3.2/cmake-4.3.2-{}"
NINJA_URL = "https://github.com/ninja-build/ninja/releases/download/v1.13.2/ninja-{}.zip"
# WinLibs: MinGW gcc for Windows. It also contains cmake, ninja and cppcheck.
WINLIBS_URL = ("https://github.com/brechtsanders/winlibs_mingw/releases/download/16.2.0posix-14.0.0-ucrt-r2/"
               "winlibs-x86_64-posix-seh-gcc-16.2.0-mingw-w64ucrt-14.0.0-r2.zip")


def portable_plan(missing):
    """Return ([(label, url)], [tools with no portable download on this OS])."""
    arm64 = platform.machine().lower() in ("arm64", "aarch64")
    plan, left = [], []
    if WINDOWS:
        if "arm-none-eabi-gcc" in missing:
            plan.append(("Arm GNU toolchain 14.2", ARM_URL.format("mingw-w64-x86_64", "zip")))
        if set(missing) & {"gcc", "cmake", "ninja", "cppcheck"}:
            plan.append(("WinLibs gcc 16.2 (with cmake, ninja, cppcheck)", WINLIBS_URL))
        return plan, left
    if MAC:
        arm_os = "darwin-arm64" if arm64 else "darwin-x86_64"
    else:
        arm_os = "aarch64" if arm64 else "x86_64"
    for t in missing:
        if t == "arm-none-eabi-gcc":
            plan.append(("Arm GNU toolchain 14.2", ARM_URL.format(arm_os, "tar.xz")))
        elif t == "cmake":
            plan.append(("CMake 4.3.2", CMAKE_URL.format(
                "macos-universal.tar.gz" if MAC else f"linux-{'aarch64' if arm64 else 'x86_64'}.tar.gz")))
        elif t == "ninja":
            plan.append(("Ninja 1.13.2", NINJA_URL.format("mac" if MAC else ("linux-aarch64" if arm64 else "linux"))))
        else:
            left.append(t)   # gcc, cppcheck: need the system package manager on macOS and Linux
    return plan, left


def local_tools_dir():
    sys.path.insert(0, str(ROOT / "tools"))
    import build  # noqa: E402  (tools/build.py)
    return build.LOCAL_TOOLS


def download_and_unpack(label, url):
    import tarfile
    import urllib.request
    import zipfile
    dest = local_tools_dir()
    name = url.rsplit("/", 1)[1]
    stem = name.split(".tar.")[0] if ".tar." in name else name.rsplit(".", 1)[0]
    if stem.startswith("arm-gnu-toolchain-") and WINDOWS:
        stem = "arm-gnu-toolchain-14.2"   # short: GCC's include paths must stay under Windows' 260-character limit
    sub = dest   # zips without a single top folder (Arm for Windows, Ninja) get one named after the archive
    if DRY:
        say(f"  would download {label}: {url}")
        say(f"    and unpack it into {dest}")
        return
    sub.mkdir(parents=True, exist_ok=True)
    archive = dest / name
    say(f"  downloading {label} ...")
    try:
        with urllib.request.urlopen(url) as r, open(archive, "wb") as f:
            total = int(r.headers.get("Content-Length") or 0)
            done = 0
            while True:
                chunk = r.read(1 << 20)
                if not chunk:
                    break
                f.write(chunk)
                done += len(chunk)
                if total:
                    print(f"\r    {done >> 20} / {total >> 20} MB", end="", flush=True)
        print()
        say("  unpacking ...")
        if name.endswith(".zip"):
            with zipfile.ZipFile(archive) as z:
                tops = {n.split("/", 1)[0] for n in z.namelist()}
                if len(tops) != 1 or not any("/" in n for n in z.namelist()):
                    sub = dest / stem
                z.extractall(sub)
                if not WINDOWS:   # zip does not restore the executable bit
                    for info in z.infolist():
                        mode = info.external_attr >> 16
                        if mode & 0o111:
                            os.chmod(sub / info.filename, mode & 0o777)
        else:
            with tarfile.open(archive) as t:
                if hasattr(tarfile, "data_filter"):
                    t.extractall(sub, filter="data")
                else:
                    t.extractall(sub)
    except Exception as e:  # network, disk or archive error: report it and carry on with the other steps
        problems.append(f"{label}: {e}  (download it yourself from {url} and unpack it into {dest})")
    finally:
        if archive.exists():
            archive.unlink()


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


def system_tools(portable=False):
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
    say(f"  missing: {', '.join(missing)}")
    pm = None if portable else package_manager()
    if not pm:
        say("  no package manager in use: downloading portable versions (no admin rights needed)")
        plan, left = portable_plan(missing)
        for label, url in plan:
            download_and_unpack(label, url)
        if left:
            how = ("brew install " + " ".join(left)) if MAC else "your distribution's package manager"
            note = " (cppcheck is only needed from lesson 83)" if left == ["cppcheck"] else ""
            problems.append(f"still missing {', '.join(left)}: install with {how}{note}")
        return
    pkgs = [PACKAGES[t][pm] for t in missing if PACKAGES[t].get(pm)]
    say(f"  installing with {pm}")
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
        elif pm == "dnf":
            run(sudo + ["dnf", "install", "-y"] + names)
        else:
            run(sudo + ["pacman", "-S", "--needed", "--noconfirm"] + names)
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


def wokwi_cli():
    step("Wokwi CLI (optional: automated simulation checks with tools/sim.py)")
    exe = HOME / ".wokwi" / "bin" / ("wokwi-cli.exe" if WINDOWS else "wokwi-cli")
    if exe.exists() or shutil.which("wokwi-cli"):
        say(f"  present: {exe if exe.exists() else shutil.which('wokwi-cli')}")
        return
    arm64 = platform.machine().lower() in ("arm64", "aarch64")
    asset = ("wokwi-cli-win-x64.exe" if WINDOWS else
             f"wokwi-cli-macos-{'arm64' if arm64 else 'x64'}" if MAC else
             f"wokwi-cli-linuxstatic-{'arm64' if arm64 else 'x64'}")
    url = "https://github.com/wokwi/wokwi-cli/releases/latest/download/" + asset
    if DRY:
        say(f"  would download {url}")
        say(f"    to {exe}")
        return
    import urllib.request
    try:
        exe.parent.mkdir(parents=True, exist_ok=True)
        say(f"  downloading {asset} ...")
        urllib.request.urlretrieve(url, exe)
        if not WINDOWS:
            exe.chmod(0o755)
        say(f"  saved: {exe}")
        say("  It needs a CI token from https://wokwi.com/dashboard/ci in WOKWI_CLI_TOKEN (see lesson 1).")
    except Exception as e:
        problems.append(f"Wokwi CLI: {e}  (download {url} and save it as {exe})")


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
    ap.add_argument("--wokwi-cli", action="store_true", help="also download the Wokwi CLI (automated checks)")
    ap.add_argument("--all", action="store_true", help="core tools plus Zephyr, Rust and the Wokwi CLI")
    ap.add_argument("--portable", action="store_true",
                    help="download portable tools into ~/.embedded-course-tools instead of using a package manager")
    ap.add_argument("--dry-run", action="store_true", help="show what would be done without changing anything")
    a = ap.parse_args()
    DRY = a.dry_run
    if sys.version_info < (3, 8):
        sys.exit("Python 3.8 or newer is needed")
    say(f"Course setup on {platform.system()} {platform.machine()}" + ("  (dry run)" if DRY else ""))

    submodules()
    system_tools(a.portable)
    pico_sdk()
    vscode_extensions()
    if a.zephyr or a.all:
        zephyr()
    if a.rust or a.all:
        rust()
    if a.wokwi_cli or a.all:
        wokwi_cli()
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
