# Changelog

Version numbers use MAJOR.MINOR.PATCH. The current version is in `VERSION`.

- **Patch** (0.1.0 to 0.1.1): fixes, wording, new widgets or quiz questions. Saved progress,
  bookmarks and project folders are unaffected.
- **Minor** (0.1.x to 0.2.0): structural changes. Lessons added, removed or renumbered, project
  folders renamed, or saved progress that needs migrating. From 0.0.11 on, the next structural
  release is 0.1.0.
- **Major** (1.0.0): the course is complete and stable. Every lab has been run end to end, in
  Wokwi or on a board; at least one learner has gone through the course; and the numbering is
  frozen, so links and saved progress stay valid.

## 0.0.15 (2026-11-08)

- Phones: tapping the search box or a widget's dropdown no longer zooms the page, and a double tap
  no longer zooms either. Pinch zoom still works.

## 0.0.14 (2026-11-08)

- The course index's "How to use it" and "What's where" sections fold away. They start closed,
  and the page remembers which ones you opened.

## 0.0.13 (2026-11-08)

- Animated diagrams: a new `anim.js` widget steps through a worked example with a caption per
  step. 51 lessons gain one or more, from Ohm's law and the ripple-carry adder to interrupt entry,
  the .data copy, USB enumeration and the bootloader hand-over.
- Lesson 25's counter is 4 bits wide and has a Run button; the latch widget in lesson 24 has one
  too. Timing diagrams keep a fixed width as they fill.
- Simulators keep the same size while they run or step: cpusim, cachesim, rtossim, racestep,
  queuesim, stackmark, mpusim and memlayout no longer make the page jump.
- Lesson 15: the regulator model opens as the 12 V to 5 V circuit its title promises (7 kΩ and
  5 kΩ, 1 mA), and the power figures in the text match it.
- Lesson 16: the open-drain part is a clickable schematic (devices and the pull-up toggle in the
  drawing), and the Schmitt trigger's hysteresis is adjustable, with the VIL-VIH band labelled.

## 0.0.12 (2026-11-07)

- Smart search is on by default. When it is off, a line crosses the brain button. The first search
  with it on downloads the model (about 50 MB) once. A choice to switch it off is remembered.

## 0.0.11 (2026-11-07)

- Smart search is now a brain button inside the search bar. Tap it to switch smart search on or
  off at any time; the choice is remembered. It used to be a checkbox under the results.

## 0.0.10 (2026-11-07)

### New lesson 105: storing data in flash

- A setpoint that survives resets and power cuts: NOR flash rules (erase a 4 KB sector to 0xFF,
  program a 256-byte page by clearing bits), wear (100,000 cycles: 69 days at one save a minute),
  and a two-sector log of records with a sequence number and a CRC that keeps the last good copy
  through a cut at any moment. Sources: the W25Q16JV datasheet (Rev I) and the SDK's
  hardware/flash.h.
- The exercise `projects/0105-flash-settings` is a host-test project with a fake flash that
  follows the rules and can cut the power after an erase or halfway through a write. The starter
  saves in one place and fails 5 of 9 tests; each part of the solution is caught by a test when
  removed. `projects/0105-flash-settings-pico` runs the same `settings.c` on the Pico.
- Glossary: flash sector, endurance, torn write.

### Lessons 105 to 120 are now 106 to 121

- Lesson files, project folders and cross-references were renumbered by script; bare numbers in
  tables and link texts were fixed by hand. Saved progress moves to the new numbers on the first
  visit (numbering "4" in `assets/course.js`).
- Progress exports now record their numbering, and importing an older export moves it to the new
  numbers.

### A shorter core path

- The Zephyr part (lessons 94 to 99, Lab 6 and Checkpoint 7) is now optional. It teaches the same
  RTOS ideas as the FreeRTOS part on a second kernel, and nothing later depends on it.
- Optional items no longer count towards course progress. The index counts them separately
  ("plus 1 / 13 optional"), tags them, and explains the tag.

- Checked in the Wokwi browser editor: the Pico demo saves 21 times on the simulated flash and
  reads the last value back. Wokwi's Pico simulates no reset that keeps the flash (watchdog and
  SYSRESETREQ do nothing), so the power-cut tests run on the host (see NOTES.md).

## 0.0.9 (2026-11-07)

### Interactive widgets in the later lessons

- Where each variable lives: sort declarations into sections, read the lesson 41 build's memory map,
  and step through the startup code that copies .data and clears .bss (lessons 41 and 42).
- An integer promotion stepper (lesson 45) and a struct layout and byte order viewer (lesson 48).
- A debounce lab with the lesson's integrator (52), a state machine stepper for the traffic light
  (56), and the ADC chain from temperature to code and back, with noise and averaging (58).
- Bus waveforms: I²C (60), UART with a receiver clock error you can drag (53), and SPI modes (62).
- A timer and PWM configurator for the STM32 and the RP2040 (59, 71, 115) and an NVIC interrupt
  timeline with preemption, grouping and critical sections (72).
- A scheduler timeline: tasks and priorities (87), priority inversion with a semaphore and a mutex,
  on the project's own numbers (91), and the rate-monotonic bound (93).
- A Modbus RTU frame builder with a CRC trace and bit flips on the wire (101, 117), a filter lab
  with aliasing (106), and a PID tuner on the lesson's heater model, which reproduces its tuning
  table (107).
- Logic levels, hysteresis on a noisy edge and an open-drain line with its pull-up (16).
- A race stepper where you choose who runs next: a read-modify-write of ODR against an interrupt (47),
  the flag and count read in three steps (57), and two cores incrementing one counter (64), each
  with the lesson's fix as an option.
- A timeout across the counter wrap, checked three ways (55, 73).
- A 5 by 7 glyph editor with SSD1306 page addressing (61), a DMA ring with its half-buffer deadline
  (74), a battery-life budget (75), CAN arbitration and bit stuffing (100), and a COBS encoder and
  decoder with a CRC (103).
- The volatile wait loop as the compiler wrote it (46), a macro expander (50), a queue and
  semaphore lab (90), a painted stack and its high-water mark (92), and the bootloader's slot
  checks (104).
- Simpler widgets: the section quiz shows one declaration at a time, each lesson shows only its own
  presets, chip or bus, and long event logs fold away.

### Search

- Each result has a coloured badge: Lesson, Glossary, Lab, Checkpoint or Reference. Glossary
  results also have a purple edge, so they stand out from the lessons.

## 0.0.8 (2026-11-07)

### More interactive lessons

- The CPU simulator can draw the CPU as blocks (PC, code memory, decoder, registers, ALU, flags,
  data memory). After each phase the wires it used light up and show their values. It is on in
  lessons 26, 28, 30, 31 and 33.
- Colour coding in every CPU simulator: each flag has its own colour, chips at the end of a program
  line show which flags it writes (filled) or reads (outlined), and after each instruction a line
  says why each flag has its value. Instructions are coloured by kind: data processing, memory,
  branch, system.
- `LDR Rd, =value` no longer changes the flags in the simulator, as on the real core.
- Logic sandbox (`assets/logicsim.js`): gates you click, with a truth table that fills in as you
  try rows, or a timing diagram for latches and flip-flops. Lessons 22 (XOR), 23 (multiplexer,
  full adder), 24 (latch against flip-flop) and 25 (2-bit counter, 4-stage shift register).
- The CircuitJS circuits run inside the lessons (5 to 18 and lab 1), with a link to the full-size
  simulator.
- New widgets: a float explorer (lesson 21), a cache simulator (36), a memory map explorer with a
  drill (37, 38), a fault status decoder and an MPU checker (39), and a clock tree configurator for
  the STM32F103 and the RP2040 (40).
- Buttons keep their size when they switch between the filled and the outlined style.

## 0.0.7 (2026-11-07)

- Search: a box in the top bar of every lesson and reference sheet, and on the index (`/` focuses
  it). Keyword search over every section and glossary term, with links to the section. Quizzes are
  not indexed. Optional smart search ranks sections by meaning as well, with a small sentence
  model that runs in the browser (about 50 MB, downloaded once from Hugging Face and jsDelivr when
  turned on). Built by `tools/maintainer/build_search.py` on every deploy.
- The published glossary no longer shows the "Avoid" aliases; they are notes for lesson authors
  and stay in `GLOSSARY.md`.
- `tools/` now holds only the scripts learners run (`setup.py`, `build.py`, `sim.py`,
  `new_project.py`, `verify_projects.py`). The scripts that build and check the website,
  `LESSON-SPEC.md`, the CircuitJS examples and the authors' proposals moved to
  `tools/maintainer/`. The merged proposals were deleted; git history keeps them.

## 0.0.6 (2026-11-07)

- The course is read at <https://jouhis.github.io/embedded-course/>. `Open course.cmd`,
  `tools/serve.py` and the instructions for serving the course on localhost are gone, and so is
  the workaround that carried progress along links between pages opened as files.
- External links open in a new tab, so the lesson stays open. `check_course.py` enforces it.

## 0.0.5 (2026-11-04)

### Every Wokwi lab after lesson 25 checked in the browser

The Wokwi CLI's minutes ran out, so the labs were run in the Wokwi browser editor instead
(the `wokwi-browser` skill): Pico SDK labs compiled there, everything else (STM32, Zephyr, Rust,
Pico 2, custom chips) built locally and uploaded as firmware.

Fixes found that way:
- 0037: EXPECT is the RCC base line; Wokwi reads RCC_APB2ENR back as 0.
- 0071: Wokwi doesn't simulate input capture or encoder mode. The lab also measures the servo
  pulse by polling PB0 against TIM3 and prints `POLL pulse_us=1500 SERVO OK`; the lesson says why
  the CAPTURE line reads 0 in the simulator.
- 0072: TIM2's update interrupt is enabled after the UG write, so it no longer fires a tick that
  never happened (in Wokwi it hung the program). A button scenario presses the button.
- 0073: the elapsed time is read before printing, so it shows 2000 ms, not 2001.
- 0101: a boot self-test answers one known Modbus request before the slave goes on the bus.
- 0110 (Rust): the delay uses the RP2040 TIMER instead of SysTick (which hangs in Wokwi), and a
  button edge latched during pin setup is cleared before the interrupt is enabled.
- `templates/rust-pico`: the same TIMER delay as 0110, and `SIM: skip` (it only blinks), so
  `verify_projects.py` passes again.
- 0115 and bench18: `DRYER DRIVERS OK` needs a valid NTC reading as well as the display.
- bench02: the pass line names the pull (`pull=up`), because the simulator reads a floating pin
  as a steady high. bench08 waits for `MIN=` (a real sample), not just `LAB3 OK`.
- bench14: run 3 reports which crash notes came back instead of claiming both.
- `SIM: skip` with the reason in the code and the lesson: 0084 (Wokwi's STM32 core raises no
  fault exceptions), 0098 and lab06 (Zephyr's RP2040 I2C driver gets no answer from the custom
  chip; the Pico SDK version in 0063 works), 0110 (no serial output), bench14 (the RP2350 doesn't
  reset on the watchdog).

Diagrams: parts placed and wires routed explicitly for 0059, 0061, 0063, 0067, 0069, 0070, 0071,
0072, 0090, 0096, 0097, 0098, 0110, the dryer (0113, 0115, 0116, 0117), lab03, lab04 (both
boards), lab05, lab06 and the Pico 2 bench labs 1–8, 17 and 18. No wire crosses a part. Only
same-net pin swaps changed the connections (another GND or 3V3 pin, a button's other contact).
Crossings that pin order forces are one right angle each (an I2C part left of a Pico has SCL and
SDA in the opposite order to GP4/GP5).

Checked on the new diagrams: the solutions of 0059, 0061, 0063, 0067, 0069, 0070, 0071, 0072,
0096, 0097, 0113, 0115, lab03, lab04 (Blue Pill) and bench02–08, 17 and 18 print their EXPECT
line; the starters checked still don't. The lab04 Pico folder is the worked example, so its
starter passes by design.

Known issues:
- The FreeRTOS labs (0087–0093, lab05, 0116, 0117) still can't run in Wokwi (see 0.0.3). Their
  diagrams are laid out but not run.
- The Wokwi CLI checks (`verify_projects.py --sim`) still wait for minutes; the browser runs above
  are by hand.

## 0.0.4 (2026-11-03)

### Bench labs need only the Pico 2 and the Nucleo-U5

- Bench lab 11 (stale DMA data) moved from the NUCLEO-H743ZI2 to the NUCLEO-U545RE-Q, and from
  concept-only to a real lab. GPDMA1 copies a 256-word frame every millisecond while the CPU reads
  it; the starter counts torn and stale frames, and the solution fixes them with double buffering
  and a transfer-complete handshake. The Cortex-M7 data-cache version of the bug stays on the page
  as reading: the U5's DCACHE serves external memory only, so it can't show it.
- The H7 is gone from the "What you need" table and the course plan. The whole bench kit is two
  boards, two tools and a parts kit, about €83.
- `projects/bench11-stale-dma-data` (starter and solution) builds for the U5; like the other U5
  projects it is build-only and hasn't run on a board yet.

## 0.0.3 (2026-11-03)

### No career material; a clearer start page

- Removed the career material: lesson 120 (portfolio and CV), lesson 121 (interview preparation),
  the interview question bank in `reference/`, the "interview drill" box at the end of every lesson,
  the "explain out loud" sections in the checkpoints, and the remarks about interviews, hiring and
  portfolios in the lesson text. Content that sat in those remarks was kept where it taught something.
  Part 10 is now "Capstone", and the course title is "Embedded Systems: From Electrons to Firmware".
- "Next steps" is now lesson 120 (was 122). The course has 120 lessons.
- Saved progress follows: a "done" mark on the old lesson 122 moves to 120, and marks on the removed
  lessons are dropped (`assets/course.js`, numbering 3).
- `check_course.py` no longer requires an interview box, and `LESSON-SPEC.md` no longer asks for one.
- The index page starts with what the course is, how to use it and what is in each folder. The
  bench-lab note moved into the bench section, which now has a "What you need" table: every board,
  tool and part, its approximate cost, and the bench labs that use it.


### Bench track: optional labs on real hardware

- 19 bench labs (🔬) in a section of their own, after the course (COURSE-PLAN.md, Bench Track:
  hardware for about €83 without an H7, the specs and the rollout). A short note at the end of each
  part lists the bench labs its lessons unlock. They are optional: they don't count towards
  progress, the pager skips them, and each page says so.
- Each bench lab's name shows its board (Pico 2, Nucleo-U5, Nucleo-H7), and the bench section on the
  index lists the board, tools and parts for each lab in its own block. COURSE-PLAN.md holds them as
  Board, Tools and Parts lines under each lab.
- Pages for bench labs 0 to 8, 11, 14, 16, 17 and 18 (Pico 2, plus the concept-only H7 cache lab).
  Projects for the Pico 2 labs (`projects/bench*`), on the new template `templates/pico2-sdk`
  (RP2350, UF2 output, stdio on UART and USB). They build and pass lint; none has been simulated or
  run on a board yet.
- Pages and projects for bench labs 9, 10, 12, 13 and 15 (NUCLEO-U545RE-Q): bring-up, interrupt
  latency, sleep current through the IDD jumper, Lab 4 on the U5 (register-level board layer, I2C,
  ADC1 with an NTC), and FreeRTOS deadlines on the analyzer. New submodule
  `third_party/cmsis-device-u5` (ST's CMSIS device headers, startup and linker script) and
  `templates/common/stm32u5.cmake` (Cortex-M33, hard float, `.bin` for ST-LINK drag-and-drop,
  FreeRTOS port `ARM_CM33_NTZ`). Wokwi has no STM32U5, so these projects have no diagram:
  `verify_projects.py` builds them and reports them as build-only. They have not run on a board.
- Bench labs 1 and 16 lost their Wokwi stage: an ideal simulated LED and a USB device that never
  reaches the PC had nothing to show.
- `build_manifest.py`, `check_course.py`, `new_project.py`, `build.py` and `sim.py` know about bench
  labs; the manifest keeps them in their own list (`bench`). The index page links the GitHub
  repository and this changelog in its header.

### Shorter lessons: five long lessons split, 116 lessons became 122

- 88 became 88 (context switching at the register level) and 89 (the FreeRTOS port, PendSV).
- 91 became 92 (stack sizing) and 93 (timing analysis); its project is now `0093-stack-and-timing`.
- The capstone grew from 4 lessons to 8 (112 to 119): requirements and state machine;
  architecture, tasks and pin map; the NTC driver and tests; PWM, buttons, display and safety;
  RTOS threads and PID; Modbus RTU; the bootloader; CI and the finished capstone. Projects were
  renamed to the lesson that uses them (`0113-dryer-skeleton` to `0119-dryer-host-tests`).
- Every lesson from 89 on moved up (old 89 is now 90, ..., old 116 became 122, and is 120 since the career lessons were removed). Lesson files,
  project folders and cross-references were renumbered by script. Labs and checkpoints keep their
  numbers.
- Saved progress moves to the new numbers on the first visit (`assets/course.js`). A split
  lesson's "done" mark carries to each of its parts.
- Errors found while splitting were fixed: the debounce confirms after 40 ms, not 60 ms; 1 kHz PWM
  is audible (the old claim that it was not is gone); there is no cold-sensor safety rule, and
  lesson 115 now says so; the application image ends at 0x08008FC0 (20416 bytes), measured from a
  fresh build.

### Code and reading aids

- Syntax highlighting (highlight.js, vendored by `tools/vendor_highlight.py`) and a Copy button
  on every code block.
- The 25 older diagrams use the course's label font (JetBrains Mono), and labels were resized to fit.
- STM32 lessons cite RM0008 and PM0056 by section. `setup` downloads both manuals into the
  git-ignored `docs-local/` (they are ST's copyright, so they are never committed or published).
- Bootloader fix: VTOR needs 512-byte alignment on this part (PM0056 4.4.4), so the application's
  vector table moved from slot + 0x100 to slot + 0x200 (lessons 104 and 118, both projects).
- `configASSERT` in every FreeRTOSConfig.h uses `taskDISABLE_INTERRUPTS()`, the kernel's own idiom,
  instead of an inline `cpsid i`.

### Automated project checks

- Every solution names its pass line in a comment in `main.c`: `// EXPECT: <text>`,
  plus `// SIM-SCENARIO: <file>.yaml` when the run needs a button press, or `// SIM: skip <reason>`.
- `tools/verify_projects.py` builds and lints every project, reports a solution without a pass line,
  runs the host unit tests, treats the FreeRTOS projects on the STM32 as build-only, and can write a
  Markdown summary. `--skip zephyr,rust` leaves out the large toolchains.
- `tools/sim.py` takes `--scenario` and `--fail-text`.
- New GitHub workflow `.github/workflows/projects.yml` runs those checks on every push and pull
  request. Simulation runs only when the workflow is started by hand, because Wokwi CI minutes are
  limited; it needs the repository secret `WOKWI_CLI_TOKEN`.

Known issues:
- The EXPECT lines added in 0.0.3 and the two button scenarios were worked out from the code; they
  have not been run, because the Wokwi minute quota was used up. The first `--sim` run will tell.
- The new workflow has not run on GitHub yet. Ubuntu's `gcc-arm-none-eabi` is 13.2, not the 14.2
  used locally.
- **FreeRTOS on the STM32 cannot run in Wokwi.** Probing the simulator (Wokwi CLI 0.29.1) found
  that its STM32 core differs from a Cortex-M3 in five ways: `cpsie`/`cpsid` are inverted, byte
  reads of the NVIC and SHPR priority registers return 0, BASEPRI is not implemented, PRIMASK does
  not mask SysTick or peripheral interrupts, and a software-pended exception (PendSV, ISPR, STIR)
  is taken at the pending store and returns to it, so it runs forever. FreeRTOS's port asserts at
  start-up, and once past that the first yield never returns. Without working interrupt masking
  there are no real critical sections, so this can't be patched around. The FreeRTOS projects
  (lessons 87 to 93, Lab 5, the capstone's RTOS, Modbus and bootloader projects) are build-checked
  only until Wokwi fixes its core. A report with a minimal repro is ready to send to Wokwi.
- The same simulator bugs probably explain some bare-metal failures (`__enable_irq()` sets PRIMASK
  in Wokwi). Still to check (all fixed or explained in 0.0.5):
  - 0057 (`presses=1`) and 0098 wait for a button press, so they cannot pass unattended as written.
  - 0071: input capture reads `pulse_us=0` (expected 1500).
  - 0072: prints nothing at all, not even the line before the interrupts start.
  - 0073: prints `elapsed=2001 ms`, expected `2000`; off by one tick.
  - 0084: the HardFault report never printed.
  - lab06 (Zephyr): `LAB6 init failed`.
- The Wokwi CLI's free plan has a monthly limit on simulation minutes, which this round of
  debugging used up. Automated simulation checks (`verify_projects.py --sim`) wait for the next
  month or a paid plan.
- The Zephyr projects that were renamed still have build folders from their old paths; build them
  once with `--clean`. (Done in 0.0.5.)

## 0.0.2 (2026-11-01)

### Quizzes that teach

- Every quiz rewritten (all 130 pages). The questions are now situations: predict what code prints,
  diagnose a symptom, fix a line, calculate and interpret, or choose a design. The old ones were
  mostly vocabulary and "In lesson N, what is…" recall. Spaced reviews apply an earlier lesson to the
  current topic. The question count now follows the lesson's content.
- Quiz engine (`assets/course.js`):
  - New `formula` type accepts any equivalent form (`RI^2`, `I²R`, `P = I*I*R`, `R₂`, implicit
    multiplication), checked by evaluating both sides.
  - Text answers ignore case, articles, hyphens and quotes.
  - Numbers also accept `330R` and `4R7`.
  - Multiple choice explains every option.
  - Typical mistakes listed in `wrong` get their own explanation.
  - New `hint` field, and a new `reflect` type: think it through, then compare with a model answer.
- `check_course.py` verifies every formula question's alternative answers and listed mistakes with a
  Python port of the engine, and warns about recall-style prompts and missing feedback. The rule that
  multiple-choice options have equal word counts is gone, and the minimum is now 3 questions.
  LESSON-SPEC section 5 is rewritten around questions that teach.
- 36 prose errors found by the quiz writers were checked against their sources and fixed. Examples:
  - The negative-index example in lesson 45 could not happen as written.
  - In lesson 89, a FreeRTOS queue copies the item, so the real bug is queuing a pointer to dead data.
  - The xTaskCreate stack-depth argument is the third, not the last (lesson 91).
  - The COBS 254-byte case encodes to 256 bytes (lesson 101).
  - Modbus 3.5 characters at 115200 8N1 is 304 µs (lesson 113).

- README, and a setup script for Windows, macOS and Linux (`setup.cmd`, `setup.sh`, `tools/setup.py`).
  It uses winget, Homebrew, apt, dnf or pacman. Without one, it downloads portable tools into
  `~/.embedded-course-tools` (no admin rights needed).
- `tools/build.py` finds tools there; tool paths no longer assume Windows.
- The `.cmd` launchers work when the system PATH starts with an empty entry.
- Lesson 1: the Wokwi CLI step moved `wokwi-cli.exe` from Downloads, but the release file is
  `wokwi-cli-win-x64.exe`; it now downloads straight to `~/.wokwi/bin`. `setup --wokwi-cli` does it on any OS.

### Depth pass: every lesson explained from the ground up

- New depth standard (`tools/LESSON-SPEC.md` section 17). Each explainer now covers: why it matters,
  the concepts one at a time with every term defined, a worked example with real numbers, the code
  line by line, at least three common mistakes, real-project practice, and a summary. The only
  assumption is basic programming.
- All 116 lessons and 6 labs were rewritten to that standard. Most went from about 1,000 to
  2,500–4,000 words of prose, with 2–3 new quiz questions each and a few new diagrams (each one rendered
  and checked).
- Hundreds of factual corrections made along the way, checked against vendor headers, the Pico SDK,
  Zephyr and FreeRTOS sources, and fetched datasheets. Examples: the 74HC595 latches on STCP;
  `spi_write_blocking` waits for the last bit; Modbus 3.5 characters at 115200 8N1 is about 304 µs;
  Lab 4's display update is 1,112 bytes, about 100 ms; MCUboot swap types; Zephyr 4.5 uses `tests.yaml`.
  Where a source couldn't be reached (ST's RM0008 and PM0056, the Modbus PDFs), the claim was dropped
  or the document is cited by title only.
- Glossary: 256 new terms from the lesson authors, plus three new groups (Low power, Signal processing,
  Embedded Linux). RESOURCES.md: 24 new verified sources.
- Project fixes: 0081's test no longer reads a dangling pointer through FFF's `arg1_val`. The dryer
  projects (0111–0113) now set the ADC sample time that their comments state (71.5 cycles, SMP = 6).
  Wrong or misleading comments fixed in 0023, 0058, 0065, 0070, 0081, 0090, 0099 and 0104.
- Tools: `check_course.py` warns about short explainers and missing "common mistakes" or "summary"
  sections, and fails on broken glossary anchors. `merge_proposals.py` reads all the proposal formats
  the authors used (it was silently skipping a "## Glossary" header).
- Longer lessons kept whole (about 3,800–4,400 words of explainer: 0001, 0060, 0061, 0085, 0088, 0098,
  0104, 0110, 0111, 0113, labs 3–5). Suggested split points if they feel too long:
  0088 simulator model | port mapping; 0110 requirements and state machine | layers and tasks;
  0111 NTC conversion | PWM, buttons and safety; 0113 Modbus | bootloader | CI and recap;
  0091 timing and utilisation | stacks.

## 0.0.1 (2026-10-31)

First complete draft: 116 lessons, 6 labs and 8 checkpoints in 11 parts, with reference sheets,
Wokwi projects (starter and solution) and host tests.

Verified:
- Every page passes `tools/check_course.py` (130/130).
- Every Wokwi project builds and passes `wokwi-cli lint`; all 12 host-test solutions pass.
- Simulated in the Wokwi cloud: 40 solutions printed their expected text, 31 without an expected text
  ran to the time limit without errors.
- Progress is saved per browser, with Export/Import on the index; `Open course.cmd` serves the course
  on localhost so every page shares it.
- Diagrams: all 77 audited; 50 redrawn or fixed.

Known issues (to fix while going through the course):
- FreeRTOS on the STM32 in Wokwi: the scheduler never runs the first task. Code before
  `vTaskStartScheduler()` prints, nothing after it does; VTOR is already 0x08000000. Affects
  `templates/stm32-freertos` and lessons 87, 89, 90 and 91. Next step: catch the configASSERT line
  or the fault (SVC/PendSV priority setup) with GDB.
- Other simulation failures, cause not yet investigated:
  - 0057 (`presses=1`) and 0096 wait for a button press, so they cannot pass unattended as written.
  - 0071: input capture reads `pulse_us=0` (expected 1500).
  - 0072: no output (TIM2 nesting inside EXTI0).
  - 0073: prints `elapsed=2001 ms`, expected `2000`; off by one tick.
  - 0084: the HardFault report never printed.
  - lab06 (Zephyr): `LAB6 init failed`.
- STM32 section numbers from RM0008 are not cited yet: the PDF could not be downloaded here.
- Diagrams not redrawn in the audit still use the old label font.
