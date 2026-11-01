# Teaching Notes

## Learner preferences
- Wants a clearly structured course: background first, then hands-on coding. Plans before implementation.
- Number everything with digits only (1, 2.1, 3); never use letters or Roman numerals for numbering.
- Environment setup is the very first lesson.
- Computer architecture helped them a lot at university, so lean on it: explain peripherals and C behaviour in terms of what the CPU and bus actually do.
- Career focus: plain C with vendor SDKs, professional practice (testing, CI, code review), interview drills.
- Can already program; new to electronics. Don't over-explain programming basics, but never skip electronics fundamentals.
- Real-world examples come from common products. Klipper (open 3D-printer firmware) is a well-documented one: stepper drivers, thermistors, heater MOSFETs, the MCU-to-host link.

## Course mechanics (for the teacher)
- Course outline: `COURSE-PLAN.md`. The lesson list is generated into `assets/manifest.js` by `python tools/build_manifest.py`.
- Lesson spec and authoring rules: `tools/LESSON-SPEC.md`. Lesson HTML skeleton: `templates/lesson-template.html`.
- Run `python tools/check_course.py` after any change to lessons. It validates quiz rules, links and required sections.
- Wokwi projects for lesson NNNN live in `projects/NNNN-slug/`, with `starter/` and `solution/` subfolders.
- Verified build templates: `templates/pico-sdk`, `stm32-cmsis`, `stm32-hal`, `stm32-freertos`, `zephyr-pico`, `zephyr-bluepill`.
- Run simulations headlessly with `~/.wokwi/bin/wokwi-cli.exe` (needs the `WOKWI_CLI_TOKEN` environment variable).
- This is a pre-built course, so GLOSSARY.md is seeded up front as the canonical terminology list. Real learner progress goes in `learning-records/`; use it to decide what to review or skip.

## Wokwi simulation limits (verified 2026-10-31)
- Pico: single core only (no multicore); DMA only in combination with PIO; I2C and SPI in master mode only; USB CDC partial; the ADC temperature sensor reads 0.
- Blue Pill (STM32F103C8): DMA, IWDG, PWR and RTC are not simulated; ADC has basic ADC1 conversion only. TIM1–4, EXTI, I2C, SPI, USART, CRC and WWDG all work.
- No CAN or USB device on STM32. Lessons 64, 74, 75, 98 and 100 are concept-only.
- Custom chips (C compiled to WASM) are supported. Used for the "mystery sensor" in lesson 63.
- Wokwi is a digital simulator with only basic analog support, and its resistors don't combine with analog parts. Analog electronics hands-on uses Falstad CircuitJS instead (see LESSON-SPEC section 7.1).
- A logic analyzer capture (`.vcd`) can be viewed in PulseView, which decodes I2C and UART.

## Toolchain facts (verified)
- Zephyr v4.5.0 at `~/zephyrproject`, using `ZEPHYR_TOOLCHAIN_VARIANT=gnuarmemb` with the Arm GNU 14.2 toolchain. The Zephyr SDK is not needed.
- Zephyr board names: `rpi_pico` and `stm32_min_dev` (Blue Pill, "blue" revision, HSE plus PLL at 72 MHz).
- Pico SDK 2.3.1 at `~/.pico-sdk/sdk/2.3.1`. Templates set `PICO_NO_PICOTOOL=1` because Wokwi runs the `.elf` directly.
- Rust (lesson 108): set up and building; see "Embedded Rust (verified 2026-10-31)" below.

## Shared components (verified with Node tests)
- `assets/cpusim.js`: a teaching CPU with MSP/PSP, CONTROL, MRS/MSR, SVC, IRQ entry and return (EXC_RETURN F9/FD) and a pipeline view. A working two-task context switch via SVC (each task on its own PSP stack, the handler swaps PSPs) was verified; lesson 88 should build on it. Not modelled: nested exceptions, PendSV priority, real instruction encodings (all instructions are 2 bytes; MOV accepts 32-bit constants).
- `assets/bits.js` (bit register, bit drill), `assets/circuit-calc.js` (Ohm, power, divider, LED with E12 rounding): tested.
- Portable Node for JS tests: system Node LTS is installed (`node`); a scratchpad copy was used during the build.

## Wokwi custom chips (verified 2026-10-31)
- Compile: `~/.wokwi/bin/wokwi-cli.exe chip compile <name>.chip.c -o <name>.chip.wasm` (downloads its toolchain on first use, about 35 s). The header is at `templates/custom-chip/wokwi-api.h` (from wokwi/inverter-chip, MIT).
- A chip needs `<name>.chip.json` next to the .wasm: `{"name": "...", "author": "...", "pins": ["SDA", "SCL", "VCC", "GND"]}`.
- Reference it in wokwi.toml with `[[chip]]` `name = '<name>'` `binary = '<name>.chip.wasm'`, and in diagram.json as part type `chip-<name>`.
- I2C device API: `i2c_init(&cfg)` with address, sda and scl from `pin_init("SDA", INPUT_PULLUP)`, plus connect/read/write/disconnect callbacks. Only call it from `chip_init()`. Docs: https://docs.wokwi.com/chips-api/i2c

## Diagram lint (no token needed)
- `~/.wokwi/bin/wokwi-cli.exe lint <project>` validates part types AND pin names (logic gates included: AND/OR/XOR pins are A, B and OUT). `tools/verify_projects.py` runs it on every project.

## Host tools (verified 2026-10-31)
- MinGW-w64 GCC 16.2 (winget BrechtSanders.WinLibs.POSIX.UCRT). tools/build.py puts it on PATH, and `build.py --check` reports it.
- With it, the Pico SDK builds pioasm: `pico_generate_pio_header()` works (lesson 65 uses a real .pio file; its output matched the hand-decoded words 0x80a0 and 0x7f04).
- Unity (third_party/Unity) and FFF (third_party/fff) cloned. A host test with gcc + Unity + FFF passed 3/3.
- cppcheck 2.22 at C:\Program Files\Cppcheck\cppcheck.exe (not on PATH by default). `--enable=warning,style` found a real shadowVariable issue in a test file.
- CMock needs Ruby (not installed): teach it conceptually, and do the hands-on mocking with FFF.

## Embedded Rust (verified 2026-10-31)
- rustup 1.29 (winget Rustlang.Rustup). The default MSVC toolchain can't link build scripts (no Visual Studio), so projects pin `stable-x86_64-pc-windows-gnu` in rust-toolchain.toml; target thumbv6m-none-eabi and llvm-tools are installed for it. rustc 1.99.1.
- templates/rust-pico builds (3.8 KB text): .boot2 at 0x10000000 (rp2040-boot2 W25Q080), vector table at 0x10000100, via memory.x plus `-Tlink.x --nmagic`. Lint ok; not yet simulated.
