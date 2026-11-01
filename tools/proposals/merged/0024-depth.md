# Proposals from the depth pass on lessons 0024 to 0028

Written by the depth-pass author for the lead to merge. Nothing in GLOSSARY.md or RESOURCES.md was edited.

## Glossary proposals (GLOSSARY.md format)

## Digital logic

**Metastability**:
A flip-flop state, between 0 and 1, that can follow a setup or hold violation and lasts for a while before the output settles to a valid level.
_Avoid_: Glitch (a short wrong pulse on a signal, which is a different effect)

**Synchroniser**:
Two flip-flops in series on the receiving clock, used to bring an asynchronous input into a clock domain. The first may go metastable, and the second gives it a full clock period to settle.
_Avoid_: Debouncer (which removes contact bounce from a switch, a different problem)

**Master-slave flip-flop**:
The usual construction of an edge-triggered flip-flop: a master latch that is transparent while the clock is low, and a slave latch that is transparent while it is high.
_Avoid_: Two-stage latch (too vague, since a synchroniser is also two stages)

**Enable (register)**:
A control input that makes a register load on a clock edge only when it is high. It is built from a multiplexer that feeds the flip-flop's own output back to its input when the enable is low.
_Avoid_: Write enable (used for memory and peripheral writes, which add an address decode)

## CPU architecture

**Bus transfer**:
One use of a bus: the CPU drives an address, the target responds, and one word of data moves. Every instruction needs at least one transfer, the fetch.
_Avoid_: Bus cycle (acceptable, but a transfer can take several clock cycles through wait states)

**Prefetch unit (PFU)**:
The Cortex-M3 block that fetches instructions ahead of the one being executed. It buffers up to three word fetches and forwards PC-relative branches early.
_Avoid_: Prefetch buffer (only the storage part of the unit)

**ICode bus**:
The Cortex-M3 AHB-Lite bus for instruction and vector fetches from the code space, 0x00000000 to 0x1FFFFFFF.
_Avoid_: Instruction bus (too general, since the System bus also fetches instructions)

**DCode bus**:
The Cortex-M3 AHB-Lite bus for data and debug accesses to the code space, 0x00000000 to 0x1FFFFFFF, which is where literal pools sit.
_Avoid_: Data bus (too general, since the System bus also carries data)

**System bus**:
The Cortex-M3 AHB-Lite bus for SRAM, peripherals and the other system space, 0x20000000 to 0xDFFFFFFF and 0xE0100000 to 0xFFFFFFFF. Instruction fetches from it are registered, so they are slower.
_Avoid_: Memory bus (too vague)

**IOPORT**:
The single-cycle port on each RP2040 Cortex-M0+ core, used by the SIO block for GPIO. It is a separate bus from the core's AHB-Lite port and is not connected to the main bus.
_Avoid_: GPIO bus (the SIO is more than GPIO)

## Resource proposals (RESOURCES.md format)

Add under "Vendor primary sources", as it fits:

- [Texas Instruments SN74HC595 datasheet](https://www.ti.com/lit/ds/symlink/sn74hc595.pdf)
  The 8-bit shift register with output latch. Use for: lesson 25 (the pin names SER, SRCLK, RCLK, SRCLR, OE and QH', section 8.1 on positive-edge clocks, the one-pulse-ahead note when the clocks are tied, and Table 8-1). Checked by text extraction on 2026-10-31.

## Corrections to existing entries (for the lead to apply)

- RESOURCES.md, Arm Cortex-M3 TRM entry: "the Harvard buses (§1.1 and §12)". The Harvard statement is in section 1.2.1 (Processor core), not 1.1 (About the processor). Section 12.1 is the overview of the four bus interfaces. Use "§1.2.1 and §12".
- RESOURCES.md, Arm Cortex-M3 TRM entry: "the three-stage pipeline (§1.3)" is correct. Section 1.3 lists the Fetch, Decode and Execute stages.
- GLOSSARY.md, Harvard architecture entry: correct as written. It says the Cortex-M3 is a Harvard design, which section 1.2.1 states.
- Lesson 25 and lesson 27 both rely on the Wokwi 74HC595 page for the pin names, which matches. The Wokwi page does not describe the clock edges, so the TI datasheet is the source for those.
- Harris and Harris chapter numbers (chapter 2 for combinational logic, chapter 3 for sequential logic) were used in lessons 23 to 25 but could not be checked here: the ScienceDirect page was not fetched. The lead should confirm them against the book.
