# Changelog

Version numbers use MAJOR.MINOR.PATCH. The current version is in `VERSION`.

## Unreleased

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
