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

The last line fetches the libraries in `third_party/` (CMSIS, ST HAL, FreeRTOS, Unity, fff).
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

Lesson 1 installs the tools step by step: Arm GCC, CMake, Ninja, the Pico SDK, VS Code with the
Wokwi extension and, for later parts, a host C compiler, cppcheck, Zephyr and Rust.
To see what's installed and what's missing:

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
