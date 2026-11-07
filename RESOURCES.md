# Embedded Systems Resources

## Knowledge

### Vendor primary sources (most trusted: cite these for any hardware fact)
- [RP2040 Datasheet (Raspberry Pi)](https://datasheets.raspberrypi.com/rp2040/rp2040-datasheet.pdf)
  Unusually readable datasheet that doubles as a reference manual. Use for: anything about RP2040 registers, peripherals, the bus fabric, boot and the clocks.
- [Raspberry Pi Pico-series C/C++ SDK (book)](https://datasheets.raspberrypi.com/pico/raspberry-pi-pico-c-sdk.pdf)
  The official SDK guide, with worked examples. Use for: Pico SDK APIs, CMake setup, PIO.
- [Pico SDK API documentation](https://www.raspberrypi.com/documentation/pico-sdk/)
  Function-level reference. Use for: exact signatures and the behaviour of `gpio_*`, `uart_*`, `i2c_*` and friends.
- [RM0008: STM32F101/102/103/105/107 Reference Manual (ST)](https://www.st.com/resource/en/reference_manual/rm0008-stm32f101xx-stm32f102xx-stm32f103xx-stm32f105xx-and-stm32f107xx-advanced-armbased-32bit-mcus-stmicroelectronics.pdf)
  Register-level description of every STM32F1 peripheral. Use for: all bare-metal STM32 lessons.
- [STM32F103x8/xB Datasheet (ST)](https://www.st.com/resource/en/datasheet/stm32f103c8.pdf)
  Pinout, alternate functions, electrical characteristics. Use for: pin mapping, absolute maximum ratings, current limits.
- [PM0056: STM32F10xxx Cortex-M3 Programming Manual (ST)](https://www.st.com/resource/en/programming_manual/pm0056-stm32f10xxx20xxx21xxxl1xxxx-cortexm3-programming-manual-stmicroelectronics.pdf)
  The core registers, instruction set, NVIC, SysTick and MPU as implemented on the STM32F1. Use for: Part 2.3 and the interrupt lessons.
- [UM1850: Description of STM32F1 HAL and Low-Layer Drivers (ST)](https://www.st.com/resource/en/user_manual/um1850-description-of-stm32f1-hal-and-lowlayer-drivers-stmicroelectronics.pdf)
  The official HAL reference. Use for: lesson 69 onwards.
- [Cortex-M3 Devices Generic User Guide (Arm)](https://developer.arm.com/documentation/dui0552/latest/)
  Arm's own description of the M3 programmer's model and exceptions. Use for: core registers, exception entry and return.
- [Armv7-M Architecture Reference Manual (Arm)](https://developer.arm.com/documentation/ddi0403/latest/)
  The definitive architecture specification. Use for: instruction encoding (lesson 29) and exact exception semantics.
- [Arm ABI documents, including the AAPCS](https://github.com/ARM-software/abi-aa/releases)
  The procedure call standard. Use for: lesson 33 (stack frames, register usage).
- [Wokwi documentation](https://docs.wokwi.com/)
  Simulator parts, diagram.json, wokwi.toml, GDB, logic analyzer, custom chips, CI. Use for: every hands-on lesson.
- [Raspberry Pi Pico datasheet](https://datasheets.raspberrypi.com/pico/pico-datasheet.pdf)
  The board-level datasheet: pinout, power chain (VBUS 5 V, VSYS 1.8–5.5 V, 3V3 buck-boost supply and its load limit). Use for: lessons 5, 6, 9, 15, 17 and any board-level power figure.
- [IRLZ44N datasheet (Infineon)](https://www.infineon.com/dgdl/irlz44npbf.pdf)
  A logic-level N-channel MOSFET with a complete datasheet. Use for: V<sub>GS(th)</sub>, R<sub>DS(on)</sub> vs gate voltage, absolute maximum ratings and thermal resistance (lessons 12, 18, Lab 1).
- [PN2222A datasheet (Micro Commercial Components)](https://www.mccsemi.com/pdf/Products/PN2222A(TO-92).pdf)
  A general-purpose NPN transistor: absolute maximum ratings and gain tables. Use for: lesson 11.
- [AN-140: Basic Concepts of Linear Regulator and Switching Mode Power Supplies (Analog Devices)](https://www.analog.com/en/app-notes/an-140.html)
  Application note on regulator power loss and efficiency. Use for: lesson 15.
- [Arm Cortex-M Processor Comparison Table (Arm)](https://documentation-service.arm.com/static/655e085f2c8b3557fee7048f)
  One table for every Cortex-M core: architecture version, FPU option, DSP extension, hardware divide. Use for: lessons 21 and 26. Its rows show that the M0+ and the M3 have no FPU, and that the M0+ has no hardware divide while the M3 has one. Read the PDF's rows directly; the page is a document, not text.
- [Arm Cortex-M3 Technical Reference Manual, DDI0337G (copy hosted by Keil)](https://www.keil.com/dd/docs/datashts/arm/cortex_m3/r2p0/ddi0337g_cortex_m3_r2p0_trm.pdf)
  The Arm TRM for the Cortex-M3 (revision r2p0). Use for: the Harvard buses (§1.1 and §12), the three-stage pipeline (§1.3), the prefetch unit (§1.4), the registers and xPSR (§2.3 and Tables 2-1 to 2-3), the privilege model (§2.2), the main and process stacks (§2.2.1), stacking (§5.5.1), the twelve-cycle entry timing (§5.5, Figure 5-2), tail-chaining (§5.6) and late arrival (§5.7). Lessons 27 to 35. The Keil-hosted copy is the one we read; check the Arm docs site for the current revision.
- [Arm Cortex-M0+ processor datasheet](https://documentation-service.arm.com/static/620545c494e7af28dd7c9cbc)
  The Arm datasheet for the Cortex-M0+: Armv6-M, a 2-stage pipeline, a single 32-bit AMBA-3 AHB-Lite system interface, and instructions fetched only over that interface. Use for: lessons 27, 29 and 30 (the M0+ bus and pipeline).
- [pico-bootrom (Raspberry Pi, GitHub)](https://github.com/raspberrypi/pico-bootrom)
  The RP2040 bootrom source, for versions B0, B1 and B2. Named in the RP2040 datasheet section 2.8. Use for: lesson 42 (boot sequence) and lesson 44 (bootrom errata).
- [pico-sdk (Raspberry Pi, GitHub)](https://github.com/raspberrypi/pico-sdk)
  The Pico SDK source. Use for: the default linker script (src/rp2040/pico_platform/memmap_default.ld, pico-sdk 2.3.1) and crt0.S (src/rp2_common/pico_crt0/crt0.S), lessons 41 and 42.
- [SSD1306 datasheet (Solomon Systech, hosted by Adafruit)](https://cdn-shop.adafruit.com/datasheets/SSD1306.pdf)
  The 128 by 64 OLED controller. Use for: the I2C address and control byte (section 8.1.5), display RAM (8.7), and the addressing modes and page commands (10.1.1 to 10.1.13). Lesson 61.
- [InvenSense RM-MPU-6000A, MPU-6000/MPU-6050 Register Map and Descriptions (hosted by SparkFun)](https://cdn.sparkfun.com/datasheets/Sensors/Accelerometers/RM-MPU-6000A.pdf)
  The MPU6050 register map. Use for: WHO_AM_I at register 0x75 (section 4.34, default 0x68), and PWR_MGMT_1 at 0x6B (sleep at power-up). Lesson 60.
- [pico-examples: adc_console (Raspberry Pi)](https://github.com/raspberrypi/pico-examples/blob/master/adc/adc_console/adc_console.c)
  The 3.3f / (1 << 12) conversion factor. Use for: lesson 58.
- [pico-examples: ssd1306_i2c (Raspberry Pi, BSD-3-Clause)](https://github.com/raspberrypi/pico-examples/blob/master/i2c/ssd1306_i2c/ssd1306_i2c.c)
  A complete SSD1306 driver for the Pico SDK, with the init sequence used in lesson 61. Licence: BSD-3-Clause.
- [cmsis-device-f1 (STMicroelectronics, GitHub)](https://github.com/STMicroelectronics/cmsis-device-f1)
  The STM32F1 device headers, startup files and `system_stm32f1xx.c`. Use for: lessons 66 to 70 (`stm32f103xb.h`, `startup_stm32f103xb.s`).
- [stm32f1xx-hal-driver (STMicroelectronics, GitHub)](https://github.com/STMicroelectronics/stm32f1xx-hal-driver)
  The HAL source. Use for: lesson 69 (the weak callbacks in `stm32f1xx_hal.c` and `stm32f1xx_hal_uart.c`), together with UM1850.

- [FreeRTOS API reference: vTaskDelay (freertos.org)](https://www.freertos.org/a00127.html)
  The API reference page for `vTaskDelay()`. Use for: lesson 87, relative delays. Other API pages in this course are cited through the kernel source, not through their freertos.org URLs.

- [Zephyr: West (meta-tool and workspace)](https://docs.zephyrproject.org/4.5.0/develop/west/index.html)
  The West tool, the manifest and the project filter. Use for: lesson 94.

- [Zephyr: Toolchains](https://docs.zephyrproject.org/4.5.0/develop/toolchains/index.html)
  Toolchain variants such as gnuarmemb, and the Zephyr SDK. Use for: lesson 94.

- [Zephyr: Configuration system (Kconfig)](https://docs.zephyrproject.org/4.5.0/build/kconfig/index.html)
  Symbols, defaults, dependencies and the generated `.config`. Use for: lesson 95.

- [Zephyr: Devicetree](https://docs.zephyrproject.org/4.5.0/build/dts/index.html)
  Nodes, properties, bindings, aliases and overlays. Use for: lessons 96 and 98.

- [Zephyr: Threads](https://docs.zephyrproject.org/4.5.0/kernel/services/threads/index.html)
  Thread creation, priorities and scheduling. Use for: lesson 97 and Lab 6.

- [Zephyr: Message queues](https://docs.zephyrproject.org/4.5.0/kernel/services/data_passing/message_queues.html)
  `k_msgq` put and get, and the timeout forms. Use for: lesson 97 and Lab 6.

- [Zephyr: Mutexes](https://docs.zephyrproject.org/4.5.0/kernel/services/synchronization/mutexes.html)
  Mutex use, priority inheritance (section "Priority Inheritance"). Use for: lesson 97.

- [Zephyr: Semaphores](https://docs.zephyrproject.org/4.5.0/kernel/services/synchronization/semaphores.html)
  Counting semaphores and their limit. Use for: lesson 97.

- [Zephyr: Timers](https://docs.zephyrproject.org/4.5.0/kernel/services/timing/timers.html)
  Expiry callbacks run in interrupt context and must be short. Use for: lesson 97.

- [Zephyr: System workqueue](https://docs.zephyrproject.org/4.5.0/kernel/services/threads/workqueue.html)
  Deferred work on the system queue. Use for: lesson 97.

- [Zephyr: GPIO](https://docs.zephyrproject.org/4.5.0/hardware/peripherals/gpio.html)
  GPIO_DT_SPEC_GET, configuration and interrupt callbacks. Use for: lessons 96 and 98.

- [Zephyr: I2C](https://docs.zephyrproject.org/4.5.0/hardware/peripherals/i2c.html)
  I2C_DT_SPEC_GET and the transfer helpers. Use for: lesson 98 and Lab 6.

- [Zephyr: Logging](https://docs.zephyrproject.org/4.5.0/services/logging/index.html)
  Log modules, levels and backends. Use for: lesson 99.

- [Zephyr: Shell](https://docs.zephyrproject.org/4.5.0/services/shell/index.html)
  Shell commands and backends. Use for: lesson 99.

- [Zephyr: ztest](https://docs.zephyrproject.org/4.5.0/develop/test/ztest.html)
  Test suites and cases, and the Linux-only native host note. Use for: lesson 99.

- [Zephyr: Testing and Twister](https://docs.zephyrproject.org/4.5.0/develop/test/index.html)
  Twister's role and the testing overview. Use for: lesson 99.

- [QP/C Reference Manual: overview (Quantum Leaps, state-machine.com)](http://www.state-machine.com/qpc/)
  The QP/C framework, described as a lightweight implementation of the active-object model. Use for: lesson 77 and the active-object glossary entry.

- [Hardware design with RP2040 (Raspberry Pi, RP-008279-DS-2)](https://pip-assets.raspberrypi.com/categories/814-rp2040/documents/RP-008279-DS-2-hardware-design-with-rp2040.pdf)
  The RP2040 minimal design and board guide. Use for: decoupling (section 2.1.2: 100 nF per power pin, placed close; section 2.1.3: 1 µF on the regulator input and output), the crystal (section 2.3) and two-layer and four-layer PCB design (section 2.7). The PDF text drops the micro sign, so check the figures in the PDF.

- [TI SLVA390: Calculating Efficiency and Power Dissipation in DC/DC Converters (Texas Instruments)](https://www.ti.com/lit/pdf/slva390)
  The application report that lists the three main causes of dissipation in a DC/DC converter (inductor conduction, MOSFET conduction, MOSFET switching) and the method for computing efficiency at any output voltage. Use for: lesson 15 (buck losses). Opened in this build; the introduction and the inductor section were read.

- [Panasonic CGR18650CH specification (copy hosted by orbtronic.com)](https://www.orbtronic.com/content/battery-specs-datasheet/CGR18650CH-Panasonic_18650_specification_datasheet.pdf)
  Lithium-ion cell: 3.6 V nominal, 4.2 V charge limit, 3.0 V discharge cut-off at 430 mA, 25 °C. Use for: lesson 15 (battery and dropout). This is a third-party copy; the manufacturer's own copy should be checked before a design relies on it.

- [CircuitJS source: MosfetElm.java, VoltageElm.java, ResistorElm.java, WireElm.java, GroundElm.java, OutputElm.java (sharpie7/circuitjs1, GitHub)](https://github.com/sharpie7/circuitjs1/tree/master/src/com/lushprojects/circuitjs1/client)
  The simulator's element classes. Their getDumpType() letters (v, r, w, g, O, f) and dump fields define the netlist format, and MosfetElm.java gives the MOSFET equations and the beta and threshold fields. Use for: lessons 17, 18 and Lab 1. Read in this build.

- [SN74HC00 datasheet, quad 2-input NAND gate (Texas Instruments)](https://www.ti.com/lit/ds/symlink/sn74hc00.pdf)
  A real NAND chip. Use for: the gate function (section 8.1, Y = A · B in positive logic), the function table (Table 8-1) and the propagation delay (section 6.7, Switching Characteristics). Lesson 22.

- [Vishay CRCW chip resistor product information](https://www.vishay.com/en/product/20008/)
  Chip resistor family with power ratings and the derating rules above the rated temperature. Use for: lesson 6, choosing a power rating. Read the derating curve in the datasheet of the exact part.

- [Analog Devices AN-140: Basic Concepts of Linear Regulator and Switching Mode Power Supplies](https://analog.com/en/app-notes/an-140.html)
  Application note on linear regulator power loss and efficiency. Use for: P<sub>loss</sub> = (V<sub>in</sub> − V<sub>out</sub>) × I and the 27.5 % example (lesson 15).

- [TI SLVA390: buck converter efficiency and power loss](https://ti.com/lit/pdf/slva390)
  Application report giving the buck loss sources and an efficiency procedure. Use for: lesson 15. Verified from a search summary only; check before the next revision.

- [pico-sdk watchdog.c (Raspberry Pi, GitHub)](https://github.com/raspberrypi/pico-sdk/blob/master/src/rp2_common/hardware_watchdog/watchdog.c)
  The SDK's watchdog code, pico-sdk 2.3.1: _watchdog_enable() multiplies the delay by WATCHDOG_XFACTOR, which is 2 on the RP2040 (errata RP2040-E1). Use for: lesson 44 (the code, line by line). The file was read from the local SDK 2.3.1 copy in this pass; the GitHub URL is the same file on the master branch.

- [W25Q16JV-DTR datasheet, Rev I (Winbond)](https://www.winbond.com/resource-files/W25Q16JV_DTR%20RevI%2005252026%20Plus.pdf)
  The Pico's 2 MB flash chip (Pico datasheet, chapter 1). Section 1: 8,192 pages of 256 bytes, erased in 4 KB sectors (512 of them). Section 2: at least 100K program-erase cycles, more than 20 years of retention. Section 9.6: sector erase 45 ms typical, 400 ms maximum. Page Program (02h) writes previously erased (FFh) locations. Use for: lesson 105.

- [Pico SDK 2.3.1, hardware/flash.h (GitHub)](https://github.com/raspberrypi/pico-sdk/blob/2.3.1/src/rp2_common/hardware_flash/include/hardware/flash.h)
  flash_range_erase() and flash_range_program(): sector- and page-aligned offsets, erase sets bits to one and program only clears them, interrupts off and the other core stopped during the call. pico/flash.h adds flash_safe_execute(). Use for: lesson 105.

- [STM32F1 medium-density errata sheet (ST, DocID 14574)](https://www.st.com/en/microcontrollers-microprocessors/stm32f1-series/documentation.html)
  The errata for STM32F101x8/B, STM32F102x8/B and STM32F103x8/B medium-density parts. The title comes from a search result, not from an opened copy. The page link is the ST F1 documentation index; open it and confirm the exact sheet and current revision before the link is used as a primary source. Use for: lesson 44 (which errata sheet a Blue Pill needs). Not yet verified in this pass.

- [Pico SDK: hardware APIs (hardware_gpio, hardware_i2c, hardware_sync, hardware_dma)](https://www.raspberrypi.com/documentation/pico-sdk/hardware.html)
  The GPIO interrupt callback, the I2C blocking calls and their return values (PICO_ERROR_GENERIC on no acknowledge), and the spinlock and interrupt-state helpers in hardware_sync. Use for: lesson 64, lesson 65 and lab 3. Already cited by lessons 60 to 63, and not yet listed here.

- [Zephyr: Twister (test runner)](https://docs.zephyrproject.org/4.5.0/develop/twister/index.html)
  How Twister finds test description files, the platform and harness options, and the native_sim Linux requirement. Use for: lesson 99.

- [Pico SDK 2.3.1 source, pico_divider/divider_hardware.S (GitHub)](https://github.com/raspberrypi/pico-sdk/blob/2.3.1/src/rp2_common/pico_divider/divider_hardware.S)
  The SDK's __aeabi_idiv wrapper, which runs integer division on the RP2040 hardware divider in the SIO block. Use for: lesson 107 (why a divide by a power of two is still worth a shift on the Pico) and lesson 21.

### Books (the canonical texts)
- [_The Definitive Guide to ARM Cortex-M3 and Cortex-M4 Processors_, Joseph Yiu (Newnes)](https://www.sciencedirect.com/book/9780124080829/the-definitive-guide-to-arm-cortex-m3-and-cortex-m4-processors)
  The standard Cortex-M text. Use for: all of Part 2.3 and 2.4, the NVIC, fault handling and context switching.
- [_Digital Design and Computer Architecture: ARM Edition_, Harris & Harris (Morgan Kaufmann)](https://www.sciencedirect.com/book/9780128000564/digital-design-and-computer-architecture)
  From gates to a pipelined ARM processor. Use for: Parts 2.1 and 2.2.
- [_Making Embedded Systems_, 2nd ed., Elecia White (O'Reilly)](https://www.oreilly.com/library/view/making-embedded-systems/9781098151539/)
  The best practical overview of the profession. Use for: architecture, debugging and power.
- [_Test-Driven Development for Embedded C_, James Grenning (Pragmatic)](https://pragprog.com/titles/jgade/test-driven-development-for-embedded-c/)
  The reference for unit-testing firmware. Use for: lessons 80 and 81.
- [_The Art of Electronics_, Horowitz & Hill](https://artofelectronics.net/)
  The electronics bible: deep, but the first chapters are approachable. Use for: depth beyond Part 1.
- [_Embedded C Coding Standard_, Barr Group](https://barrgroup.com/embedded-systems/books/embedded-c-coding-standard)
  A free, widely adopted coding standard. Use for: style and the defensive-coding lessons (83, 84).

- [Pro Git (Scott Chacon and Ben Straub, free online)](https://git-scm.com/book/en/v2)
  The free git book. Use for: branches and merges (chapter 3.2, Basic Branching and Merging), and advanced merging (chapter 7.8). Use for: lesson 79.

### Free courses and tutorials
- [Modern Embedded Systems Programming, Miro Samek (video course)](https://www.state-machine.com/video-course)
  A free course from bare metal to RTOS and active objects, showing what the code compiles to. Use for: Parts 3 to 7, especially state machines and active objects.
- [Interrupt blog (Memfault)](https://interrupt.memfault.com/blog/)
  Practitioner articles on Cortex-M internals, fault debugging, linker scripts, CI and testing. Use for: Parts 2.4 and 6.
- [Ben Eater: Build an 8-bit computer](https://eater.net/8bit)
  Video series building a CPU from logic chips on breadboards. Use for: intuition in Parts 2.1 and 2.2.
- [nand2tetris](https://www.nand2tetris.org/)
  Build a computer from NAND gates upward. Use for: optional deeper practice for Part 2.
- [All About Circuits textbook](https://www.allaboutcircuits.com/textbook/)
  A free electronics textbook (DC, AC, semiconductors, digital). Use for: Part 1.
- [SparkFun tutorials](https://learn.sparkfun.com/tutorials)
  Beginner-friendly electronics and protocol explainers (pull-ups, I2C, SPI, serial). Use for: Part 1 and the protocol lessons.
- [FreeRTOS documentation](https://www.freertos.org/Documentation/00-Overview) and [_Mastering the FreeRTOS Real Time Kernel_](https://github.com/FreeRTOS/FreeRTOS-Kernel-Book)
  The official docs and the free official book. Use for: Part 7.1.
- [Zephyr Project documentation](https://docs.zephyrproject.org/latest/)
  The official docs: devicetree, Kconfig, kernel services, drivers. Use for: Part 7.2 and the capstone.
- [Nordic DevAcademy: nRF Connect SDK Fundamentals](https://academy.nordicsemi.com/courses/nrf-connect-sdk-fundamentals/)
  An excellent free Zephyr course (Nordic's SDK is built on Zephyr). Use for: Part 7.2.
- [The Embedded Rust Book](https://docs.rust-embedded.org/book/)
  Official Rust embedded working group book. Use for: lesson 111.
- [Embedded Artistry](https://embeddedartistry.com/)
  Articles on embedded architecture, process and C/C++. Use for: Part 6.
- [Unity test framework (Throw The Switch)](https://www.throwtheswitch.org/unity)
  The C unit test framework used in the course. Use for: lessons 80 and 81.
- [SparkFun: LED Current Limiting Resistors](https://www.sparkfun.com/tutorials/219)
  A short tutorial on R = (supply − forward voltage) ÷ current. Use for: lesson 9.
- [Klipper Config Reference](https://www.klipper3d.org/Config_Reference.html)
  The 3D printer firmware's configuration reference (thermistor pull-up of 4.7 kΩ by default, heater pins). Use for: real-world divider and heater examples from a shipping 3D-printer firmware.
- [Divide and conquer (Arm architectures and processors blog)](https://developer.arm.com/community/arm-community-blogs/b/architectures-and-processors-blog/posts/divide-and-conquer)
  Which Cortex-M cores have hardware SDIV and UDIV, with a table of M0, M0+, M1, M3 and M4. Use for: lesson 21, the reason a software divide is slow on the M0+.

- [rp2040-hal 0.11.0 documentation (docs.rs)](https://docs.rs/rp2040-hal/0.11.0/rp2040_hal/)
  The rp2040-hal crate: GPIO, clocks, UART and interrupts. The docs.rs gpio page does not show the interrupt methods; read them in the crate source (src/gpio/mod.rs, set_interrupt_enabled, interrupt_status and clear_interrupt). Use for: lesson 111.

- [The Embedded Rust Book, Singletons](https://docs.rust-embedded.org/book/peripherals/singletons.html)
  Peripherals::take() and why the singleton gives one owner per peripheral. Use for: lesson 111. Secondary to the book's root page already listed above.

- [Ferrocene (Ferrous Systems)](https://www.ferrous-systems.com/ferrocene)
  A Rust toolchain from Ferrous Systems that is offered for safety-critical projects (ISO 26262 and IEC 61508). Its qualification scope changes by release; check the vendor's current statement before use. Use for: lesson 111, the balance section. Vendor source: mark as secondary.

- [Wokwi license](https://wokwi.com/license)
  Personal 30-day license for Wokwi VS Code, free for open-source projects, and paid for commercial use. The page does not state renewal. Use for: lesson 1 (license terms).

- [Retrieval Practice](https://www.retrievalpractice.org/)
  The research summary behind retrieval practice, with spacing and interleaving as related strategies. Use for: lesson 4 (the method and its evidence).

- [SparkFun: basic red 5 mm LED, product 9590](https://sparkfun.com/products/9590)
  Typical forward voltage 2.0 V, range 1.8 to 2.2 V, as shown on the product page. Use for: lesson 9 (the forward-voltage example). Check your own LED's datasheet before you use any value.

- [Texas Instruments SN74HC595 datasheet](https://www.ti.com/lit/ds/symlink/sn74hc595.pdf)
  The 8-bit shift register with output latch. Use for: lesson 25 (the pin names SER, SRCLK, RCLK, SRCLR, OE and QH', section 8.1 on positive-edge clocks, the one-pulse-ahead note when the clocks are tied, and Table 8-1). Checked by text extraction on 2026-10-31.

- [MC74HC595A 8-bit shift register with output latches (onsemi)](https://www.onsemi.com/pdf/datasheet/mc74hc595a-d.pdf)
  The 74HC595 datasheet from onsemi. The pin descriptions say that a low-to-high transition on the shift clock shifts the serial input in, and a low-to-high transition on the latch clock copies the shift register to the outputs. Use for: lesson 25 and lesson 62 (the mode 0 choice and the latch timing). The PDF was downloaded and its pin descriptions were read in this pass; the page numbers were not recorded.

- [GitHub Docs: using secrets in GitHub Actions](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
  The page that says secrets are not passed to a workflow triggered from a forked repository (GITHUB_TOKEN is still passed). Use for: lesson 82, the simulate job's if line. Opened in this pass.

- [KiCad 9.0 documentation: Pcbnew (docs.kicad.org)](https://docs.kicad.org/9.0/en/pcbnew/pcbnew.html)
  The board editor: the design rules checker (copper clearance, minimum width, and that every pad is connected as the netlist says), the board setup dialog that holds the design rules, and the fabrication outputs and drill files. Verified as the KiCad 9.0 manual in this build. Use for: lesson 109.

- [RFC 2217: Telnet COM Port Control Option (rfc-editor.org)](https://www.rfc-editor.org/rfc/rfc2217)
  Not fetched in this pass. Lesson 118 mentions RFC 2217 in one sentence and does not link it yet.

### Protocol and topic specifications
- [UM10204: I2C-bus Specification (NXP)](https://www.nxp.com/docs/en/user-guide/UM10204.pdf)
  The I2C spec itself (rev. 7 uses controller/target terminology). Use for: lessons 60 and 61.
- [SLOA101: Introduction to the Controller Area Network (TI)](https://www.ti.com/lit/an/sloa101b/sloa101b.pdf)
  A clear CAN introduction. Use for: lesson 100.
- [Modbus specifications](https://www.modbus.org/specs.php)
  The official Modbus application protocol and serial line specs. Use for: lesson 101.
- [USB in a NutShell (Beyond Logic)](https://www.beyondlogic.org/usbnutshell/usb1.shtml)
  The classic USB primer. Use for: lesson 102.
- [Improving the Beginner's PID, Brett Beauregard](http://brettbeauregard.com/blog/2011/04/improving-the-beginners-pid-introduction/)
  A practical PID implementation series. Use for: lesson 108 and the capstone.
- [The Scientist and Engineer's Guide to DSP, Steven W. Smith](https://www.dspguide.com/)
  A free DSP textbook. Use for: lesson 107.
- [Bootlin embedded Linux training materials](https://bootlin.com/training/embedded-linux/)
  Free, professional training slides and labs. Use for: lesson 110.

- [Liu and Layland, "Scheduling Algorithms for Multiprogramming in a Hard-Real-Time Environment", Journal of the ACM 20(1), 1973](https://doi.org/10.1145/321738.321743)
  The utilisation bound n(2^(1/n) − 1) for rate-monotonic scheduling. Use for: lesson 93. Check the DOI before merging; it was not opened during this build.

- [RISKS Digest, volume 19, issue 49: Mike Jones, "What really happened on Mars Rover Pathfinder" (December 1997)](https://catless.ncl.ac.uk/Risks/19/49)
  The primary account of the Mars Pathfinder priority inversion, the mutex with priority inheritance disabled, and Glenn Reeves's reply in the same thread. Use for: lesson 91, the Mars Pathfinder story.

- [RP2350 Datasheet (Raspberry Pi)](https://datasheets.raspberrypi.com/rp2350/rp2350-datasheet.pdf)
  The RP2350 datasheet. Use for: section 10.1.1 (secure boot: SHA-256, secp256k1 ECDSA, OTP key fingerprint, anti-rollback, glitch detectors, debug note), section 5.10.1 (enable steps) and section 10.5 (the enable procedure). Lesson 106. Opened and read in this build.

- [MCUboot design (docs.mcuboot.com)](https://docs.mcuboot.com/design.html)
  The MCUboot design document, which is the reference bootloader for Zephyr. Use for: the 32-byte image header and its magic value, the primary and secondary slots, and the test, confirm and revert swap types. Lesson 104. Opened and read in this build.

- [TinyUSB documentation](https://docs.tinyusb.org/en/latest/)
  The open-source USB stack used by the Pico SDK. Use for: the device classes it supports (CDC, HID, MSC). Lesson 102. Opened in this build. It does not describe pico_enable_stdio_usb; the SDK source is the reference for that.

- [Koopman, "Best CRC Polynomials" (Carnegie Mellon University)](https://users.ece.cmu.edu/~koopman/crc/)
  Koopman's tables of CRC polynomials by Hamming distance and data length, with the assumptions behind them. Use for: choosing a CRC polynomial. Lesson 103. Opened in this build.

- [Cheshire and Baker, "Consistent Overhead Byte Stuffing" (author's page)](https://stuartcheshire.org/papers/COBSforToN/)
  The COBS paper, published in IEEE/ACM Transactions on Networking, vol. 7, no. 2, April 1999. Use for: the COBS definition and its bound of one byte in 254. Lesson 103. Found by search, not opened. No DOI was found; the publisher identifier is S 1063-6692(99)03826-1.

- [Bosch CAN Specification 2.0 (copy hosted by NXP)](https://www.nxp.com/docs/en/reference-manual/BCANPSV2.pdf)
  The Bosch CAN 2.0 protocol specification, Part A (11-bit identifiers) and Part B (29-bit identifiers). Use for: the frame format, the error counters and the error-state thresholds. Lesson 100. Found by search, not opened: confirm the URL and the copy before merging.

- [Regulation (EU) 2024/2847, Cyber Resilience Act (EUR-Lex)](https://eur-lex.europa.eu/eli/reg/2024/2847/oj/eng)
  The official text of the EU Cyber Resilience Act. Use for: the obligations and the application dates in Article 71. Lesson 106. Not opened in this build: the fetch returned no content, and secondary sites disagree on the application dates, so check Article 71 before quoting a date.

- [RFC 1055: A Nonstandard for Transmission of IP Datagrams over Serial Lines (SLIP)](https://www.rfc-editor.org/rfc/rfc1055)
  The SLIP framing specification, with its END and ESC escaping. Use for: the comparison in lesson 103. Not opened in this build.

- [The Scientist and Engineer's Guide to DSP, chapter 15 (dspguide.com)](https://www.dspguide.com/ch15.htm)
  The chapter on digital filters, including the moving average. The fetch confirmed the PDF name Chapter15.pdf but not the chapter title; check the title in the book. Use for: lesson 107.

- [The Scientist and Engineer's Guide to DSP, chapter 19 (dspguide.com)](https://www.dspguide.com/ch19.htm)
  The chapter on recursive (IIR) filters. The fetch confirmed the PDF name Chapter19.pdf but not the chapter title; check the title in the book. Use for: lesson 107.

- [Klipper Code Overview (klipper3d.org)](https://www.klipper3d.org/Code_Overview.html)
  The Klipper host and MCU split: the host plans moves and sends queue_step commands, and the MCU fires steps from hardware timers. Use for: lesson 110 (the hybrid pattern) and the host and MCU split glossary entry.

- [Klipper Protocol (klipper3d.org)](https://www.klipper3d.org/Protocol.html)
  The host-to-MCU message protocol, with the clock value in each command and the window of messages in flight. Use for: lesson 110.

- [Buildroot (buildroot.org)](https://buildroot.org/)
  The Buildroot project page: a tool for generating embedded Linux systems through cross-compilation. Use for: lesson 110.

- [Yocto Project overview manual (docs.yoctoproject.org)](https://docs.yoctoproject.org/overview-manual/yp-intro.html)
  The introduction to the Yocto Project for custom embedded Linux systems. Its comparison with Buildroot is not on this page, so cite Bootlin for the trade-off. Use for: lesson 110.

- [NXP, Functional safety white paper: IEC 61508 and ISO 26262 (2013, vendor)](https://nxp.com/docs/en/white-paper/FCTNLSFTYWP.pdf)
  A vendor overview of both standards, with the SIL and ASIL levels and the comparison table. A 2013 vendor document: read the numbers as an overview. Use for: lesson 112. This is the only free functional safety primer fetched, so it fills the Gap noted below, partly.

- [Microchip SRAM self-test documentation: DIAG_SRAM_MarchCMinus](https://onlinedocs.microchip.com/oxy/GUID-CA566412-3E3C-467B-98AF-9F1D156615B7-en-US-3/GUID-4236B5E8-131B-4198-BED7-A31CE5426ACD.html)
  The vendor's March C- SRAM test, which describes it as detecting stuck-at faults among others. The page was seen in a search result, not opened in full. Use for: lesson 112.

- [IEC 60063 (EN 60063:2015): preferred number series for resistors and capacitors (DIN publication page)](https://www.din.de/en/getting-involved/standards-committees/dke/publications/wdc-beuth:din21:240741276)
  The standard that defines the E12 and E24 series. Use for: lesson 9, the E12 rounding rule. The publication page does not show the table; the values are the ones in the E12 section of the sheet in `reference/electronics-formulas.html`.

- [RISKS Digest 19.50: reply by Bob Rahe, "Mars Pathfinder priority inversion" (catless.ncl.ac.uk, December 1997)](https://catless.ncl.ac.uk/Risks/19/50)
  A reply that dates the CMU priority inheritance paper to 1990 and notes earlier prior art in a mainframe locking scheme. Use for: lesson 91, the note on prior art. The date is the replier's, not independently checked.

### Language and build references
- [cppreference: Fixed-width integer types](https://en.cppreference.com/w/c/types/integer)
  The C page on uintN_t: exact width, no padding bits, and the rule that each type is defined only when the implementation provides it. Use for: lesson 45, and the integer rules in checkpoint 3.
- [cppreference: Conversions](https://en.cppreference.com/w/c/language/conversion)
  Integer promotions, usual arithmetic conversions, and conversion to unsigned types (modulo 2 to the power N). Use for: lessons 45 and 48, and checkpoint 3.
- [cppreference: Arithmetic operators, overflows](https://en.cppreference.com/w/c/language/operator_arithmetic)
  Signed integer overflow is undefined behaviour; unsigned arithmetic is modulo 2 to the power N. Use for: lesson 45.
- [cppreference: volatile](https://en.cppreference.com/w/c/language/volatile)
  Accesses to volatile objects are observable side effects, and volatile gives no atomicity, synchronisation or memory ordering between threads. Use for: lessons 46 and 47.
- [cppreference: Storage duration and linkage](https://en.cppreference.com/w/c/language/storage_duration)
  Static storage duration (initialised once, lasts the program) and internal linkage for file-scope static. Use for: lesson 46.
- [cppreference: Bit-field declaration](https://en.cppreference.com/w/c/language/bit_field)
  Which bit-field layout details are implementation-defined or unspecified. Use for: lesson 48.
- [cppreference: Replacement of macros](https://en.cppreference.com/w/c/preprocessor/replace)
  Function-like macros replace text, and the argument count must match. Use for: lesson 50.
- [GCC manual: Common attributes (packed)](https://gcc.gnu.org/onlinedocs/gcc/Common-Attributes.html)
  The packed attribute removes padding and gives members the smallest alignment. Use for: lesson 48.
- [CMake: target_compile_definitions](https://cmake.org/cmake/help/latest/command/target_compile_definitions.html)
  Adds definitions to one target, with PRIVATE, PUBLIC or INTERFACE, and the NAME=VALUE form. Use for: lesson 50 and the multi-target builds.
- [CMSIS-Core documentation (Arm)](https://arm-software.github.io/CMSIS_5/Core/html/index.html)
  The CMSIS core API reference. Use for: lesson 47, the register access conventions. Note that the reference pages do not define the __IO macro: it is in the header, core_cm3.h.
- [GDB manual (GNU Debugger)](https://sourceware.org/gdb/current/onlinedocs/gdb/)
  The reference for every GDB command: breakpoints, watchpoints, the x command and its format letters, and set var. Use for: lesson 54 and the GDB commands reference sheet.
- [Pico SDK 2.3.1 source, GPIO header (GitHub)](https://github.com/raspberrypi/pico-sdk/blob/2.3.1/src/rp2_common/hardware_gpio/include/hardware/gpio.h)
  The inline functions behind gpio_put, gpio_put_masked and gpio_set_dir_out_masked, with the SIO register each one writes. Use for: lessons 51, 52 and 55, where the SDK call is checked against the register it reaches.
- [Pico SDK 2.3.1 source, UART (GitHub)](https://github.com/raspberrypi/pico-sdk/blob/2.3.1/src/rp2_common/hardware_uart/uart.c)
  uart_init and uart_set_baudrate, including the divisor arithmetic and the dummy LCR_H write. Use for: lesson 53.
- [Pico SDK 2.3.1 source, pico/time.h (GitHub)](https://github.com/raspberrypi/pico-sdk/blob/2.3.1/src/common/pico_time/include/pico/time.h)
  absolute_time_t, get_absolute_time, make_timeout_time_ms, absolute_time_diff_us and sleep_until. Use for: lesson 55.
- [Pico SDK hardware_spi: spi.c (raspberrypi/pico-sdk)](https://github.com/raspberrypi/pico-sdk/blob/master/src/rp2_common/hardware_spi/spi.c)
  The SPI bit-rate calculation in spi_set_baudrate (lines 42 to 64): clk_peri divided by prescale times post-divide. Use for: lesson 62.
- [Pico SDK hardware_pwm: pwm.h (raspberrypi/pico-sdk)](https://github.com/raspberrypi/pico-sdk/blob/master/src/rp2_common/hardware_pwm/include/hardware/pwm.h)
  The PWM counter rule (clk_sys divided by the divider) and the slice and channel helpers. Use for: lesson 59.
- [Pico SDK: multicore, FIFO and PIO API groups](https://www.raspberrypi.com/documentation/pico-sdk/high_level.html)
  The pico_multicore API, and the PIO and DMA groups in the Pico SDK reference. Use for: lessons 64 and 65.
- [CMSIS_5 (Arm, GitHub)](https://github.com/ARM-software/CMSIS_5)
  The CMSIS core headers, sparse-checked-out to `CMSIS/Core/Include` in `third_party/CMSIS_5`. Use for: lessons 66 and 67 (`core_cm3.h`, the NVIC and SysTick functions).

- [Martin Fowler, "Mocks Aren't Stubs"](https://martinfowler.com/articles/mocksArentStubs.html)
  Fowler's explanation of Meszaros's test double vocabulary: dummy, fake, stub, spy and mock. Use for: lesson 81 and the glossary's test double terms.

- [GCC manual: Warning Options](https://gcc.gnu.org/onlinedocs/gcc/Warning-Options.html)
  Every GCC warning flag, and the group that enables it (-Wall, -Wextra, or none). Use for: lesson 83 and the MISRA quick list.

- [Doxygen manual: usage (doxygen.nl)](https://www.doxygen.nl/manual/doxygen_usage.html)
  The command-line options of doxygen, including -g, which writes a template configuration file, and the rule that a run without a configuration argument looks for a file named Doxyfile. Use for: lesson 79.

### Tools
- [PulseView (sigrok)](https://sigrok.org/wiki/PulseView)
  Logic analyzer viewer with protocol decoders. Use for: viewing Wokwi `.vcd` captures.
- [Falstad CircuitJS](https://www.falstad.com/circuit/) ([source](https://github.com/sharpie7/circuitjs1))
  A free (GPL) browser circuit simulator with voltmeter, ammeter and scope. Built-in examples are listed in `tools/maintainer/circuitjs/setuplist.txt`. Use for: all analogue hands-on work (Part 1 and analogue parts of later lessons).
- [Wokwi parts reference: logic analyzer](https://docs.wokwi.com/parts/wokwi-logic-analyzer) and [pushbutton](https://docs.wokwi.com/parts/wokwi-pushbutton)
  Pin names, attributes and behaviour. Use for: lessons 10, 16 and 60. Check the part page before using any Wokwi part.
- [Wokwi: 74HC595 shift register part](https://docs.wokwi.com/parts/wokwi-74hc595)
  The part type `wokwi-74hc595` and its pin names (DS, SHCP, STCP, MR, OE, Q0 to Q7, Q7S). Use for: lesson 25 and the shift-out project.
- [Wokwi: Clock generator part](https://docs.wokwi.com/parts/wokwi-clock-generator)
  The part type `wokwi-clock-generator`, pin CLK, and the frequency attribute. Use for: lessons 24 and 25 when a free-running clock is needed.
- [Wokwi: debugging in VS Code](https://docs.wokwi.com/vscode/debugging)
  The GDB setup for Wokwi: gdbServerPort in wokwi.toml, the launch.json attach to localhost:3333, the "Start Simulator and Wait for Debugger" command, and the order of starting the simulator and the debugger. Use for: lesson 54 and the GDB reference sheet. Note: the page does not describe watchpoint support, so confirm it in the simulator.
- [Wokwi parts: board-ssd1306](https://docs.wokwi.com/parts/board-ssd1306) and [wokwi-ssd1306 (deprecated)](https://docs.wokwi.com/parts/wokwi-ssd1306)
  Use the board part. Pins GND, VCC, SCL, SDA, address 0x3C. Lesson 61.
- [Wokwi parts: NTC temperature sensor](https://docs.wokwi.com/parts/wokwi-ntc-temperature-sensor)
  Pins VCC, OUT, GND; attributes temperature and beta (default 3950); the beta formula. Lesson 58.
- [Wokwi parts: servo](https://docs.wokwi.com/parts/wokwi-servo) and [buzzer](https://docs.wokwi.com/parts/wokwi-buzzer)
  The servo pins PWM, V+ and GND, and the buzzer pins 1 and 2. Lesson 59.
- [Wokwi guide: logic analyzer](https://docs.wokwi.com/guides/logic-analyzer)
  Channels D0 to D7, the wokwi.vcd file written on stop, and PulseView decoding. Lessons 60 and 62.
- [Wokwi chips API: I2C](https://docs.wokwi.com/chips-api/i2c)
  The I2C callbacks for a custom chip (connect, read, write, disconnect) and the config struct. Use for: lesson 63 and the Lab 3 sensor.
- [Wokwi chips API: getting started](https://docs.wokwi.com/chips-api/getting-started)
  How a custom chip is written and compiled, and where its JSON definition lives. Use for: lesson 63 and the mystery sensor chip.
- [Wokwi: STM32 Blue Pill part](https://docs.wokwi.com/parts/board-stm32-bluepill)
  The part type `board-stm32-bluepill`, its onboard LED on PC13, and the simulation table (USART, EXTI, RCC and AFIO simulated; DMA, IWDG, PWR and RTC not). Use for: lessons 66 to 70 and the simulator limits.
- [Wokwi: KY-040 rotary encoder part](https://docs.wokwi.com/parts/wokwi-ky-040)
  The part type `wokwi-ky-040` and its pins (CLK, DT, SW, VCC, GND). Use for: lesson 71 and the encoder mode.

- [Doxygen manual: documenting the code](https://www.doxygen.nl/manual/docblocks.html)
  The comment blocks, the @brief and @param tags, and the file command. Use for: lesson 79 and the Doxygen comment style on a driver header.

- [Doxygen manual: configuration](https://www.doxygen.nl/manual/config.html)
  The Doxyfile options: PROJECT_NAME, INPUT, RECURSIVE, GENERATE_HTML and OUTPUT_DIRECTORY. Use for: lesson 79. The page does not show the doxygen -g flag in the part read; check doxygen --help on the install.

- [Trunk-based development (trunkbaseddevelopment.com)](https://trunkbaseddevelopment.com/)
  The definition of trunk-based development, with short-lived branches and pull-request review. Use for: lesson 79.

- [MISRA C:2012 rule 21.3 (MathWorks, Polyspace documentation)](https://www.mathworks.com/help/bugfinder/ref/misrac2012rule21.3.html)
  A tool vendor's summary of the MISRA rule that prohibits the stdlib allocation functions. Secondary: the MISRA document itself is the normative text. Use for: lesson 78. Mark as secondary if the lead keeps the source type column.

- [Wokwi CI: getting started](https://docs.wokwi.com/wokwi-ci/getting-started)
  How to run Wokwi in CI: the token, the wokwi-cli and the GitHub Actions example. Use for: lesson 82.

- [Wokwi CI: CLI usage](https://docs.wokwi.com/wokwi-ci/cli-usage)
  Every wokwi-cli option, with its default: --timeout (simulated milliseconds, default 30000), --expect-text, --fail-text, --serial-log-file and --scenario. Use for: lesson 82.

- [Wokwi CI: automation scenarios](https://docs.wokwi.com/wokwi-ci/automation-scenarios)
  The scenario YAML steps (wait-serial, delay, set-control, expect-pin). The page labels the feature alpha. Use for: lesson 82.

- [wokwi/wokwi-ci-action (GitHub)](https://github.com/wokwi/wokwi-ci-action)
  The GitHub Action that runs a Wokwi simulation in a workflow: uses wokwi/wokwi-ci-action@v1, with the token from the WOKWI_CLI_TOKEN secret. Use for: lesson 82.

- [carlosperate/arm-none-eabi-gcc-action (GitHub)](https://github.com/carlosperate/arm-none-eabi-gcc-action)
  Installs the Arm GNU toolchain in a GitHub Actions job, with a pinned release such as 15.3.Rel2. Use for: lesson 82.

- [cppcheck (GitHub)](https://github.com/danmar/cppcheck)
  The static analyser's source, manual and addons folder (addons/misra.py is the MISRA addon). Use for: lesson 83.

- [CMock summary (ThrowTheSwitch, GitHub)](https://github.com/ThrowTheSwitch/CMock/blob/master/docs/CMock_Summary.md)
  How CMock generates a mock from a header, and the _ExpectAndReturn, _IgnoreAndReturn and _Verify functions. Use for: lesson 81. CMock needs Ruby, which the course does not install.

- [KiCad 9.0 documentation: Eeschema (docs.kicad.org)](https://docs.kicad.org/9.0/en/eeschema/eeschema.html)
  The schematic editor: choosing symbols, assigning footprints, the electrical rules check, the netlist and annotation. Verified as the KiCad 9.0.9 manual. Use for: lesson 109.

- [KiCad documentation](https://docs.kicad.org/) and [Phil's Lab (YouTube)](https://www.youtube.com/@PhilsLab)
  Official docs, plus the best practical PCB design channel. Use for: lesson 109.

- [Raspberry Pi Debug Probe](https://www.raspberrypi.com/products/debug-probe/)
  The product page: a complete debug hardware solution for Arm microcontrollers, a USB-to-SWD and USB-to-UART bridge, powered by RP2040. Use for: lesson 121 (the starter kit and the probe wiring). The page gives no price.

- [Raspberry Pi: Debug Probe documentation](https://www.raspberrypi.com/documentation/microcontrollers/debug-probe.html)
  The SWD wiring (three-pin JST-SH and the header pins), and OpenOCD with GDB on port 3333 using interface/cmsis-dap.cfg and target/rp2040.cfg. Use for: lesson 121, moving a Wokwi project to a board. Opened in this build.

- [Raspberry Pi: Pico series documentation](https://www.raspberrypi.com/documentation/microcontrollers/pico-series.html)
  BOOTSEL mode (held while plugging in), drag-and-drop UF2 programming, and picotool. Use for: lesson 121 and the UF2 and BOOTSEL glossary entries. Opened in this build.

- [picotool (Raspberry Pi, GitHub)](https://github.com/raspberrypi/picotool)
  The command-line tool: `picotool info`, `picotool load blink.uf2`, and erase. Use for: lesson 121. Read in this build (the README's usage examples).

- [Raspberry Pi Pico 2 product page](https://www.raspberrypi.com/products/raspberry-pi-pico-2/)
  The RP2350 with dual Cortex-M33 or Hazard3 RISC-V cores at 150 MHz, and "available now from $5" (the price was seen when the lesson was written, 31 October 2026). Use for: lesson 121 (the starter kit). Opened in this build.

- [NUCLEO-F411RE (STMicroelectronics)](https://www.st.com/en/evaluation-tools/nucleo-f411re.html)
  The STM32 Nucleo-64 board with the STM32F411RE, Arduino and ST morpho connectivity, and the on-board ST-LINK debugger. Use for: lesson 121 (the starter kit). The page timed out in this build; the facts came from a search snippet of the same page.

- [sigrok wiki: fx2lafw](https://sigrok.org/wiki/Fx2lafw)
  The open firmware for FX2 and FX2LP logic analyzer clones: which devices are supported, and the 8-probe pin mapping (PB0 to PB7). Use for: lesson 121 (the logic analyzer). The wiki gives no sample rate; check the clone's listing. Opened in this build.

- [Espressif: ESP-IDF Get Started](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/get-started/index.html)
  The official ESP32 framework (ESP-IDF), built with CMake and Ninja. Use for: lesson 121 (next topics: ESP32). Opened in this build.

- [Nordic: nRF54L15 development kit](https://www.nordicsemi.com/Products/Development-hardware/nRF54L15-DK)
  The nRF54L15 is a Bluetooth LE SoC with a 128 MHz Arm Cortex-M33 core. Use for: lesson 121 (next topics: BLE). Opened in this build; no price shown.

- [Embassy: async framework for embedded Rust](https://embassy.dev/)
  Embassy supports STM32 (embassy-stm32), RP2040 (embassy-rp) and the nRF52, nRF53 and nRF91 series. Use for: lesson 121 and lesson 111. Opened in this build.

- [CNX Software: CS32 MCU clone of STM32 in a Blue Pill board](https://cnx-software.com/?p=63676)
  Describes the CS32F103 as compatible with the STM32F103, notes the inconsistent flash size in its datasheet, and quotes readers who had debugging problems (anecdotes, not tests). Use for: lesson 121 (the Blue Pill clone warning). Secondary source.

- [Wokwi for VS Code: getting started](https://docs.wokwi.com/vscode/getting-started)
  Installing the Wokwi extension and requesting a license with F1, then Wokwi: Request a new License. Use for: lesson 1 (license steps).

- [littlefs (GitHub)](https://github.com/littlefs-project/littlefs)
  A small file system for microcontroller flash. Its README: "designed to handle random power failures", with wear leveling over dynamic blocks. Use for: lesson 105 (In real projects).

## Wisdom (Communities)
- [r/embedded](https://www.reddit.com/r/embedded/)
  A large, active subreddit with practitioners. Use for: beginner questions, code critique, "how is this done in industry".
- [Electronics Stack Exchange](https://electronics.stackexchange.com/)
  Strict, high-quality Q&A. Use for: specific circuit and firmware questions.
- [EEVblog forum](https://www.eevblog.com/forum/)
  A long-running electronics engineering community. Use for: hardware and measurement questions.
- [Interrupt community (Slack, linked from the blog)](https://interrupt.memfault.com/)
  Firmware professionals, often including Memfault engineers. Use for: professional practice, debugging, tooling.
- [Zephyr Project community (Discord, mailing lists)](https://www.zephyrproject.org/community/)
  Use for: Zephyr questions and contributing upstream.
- [Raspberry Pi forums: Pico section](https://forums.raspberrypi.com/viewforum.php?f=143)
  Use for: RP2040 and Pico SDK specifics.
- [ST Community](https://community.st.com/)
  Use for: STM32 peripheral and HAL quirks.
- [Embedded.fm podcast](https://embedded.fm/)
  Conversations with embedded engineers. Use for: hearing how practitioners work.

## Gaps
- No high-trust, free, MCU-focused **functional safety** primer found yet (lesson 112). Look for one before writing it.
- The **embedded security** source (lesson 106) still needs to be chosen. Candidates: Arm PSA Certified docs, the Interrupt articles on secure boot.
