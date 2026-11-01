# Proposals from the depth pass on lessons 0074, 0075 and lab04

Written by the depth-pass author for the lead to merge. Nothing in GLOSSARY.md or RESOURCES.md was edited.

## Glossary proposals (GLOSSARY.md format)

## Computer architecture

**Bus master**:
A device on a bus that can start transfers, such as the CPU or a DMA controller. A slave only answers. A bus can have several masters, and the bus matrix decides which one is served first when they collide.
_Avoid_: Initiator (acceptable in other buses, but not the course term)

## Peripherals

**DMA request**:
The signal a peripheral raises to ask the DMA controller for one transfer, such as a UART that has received a byte. Each request is wired to one DMA channel, and the mapping is in the DMA chapter of the reference manual.
_Avoid_: DMA trigger (informal)

**Active low**:
A signal that is asserted, meaning on or selected, when its pin is driven low. The Blue Pill LED on PC13 is active low, so the level that lights it is 0.
_Avoid_: Inverted (describes the wiring, not the signal's meaning)

**Polling**:
Checking a device's status or a pin's level in a loop, instead of waiting for an interrupt. Simple and deterministic, but the check costs CPU time on every pass, and a short event can be missed between passes.
_Avoid_: Busy-wait (a polling loop that waits for a condition with nothing else to do)

## Firmware and tools

**Hardware abstraction layer (HAL)** is already in GLOSSARY.md as HAL (hardware abstraction layer). Do not add a second entry. Lab 4 uses it for the interface in `app/hal.h` and the board files `hal_<board>.c`.

## Low power

**Stop (STM32F1)**:
A low-power mode in which the main clocks stop, and the SRAM and registers keep their contents. The core resumes after the instruction that entered Stop. An EXTI line can wake it; a timer or ADC interrupt cannot, because their clocks are off.
_Avoid_: Deep sleep (informal; Standby is the deepest mode)

**Standby (STM32F1)**:
The deepest STM32F1 low-power mode. The SRAM contents are lost, and the chip restarts from reset on wake-up, so state must be kept in backup registers or flash.
_Avoid_: Power off (the chip still runs its wake-up logic)

## Resources proposals (RESOURCES.md format)

None. Lessons 0074, 0075 and lab04 cite only sources already listed in RESOURCES.md.
