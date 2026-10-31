# Embedded Systems: From Electrons to Firmware Engineer

An introductory embedded-development course: 116 lessons, 6 labs and 8 checkpoints, from Ohm's law
and computer architecture to bare-metal C, FreeRTOS, Zephyr and a capstone project. Raspberry Pi Pico
and STM32 Blue Pill, simulated in [Wokwi](https://wokwi.com) inside VS Code. No hardware needed.

Version: see [`VERSION`](VERSION). Known issues: [`CHANGELOG.md`](CHANGELOG.md).

## Get it

```sh
git clone https://github.com/Jouhis/embedded-course
cd embedded-course
git submodule update --init
```

(The setup script below does this for you.) The last line fetches the libraries in `third_party/` (CMSIS, ST HAL, FreeRTOS, Unity, fff).
Don't use `git clone --recurse-submodules`: it also tries FreeRTOS's own nested submodules, one
of which fails to clone. The course doesn't need them.

## Read the course (nothing to install)

The course is plain HTML. Either:

- **Double-click `Open course.cmd`** (Windows; needs Python). It serves the course on
  `http://localhost:8000` and opens your browser. Or run `python tools/serve.py` on any OS.
- Or open `index.html` directly in a browser.

Serving it is better: your progress ("Mark lesson complete") is saved in the browser, and Firefox
gives every page opened as a file its own storage. The course carries progress along its own links
to work around that, but over localhost every page simply shares one store. Use **Export progress**
on the index to back up your progress or move it to another browser.

## Build and simulate the projects

One command installs everything (Windows, macOS, Linux). You need Python 3 and Git first.

```sh
setup.cmd            # Windows (double-click works too)
./setup.sh           # macOS, Linux
```

It fetches `third_party/` and installs Arm GCC, CMake, Ninja, a host C compiler, cppcheck
(winget / Homebrew / apt / dnf), Pico SDK 2.3.1 and the VS Code extensions, then test-builds the
Pico and STM32 templates. Add `--zephyr` (lessons 92-96, about 1-2 GB), `--rust` (lesson 108) or
`--all`; `--dry-run` shows what it would do. It is safe to run again: it skips what's there.

Lesson 1 explains each tool, if you'd rather install them by hand. To see what's missing:

```sh
python tools/build.py --check
```

Then, for any project:

```sh
python tools/build.py projects/0002-first-blink/solution   # build
python tools/build.py templates/host-test --test           # build and run host tests
```

Open the project folder in VS Code and run **Wokwi: Start Simulator**. A free Wokwi account and a
browser sign-in from VS Code are needed the first time.

Every project has a `starter/` (your exercise) and a `solution/`.

## Tools for maintaining the course

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
