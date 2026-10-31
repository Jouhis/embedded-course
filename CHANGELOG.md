# Changelog

Version numbers use MAJOR.MINOR.PATCH. The current version is in `VERSION`.

## Unreleased

- README, and a setup script for Windows, macOS and Linux (`setup.cmd`, `setup.sh`, `tools/setup.py`).
  It uses winget, Homebrew, apt, dnf or pacman. Without one, it downloads portable tools into
  `~/.embedded-course-tools` (no admin rights needed).
- `tools/build.py` finds tools there; tool paths no longer assume Windows.
- The `.cmd` launchers work when the system PATH starts with an empty entry.
- Lesson 1: the Wokwi CLI step moved `wokwi-cli.exe` from Downloads, but the release file is
  `wokwi-cli-win-x64.exe`; it now downloads straight to `~/.wokwi/bin`. `setup --wokwi-cli` does it on any OS.

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
