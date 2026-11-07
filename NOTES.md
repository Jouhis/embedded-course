# Teaching Notes

## Learner preferences
- Wants a clearly structured course: background first, then hands-on coding. Plans before implementation.
- Number everything with digits only (1, 2.1, 3); never use letters or Roman numerals for numbering.
- Environment setup is the very first lesson.
- Computer architecture helped them a lot at university, so lean on it: explain peripherals and C behaviour in terms of what the CPU and bus actually do.
- Practical focus: plain C with vendor SDKs, professional practice (testing, CI, code review). No career, portfolio or interview material (removed in 0.0.3 at the learner's request).
- Can already program; new to electronics. Don't over-explain programming basics, but never skip electronics fundamentals.
- Real-world examples come from common products. Klipper (open 3D-printer firmware) is a well-documented one: stepper drivers, thermistors, heater MOSFETs, the MCU-to-host link.

## Course mechanics (for the teacher)
- Course outline: `COURSE-PLAN.md`. The lesson list is generated into `assets/manifest.js` by `python tools/maintainer/build_manifest.py`.
- Lesson spec and authoring rules: `tools/maintainer/LESSON-SPEC.md`. Lesson HTML skeleton: `templates/lesson-template.html`.
- Run `python tools/maintainer/check_course.py` after any change to lessons. It validates quiz rules, links and required sections.
- Wokwi projects for lesson NNNN live in `projects/NNNN-slug/`, with `starter/` and `solution/` subfolders.
- Verified build templates: `templates/pico-sdk`, `stm32-cmsis`, `stm32-hal`, `stm32-freertos`, `zephyr-pico`, `zephyr-bluepill`.
- Run simulations headlessly with `~/.wokwi/bin/wokwi-cli.exe` (needs the `WOKWI_CLI_TOKEN` environment variable).
- This is a pre-built course, so GLOSSARY.md is seeded up front as the canonical terminology list. Real learner progress goes in `learning-records/`; use it to decide what to review or skip.

## Wokwi simulation limits (verified 2026-10-31)
- Pico: single core only (no multicore); DMA only in combination with PIO; I2C and SPI in master mode only; USB CDC partial; the ADC temperature sensor reads 0.
- Blue Pill (STM32F103C8): DMA, IWDG, PWR and RTC are not simulated; ADC has basic ADC1 conversion only. TIM1–4, EXTI, I2C, SPI, USART, CRC and WWDG all work.
- No CAN or USB device on STM32. Lessons 64, 74, 75, 100 and 102 are concept-only.
- Custom chips (C compiled to WASM) are supported. Used for the "mystery sensor" in lesson 63.
- Wokwi is a digital simulator with only basic analog support, and its resistors don't combine with analog parts. Analog electronics hands-on uses Falstad CircuitJS instead (see LESSON-SPEC section 7.1).
- A logic analyzer capture (`.vcd`) can be viewed in PulseView, which decodes I2C and UART.

## Pico 2 / RP2350 facts for the bench labs (verified 2026-11-02 against the datasheets)
- Wokwi `board-pi-pico-2`: one M33 core simulated; watchdog, ADC, DMA, UART simulated; PIO partial; USB CDC partial. GP0-22 and GP26-28 on the header, TP4 = GPIO23, TP5 = GPIO25. RUN, 3V3_EN and ADC_VREF are not simulated. Wokwi has no STM32U5 or H7 boards: the U5 bench projects are build-only.
- CHIP_ID (SYSINFO, RP2350 datasheet 12.15.1): revision 31:28, part 27:12, manufacturer 11:1 (0x493), bit 0 = 1. Revision 2 = stepping A2; 3 = A3 or A4 (appendix C).
- Erratum RP2350-E9 (appendix D.5.1): on A2 the input pad leaks ~120 uA in the undefined region and sits near 2.2 V; the internal pull-down can't hold it low. External pull-down <= 8.2 kOhm, or use a pull-up. Fixed in A3.
- GPIO DC (14.9.4): VIH 2 V, VOH min 2.62 V at the drive-strength current (IOVDD 3.3 V), pull-up 32-86 kOhm, pull-down 36-113 kOhm, 100 mA total IOVDD. Digital pins 5 V tolerant only while IOVDD is powered; ADC pins (GPIO26-29) never (Pico 2 datasheet 5.2).
- Watchdog scratch registers (12.9.5) survive a watchdog reset, cleared by power-on and RUN. The SDK uses scratch 4-7.
- `set_sys_clock_khz()` moves clk_peri to the 48 MHz USB PLL by default (`PICO_CLOCK_ADJUST_PERI_CLOCK_WITH_SYS_CLOCK=0`), so UART baud divisors must be recomputed.
- Pico 2 ADC (board datasheet 5.3): ADC_AVDD is the SMPS 3.3 V through 200 Ohm and 2.2 uF; ~30 mV offset; GPIO23 high = SMPS PWM mode, less ripple.
- SDK USB defaults: VID 0x2E8A, PID 0x0009 (RP2350), strings from `USBD_MANUFACTURER` / `USBD_PRODUCT`, serial = unique board ID; `stdio_usb_connected()` checks DTR.
- None of the bench projects has been simulated (Wokwi CI quota) or run on a real board yet. They build and lint.

## NUCLEO-U545RE-Q facts for the bench labs (verified 2026-11-02 against UM3062 Rev 1)
- LD2 green user LED on PA5 (SB10 on), driven through a transistor, active high (6.5). B1 user button on PC13, high while pressed; keep PC13 an input with pull-down, never output low (6.6). B2 = NRST.
- IDD jumper JP4: remove it and put an ammeter in its place to measure VDD_MCU only (6.4.6). JP5 selects VDD 3V3/1V8.
- STLINK-V3EC: mass storage (drag-and-drop `.bin`), VCP on USART1 PA9/PA10. Arduino D0/D1 are LPUART1 on PA2/PA3.
- Arduino: A0 PA0 (ADC1_IN5), A1 PA1, A2 PA4, A3 PB0 (ADC1_IN15), A4 PC1, A5 PC0; D15 PB6 I2C1_SCL, D14 PB7 I2C1_SDA, D13 PA5, D7 PA8, D6 PB10. Morpho CN7-23 PC13, CN7-34 PB0, CN10-11 PA5, CN10-13 PA6, CN10-15 PA7, CN10-19 PC6, CN10-33 PC8.
- STM32U545RE: Cortex-M33, 512 KB flash, 272 KB SRAM (linker script uses 256 KB at 0x20000000 + SRAM4), 160 MHz max; resets onto MSIS 4 MHz (system_stm32u5xx.c). GPIO resets to analog mode. USART1 is AF7, I2C1 AF4. `-Q` = internal SMPS.
- Not verified: whether ADC1 has limits at the reset voltage range (VOS range 4). Bench lab 13 uses ADC1 at reset defaults; if ADRDY never sets on a real board, check RM0456 first.
- Arm's zero-wait-state interrupt latency table lists M0 16, M0+ 15, M3/M4 12 cycles and has no M33 row; bench lab 10 measures it rather than quoting a number.

## Toolchain facts (verified)
- Zephyr v4.5.0 at `~/zephyrproject`, using `ZEPHYR_TOOLCHAIN_VARIANT=gnuarmemb` with the Arm GNU 14.2 toolchain. The Zephyr SDK is not needed.
- Zephyr board names: `rpi_pico` and `stm32_min_dev` (Blue Pill, "blue" revision, HSE plus PLL at 72 MHz).
- Pico SDK 2.3.1 at `~/.pico-sdk/sdk/2.3.1`. Templates set `PICO_NO_PICOTOOL=1` because Wokwi runs the `.elf` directly.
- Bench labs use `templates/pico2-sdk` (`PICO_BOARD pico2`, stdio on UART0 and USB, `pico_add_uf2_output`). The UF2 needs picotool: without an installed one the SDK fetches and builds it, and `tools/build.py` sets `PICOTOOL_FETCH_FROM_GIT_PATH=~/.pico-sdk/picotool-build` so this happens once. The first bench build needs the internet.
- Rust (lesson 110): set up and building; see "Embedded Rust (verified 2026-10-31)" below.

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
