# Embedded Systems: From Electrons to Firmware

**Mission (draft):** Learn embedded development from the electronics up, and finish with a complete, tested capstone project.
**Learner:** Already programs; new to electronics.
**Platforms:** Raspberry Pi Pico (RP2040, Pico SDK, C) and STM32 Blue Pill (STM32F103, CMSIS + HAL), simulated with Wokwi in VS Code.
**Size:** 120 lessons, 6 labs, 8 checkpoint exams.

**Legend**
- 🔧 lab
- 📝 checkpoint exam
- 💡 concept-only (Wokwi can't simulate it)
- ⭐ optional
- 🔬 bench lab: optional, needs a real board. They are listed in the Bench Track; a note after each part says which ones you can do now

---

## Part 0: Getting Started
1. Set up your environment: VS Code with the Wokwi, C/C++ and Cortex-Debug extensions, the Wokwi license, ARM GCC, CMake, Ninja, git, the Pico SDK and PulseView; finish with a verification checklist (`tools/build.py --check`)
2. First blink in Wokwi: build, simulate, modify; tour of diagram.json and wokwi.toml
3. What embedded engineers do: roles and industries
4. How this course works: study routine, using the agent as a tutor, spaced review

> 🔬 Bench labs you can do now (optional, real board): 0 (Blink on a real Pico 2).

## Part 1: Electronics for Programmers
5. Voltage, current, resistance, and Ohm's law
6. Power, energy, and heat
7. Series and parallel circuits; Kirchhoff's laws
8. Voltage dividers
9. Diodes, LEDs, and current-limiting resistors
10. Measuring circuits: multimeter, oscilloscope, logic analyzer
11. BJT transistors as switches
12. MOSFETs: low-side vs high-side switching, flyback diodes
13. Capacitors: decoupling, RC time constants, filters
14. Inductors, motors, and relays: inductive kickback
15. Power supplies: linear regulators, buck converters, batteries
16. Logic levels, pull-ups, open-drain, level shifting
17. Reading schematics
18. Reading datasheets: absolute maximum ratings, electrical characteristics, timing diagrams

- 🔧 **Lab 1:** Design and simulate an LED and MOSFET load driver, and justify every component value
- 📝 **Checkpoint 1**

> 🔬 Bench labs you can do now (optional, real board): 1 (Measure what you calculated), 2 (The floating input).

## Part 2: Computer Architecture, from Gates to Cortex-M

### 2.1 Digital Logic (built in Wokwi)
19. Number systems: binary, hex, two's complement
20. Bitwise operations and masks (drills)
21. Fixed-point vs floating-point
22. Logic gates and Boolean algebra
23. Combinational logic: multiplexers, decoders, half and full adders
24. Sequential logic: latches, flip-flops, clocks
25. Registers, counters, shift registers (74HC595)
26. The ALU and status flags (N, Z, C, V)

### 2.2 How a CPU Works
27. Von Neumann vs Harvard architecture
28. Fetch, decode, execute (in-browser CPU simulator)
29. Instruction sets: RISC vs CISC, Thumb-2, instruction encoding
30. Pipelining and the cost of branches

### 2.3 The Cortex-M Core
31. Core registers: R0–R12, SP, LR, PC, xPSR
32. Reading ARM assembly: stepping through compiled C in GDB
33. The stack and the AAPCS calling convention
34. Exceptions and interrupt entry: stacking, tail-chaining, latency
35. Privilege modes: thread vs handler mode, MSP vs PSP

### 2.4 Memory, Buses, and Boot
36. Memory hierarchy: SRAM, flash, caches, wait states, execute-in-place (XIP)
37. Bus architecture: AHB, APB, and the bus matrix
38. The memory map and memory-mapped registers
39. The MPU and how faults happen
40. Clock tree and PLLs
41. The build pipeline: compiling, linking, the linker script, ELF/BIN/UF2 files
42. Startup code and the vector table: what happens before main()
43. Navigating a reference manual (the RP2040 datasheet and STM32 RM0008)
44. Errata sheets and application notes

- 🔧 **Lab 2, "Trace one instruction":** follow `GPIO->ODR |= 1;` from C through assembly, the instruction encoding, the bus and the register to the LED; then read the .map file and the disassembly
- 📝 **Checkpoint 2**

> 🔬 Bench labs you can do now (optional, real board): 3 (See the clock).

## Part 3: Embedded C
45. stdint types, integer promotion, overflow pitfalls
46. volatile, const, and static
47. Pointers to registers and struct overlays
48. Bit fields, unions, packing, endianness
49. Function pointers and callbacks
50. The preprocessor and multi-target builds

- 📝 **Checkpoint 3**

## Part 4: Peripherals on the Pico
51. GPIO output
52. GPIO input and debouncing
53. UART logging
54. GDB debugging: breakpoints, watchpoints, memory inspection
55. Timing and non-blocking super-loops
56. State machines: switch-based and table-driven
57. Interrupts in practice: ISR rules and critical sections
58. ADC: thermistors and oversampling
59. PWM: dimming, servos, tones
60. The I2C protocol (decoded with the logic analyzer)
61. An I2C OLED display and a small UI framework
62. SPI: displays and shift registers
63. Writing a driver from a datasheet: the "mystery sensor" (a custom Wokwi chip)
64. 💡 Multicore on the RP2040: FIFOs and spinlocks
65. ⭐ PIO and DMA

- 🔧 **Lab 3:** Environment monitor: sensor, OLED, buttons, a menu state machine, and logging
- 📝 **Checkpoint 4**

> 🔬 Bench labs you can do now (optional, real board): 4 (Measure the bounce), 5 (The noisy ADC), 6 (The OLED that doesn't answer), 7 (The flaky LED strip), 8 (Lab 3 on the bench).

## Part 5: STM32 Deep Dive
66. Setting up the STM32 toolchain (ARM GCC, CMSIS, HAL, Wokwi Blue Pill)
67. Bare-metal blink with CMSIS only
68. Writing your own linker script and startup file
69. STM32 HAL and CubeMX-generated code
70. USART and EXTI interrupts with a ring buffer
71. Timers: PWM, input capture, encoder mode
72. The NVIC: priorities, preemption, latency
73. SysTick and a millisecond time base
74. 💡 DMA
75. 💡 Low-power modes

- 🔧 **Lab 4:** Port Lab 3 to the STM32 behind a hardware abstraction layer (HAL)
- 📝 **Checkpoint 5**

> 🔬 Bench labs you can do now (optional, real board): 9 (Bring up the Nucleo-U5), 10 (Measure interrupt latency), 11 (Stale DMA data), 12 (The sleep current hunt), 13 (Lab 4 on the Nucleo-U5).

## Part 6: Firmware Architecture and Professional Practice
76. Driver design and hardware abstraction layers
77. Layered and event-driven architecture; active objects
78. Memory: stack vs heap, static allocation, detecting stack overflow
79. Git workflow, code review, Doxygen
80. Unit testing on the host with Unity; TDD for firmware
81. Mocks and fakes (CMock, FFF)
82. Continuous integration: wokwi-cli and GitHub Actions
83. Static analysis: cppcheck, compiler warnings, MISRA C
84. Robustness: watchdogs, HardFault analysis, assertions
85. Logging, tracing, and field diagnostics

- 📝 **Checkpoint 6**

> 🔬 Bench labs you can do now (optional, real board): 14 (The crash that leaves a note).

## Part 7: Real-Time Operating Systems

### 7.1 FreeRTOS
86. Why use an RTOS: super-loop vs scheduler
87. FreeRTOS setup, tasks, and scheduling
88. Context switching at the register level
89. Context switching in the FreeRTOS port: the handler and PendSV
90. Queues, semaphores, and event groups
91. Mutexes, priority inversion, and deadlock
92. Stack sizing: high-water marks and overflow checks
93. Timing analysis: execution time, deadlines, and rate-monotonic priorities

- 🔧 **Lab 5:** Move Lab 4 onto FreeRTOS

### 7.2 Zephyr
94. Zephyr setup: west, the SDK, and a first app on the Pico
95. Kconfig and the build system
96. Devicetree: describing hardware
97. Threads and kernel services: message queues, semaphores, mutexes, work queues
98. The device driver model and the GPIO and I2C APIs
99. Logging, the shell, and testing with ztest and Twister

- 🔧 **Lab 6:** Port Lab 5 to Zephyr and compare the two RTOSes
- 📝 **Checkpoint 7**

> 🔬 Bench labs you can do now (optional, real board): 15 (Measure your deadlines).

## Part 8: Communication and Connected Systems
100. 💡 CAN bus
101. RS-485 and Modbus RTU (with a Python master on the PC over the simulated serial port)
102. 💡 USB fundamentals (plus a USB CDC serial demo on the Pico)
103. Designing a serial protocol: framing, checksums, CRC
104. Bootloaders and firmware updates: A/B slots, OTA
105. Embedded security: secure boot, debug port lockdown, attack surfaces

- 📝 **Checkpoint 8**

> 🔬 Bench labs you can do now (optional, real board): 16 (Real USB enumeration).

## Part 9: Signal Processing, Control, and Beyond
106. Digital filtering: moving average and IIR filters
107. PID control
108. ⭐ PCB design in KiCad: from schematic to board
109. ⭐ Embedded Linux: when to use it instead of an MCU
110. ⭐ Embedded Rust on the Pico (including setup)
111. ⭐ Functional safety: IEC 61508 and ISO 26262

> 🔬 Bench labs you can do now (optional, real board): 17 (Mains hum on the ADC).

## Part 10: Capstone
112. Capstone 1: requirements and the state machine for a filament-dryer controller
113. Capstone 2: layered architecture, tasks, and the pin map
114. Capstone 3: the NTC driver and unit tests
115. Capstone 4: heater PWM, buttons, display, and safety checks
116. Capstone 5: RTOS threads and PID heater control
117. Capstone 6: Modbus RTU interface and the host master
118. Capstone 7: the bootloader and the image layout
119. Capstone 8: CI and the finished capstone
120. Next steps: real hardware to buy, communities

> 🔬 Bench labs you can do now (optional, real board): 18 (The capstone on the bench).

## Bench Track (extra, not required)
The bench labs are optional extras on real boards. The core course stays simulator-only: every lesson, lab, checkpoint, capstone step and the course completion requirement can be finished in Wokwi alone. Learners who skip the bench track lose nothing that is assessed, and no lesson links to a bench lab as a prerequisite. Budget target: under €100 total. Each lab has three stages: a sim stage that passes in Wokwi (or Renode where Wokwi can't model the chip), a board stage with a specific symptom, and a diagnosis checklist with hints. Every bench lab ends with the fix committed to the learner's repo.

**Time limit:** each bench lab takes at most 1 hour. Labs that would run longer (bench labs 8, 9, 13 and 18) ship with a ready-made starter or are split into parts of 1 hour or less.

**Hardware** (prices from memory; verify before publishing)
| Item | Approx. cost | Wokwi sim | Used in bench labs |
|---|---|---|---|
| Raspberry Pi Pico 2 (RP2350) | €7 | Yes (board part exists) | bench labs 0–8, 14, 16, 17, 18 |
| STM32U5 Nucleo (NUCLEO-U545RE-Q) | €30 | Not found in Wokwi docs; Renode or compile-only | 9, 10, 12, 13, 15 |
| Parts kit: breadboard, jumper wires, LEDs, resistors, button, potentiometer, 10 kΩ NTC | €10 | | 1, 2, 4, 5, 8, 17, 18 |
| SSD1306 I2C OLED | €5 | | 6, 8 |
| Logic analyzer (8-channel, 24 MHz clone) | €10 | | 3, 4, 6, 10, 11, 15 |
| Multimeter (if the learner doesn't own one) | €15 | | 1, 5, 12 |
| WS2812 strip and 74HCT125 level shifter | €6 | | 7 |
| **Total** | **about €83** | | |
| ESP32 DevKit, optional appendix | €8–10 | Yes | ESP32 extras 1 and 2 |

Only two boards are needed: the Pico 2 and the Nucleo-U5. Nucleo boards include an onboard ST-LINK debugger, so no extra probe is needed. No bench lab ever connects 5 V to an RP2350 or STM32 pin.

**Bench lab specs** (🔬 bench lab, ⭐ stretch; numbers are bench lab numbers; each lab can be done once the lesson in brackets is done, and the outline notes them at the end of each part. `tools/build_manifest.py` reads these lines.)

Part 0
- 🔬 **Bench lab 0: Blink on a real Pico 2** (after lesson 2). Build with `PICO_BOARD=pico2`, flash the UF2, confirm it runs. Sets up the bench for every later lab.
  - Board: Pico 2 (Raspberry Pi Pico 2 with headers)
  - Tools: USB data cable, VS Code Serial Monitor
  - Parts: none

Part 1
- 🔬 **Bench lab 1: Measure what you calculated** (after lesson 10). Measure the real LED current and resistor voltage with a multimeter; compare with the lesson 5 and 9 calculations. Real parts don't match the ideal values.
  - Board: Pico 2 (Raspberry Pi Pico 2 with headers)
  - Tools: multimeter
  - Parts: breadboard, red LED, 330 Ω resistor, jumper wires
- 🔬 **Bench lab 2: The floating input** (after lesson 16). Wokwi reads an unconnected input as steady; the board reads noise that changes when you touch the wire. Fix with the internal pull-up. Check the RP2350 absolute maximum ratings before wiring anything near 5 V.
  - Board: Pico 2 (Raspberry Pi Pico 2 with headers)
  - Tools: none
  - Parts: pushbutton, jumper wires, one resistor of 8.2 kΩ or less (4.7 kΩ)

Part 2
- 🔬 **Bench lab 3: See the clock** (after lesson 40). Route the system clock to a GPIO with `clk_gpout` (divided down for the analyzer) and measure it. Change the PLL: the UART prints garbage because the baud divider used the old clock. Fix by deriving the baud rate from the actual clock.
  - Board: Pico 2 (Raspberry Pi Pico 2 with headers)
  - Tools: logic analyzer with PulseView
  - Parts: jumper wires

Part 4
- 🔬 **Bench lab 4: Measure the bounce** (after lesson 52). Capture a real button with the logic analyzer, measure the bounce time, tune the debounce to it.
  - Board: Pico 2 (Raspberry Pi Pico 2 with headers)
  - Tools: logic analyzer with PulseView
  - Parts: one or two pushbuttons, jumper wires
- 🔬 **Bench lab 5: The noisy ADC** (after lesson 58). A potentiometer and an NTC give jittery readings; compare with the multimeter; fix with oversampling and averaging.
  - Board: Pico 2 (Raspberry Pi Pico 2 with headers)
  - Tools: multimeter
  - Parts: 10 kΩ potentiometer, jumper wires
- 🔬 **Bench lab 6: The OLED that doesn't answer** (after lesson 61). Two faults: the code's fixed address 0x3C doesn't match a module strapped to 0x3D (silkscreens print the 8-bit forms 0x78 and 0x7A), and a bus stuck after a reset mid-transfer. Scan the bus, decode with the logic analyzer, add bus recovery (9 clock pulses).
  - Board: Pico 2 (Raspberry Pi Pico 2 with headers)
  - Tools: logic analyzer with PulseView
  - Parts: SSD1306 I2C OLED, two 4.7 kΩ resistors
- 🔬⭐ **Bench lab 7: The flaky LED strip** (after lesson 65). A WS2812 at 5 V gets 3.3 V data and glitches. Find its input-high threshold in the datasheet; fix with a 74HCT125.
  - Board: Pico 2 (Raspberry Pi Pico 2 with headers)
  - Tools: multimeter
  - Parts: WS2812B strip (8 LEDs), 74HCT125, 330 Ω resistor, 100 µF capacitor
- 🔬 **Bench lab 8: Lab 3 on the bench** (after Lab 3). Run the environment monitor on real parts and fix what breaks. The MYS-1 sensor exists only in Wokwi, so an NTC on the ADC replaces it behind the same `sensor_poll()` interface. Split into parts of 1 hour or less.
  - Board: Pico 2 (Raspberry Pi Pico 2 with headers)
  - Tools: a room thermometer to compare against
  - Parts: SSD1306 I2C OLED, two 4.7 kΩ resistors, two pushbuttons, 10 kΩ NTC thermistor, 10 kΩ resistor

Part 5
- 🔬 **Bench lab 9: Bring up the Nucleo-U5** (after lesson 67). The Blue Pill blink doesn't run: port it (RCC registers, Cortex-M33, LED pin, flashing over ST-LINK). Ships with a starter so it fits in 1 hour.
  - Board: Nucleo-U5 (NUCLEO-U545RE-Q, ST-LINK on board)
  - Tools: USB cable
  - Parts: none
- 🔬 **Bench lab 10: Measure interrupt latency** (after lesson 72). Toggle a pin in the ISR, time it with the logic analyzer, and account for the gap from the 12-cycle figure in lesson 34 (flash wait states, HAL overhead). Wokwi timing isn't cycle-accurate.
  - Board: Nucleo-U5 (NUCLEO-U545RE-Q, ST-LINK on board)
  - Tools: logic analyzer with PulseView
  - Parts: pushbutton, jumper wires
- 🔬⭐ **Bench lab 11: Stale DMA data** (after lesson 74). GPDMA1 copies a frame every millisecond while the CPU reads it: count torn and stale frames, fix them with double buffering and a transfer-complete handshake. The data-cache version of the bug (Cortex-M7) is explained, since the U5's DCACHE serves external memory only.
  - Board: Nucleo-U5 (NUCLEO-U545RE-Q, ST-LINK on board)
  - Tools: logic analyzer with PulseView (optional)
  - Parts: none
- 🔬 **Bench lab 12: The sleep current hunt** (after lesson 75). Measure through the Nucleo's IDD jumper; find the clock or floating pin wasting power; get the sleep current down. Lesson 75 stays 💡 and complete without it.
  - Board: Nucleo-U5 (NUCLEO-U545RE-Q, ST-LINK on board)
  - Tools: multimeter on its µA range (across the IDD jumper)
  - Parts: none
- 🔬⭐ **Bench lab 13: Lab 4 on the Nucleo-U5** (after Lab 4). Swap in a new board layer under your HAL; nothing above it should change. Split into parts of 1 hour or less.
  - Board: Nucleo-U5 (NUCLEO-U545RE-Q, ST-LINK on board)
  - Tools: none
  - Parts: SSD1306 I2C OLED, two 4.7 kΩ resistors, two pushbuttons, 10 kΩ NTC thermistor, 10 kΩ resistor (Lab 4's parts)

Part 6
- 🔬 **Bench lab 14: The crash that leaves a note** (after lesson 84). Enable the watchdog and print the reset reason; save a fault record in `.noinit` RAM (or the watchdog scratch registers) from the HardFault handler; trigger a bad pointer write and a stuck loop; read the record after reboot; add a magic number and CRC so power-on garbage isn't read as a crash. Check whether Wokwi keeps RAM across a watchdog reset; if it does, the sim-vs-board contrast is power-on vs watchdog reset.
  - Board: Pico 2 (Raspberry Pi Pico 2 with headers)
  - Tools: none
  - Parts: none

Part 7
- 🔬 **Bench lab 15: Measure your deadlines** (after lesson 93; Nucleo-U5, FreeRTOS). Toggle one pin per task, capture the timeline, compare with the rate-monotonic analysis, fix the task that misses its deadline under load. Needs a starter with FreeRTOS already configured for the U5.
  - Board: Nucleo-U5 (NUCLEO-U545RE-Q, ST-LINK on board)
  - Tools: logic analyzer with PulseView
  - Parts: jumper wires

Part 8
- 🔬 **Bench lab 16: Real USB enumeration** (after lesson 102). The Pico 2 appears on the PC as a serial port; read its descriptors with the OS tools. Lesson 102 stays 💡 and complete without it.
  - Board: Pico 2 (Raspberry Pi Pico 2 with headers)
  - Tools: OS USB tools: Device Manager and USBView, lsusb or system_profiler
  - Parts: none

Part 9
- 🔬 **Bench lab 17: Mains hum on the ADC** (after lesson 106). A 30 cm wire on an ADC pin picks up 50 Hz hum. Stream samples over UART, plot them, measure the frequency, cancel it with a 20 ms moving average, compare with the lesson's IIR filter.
  - Board: Pico 2 (Raspberry Pi Pico 2 with headers)
  - Tools: none
  - Parts: 30 cm jumper wire, 1 MΩ resistor

Part 10
- 🔬⭐ **Bench lab 18: The capstone on the bench** (after lesson 119). Real NTC; a low-voltage power resistor stands in for the heater. Low voltage only, never mains. Split into parts of 1 hour or less.
  - Board: Pico 2 (Raspberry Pi Pico 2 with headers)
  - Tools: heat-resistant tape
  - Parts: SSD1306 I2C OLED, two 4.7 kΩ resistors, two pushbuttons, 10 kΩ NTC, 10 kΩ, 22 Ω 5 W resistor, logic-level N-MOSFET, 100 Ω, LED and 330 Ω

ESP32 appendix (only if the ESP32 is included)
- ⭐ **ESP32 extra 1:** A busy loop trips the task watchdog on the board.
- ⭐ **ESP32 extra 2:** A button on GPIO0 blocks boot (strapping pin).

Totals: 19 bench labs (15 core, 4 stretch) plus 2 in the ESP32 appendix. 13 on the Pico 2, 6 on the Nucleo-U5. Every part except Part 3 (pure C, fully covered in the sim) has at least one.

**Rollout**
1. Bench labs 0, 2, 4, 5 on the Pico 2 (cheapest, closest to the existing Pico lessons).
2. Bench labs 3, 6, 14, 16, 17 (Pico 2, no new hardware beyond the kit).
3. Bench labs 9, 10, 11, 12 on the U5.
4. Bench lab 15 once the U5 FreeRTOS starter exists.
5. Bench labs 1, 7, 8, 13, 18.
6. The ESP32 appendix only if the hardware is added.

**Maintenance:** CI compiles every bench board target; on-hardware steps are manual checks re-run each release.

---

## Every Lesson Includes
- A short explainer with citations, plus one primary source
- A Wokwi project where possible: diagram.json, wokwi.toml, CMakeLists.txt, starter code, and a solution
- An auto-graded quiz (answers of equal length, correct position varied)
- Spaced-review questions on earlier lessons
- A reminder to ask the agent follow-up questions, and links to related lessons and reference sheets

## Reference Sheets
1. Glossary
2. Electronics formulas
3. Bitwise operations
4. Cortex-M programmer's model
5. ARM Thumb-2 quick reference
6. Pico SDK cheat sheet
7. STM32 register cheat sheet
8. Protocol comparison: UART, I2C, SPI, CAN, USB
9. GDB commands
10. FreeRTOS API
11. Zephyr cheat sheet: west, devicetree, Kconfig
12. MISRA quick list

## Shared Components (./assets/)
1. Stylesheet
2. Quiz widget
3. In-browser CPU simulator
4. Bitwise drill widget
5. Circuit calculators
6. Lesson template
7. "Mystery sensor" custom Wokwi chip
8. Wokwi project templates: Pico SDK, STM32 CMSIS, STM32 HAL, FreeRTOS, Zephyr

## Build Process
1. **Environment:** Install the Part 0 tools and verify them by following lesson 1 myself.
2. **Prove the platforms:** Get a blink running in Wokwi for Pico SDK, STM32 CMSIS, STM32 HAL, FreeRTOS, Zephyr, and Rust.
3. **Foundation:** MISSION, RESOURCES, GLOSSARY, NOTES, and all shared components.
4. **Pilot:** A Haiku agent writes Part 0; I review it and tighten the lesson spec.
5. **Generate:** One Haiku agent per part, working in batches.
6. **Review:** Check accuracy, compile every Wokwi project, check the quiz rules, and fix cross-links.

## Open Decisions
1. Teach both FreeRTOS and Zephyr (recommended)
2. Capstone RTOS: Zephyr (recommended) or FreeRTOS
3. Wokwi license: free 30-day personal license first; Hobby+ (about €8/month) only if needed
4. Bench track sim stage for the STM32U5: Renode (recommended) or compile-only. Wokwi docs list only Nucleo-32 L031K6, Nucleo-64 C031C6 and Blue Pill for STM32, so the U5 isn't covered there.
5. Bench track: include the ESP32 (optional, separate ESP-IDF toolchain) or leave it out
