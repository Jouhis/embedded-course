# Embedded Systems: From Electrons to Firmware Engineer

An introductory embedded-development course: 116 lessons, 6 labs and 8 checkpoints, from Ohm's law
and computer architecture to bare-metal C, FreeRTOS, Zephyr and a capstone project. Raspberry Pi Pico
and STM32 Blue Pill, simulated in [Wokwi](https://wokwi.com) inside VS Code. No hardware needed.

Version: see [`VERSION`](VERSION). Known issues: [`CHANGELOG.md`](CHANGELOG.md).

## First time: step by step

1. **Install the prerequisites:** [Git](https://git-scm.com/downloads), [Python 3](https://www.python.org/downloads/)
   (on Windows tick "Add python.exe to PATH") and [VS Code](https://code.visualstudio.com/).
   On Windows, also enable `code` on the PATH when the VS Code installer asks; it does this by default.
2. **Clone the repo.** It is private, so sign in to GitHub first: `gh auth login` with the
   [GitHub CLI](https://cli.github.com/), or let Git's credential manager open a browser on the first clone.
   ```sh
   git clone https://github.com/Jouhis/embedded-course
   cd embedded-course
   ```
3. **Run the setup.** It downloads several hundred MB, so give it a while:
   ```sh
   setup.cmd          # Windows: double-click it, or type .\setup.cmd in PowerShell
   ./setup.sh         # macOS, Linux
   ```
   It must end with `== Done`. If it lists problems instead, fix them and run it again.
4. **Get a free Wokwi licence:** in VS Code press Ctrl+Shift+P (Cmd+Shift+P on macOS), run
   **Wokwi: Request a New License** and sign in to Wokwi in the browser that opens.
5. **Open the course:** double-click `Open course.cmd` (Windows) or run `python3 tools/serve.py`
   (macOS, Linux), then start with lesson 1.

The sections below explain each step in more detail.

## Get it

```sh
git clone https://github.com/Jouhis/embedded-course
cd embedded-course
git submodule update --init
```

The last line fetches the libraries in `third_party/` (CMSIS, ST HAL, FreeRTOS, Unity, fff); the
setup script does it for you too. Don't use `git clone --recurse-submodules`: it also tries FreeRTOS's own nested submodules, one
of which fails to clone. The course doesn't need them.

## Read the course (nothing to install)

The course is plain HTML. Either:

- **Double-click `Open course.cmd`** (Windows; needs Python). It serves the course on
  `http://localhost:8000` and opens your browser. On macOS and Linux, run `python3 tools/serve.py`.
- Or open `index.html` directly in a browser.

Serving it is better: your progress ("Mark lesson complete") is saved in the browser, and Firefox
gives every page opened as a file its own storage. The course carries progress along its own links
to work around that, but over localhost every page simply shares one store. Use **Export progress**
on the index to back up your progress or move it to another browser.

## Build and simulate the projects

One command installs everything (Windows, macOS, Linux). You need Git, Python 3 and VS Code first:
without VS Code's `code` command, the script cannot install the extensions and only tells you their names.

```sh
setup.cmd            # Windows (double-click works too)
./setup.sh           # macOS, Linux
```

It fetches `third_party/` and installs Arm GCC, CMake, Ninja, a host C compiler and cppcheck
with your package manager (winget, Homebrew, apt, dnf or pacman), then Pico SDK 2.3.1 and the
VS Code extensions, and test-builds the Pico and STM32 templates.

No package manager, or not allowed to install software? It then downloads the official portable
archives into `~/.embedded-course-tools` instead, with no admin rights needed (add `--portable` to
choose this yourself). `tools/build.py` finds tools there automatically.

Optional parts: add `--zephyr` (lessons 92-96, about 1-2 GB), `--rust` (lesson 108) or `--all`, for
example `./setup.sh --all`. `--dry-run` shows what it would do. It is safe to run again: it skips
what is already there, so run it again with `--zephyr` when you reach lesson 92.

Lesson 1 explains each tool, if you'd rather install them by hand. To see what's missing:

```sh
python tools/build.py --check
```

Then, for any project:

```sh
python tools/build.py projects/0002-first-blink/solution   # build
python tools/build.py templates/host-test --test           # build and run host tests
```

Open the project folder in VS Code and run **Wokwi: Start Simulator** (Ctrl+Shift+P). The first time,
run **Wokwi: Request a New License** and sign in to a free Wokwi account in the browser.

Every project has a `starter/` (your exercise) and a `solution/`.

## Tools for maintaining the course

On macOS and Linux, type `python3` where these say `python`.

| Command | What it does |
| --- | --- |
| `python tools/check_course.py` | validates every lesson page |
| `python tools/verify_projects.py` | builds and lints every Wokwi project |
| `python tools/verify_projects.py --sim` | also runs solutions in the Wokwi cloud (needs `WOKWI_CLI_TOKEN`) |
| `python tools/build_manifest.py` | rebuilds `assets/manifest.js` from `COURSE-PLAN.md` |

Lesson authoring rules are in `tools/LESSON-SPEC.md`; verified toolchain and simulator facts are in `NOTES.md`.

## Licence notes

Bundled fonts (Inter, JetBrains Mono) are SIL Open Font License 1.1; see `assets/fonts/LICENSE-*.txt`.
Libraries in `third_party/` keep their own licences.
