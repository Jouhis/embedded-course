# Embedded Systems: From Electrons to Firmware Engineer

**Mission (draft):** Reach junior embedded-engineer level and finish with a portfolio project on GitHub.
**Learner:** Already programs; new to electronics.
**Platforms:** Raspberry Pi Pico (RP2040, Pico SDK, C) and STM32 Blue Pill (STM32F103, CMSIS + HAL), simulated with Wokwi in VS Code.
**Size:** 116 lessons, 6 labs, 8 checkpoint exams.

**Legend**
- 🔧 lab
- 📝 checkpoint exam
- 💡 concept-only (Wokwi can't simulate it)
- ⭐ optional

---

## Part 0: Getting Started
1. Set up your environment: VS Code with the Wokwi, C/C++ and Cortex-Debug extensions, the Wokwi license, ARM GCC, CMake, Ninja, git, the Pico SDK and PulseView; finish with a verification checklist (`tools/build.py --check`)
2. First blink in Wokwi: build, simulate, modify; tour of diagram.json and wokwi.toml
3. What embedded engineers do: roles, industries, career paths
4. How this course works: study routine, using the agent as a tutor, spaced review

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

## Part 7: Real-Time Operating Systems

### 7.1 FreeRTOS
86. Why use an RTOS: super-loop vs scheduler
87. FreeRTOS setup, tasks, and scheduling
88. Context switching at the register level
89. Queues, semaphores, and event groups
90. Mutexes, priority inversion, and deadlock
91. Timing analysis, deadlines, and stack sizing

- 🔧 **Lab 5:** Move Lab 4 onto FreeRTOS

### 7.2 Zephyr
92. Zephyr setup: west, the SDK, and a first app on the Pico
93. Kconfig and the build system
94. Devicetree: describing hardware
95. Threads and kernel services: message queues, semaphores, mutexes, work queues
96. The device driver model and the GPIO and I2C APIs
97. Logging, the shell, and testing with ztest and Twister

- 🔧 **Lab 6:** Port Lab 5 to Zephyr and compare the two RTOSes
- 📝 **Checkpoint 7**

## Part 8: Communication and Connected Systems
98. 💡 CAN bus
99. RS-485 and Modbus RTU (with a Python master on the PC over the simulated serial port)
100. 💡 USB fundamentals (plus a USB CDC serial demo on the Pico)
101. Designing a serial protocol: framing, checksums, CRC
102. Bootloaders and firmware updates: A/B slots, OTA
103. Embedded security: secure boot, debug port lockdown, attack surfaces

- 📝 **Checkpoint 8**

## Part 9: Signal Processing, Control, and Beyond
104. Digital filtering: moving average and IIR filters
105. PID control
106. ⭐ PCB design in KiCad: from schematic to board
107. ⭐ Embedded Linux: when to use it instead of an MCU
108. ⭐ Embedded Rust on the Pico (including setup)
109. ⭐ Functional safety: IEC 61508 and ISO 26262

## Part 10: Capstone and Career
110. Capstone 1: requirements and architecture for a filament-dryer controller
111. Capstone 2: drivers and unit tests
112. Capstone 3: RTOS threads and PID heater control
113. Capstone 4: Modbus interface, bootloader, and CI
114. Portfolio and CV for embedded jobs
115. Interview preparation (practice quiz)
116. Next steps: real hardware to buy, communities

---

## Every Lesson Includes
- A short explainer with citations, plus one primary source
- A Wokwi project where possible: diagram.json, wokwi.toml, CMakeLists.txt, starter code, and a solution
- An auto-graded quiz (answers of equal length, correct position varied)
- Spaced-review questions on earlier lessons
- One interview-drill question
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
13. Interview question bank

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
2. Capstone RTOS: Zephyr (recommended, stronger portfolio) or FreeRTOS
3. Wokwi license: free 30-day personal license first; Hobby+ (about €8/month) only if needed
