# Changelog

Version numbers use MAJOR.MINOR.PATCH. The current version is in `VERSION`.

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
  in Wokwi). Still to check:
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
  once with `--clean`.

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
