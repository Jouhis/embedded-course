# Proposals from the depth pass on lessons 0061, 0062 and 0063

Written by the depth-pass author for the lead to merge. Nothing in GLOSSARY.md or RESOURCES.md was edited.

## Glossary proposals (GLOSSARY.md format)

## Electronics

**Falling edge**:
The change of a signal from 1 to 0. A negative-edge flip-flop copies its input on this edge, and an SPI device sampling on the second edge of an idle-low clock uses it.
_Avoid_: Trailing edge (acceptable in timing diagrams)

## Peripherals

**Glyph**:
One character's bitmap in a font, such as the five column bytes of a 5 by 7 capital L. Drawing a character means copying its glyph into the display memory.
_Avoid_: Character (which is the code point, not its picture), symbol

**Display RAM (GDDRAM)**:
The memory inside a display controller that holds the picture, one bit per pixel. The controller reads it to drive the panel, so the microcontroller writes only when the picture changes.
_Avoid_: Framebuffer (which is the microcontroller's copy, not the controller's memory)

**Control byte**:
The first byte of an SSD1306 I2C write. Its top bit, Co, says whether more control bytes follow, and bit 6, D/C#, says whether the bytes after it are commands (0) or display data (1).
_Avoid_: Command byte (which is the byte that follows the control byte, not the control byte itself)

**Page addressing**:
The SSD1306 memory mode in which the column pointer wraps to the start of the same page at the end of a row, and the page pointer does not change. The mode is selected by 0x20 0x02, and the reset default is page addressing.
_Avoid_: Row mode (the datasheet does not use it)

**Full duplex**:
A serial link in which data moves in both directions at once. SPI is full duplex: each clock pulse shifts one bit out of the master and one bit into it.
_Avoid_: Two-way (too vague, since I2C is also two-way but takes turns)

**MOSI and MISO**:
The two SPI data lines. MOSI (master out, slave in) carries data from the master to the device, and MISO (master in, slave out) carries it back. A device that only receives can leave MISO unconnected.
_Avoid_: SDI and SDO (other names for the same lines, used by some device datasheets)

**Transmit FIFO**:
A small hardware queue in a serial peripheral that holds bytes waiting to be shifted out. The RP2040's SPI has an 8-entry transmit FIFO, so the CPU can queue several bytes before the peripheral sends them.
_Avoid_: Buffer (which is software, in RAM)

**Busy flag**:
A status bit that a peripheral sets while it is still shifting a byte. Waiting for it to clear before a chip select or latch changes is the rule that keeps the last bit from being cut short.
_Avoid_: Ready flag (which often means the reverse, that the peripheral can accept more data)

**Bit-bang**:
Driving a serial protocol by setting and clearing GPIO pins in software, one bit at a time. It works on any pins, but the clock is only as steady as the code, and every edge costs CPU time.
_Avoid_: Software SPI (acceptable, but bit-bang is also used for I2C and UART)

**Bus master**:
The device on a bus that generates the clock and starts each transfer. On I2C and SPI, the microcontroller is the master, and the sensors or displays on the bus are the devices.
_Avoid_: Controller (which the SSD1306 datasheet uses for the display chip, a different meaning)

## Glossary anchors used by these lessons

The lessons link to these new entries by anchor: falling-edge, glyph, display-ram-gddram, control-byte, page-addressing, full-duplex, mosi-and-miso, transmit-fifo, busy-flag, bit-bang, bus-master. The existing entries used are i2c, spi, framebuffer, chip-select-cs, repeated-start, register-pointer, data-ready-flag, device-driver, two-s-complement, callback, pull-up-resistor, shift-register, rising-edge, clock-polarity-and-phase-cpol-cpha and logic-analyzer. Lesson 0062 links bit-bang, full-duplex, mosi-and-miso and transmit-fifo; lesson 0061 links control-byte, page-addressing and glyph.

## Resource proposals (RESOURCES.md format)

### Vendor primary sources

- [MC74HC595A 8-bit shift register with output latches (onsemi)](https://www.onsemi.com/pdf/datasheet/mc74hc595a-d.pdf)
  The 74HC595 datasheet from onsemi. The pin descriptions say that a low-to-high transition on the shift clock shifts the serial input in, and a low-to-high transition on the latch clock copies the shift register to the outputs. Use for: lesson 25 and lesson 62 (the mode 0 choice and the latch timing). The PDF was downloaded and its pin descriptions were read in this pass; the page numbers were not recorded.

## Notes for the lead

- SSD1306 datasheet (already in RESOURCES) was checked in this pass for sections 8.1.3, 8.1.5, 8.1.5.1, 8.7, 10.1.1, 10.1.2, 10.1.3, 10.1.8, 10.1.11, 10.1.13, 10.1.14, 10.1.18 and 10.2.3. The PDF text is extracted by a simple parser, so exact wording may differ from the printed page.
- The Pico SDK spi.c line numbers in lesson 0062 are: spi_init at lines 21 to 34 (mode 0 at line 26), spi_set_baudrate at lines 42 to 74 (the two search loops at 51 to 64), and spi_write_blocking at lines 107 to 125 (it waits for the busy flag before it returns).
- Lesson 0062's old text said spi_write_blocking returns before the last bit has left. In SDK 2.3.1 it does not: it waits for the busy flag. The lesson now says so. The solution's explicit spi_is_busy loop repeats that wait and is harmless. The project was left unchanged.
- Lesson 0061's old text said the panel has 1024 pixels. A 128 by 64 panel has 8192 pixels, and the framebuffer is 1024 bytes. Fixed in the subtitle and the text.
- Lesson 0062's old text said the 74HC595 latches on the rising edge of its chip select. It latches on STCP, a separate pin. The project uses GP17 as STCP, which it calls the latch and chip select. Fixed in the text.
- Pico SDK i2c_write_blocking returns the byte count, or PICO_ERROR_GENERIC when no device acknowledges the address (i2c.h, return notes). Lesson 0063 now says so.
