# Mission: Embedded Systems Development

## Why
Learn to write firmware. That means being able to read a schematic and a reference manual, write and debug C for a microcontroller, and explain interrupts, RTOS design and communication protocols clearly.

## Success looks like
- Can explain how a Cortex-M CPU executes code, from logic gates up to the vector table and an interrupt entry
- Can size a resistor, MOSFET or voltage divider from a datasheet and justify the choice
- Can bring up GPIO, UART, I2C, SPI, ADC, PWM and timers on an RP2040 and an STM32, both with registers and with the vendor SDK or HAL
- Can write a portable, unit-tested driver behind a hardware abstraction layer (HAL)
- Can build a multi-threaded application on FreeRTOS and on Zephyr, and explain the trade-offs
- Has finished the capstone: a thermal controller with tests and CI

## Constraints
- Already programs; new to electronics, so electronics fundamentals need extra care
- No physical hardware required: everything runs in Wokwi inside VS Code (Windows 11)
- Self-paced, one short lesson at a time

## Out of scope
- Arduino framework (we use plain C with vendor SDKs, as industry does)
- FPGA and HDL design
- Deep analogue and RF design
- Embedded Linux beyond the overview lesson
