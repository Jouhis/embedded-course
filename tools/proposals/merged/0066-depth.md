# Proposals from lessons 0066 to 0070 (depth expansion)

## Glossary additions

Group: STM32 and CMSIS (add after **Load address**, or in the Firmware and tools group if preferred)

**Run address**:
The address where a section's variables are read and written while the program runs. For .data on Cortex-M it is in RAM, and the startup code copies the initial values there from the load address in flash.
_Avoid_: Virtual address (informal), destination address

Group: Peripherals

**Write-1-to-clear (W1C)**:
A status bit that reads 1 while its event is pending, and that is cleared by writing a 1 to it. Writing a 0 leaves the bit unchanged, so a read-modify-write is not needed to clear it.
_Avoid_: Write-to-clear (does not say which value clears the bit)

**Free-running counter**:
A counter that increases on every tick and wraps at its maximum value, and that is used as an index only after masking. Differences of two such counters are correct across the wrap when they are computed in the counter's own width.
_Avoid_: Wrapping index (a masked counter is an index, the counter itself is not)

Group: Communication

**Overrun error (ORE)**:
A USART status flag set when a new byte arrives before the previous one has been read, so the older byte is lost. Clearing it needs a read of the status register followed by a read of the data register.
_Avoid_: Buffer overflow (that is a software ring buffer condition, which is a different event)

Group: Electronics

**Active low**:
A signal or LED that is asserted, or lit, when its pin is at logic 0. An LED on the Blue Pill's PC13 is active low, because it lights when the pin is driven low.
_Avoid_: Inverted (ambiguous: says the logic is flipped, not which level is the active one)

**Active high**:
A signal or LED that is asserted, or lit, when its pin is at logic 1. The external LED on PB0 in lesson 67 is active high.
_Avoid_: Non-inverted (says what the level is not)

Group: STM32 and CMSIS

**HAL MSP function**:
A HAL hook, named with the MspInit suffix, that the HAL calls from a peripheral's init to do chip-specific setup: the clock enable and the alternate-function pin configuration. It is weak, so a project can define it in its own file. The HAL's name for it is MSP, for MCU support package.
_Avoid_: MSP alone (the glossary's MSP is the main stack pointer)

## Resources

No new sources were needed. The facts checked in this batch came from the course's own third_party/ headers and HAL source, the Arm GNU toolchain run on the solution objects, and the Wokwi Blue Pill part page. The RM0008 PDF could not be fetched in this session (the request timed out twice), so its register-level statements are checked only against the headers and the HAL source.
