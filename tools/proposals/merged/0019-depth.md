# Proposals from lessons 0019 to 0023 (depth pass: Number systems to Combinational logic)

Do not merge these yourself: the lead adds them to GLOSSARY.md and RESOURCES.md in the exact formats used there.

## GLOSSARY.md additions

Add these under the groups named in each heading. Anchors are the term lowercased, with non-alphanumerics replaced by `-`.

### Electronics

Place **Propagation delay** after **Logic level**.

**Propagation delay**:
The time a gate or pin takes to change its output after an input changes. A datasheet gives it in nanoseconds, and it grows as the supply voltage falls. A test bench must wait for it before it reads an output.
_Avoid_: Delay (too vague: it could mean any wait), latency (a term for whole pipelines and buses)

### Computer architecture

Place **Ripple-carry adder** after **Full adder**, and **One-hot** after **Decoder**.

**Ripple-carry adder**:
A row of full adders in which the carry out of each stage feeds the carry in of the next. Its delay grows with the width, because the carry must cross every stage.
_Avoid_: Carry chain (informal), serial adder (a different circuit that adds one bit per clock)

**One-hot**:
A code in which exactly one bit is 1. A decoder's outputs are one-hot, so each output can select one device.
_Avoid_: Enable line (an enable is an input that switches a block on or off)

### Embedded C

Add after **Integer promotion**, in this order: **Sign extension**, **Binary point**, **Saturating arithmetic**.

**Sign extension**:
Copying a signed value to a wider type by filling the new upper bits with the value of the old sign bit, so the number does not change. Copying an unsigned value fills the upper bits with zeros instead.
_Avoid_: Widening (which is the general term for any wider copy)

**Binary point**:
The position that separates the integer bits from the fraction bits in a fixed-point number. In fixed point it stays in one place, and the programmer keeps track of it.
_Avoid_: Decimal point (correct only for decimal numbers)

**Saturating arithmetic**:
Arithmetic that clamps a result to the largest or smallest value the type holds, instead of wrapping around. It is the usual choice for control loops and filters.
_Avoid_: Clipping (informal), overflow protection (too vague)

## RESOURCES.md additions

Add under **Vendor primary sources**, after the RP2040 hardware design entry:

- [SN74HC00 datasheet, quad 2-input NAND gate (Texas Instruments)](https://www.ti.com/lit/ds/symlink/sn74hc00.pdf)
  A real NAND chip. Use for: the gate function (section 8.1, Y = A · B in positive logic), the function table (Table 8-1) and the propagation delay (section 6.7, Switching Characteristics). Lesson 22.

## Facts checked for these lessons (no new source needed)

The depth pass checked these against the sources already in RESOURCES.md, using the RP2040 datasheet text, the Arm Cortex-M comparison table and the Pico SDK 2.3.1 headers:

- RP2040 datasheet section 2.1.2: aliases at +0x1000 (XOR), +0x2000 (SET), +0x3000 (CLR). The SIO block has no bus-level aliases.
- RP2040 datasheet section 2.3.1.5: the SIO integer divider is an 8-cycle divider, and the SDK can map C's `/` and `%` to it.
- RP2040 datasheet section 2.8.3.2: the bootrom uses the IEEE single and double formats, with denormals treated as zero and only round-to-nearest.
- Arm Cortex-M comparison table: FPU is "No" for M0, M0+, M1, M23 and M3, and an option from M4 onward. Hardware divide is "No" for M0 and M0+, and "Yes" for M3.
- Pico SDK 2.3.1: `PICO_DEFAULT_LED_PIN` is 25, `SIO_BASE` is 0xD0000000, the SIO GPIO offsets are OUT 0x10, SET 0x14, CLR 0x18, XOR 0x1C.
