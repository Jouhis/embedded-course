# Proposals from the depth pass on lessons 0039 to 0043

Written by the depth-pass author for the lead to merge. Nothing in GLOSSARY.md or RESOURCES.md was edited.

## Glossary proposals (GLOSSARY.md format)

## Electronics and clocks

**Crystal oscillator (XOSC)**:
A quartz crystal and its driver circuit, which give an accurate reference clock. Software must start it and wait for it to settle before the clock is used.
_Avoid_: Crystal (alone, when a clock source is meant)

**Ring oscillator (ROSC)**:
An on-chip oscillator made from a loop of logic gates. It needs no external part and runs from power-up, but its frequency moves with voltage and temperature, so it is only approximately known.
_Avoid_: RC oscillator (the STM32 HSI is also an RC design, so the name does not tell the two apart)

**HSI (high-speed internal oscillator)**:
The STM32F1's internal 8 MHz oscillator. The system clock uses it straight after reset.
_Avoid_: Internal clock (too broad: the RP2040 also has internal oscillators)

**HSE (high-speed external oscillator)**:
The STM32F1's external crystal input. The header limits it to 4 to 16 MHz. The Blue Pill uses an 8 MHz crystal.
_Avoid_: External clock (also used for a clock signal driven from outside the chip)

**VCO (voltage-controlled oscillator)**:
The high-frequency oscillator inside a PLL. The feedback divider sets its frequency, and it must stay in its legal range (750 to 1600 MHz on the RP2040). It is not the clock the core runs from.
_Avoid_: System clock (the output after the post-dividers is the system clock)

**Post-divider**:
A divider after the VCO in a PLL. It sets the output frequency that the clock tree uses, and on the RP2040 there are two of them, POSTDIV1 and POSTDIV2.
_Avoid_: Output divider (acceptable, but this course uses post-divider)

**SystemCoreClock**:
The CMSIS variable that holds the core clock frequency in hertz. Call SystemCoreClockUpdate() after any clock change, so the variable matches the registers.
_Avoid_: HCLK (the same frequency under ST's name, but the variable is the one code reads)

**SWS (system clock switch status)**:
The RCC_CFGR field, bits 3 and 2 on the STM32F1, that reports which source drives the system clock: 0 for HSI, 4 for HSE and 8 for the PLL.
_Avoid_: Clock source select (that is SW, the request, which is a different field)

## Firmware and tools

**Section (linker)**:
A named group of bytes in an object or ELF file, such as .text, .data or .bss. The linker places each section as one unit, and gives it a run address and a load address.
_Avoid_: Segment (a program-header term, not the same thing)

**.data section**:
The section for initialised writable globals. Its run address is in RAM, and its starting bytes are stored in flash at the load address, from which startup code copies them.
_Avoid_: Initialised data (acceptable in prose, but use .data for the section)

**.bss section**:
The section for zero-initialised globals. Startup code clears it, and no bytes for it are stored in flash.
_Avoid_: Zero-initialised data (acceptable in prose, but use .bss for the section)

**Preprocessor**:
The first build stage. It expands #include lines and macros as text, before the compiler runs, and it knows nothing about types or registers.
_Avoid_: Compiler (the compiler is the next stage)

**Object file (.o)**:
The assembler's output: machine code and data for one source file, with symbols whose final addresses the linker has not yet set.
_Avoid_: Binary (an object file is not a runnable image)

**Map file**:
The text file the linker writes, which lists each section and symbol with its address and load address. The STM32 template writes it as blink.map.
_Avoid_: Symbol table (the ELF file holds the symbol table; the map file is a report)

**Intel HEX**:
A text format that records each byte with its address, so a programmer can write a chip from it. The STM32 template makes one with objcopy.
_Avoid_: Hex file (ambiguous with a hexadecimal number)

**Startup code**:
The assembly that runs from reset, before main(). It sets the stack, calls the clock setup, copies .data from flash to RAM, clears .bss, and calls the C library's initialisers and then main.
_Avoid_: Boot code (which often means the bootrom or boot2)

**Default_Handler**:
The infinite loop that every unused vector table entry points at. A debugger that stops there usually means an interrupt or fault had no handler of its own.
_Avoid_: Hard fault (a different handler)

**Thumb bit**:
Bit 0 of an address in the vector table or a function pointer. It is set for Thumb code, and the Cortex-M core runs only Thumb code.
_Avoid_: Odd address (the address itself is even; the bit marks the code type)

**Bootrom**:
The RP2040's ROM code, which runs first after reset. It starts the second-stage bootloader, and it accepts UF2 files over USB.
_Avoid_: BIOS (a PC term)

**Second-stage bootloader (boot2)**:
The RP2040 code that configures the external flash interface. The bootrom copies it into SRAM and runs it, and it is the only job of that stage.
_Avoid_: Bootloader (too broad: the UF2 bootloader is also in the bootrom)

**Reset value**:
The value a register holds after reset, given in the register's table in the reference manual. Header files do not carry reset values.
_Avoid_: Default value (a software default is set by code, not by the chip)

**Reference manual**:
The vendor document that specifies each peripheral's registers, bit fields and reset values. It has priority over the device header, and the errata sheet lists where the chip differs from it.
_Avoid_: Datasheet (the datasheet covers electrical limits and pinout, the reference manual covers registers)

**System Control Block (SCB)**:
The block of Cortex-M core registers, at 0xE000ED00 on the Cortex-M3, that holds the fault status registers, the vector table offset register and system control bits.
_Avoid_: System control register (the SCB is a block of several registers)

**Configurable fault status register (CFSR)**:
The SCB register at offset 0x28 that packs the MemManage, BusFault and UsageFault status bits into three byte-wide groups.
_Avoid_: Fault register (ambiguous: there is also HFSR)

**MemManage fault**:
The Cortex-M3 fault for memory protection violations, raised by the MPU. The M3 MPU is optional, and the STM32F103 has none.
_Avoid_: MPU fault (the MPU is the unit, MemManage is the exception)

**BusFault**:
The Cortex-M3 fault for errors the bus reports back to the core, such as an access to an address with no device behind it.
_Avoid_: Bus error (acceptable in prose, but BusFault is the exception name)

**UsageFault**:
The Cortex-M3 fault for instruction-level problems, such as an undefined instruction or an unaligned access, when that fault is enabled.
_Avoid_: Software fault (too vague)

## Resource proposals (RESOURCES.md format)

None. Every source the depth pass checked is already in RESOURCES.md: the RP2040 datasheet (sections 2.2, 2.3.1.7, 2.4.2.5, 2.4.6.1, 2.7, 2.8.1, 2.8.1.3, 2.8.4, 2.15, 2.18 and Appendices A and B were read in the local copy), the Pico SDK 2.3.1 sources, and the ST CMSIS device sources. Not checked in this pass: RM0008 and PM0056 could not be downloaded, so no section of either is cited. The Arm Cortex-M3 TRM (DDI0337G) was downloaded but its text was not extracted.
