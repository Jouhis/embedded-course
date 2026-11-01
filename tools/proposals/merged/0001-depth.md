# Proposals from the depth expansion of lessons 0001 to 0004

For the lead to merge into `GLOSSARY.md` and `RESOURCES.md`. Formats follow those files.

## Glossary terms (add to the groups shown)

### Computer architecture / firmware (group: Computer architecture)

**Cross-compiler**:
A compiler that runs on one kind of processor (the host) and produces machine code for another (the target), such as `arm-none-eabi-gcc` on a Windows PC.
_Avoid_: Cross toolchain (acceptable in conversation)

**Object file**:
The output of the compiler for one source file: machine code and a symbol table, with calls to other files left unresolved. It cannot run until the linker joins it into an ELF file. Usually named `.o`.
_Avoid_: Binary (too vague)

**Symbol table**:
The list in an object or ELF file of the names it defines and the names it needs, with their addresses once the linker has placed them.
_Avoid_: Symbols (acceptable in informal use)

**Driver**:
Code that talks to one piece of hardware, such as a display or a sensor, and hides its register details behind a few functions.
_Avoid_: Library (a driver is one kind of library)

**Sensor**:
A component that turns a physical quantity into an electrical signal, such as a thermistor whose resistance changes with temperature.
_Avoid_: Probe (informal)

**Actuator**:
A component that turns an electrical signal into motion, heat or another physical effect, such as a motor, heater or relay.
_Avoid_: Output device (too vague)

**Hard real-time**:
A deadline where a late result is wrong, such as a motor step pulse that must fire at its scheduled time.
_Avoid_: Real-time (alone, when the deadline type matters)

**Soft real-time**:
A deadline where a late result is worse but still usable, such as a web page that loads late.
_Avoid_: Best effort (a different idea with no deadline)

**Bring-up**:
The first power-on and check of a new board, done pin by pin with a meter, scope or logic analyzer, and with simple test code.
_Avoid_: Commissioning (acceptable in industry)

**Period**:
The time for one complete cycle of a repeating signal, in seconds. Frequency is 1 ÷ period.
_Avoid_: Cycle time (ambiguous)

**Frequency**:
The number of complete cycles per second, in hertz (Hz). It is the inverse of the period.
_Avoid_: Rate (too vague)

### Tools (group: Tools; new group if none exists)

**CMake**:
A build-description tool. A `CMakeLists.txt` file names the sources, programs and libraries, and CMake writes the commands that the build tool runs.
_Avoid_: Make (a different build tool)

**Ninja**:
A fast build tool that runs the compile and link commands CMake writes into `build.ninja`, rebuilding only what has changed.
_Avoid_: Make (a different build tool)

**Pico SDK**:
Raspberry Pi's C library and build support for the RP2040 and RP2350 chips. Version 2.3.1 is used in this course. It provides functions such as `gpio_put`, `sleep_ms` and `stdio_init_all`.
_Avoid_: Pico library (informal)

**Environment variable**:
A named text value that the operating system passes to each program it starts, such as `PICO_SDK_PATH`.
_Avoid_: Config (too vague)

**Git submodule**:
A separate git repository stored inside another at a fixed commit. A plain clone does not download it; `git submodule update --init` does.
_Avoid_: Subrepo

**PATH**:
The environment variable listing the folders a terminal searches when you type a program name. An installer changes it only for terminals opened afterwards.
_Avoid_: Path (ambiguous with file paths)

**Package manager**:
A tool, such as winget, Homebrew or apt, that installs software from a central list by exact package ID.
_Avoid_: Installer (an installer is one package; the package manager is the tool that runs them)

### Learning method (group: Course method)

**Metacognition**:
Thinking about your own thinking: noticing whether you actually know something before you assume you do.
_Avoid_: Self-awareness (broader)

## Resources (add to the groups shown)

### Tools (group: Tools)

- [Wokwi for VS Code: getting started](https://docs.wokwi.com/vscode/getting-started)
  Installing the Wokwi extension and requesting a license with F1, then Wokwi: Request a new License. Use for: lesson 1 (license steps).
- [Wokwi license](https://wokwi.com/license)
  Personal 30-day license for Wokwi VS Code, free for open-source projects, and paid for commercial use. The page does not state renewal. Use for: lesson 1 (license terms).

### Knowledge (group: Knowledge)

- [Retrieval Practice](https://www.retrievalpractice.org/)
  The research summary behind retrieval practice, with spacing and interleaving as related strategies. Use for: lesson 4 (the method and its evidence).
