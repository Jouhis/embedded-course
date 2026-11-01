# Proposals from the depth pass on lessons 0056 to 0060

Written by the depth-pass author for the lead to merge. Nothing in GLOSSARY.md or RESOURCES.md was edited.

## Glossary proposals (GLOSSARY.md format)

## Firmware and tools

**Switch-based state machine**:
A state machine written as a switch on the state, with an if or nested switch on the event inside each case. The rules read like the diagram, but a missing event for a state is easy to overlook.
_Avoid_: Nested-if machine (too vague)

**Table-driven state machine**:
A state machine whose rules are a static const two-dimensional array indexed by state and event, with one dispatch function that applies them. A missing cell is visible from the table's shape.
_Avoid_: Lookup-table machine (the table is a transition table; see Transition table)

**Dispatch (state machine)**:
The function that takes the current state and one event, looks up the next state, and applies the change: it prints the transition, updates the outputs and restarts the timer. It runs once per event.
_Avoid_: Dispatcher (in the RTOS sense, which is the scheduler; see Scheduler)

## Peripherals

**GPIO bank**:
A group of GPIO pins that share one interrupt line to the NVIC. On the RP2040, bank 0 holds GPIO 0 to 29 and raises IRQ 13 (IO_IRQ_BANK0), so one handler serves every pin in the bank.
_Avoid_: Port (the STM32 and other vendors use port for the same grouping, with different widths)

**GPIO callback (SDK)**:
A function registered with the Pico SDK through gpio_set_irq_enabled_with_callback(). The SDK's shared bank handler finds the pin with the event, acknowledges it, and calls the callback with the pin number and the event mask.
_Avoid_: Interrupt handler (the callback runs inside the ISR context that the SDK owns)

**Free-running sampling (ADC)**:
An ADC mode in which the converter starts a new conversion on its own at a fixed rate, set by a pacing timer, and the results go to a FIFO or the result register. The CPU reads the latest value or drains the FIFO, instead of starting each conversion.
_Avoid_: Continuous mode (vendor-specific)

**Effective number of bits (ENOB)**:
The number of bits of a real converter's output that are useful once noise and distortion are counted. It is measured with a test tone and is lower than the nominal resolution. The RP2040 ADC has 12 bits and a typical ENOB of 8.7.
_Avoid_: Resolution (which is the nominal number of codes)

## Communication

**Master (I2C)**:
The device that starts every I2C transaction and generates the clock. The NXP specification (UM10204 rev. 7) calls it the controller, and the RP2040 datasheet calls it the master.
_Avoid_: Host (that is a computer, not a bus role)

**Clock stretching**:
A target holds SCL low to pause a transfer until it is ready. The master must wait until the line is released. Most simple sensors cannot stretch the clock because they have no SCL driver.
_Avoid_: Wait state (a general term for a processor pausing)

## Resources proposals (RESOURCES.md format)

## Peripherals and hardware

- [Wokwi parts: MPU6050](https://docs.wokwi.com/parts/wokwi-mpu6050)
  The MPU6050 part: pins VCC, GND, SCL, SDA, AD0 and INT, the default address 0x68, and 0x69 when AD0 is connected to VCC. Use for: lesson 60.
- [Pico SDK hardware API: hardware.html (raspberrypi.com)](https://www.raspberrypi.com/documentation/pico-sdk/hardware.html)
  The hardware-block reference, with the GPIO interrupt, ADC, I2C and PWM sections. Use for: lessons 57, 58 and 60, where the page anchors (group_hardware_gpio, hardware/adc.h and hardware/i2c.h) are cited.
