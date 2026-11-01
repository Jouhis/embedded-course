# Proposals from the depth pass on lessons 0044, lab02, 0045 and 0046

Written by the depth-pass author for the lead to merge. Nothing in GLOSSARY.md or RESOURCES.md was edited.

## Glossary proposals (GLOSSARY.md format)

## Firmware and tools

**Application note**:
A short vendor document that shows one correct way to use a block, such as a recommended circuit, a power-up sequence or a peripheral setup. It is not a specification, so check its register values against the datasheet.
_Avoid_: Reference design (the circuit itself, which an application note may describe)

**Datasheet**:
The vendor's description of a chip: pins, electrical limits, clocks and the registers of each peripheral. Where a reference manual exists, it holds the longer register descriptions.
_Avoid_: Spec sheet (informal)

**Silicon revision**:
A version of the physical chip, marked by a letter or number such as B0, B1 or B2, which the vendor uses when it fixes a bug. Two parts with the same name can differ in revision.
_Avoid_: Chip version (too vague, since a bootrom version is a different number)

**Density (STM32F1)**:
The flash size class of an STM32F1 part: medium density (8 and B suffixes) or high density (C, D and E). Errata sheets and some features differ between densities.
_Avoid_: Size (too vague, since it also means package size)

## Embedded C

**Fixed-width integer type**:
An integer type from `<stdint.h>` with an exact width, such as uint8_t (8 bits) or uint32_t (32 bits). Its width is part of the contract with a register or a wire format.
_Avoid_: int (which is at least 16 bits and has no fixed width)

**Modulo arithmetic**:
Unsigned arithmetic in which a result above the type's largest value wraps: the value is taken modulo 2 to the power N, where N is the width. For uint8_t, 300 becomes 44.
_Avoid_: Overflow (for unsigned types, which wrap by definition; reserve overflow for the undefined signed case)

**Static storage duration**:
The lifetime of an object that exists for the whole run of the program and is initialised once before main. A static local keeps its value between calls.
_Avoid_: Global (which is about scope, not lifetime)

**Internal linkage**:
The property of a file-scope object or function declared static, so that other translation units cannot refer to its name.
_Avoid_: Private (informal; C has no private)

**Preprocessor**:
The stage that runs before the compiler and handles lines that begin with #, such as #include and #define. It works on text and does no type checking.
_Avoid_: Compiler (the preprocessor is one stage of it)

**Macro**:
A name that the preprocessor replaces with text. A macro such as GPIO_BSRR_BR13 is expanded before the compiler sees the code.
_Avoid_: Function (a macro is substitution, with no call and no type checking)

**Literal pool**:
A small table of constants, such as 32-bit addresses, placed in flash near the code that uses it. A PC-relative ldr reads an entry, because Thumb-2 cannot hold a 32-bit constant in one instruction.
_Avoid_: Constant table (which is a program's own data table, not compiler-generated)

**Read-only data (.rodata)**:
The linker section that holds const objects and string literals. On the course's STM32 linker script it is placed in FLASH.
_Avoid_: Constant data (which also describes .data after its initial values are copied)

## Glossary anchors used by these lessons

The lessons link to these existing entries by anchor: errata-sheet, watchdog, integer-promotion, undefined-behaviour, unsigned-wraparound, volatile, critical-section, linker-script, base-address. The new entries above add the anchors application-note, datasheet, silicon-revision, density-stm32f1, fixed-width-integer-type, modulo-arithmetic, static-storage-duration, internal-linkage, preprocessor, macro, literal-pool and read-only-data-rodata.

## Resource proposals (RESOURCES.md format)

### Language and build references

- [pico-sdk watchdog.c (Raspberry Pi, GitHub)](https://github.com/raspberrypi/pico-sdk/blob/master/src/rp2_common/hardware_watchdog/watchdog.c)
  The SDK's watchdog code, pico-sdk 2.3.1: _watchdog_enable() multiplies the delay by WATCHDOG_XFACTOR, which is 2 on the RP2040 (errata RP2040-E1). Use for: lesson 0044 (the code, line by line). The file was read from the local SDK 2.3.1 copy in this pass; the GitHub URL is the same file on the master branch.

### Vendor primary sources

- [STM32F1 medium-density errata sheet (ST, DocID 14574)](https://www.st.com/en/microcontrollers-microprocessors/stm32f1-series/documentation.html)
  The errata for STM32F101x8/B, STM32F102x8/B and STM32F103x8/B medium-density parts. The title comes from a search result, not from an opened copy. The page link is the ST F1 documentation index; open it and confirm the exact sheet and current revision before the link is used as a primary source. Use for: lesson 0044 (which errata sheet a Blue Pill needs). Not yet verified in this pass.

## Notes for the lead

- ES0340 is the high-density errata sheet (STM32F101xC/D/E and STM32F103xC/D/E), and the earlier 0044 text already said it is the wrong sheet for a Blue Pill. What changed in 0044 is the medium-density sheet's title, which now comes from a search result and not from an opened copy.
- RP2040 datasheet section 4.7.2 gives the watchdog tick as nominally 1 µs. The PDF text drops the micro sign and reads "1s"; the SDK's watchdog.h says the watchdog gets a 1 MHz clock.
- The RP2040 datasheet's hardware design example is cited in section 2.16.3 (crystal startup delay), not 2.15.2.2 as the earlier lesson text said.
