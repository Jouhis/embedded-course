# Proposals from the depth expansion of lessons 0051 to 0055

For the lead to merge into `GLOSSARY.md` and `RESOURCES.md`. Formats follow those files.

## Glossary terms (add to the groups shown)

### Peripherals (group: Peripherals)

**Single-cycle IO (SIO)**:
The RP2040 block that holds the GPIO output, output-enable and input registers. Each core reaches it through its IOPORT, so every access takes one cycle, unlike the two-cycle system bus. Its set, clear and XOR aliases change only the bits named in a write.
_Avoid_: GPIO registers (too vague)

**Pad**:
The electrical interface between a chip's internal logic and a package pin. It sets drive strength, pull-up or pull-down, input enable and schmitt trigger.
_Avoid_: Pin (for the electrical circuit only)

**Function select**:
The field in a GPIO's control register that routes the pin to the SIO or to a peripheral such as a UART or PWM. Function 5 is SIO on the RP2040.
_Avoid_: Mux (informal)

**UART**:
A universal asynchronous receiver/transmitter: a peripheral that sends and receives bytes as serial frames, with a start bit, data bits and a stop bit, over a pair of wires at an agreed baud rate.
_Avoid_: Serial port (acceptable for the PC side)

**Baud rate**:
The number of bit periods per second on a serial line. Both ends must agree on it.
_Avoid_: Bit rate (acceptable when parity or framing is not in question)

**FIFO**:
A first-in, first-out hardware buffer between the CPU and a peripheral, such as the UART's 32-entry transmit and receive queues.
_Avoid_: Queue (in hardware contexts)

### Computer architecture / firmware (group: Computer architecture)

**Super-loop**:
A firmware structure where one endless loop calls several service functions in turn, each of which must return quickly. It is the usual pattern for small products that handle several tasks without an RTOS.
_Avoid_: Main loop (too vague)

**Deadline**:
A stored time at which an action must happen next. The loop compares the current time with it, and after the action it advances the stored value from its old value, not from the current time.
_Avoid_: Timeout (when the check repeats)

**Debounce**:
Filtering a mechanical switch's bounce so that one press counts as one event. An integrator debounce climbs and falls with the raw reading and changes state only at the ends of its window.
_Avoid_: Filter (too general)

**Watchpoint**:
A debugger stop that triggers when a memory location's value changes. The Cortex-M0+ has two hardware watchpoints, so a third needs one deleted first.
_Avoid_: Data breakpoint (acceptable in conversation)

**Breakpoint**:
A debugger stop at a code address. The Cortex-M0+ has four hardware breakpoints and unlimited software breakpoints using the BKPT instruction.
_Avoid_: Stop point

**GDB server**:
The program that exposes a target's registers and memory to GDB over a network port or a probe link. In Wokwi it runs inside the simulator on port 3333.
_Avoid_: Debug server (acceptable)

## Resources

No new resources. The sources used in this expansion are already listed in `RESOURCES.md`: the RP2040 datasheet (sections 2.3.1, 2.4.2.4, 2.19, 4.2, 4.6), the Wokwi pushbutton part page, the Wokwi VS Code debugging page, and the Pico SDK 2.3.1 sources.
