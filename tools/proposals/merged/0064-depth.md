# Proposals from the depth pass on lessons 0064, 0065 and lab03

Written by the author of lessons 0064, 0065 and lab03 (depth standard, LESSON-SPEC section 17). The lead merges these into `GLOSSARY.md` and `RESOURCES.md`. Nothing here has been merged. Neither file was edited.

## Glossary additions

Format follows `GLOSSARY.md`: bold term, one or two sentences, `_Avoid_:` line where useful. Group in brackets after each term.

**Deadlock** (Firmware and tools):
A state in which two or more cores or tasks each wait for something only the other can give, so none of them can move. On a multicore RP2040, a core that holds a spinlock and waits for a FIFO message from a core that is spinning on that lock is a deadlock.
_Avoid_: Hang (a hang can have other causes, such as a stuck peripheral)

**DMA (direct memory access)** (Peripherals):
A hardware block that copies data between addresses, such as from memory to a peripheral's data register, without the CPU moving each word. A DMA channel is set up by the CPU, and then runs on its own, normally paced by a DREQ.
_Avoid_: Memcpy in hardware (DMA runs in parallel with the CPU and uses the bus, which memcpy does not)

## Resources additions

Format follows `RESOURCES.md`: a bold-free list item with the title and link, then a line that says what to use it for.

- [Pico SDK: hardware APIs (hardware_gpio, hardware_i2c, hardware_sync, hardware_dma)](https://www.raspberrypi.com/documentation/pico-sdk/hardware.html)
  The GPIO interrupt callback, the I2C blocking calls and their return values (PICO_ERROR_GENERIC on no acknowledge), and the spinlock and interrupt-state helpers in hardware_sync. Use for: lesson 64, lesson 65 and lab 3. Already cited by lessons 60 to 63, and not yet listed here.
