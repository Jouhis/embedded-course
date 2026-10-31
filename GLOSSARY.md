# Embedded Systems Glossary

The canonical vocabulary of this course, from electronics through CPU architecture to firmware. Every lesson uses these terms exactly as defined here, and avoids the listed aliases.

> Authors: add a term the first time a lesson defines it, in the right group. Keep each definition to one or two sentences and use already-defined terms inside definitions. Revise in place; never leave stale entries.

## Electronics

**Voltage (V)**:
The difference in electric potential between two points; the "push" that drives current through a circuit, measured in volts.
_Avoid_: Power (as a synonym), "juice"

**Current (I)**:
The rate of charge flowing past a point, measured in amperes (A).
_Avoid_: Amperage, power

**Resistance (R)**:
A component's opposition to current, measured in ohms (Ω). Related to voltage and current by Ohm's law, V = I × R.
_Avoid_: Impedance (reserve that for AC)

**Ground (GND)**:
The reference node that all voltages in a circuit are measured against, defined as 0 V.
_Avoid_: Earth (unless literally earthed), negative

**Pull-up resistor**:
A resistor connecting a signal line to the supply voltage, so the line reads logic high when nothing actively drives it low.
_Avoid_: Bias resistor

**Open-drain output**:
An output that can only pull a line low, or release it (high impedance). A pull-up resistor supplies the high level.
_Avoid_: Open-collector (that's the BJT equivalent, acceptable only when talking about BJTs)

**Logic level**:
The voltage ranges a device interprets as 0 (low) or 1 (high), e.g. 3.3 V logic.
_Avoid_: Signal voltage

**Power (P)**:
The rate at which a component uses energy, measured in watts (W). For a resistor, P = V × I, which is the same as I² × R or V² ÷ R.
_Avoid_: Energy (energy is power multiplied by time, in joules)

**Energy**:
Power multiplied by time, measured in joules (J). One watt for one second is one joule.
_Avoid_: Power (as a synonym)

**Power rating**:
The continuous power a component may dissipate, given by its datasheet at a stated ambient temperature. Above that temperature the allowed power falls (derating).
_Avoid_: Wattage (informal, acceptable in conversation only)

**Series connection**:
Components joined end to end, so they carry the same current. Their resistances add.
_Avoid_: Chain

**Parallel connection**:
Components joined across the same two nodes, so they have the same voltage. Their conductances add.
_Avoid_: Branch (a branch is one path in a parallel network, not the connection itself)

**Node**:
A point in a circuit where two or more wires join.
_Avoid_: Junction (acceptable only for a transistor's junction)

**Kirchhoff's current law (KCL)**:
The sum of the currents entering a node equals the sum leaving it. It is charge conservation applied to a node.
_Avoid_: Kirchhoff's first law (acceptable in older texts)

**Kirchhoff's voltage law (KVL)**:
Around any closed loop, the sum of the voltage rises and drops is zero.
_Avoid_: Kirchhoff's second law (acceptable in older texts)

**Voltage divider**:
Two resistors in series across a supply. The midpoint voltage is a fraction of the supply, set by the ratio of the resistors.
_Avoid_: Potential divider (acceptable in older texts)

**Load**:
Anything that draws current from a point in a circuit. A load on a divider's midpoint lowers its output voltage.
_Avoid_: Consumer (informal)

**Diode**:
A component that passes current in one direction. Above its forward voltage it conducts strongly, and below it almost nothing flows.
_Avoid_: Rectifier (a use of a diode, not the part)

**Forward voltage (Vf)**:
The voltage across a conducting diode or LED, which is roughly constant over a wide current range. About 0.6 to 0.7 V for silicon diodes; about 1.8 to 2.2 V for a red LED.
_Avoid_: Drop (acceptable only when naming the voltage across a diode)

**LED (light-emitting diode)**:
A diode that emits light when current flows through it. Its brightness and life depend on the current, not the voltage.
_Avoid_: Light (too vague)

**Current-limiting resistor**:
A resistor in series with a diode or LED, sized so that R = (V_supply − V_f) ÷ I sets the current.
_Avoid_: Ballast resistor (a term for gas-discharge lamps)

**E12 series**:
The standard preferred values for resistors: 1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8 and 8.2, each times a power of ten, from IEC 60063.
_Avoid_: E12 (use the full name at first mention)

**Multimeter**:
A meter that measures voltage, current or resistance. A voltmeter is connected in parallel, and an ammeter in series.
_Avoid_: Voltmeter (a multimeter in voltage mode only)

**Ammeter**:
A meter for current, connected in series with the component. Its resistance is very low, so it must never be connected across a supply.
_Avoid_: Current meter (acceptable in informal use)

**Voltmeter**:
A meter for voltage, connected in parallel with the component. Its input resistance is very high.
_Avoid_: Volt meter

**Oscilloscope**:
An instrument that plots voltage against time. It records analogue behaviour, not the digital levels of many pins.
_Avoid_: Scope (acceptable in conversation), logic analyzer (which records digital states)

**Bipolar junction transistor (BJT)**:
A three-terminal semiconductor: a small base current controls a larger collector current. An NPN has base, collector and emitter, and conducts when the base is about 0.7 V above the emitter.
_Avoid_: Transistor (when a MOSFET is meant)

**Current gain (hFE)**:
The ratio of collector current to base current in a BJT, written β or h_FE. It varies with current and temperature, so datasheets give a range.
_Avoid_: Gain (too vague; a voltage gain is something else)

**Saturation**:
The state of a BJT used as a switch when its base current is large enough for the collector-emitter voltage to fall to a small fraction of a volt.
_Avoid_: On (informal)

**Base resistor**:
The resistor in series with a transistor's base, set so that the GPIO supplies the base current the transistor needs.
_Avoid_: Series resistor (ambiguous when several resistors are in series)

**MOSFET**:
A transistor switched by the voltage on its gate: an N-channel device conducts when the gate is above the source by more than its threshold voltage. The gate draws almost no DC current.
_Avoid_: FET (without saying which kind), MOS switch

**Gate (MOSFET)**:
The insulated control terminal of a MOSFET. Charging it turns the channel on, and in steady state it draws no current.
_Avoid_: Base (that is the BJT's control terminal)

**Threshold voltage**:
The gate-source voltage at which a MOSFET's channel starts to conduct, written V<sub>GS(th)</sub> on datasheets. A logic-level part is designed to switch fully on at a gate voltage of 4 V or 5 V, or lower.
_Avoid_: Vth alone (say which voltage it refers to), turn-on voltage

**On-resistance**:
The resistance of a MOSFET's drain-source channel when it is fully on, written R<sub>DS(on)</sub>. Power lost in the switch is I² × R<sub>DS(on)</sub>.
_Avoid_: Rdson (informal), channel resistance

**Low-side switch**:
A switch placed between the load and ground, so the load stays on the supply rail. An N-channel MOSFET can be driven directly from a logic pin in this position.
_Avoid_: Ground-side switch (say low-side)

**High-side switch**:
A switch placed between the supply and the load. An N-channel device here needs a gate voltage above the supply, so a P-channel device or a gate driver is used.
_Avoid_: Supply-side switch (say high-side)

**Flyback diode**:
A diode placed across an inductive load, such as a relay coil, reverse biased while the load is powered. It gives the coil current a path when the switch turns off, which limits the voltage spike.
_Avoid_: Freewheeling diode (acceptable as a synonym, but say flyback in datasheets and schematics), snubber diode

**Inductive kickback**:
The large voltage that appears across an inductor when its current is switched off quickly, from V = L × di/dt. It can destroy a switch that is not protected.
_Avoid_: Back EMF (that is the motor's own voltage when it spins)

**Snubber**:
A resistor and capacitor in series placed across an inductive load to absorb the energy of the switch-off spike.
_Avoid_: Damper (a different idea in mechanical contexts)

**Time constant**:
The time, τ = R × C for an RC circuit, after which a capacitor has charged to about 63 % of a step. It takes about 5τ to settle to within about 1 %.
_Avoid_: Time-constant tau (use the single term), RC delay

**Decoupling capacitor**:
A capacitor placed close to a chip's supply pin that supplies the short current bursts of the chip's switching, so the supply does not dip. Typically 100 nF per pin.
_Avoid_: Bypass capacitor (a synonym, but use decoupling in this course), filter cap

**Low-pass filter**:
A circuit that passes signals below its cut-off frequency and attenuates faster signals. A resistor and capacitor give f<sub>c</sub> = 1 ÷ (2π × R × C).
_Avoid_: Smoothing filter (vague)

**Linear regulator**:
A regulator that holds a fixed output by dropping the difference between input and output across a pass element. Its power loss is (V<sub>in</sub> − V<sub>out</sub>) × I<sub>out</sub>, and its efficiency is about V<sub>out</sub> ÷ V<sub>in</sub>.
_Avoid_: LDO (say linear regulator for the general type, LDO for a low-dropout variant), voltage regulator (too broad)

**Buck converter**:
A switching regulator that steps the voltage down by switching a MOSFET and storing energy in an inductor. It wastes far less power than a linear regulator at a large voltage difference.
_Avoid_: Step-down converter (acceptable, but use buck in this course), switch-mode supply (broader)

**Dropout voltage**:
The smallest difference between input and output voltage for which a linear regulator still regulates. Below it, the output follows the input down.
_Avoid_: Headroom (informal)

**Floating input**:
A digital input connected to nothing that sets its level. Its voltage wanders, so it can read 0 or 1 at random.
_Avoid_: Open pin (ambiguous: an unused pin may have a defined pull)

**Level shifter**:
A circuit, such as a resistor divider or a translator IC, that converts a signal between two logic voltages so that each device sees a level it can read and tolerate.
_Avoid_: Level converter (acceptable as a synonym)

**Absolute maximum rating**:
A stress limit from a datasheet. Exceeding it can damage the part, and the part is not guaranteed to work at that value.
_Avoid_: Maximum operating voltage (that is a different, guaranteed range)

**Electrical characteristics**:
The measured parameters of a part, given as minimum, typical and maximum at stated test conditions. These are the guarantees a design relies on.
_Avoid_: Specs (informal), typical values (only one column)

**Net**:
A set of connected points that are all at the same voltage in a schematic.
_Avoid_: Wire (a wire is one drawn line; a net can be many wires and labels)

**Net label**:
A name placed on a net in a schematic. Every point with the same name is connected, even across sheets.
_Avoid_: Wire label (informal)

**Power flag**:
A schematic symbol (PWR_FLAG in KiCad) that tells the electrical rule checker a net has a power source. It does not create voltage or connect nets.
_Avoid_: Power symbol (a different, connecting symbol)

**Reference designator**:
The letter and number that identify a part on a schematic and board, such as R1, C3 or U1.
_Avoid_: Part number (that is the manufacturer's code), ref des (informal)

## Computer architecture

**Microcontroller (MCU)**:
A single chip containing a CPU core, flash, SRAM and peripherals, designed to control hardware directly.
_Avoid_: Microprocessor (a CPU without on-chip memory and peripherals), "chip" (too vague)

**CPU core**:
The part of the MCU that fetches, decodes and executes instructions. In this course: an Arm Cortex-M0+ (RP2040) or Cortex-M3 (STM32F103).
_Avoid_: Processor (ambiguous between the core and the whole chip)

**Register (CPU)**:
One of a small set of storage cells inside the CPU core (R0–R15, xPSR) that instructions operate on directly.
_Avoid_: Variable

**Peripheral register**:
A memory-mapped location that configures or reflects the state of a peripheral. Reading or writing its address talks to the hardware.
_Avoid_: SFR (acceptable alias in datasheets, but not used in this course)

**Peripheral**:
A hardware block in the MCU, other than the CPU core and memory, that performs a function such as GPIO, UART, a timer or the ADC.
_Avoid_: Module, device (reserve "device" for external chips)

**Memory map**:
The assignment of address ranges to flash, SRAM and peripherals, so the CPU reaches all of them with ordinary load and store instructions.
_Avoid_: Address space (acceptable, but less specific)

**Exception**:
An event that makes the CPU core suspend normal execution and run a handler, such as Reset, HardFault, SysTick or an interrupt.
_Avoid_: Trap

**Interrupt**:
An exception raised by a peripheral or an external pin, managed by the NVIC.
_Avoid_: IRQ (use only for the numbered input line, e.g. "IRQ 37")

**Interrupt service routine (ISR)**:
The function the CPU core runs in response to an interrupt.
_Avoid_: Interrupt handler, callback (in the ISR context)

**Vector table**:
A table at a fixed address that holds the initial stack pointer and the address of every exception handler.
_Avoid_: Interrupt table, jump table

**NVIC (Nested Vectored Interrupt Controller)**:
The Cortex-M block that enables, prioritises and dispatches interrupts to the CPU core.
_Avoid_: Interrupt controller (too generic)

**Embedded Linux**:
A full Linux operating system running on an application processor inside an embedded product, with far more memory than an MCU has.
_Avoid_: Linux (too vague on its own)

**Bit**:
The smallest unit of storage, holding a 0 or a 1. A register or memory word is a fixed group of bits, and its meaning depends on the instruction that reads it.
_Avoid_: Byte (a group of eight bits), digit (a base-10 idea)

**Nibble**:
Four bits, which is one hex digit.
_Avoid_: Half-byte (acceptable in conversation)

**Two's complement**:
The signed binary encoding used by almost every processor. In an n-bit register the top bit has weight −2<sup>n−1</sup>, and negation is invert-and-add-one.
_Avoid_: Signed binary (too vague, since sign-magnitude is also signed binary)

**Mask**:
A bit pattern with ones in the bits to be kept or changed, used with AND, OR or XOR to select bits of a register.
_Avoid_: Filter (informal)

**Read-modify-write**:
Reading a register, changing some of its bits, and writing it back. It is unsafe when an interrupt can change the same register in between.
_Avoid_: Bit-banging (which means driving pins by hand, not this operation)

**Q format**:
A fixed-point notation Qm.n, where the stored integer x means x ÷ 2<sup>n</sup>. Q15 has 15 fraction bits, and Q16.16 has 16.
_Avoid_: Fixed-point (the general idea, not one format)

**Fixed-point number**:
A number stored as an integer with an implied binary point at a fixed position, so integer hardware does fraction arithmetic.
_Avoid_: Scaled integer (acceptable in conversation)

**Floating-point number**:
A number stored as sign, exponent and mantissa, so the binary point moves. IEEE 754 single precision is the usual format for C float.
_Avoid_: Real number (in the sense of a computer type, which it is not)

**Logic gate**:
A circuit that computes one Boolean function of one or two input bits, such as AND, OR, XOR, NOT or NAND.
_Avoid_: Logic chip (a package containing gates)

**Truth table**:
A table that lists the output of a circuit for every combination of its inputs. It fully specifies a combinational function.
_Avoid_: Logic table (acceptable in informal use)

**Boolean algebra**:
The algebra of 0 and 1 with AND, OR and NOT, used to write and simplify gate circuits.
_Avoid_: Logic algebra (informal)

**De Morgan's laws**:
NOT (A AND B) equals (NOT A) OR (NOT B), and NOT (A OR B) equals (NOT A) AND (NOT B). They turn AND into OR when you move the NOT across.
_Avoid_: De Morgan's theorem (acceptable in older texts)

**Universal gate**:
A gate type, such as NAND or NOR, from which every other logic function can be built alone.
_Avoid_: Basic gate (wrong: AND is not universal)

**Combinational logic**:
Logic whose outputs depend only on its current inputs, with no state.
_Avoid_: Stateless logic (acceptable in conversation)

**Multiplexer (mux)**:
A circuit that passes one of several data inputs to its output, chosen by select inputs.
_Avoid_: Selector (informal)

**Decoder**:
A circuit that turns an n-bit address into 2<sup>n</sup> outputs, exactly one of which is 1.
_Avoid_: Demultiplexer (a decoder with an enable input, used for routing)

**Half adder**:
A circuit that adds two bits, giving a sum (XOR) and a carry (AND).
_Avoid_: Adder (too vague, since full adders also add)

**Full adder**:
A circuit that adds three bits, two inputs and a carry in, giving a sum and a carry out.
_Avoid_: Three-input adder (too vague)

**Sequential logic**:
Logic with state: its outputs depend on its inputs and on what it stored earlier.
_Avoid_: Stateful logic (acceptable in conversation)

**Latch**:
A circuit that holds a bit and follows its data input while its enable is high. A latch is level-sensitive.
_Avoid_: Flip-flop (which copies only on an edge)

**Flip-flop**:
A circuit that copies its data input to its output only on a clock edge, and holds it otherwise. A D flip-flop is the usual one.
_Avoid_: Latch (which is level-sensitive)

**Clock**:
A periodic signal that tells the state elements of a synchronous design when to copy their inputs.
_Avoid_: Timer (a timer counts time in a peripheral, not the digital clock signal)

**Rising edge**:
The change of a signal from 0 to 1. A positive-edge flip-flop copies its input on this edge.
_Avoid_: Leading edge (acceptable in timing diagrams)

**Setup time**:
The time before the active clock edge in which a flip-flop's data input must be stable.
_Avoid_: Setup (on its own, which is ambiguous)

**Hold time**:
The time after the active clock edge in which a flip-flop's data input must stay stable.
_Avoid_: Hold (on its own, which is ambiguous)

**Counter**:
A register whose next value is its current value plus one, so it counts clock edges.
_Avoid_: Timer (a counter that also drives a time base)

**Shift register**:
A chain of flip-flops in which each one takes the output of the previous one, so data moves one place per clock edge.
_Avoid_: Serial register (acceptable in conversation)

**ALU (arithmetic logic unit)**:
The combinational block of the CPU that computes add, subtract and logic operations on two operands, and sets the status flags.
_Avoid_: Processor (which is the whole core)

**Status flags (N, Z, C, V)**:
Four bits in the program status register set by the ALU: N (negative, bit 31 of the result), Z (zero), C (carry out, or no borrow after a subtract) and V (signed overflow). Branches read them.
_Avoid_: Condition codes (acceptable in other architectures)

**Von Neumann architecture**:
A design with one memory and one path shared by instructions and data, so an instruction fetch and a data access take turns on that path.
_Avoid_: Von Neumann bottleneck (a consequence, not the design itself)

**Harvard architecture**:
A design with separate instruction and data paths, so the core can fetch an instruction and load data in the same cycle. The Cortex-M3 is a Harvard design; both designs share one address map.
_Avoid_: Split bus (describes the paths, not the design)

**Instruction set architecture (ISA)**:
The set of operations a CPU understands and the binary form (encoding) of each one. Software compiled for one ISA does not run on another.
_Avoid_: Architecture (too vague on its own)

**Encoding (instruction)**:
The rule that maps an instruction to bits: fixed bits that identify the operation, and fields that hold register numbers and immediate values.
_Avoid_: Opcode (only the operation part of an encoding)

**RISC**:
A reduced instruction set computer: a small set of simple operations, with memory reached only through loads and stores.
_Avoid_: Simple CPU (the label is about the instruction set, not the chip)

**CISC**:
A complex instruction set computer: many instructions, some of which read or write memory as part of an arithmetic operation.
_Avoid_: Old CPU (a style, not an age)

**Thumb-2**:
Arm's instruction set that mixes 16-bit and 32-bit instructions. The Cortex-M3 implements it; it cannot execute ARM (32-bit Arm state) instructions.
_Avoid_: Thumb (on its own, which is the 16-bit subset)

**Pipeline**:
The split of fetch, decode and execute into stages that run at the same time, so one instruction finishes about every cycle in steady state.
_Avoid_: Queue (which is a buffer, not a set of stages)

**Pipeline flush**:
Discarding the instructions in the pipeline behind a taken branch, because they were fetched from the wrong address.
_Avoid_: Stall (a stall waits; a flush throws work away)

**Stack**:
A region of RAM used for local data, saved registers and return addresses. On Cortex-M it grows toward lower addresses.
_Avoid_: Heap (which is for dynamic allocation)

**Full-descending stack**:
A stack in which the stack pointer points at the last item pushed, and a push moves SP down before writing.
_Avoid_: Ascending stack (the opposite direction)

**Stack frame**:
The block of words a call or an exception pushes onto the stack, such as the eight words stacked on interrupt entry.
_Avoid_: Stack (the whole region, not one frame)

**Stack pointer (SP)**:
The register, R13, that holds the top of the current stack. On Cortex-M it is banked as MSP and PSP.
_Avoid_: Stack (the region, not the pointer)

**Main stack pointer (MSP)**:
The stack pointer used by exception handlers and by thread mode after reset. Also written SP_main.
_Avoid_: Kernel stack (an RTOS term that is not the same thing)

**Process stack pointer (PSP)**:
The stack pointer that thread mode can use instead of MSP, selected through the CONTROL register. RTOS tasks use it. Also written SP_process.
_Avoid_: Task stack (the stack of one task, which PSP is pointed at)

**Link register (LR)**:
R14. It holds the return address after a call, and an EXC_RETURN value inside an exception handler.
_Avoid_: Return register (it holds the address, not the return value)

**Program counter (PC)**:
R15. It holds the address of the instruction being executed, and writing it branches.
_Avoid_: Instruction pointer (the same idea, not the Arm name)

**Program status register (xPSR)**:
The register that holds the APSR flags, the IPSR exception number and the EPSR state bits, as three views of one register.
_Avoid_: Status register (too vague: Arm has several)

**AAPCS**:
The Procedure Call Standard for the Arm Architecture. It defines which registers carry arguments and results, which must be preserved, and the stack alignment at public interfaces.
_Avoid_: Calling convention (acceptable in general, but AAPCS names the Arm rule)

**Thread mode**:
The core mode that runs the main program and RTOS tasks. It is entered on reset and on exception return.
_Avoid_: User mode (which is a privilege level, not a mode)

**Handler mode**:
The core mode that runs exception handlers. It is always privileged.
_Avoid_: Interrupt mode (handlers also run for faults and system exceptions)

**Privileged access**:
Code that can reach all resources, including the system control registers. Handler mode is always privileged.
_Avoid_: Supervisor (an informal name, not Arm's)

**EXC_RETURN**:
A special value loaded into LR on exception entry. A branch to it from a handler returns to the interrupted code and unstacks the frame.
_Avoid_: Return address (it selects the return, it is not an address)

**Tail-chaining**:
Starting a pending handler directly after another finishes, without restoring and saving the frame in between.
_Avoid_: Back-to-back interrupts (the informal description)

**Late arrival**:
A higher-priority exception that arrives while the core is still stacking for another one. It takes over, and the stacking is kept.
_Avoid_: Preemption (the broader term)

**Execute in place (XIP)**:
Running code directly from external flash, mapped into the address space, through a cache. The RP2040 maps a 16 MB flash window at 0x10000000.
_Avoid_: Running from flash (too vague: an STM32 runs from its own flash without XIP)

**Wait state**:
An extra clock cycle the bus or memory makes the core wait for, so a slower memory can keep up with a faster core. On the STM32F1, flash wait states are set by the LATENCY field of FLASH_ACR.
_Avoid_: Stall (a stall is the core waiting for any reason, including a bus conflict)

**Bus matrix (crossbar)**:
A switch that connects several bus masters to several slaves, so accesses to different slaves run in parallel. The RP2040 fabric is a 4-master, 10-port AHB-Lite crossbar.
_Avoid_: Bus (a shared bus allows one transfer at a time)

**APB bridge**:
The bridge from the high-speed AHB side of the bus to the slower APB peripheral bus. It adds cycles to each access.
_Avoid_: Bus (the bridge is the component, the APB is the bus behind it)

**Base address**:
The start address of a peripheral's register block. A register's address is its base address plus its offset.
_Avoid_: Start address (too generic)

**Register offset**:
The distance of one register from its peripheral's base address, in bytes.
_Avoid_: Index (an offset is in bytes, an index counts words)

**MPU (memory protection unit)**:
Optional Cortex-M hardware that lets software define regions with access permissions. Violations raise a fault. The RP2040's M0+ has 8 regions. The STM32F103 device header sets __MPU_PRESENT to 0.
_Avoid_: MMU (an MMU translates addresses, an MPU only checks them)

**HardFault**:
The fault exception every Cortex-M core has. On the Cortex-M0+ it is the only fault exception, and MPU violations raise it.
_Avoid_: Crash (a HardFault is a handled exception, not a crash)

**PLL (phase-locked loop)**:
A circuit that multiplies a reference clock to a higher frequency. The RP2040's PLL_SYS produces 125 MHz from a 12 MHz crystal.
_Avoid_: Oscillator (an oscillator makes the reference, a PLL multiplies it)

**Clock tree**:
The network of oscillators, PLLs, dividers and selectors that delivers clocks to the core and to each peripheral.
_Avoid_: Clock (too vague when you mean the whole network)

**Reset handler**:
The function the core jumps to after reset, found through the second word of the vector table. It calls SystemInit, copies .data, zeroes .bss, and calls main.
_Avoid_: Startup function (the startup code is the whole file, the reset handler is one function in it)

**Load address**:
The flash address where a section's initial bytes are stored, while the section runs at its virtual address in RAM. For .data, the linker writes it with AT> FLASH.
_Avoid_: Physical address (on Cortex-M the load and virtual addresses are both bus addresses)

**Errata sheet**:
The vendor's list of known silicon bugs, each with its summary, affected revisions and workaround. The RP2040's list is Appendix B of its datasheet.
_Avoid_: Release notes (those list software changes)

**Timer (hardware)**:
A peripheral counter that the hardware advances on a prescaled clock, and that can drive outputs, capture input edges or raise interrupts without the CPU counting.
_Avoid_: Clock (the digital clock signal is a different thing, see Clock)

**Prescaler (PSC)**:
A divider in front of a timer's counter. The counter ticks at f_clk ÷ (PSC + 1).
_Avoid_: Divider (acceptable, but name the register)

**Auto-reload value (ARR)**:
The count at which a timer counter wraps to zero and raises an update event. The period is (ARR + 1) ticks.
_Avoid_: Period register (informal)

**Input capture**:
A timer feature that latches the counter value when an edge arrives on a pin. The difference between two captures gives a pulse width or a period.
_Avoid_: Timestamping (informal)

**Encoder mode**:
A timer mode that counts up or down from the two quadrature signals of a rotary encoder, so the CPU only reads the count.
_Avoid_: Quadrature decoder (a name for the same job in other chips)

**NVIC priority grouping**:
The split of the implemented priority bits into a preemption field and a sub-priority field, set by PRIGROUP in AIRCR. It decides which bits can preempt a running handler.
_Avoid_: Priority level (a level is a whole priority value, not the split)

**Preemption**:
A pending interrupt with a higher priority (a lower preemption value) interrupts a running handler, which resumes after the new handler returns.
_Avoid_: Interruption (vague)

**Sub-priority**:
The low part of an interrupt priority, used only to choose between two pending interrupts that have the same preemption value. It cannot interrupt a running handler.
_Avoid_: Minor priority (informal)

**SysTick**:
The 24-bit down counter built into the Cortex-M core. It raises SysTick_Handler each time it reaches zero, and is used for the millisecond time base.
_Avoid_: System timer (the name is SysTick)

**Wrap-safe timeout**:
A timeout check that subtracts the start time in unsigned arithmetic, so it stays correct when the counter wraps.
_Avoid_: Deadline comparison (a raw comparison of times fails at the wrap)

**HAL (hardware abstraction layer)**:
A header and one implementation file per board, so that the application calls logical functions and never names a register or a pin.
_Avoid_: Driver (a driver talks to one device, the HAL talks to the board)

**Circular mode (DMA)**:
A DMA mode in which the count and the address reload at the end of the buffer, so the transfer runs forever into a ring buffer.
_Avoid_: Ring mode (informal)

**Half-transfer interrupt**:
A DMA interrupt raised when half of the buffer has been transferred, so the CPU can process the first half while the DMA fills the second.
_Avoid_: Half-full flag (the flag is an event, not a state)

**Cache coherence**:
The rule that a cache and the memory it shadows agree. A DMA write to RAM can leave a cache with a stale copy, so the cache must be invalidated before the CPU reads the buffer.
_Avoid_: Cache sync (vague)

**WFI (wait for interrupt)**:
A Cortex-M instruction that sleeps the core until an enabled interrupt is pending.
_Avoid_: Idle (a general word, not the instruction)

**WFE (wait for event)**:
A Cortex-M instruction that sleeps the core until an event or an interrupt occurs. The event flag must be cleared as well.
_Avoid_: Sleep (WFI is also a sleep)

**Sleep, Stop and Standby**:
The STM32F1 low-power levels. Sleep stops the CPU clock. Stop keeps the SRAM and wakes on an EXTI line. Standby loses the SRAM and restarts from reset.
_Avoid_: Deep sleep (say Stop or Standby)

## Firmware and tools

**Firmware**:
The software that runs on an MCU, stored in its flash.
_Avoid_: Sketch, program (too generic), code

**Toolchain**:
The compiler, assembler, linker and related tools that turn source code into firmware. In this course: Arm GNU (arm-none-eabi-gcc).
_Avoid_: Compiler (when you mean the whole chain)

**ELF file**:
The linker's output: firmware plus symbols and debug information. Wokwi and GDB both consume it.
_Avoid_: Binary (a `.bin` is a raw image without symbols)

**Linker script**:
A file (`.ld`) telling the linker where each section of the program goes in the memory map.
_Avoid_: Memory map file (that's the `.map` output)

**Super-loop**:
A firmware structure with one endless `while (1)` loop in `main()` that polls and handles everything in turn.
_Avoid_: Main loop, bare-metal loop

**Blocking (code)**:
Code that waits, stopping the CPU core from doing anything else until a condition is met, e.g. `sleep_ms()` or a busy-wait loop.
_Avoid_: Synchronous

**Hardware abstraction layer (HAL)**:
A software layer that exposes hardware through a portable API so that higher layers don't touch peripheral registers. "STM32 HAL" is ST's specific library.
_Avoid_: Driver (a driver sits on top of, or is part of, a HAL)

**Wokwi**:
The simulator used in this course. It runs real firmware against virtual MCUs and parts, described in `diagram.json` and configured by `wokwi.toml`.
_Avoid_: Emulator (fine technically, but not used here)

**Compiler**:
The tool that translates C or C++ source into machine code for one target, one source file at a time.
_Avoid_: Toolchain (when you mean the whole set of tools)

**Linker**:
The tool that joins object files and libraries, resolves the symbols between them and writes the final ELF file.
_Avoid_: Linker script (that is the layout file the linker reads, not the tool)

**Cross-compilation**:
Compiling on one kind of machine for a different kind of processor, such as building Cortex-M code on a Windows PC.
_Avoid_: Remote build

**Build system**:
The tool that runs the compiler and linker in the right order for a project, here CMake with Ninja.
_Avoid_: Make (one builder, not the whole system)

**Simulator**:
Software that runs firmware against virtual parts of a chip and board, such as Wokwi.
_Avoid_: Emulator (fine technically, but not used in this course)

**Debugger**:
Software that attaches to running firmware to set breakpoints, step through code and read memory, such as Arm GDB through Cortex-Debug.
_Avoid_: Logger (a logger prints values but does not stop the CPU)

**Logic analyzer**:
An instrument that records digital signal edges on several pins over time, and a viewer such as PulseView that decodes protocols from the recording.
_Avoid_: Oscilloscope (which records voltage waveforms, not digital states)

**GPIO (general-purpose input/output)**:
A pin the CPU can drive high or low, or read as an input. On the RP2040 its level and direction are bits in the SIO registers, and its function select routes it to the SIO or to a peripheral.
_Avoid_: IO (too vague on its own)

**SIO (single-cycle IO)**:
The RP2040 block at 0xD0000000 that holds the GPIO registers and FIFOs. Each core reaches it through its IOPORT in one cycle, and it is not on the main bus.
_Avoid_: GPIO block (the SIO also holds FIFOs and spinlocks)

**Atomic alias (SET, CLR, XOR)**:
A write-only register address that changes only the bits named in the written value. It sets, clears or toggles the bits of its partner register in one store, so no read is needed.
_Avoid_: Bit-band (a different, Cortex-M3 mechanism)

**Bounce**:
The burst of rapid edges a mechanical contact makes for a few milliseconds before it settles. One click becomes several edges unless the input is debounced.
_Avoid_: Chatter (acceptable in older texts)

**Debounce**:
Software that turns a bouncing input into one clean event, usually by accepting a level only after it has been steady for a set window.
_Avoid_: Filter (a debounce is a specific kind of filter for switch edges)

**Integrator debounce**:
A debounce that keeps a counter, which rises while the input reads pressed and falls while it reads released, and changes the stable state only when the counter reaches an end of its range.
_Avoid_: Averaging (an integrator counts steps; it does not average values)

**UART (universal asynchronous receiver-transmitter)**:
A serial port with no shared clock line. Each byte is a start bit, the data bits and a stop bit, sent at a fixed baud rate.
_Avoid_: Serial (too broad: USB and SPI are serial too)

**Baud rate**:
The number of signal symbols per second on a serial line. For the UART, one symbol is one bit, so 115200 baud carries 115200 bits per second.
_Avoid_: Speed (informal)

**Baud divisor**:
The value that divides the UART clock to give the baud rate. The RP2040 stores it as a 16-bit integer part (UARTIBRD) and a 6-bit fraction (UARTFBRD), in units of the clock divided by 16 times the baud rate.
_Avoid_: Prescaler (a different, general term)

**Breakpoint**:
A point where the debugger stops the core, either with a hardware comparator or with a software instruction. The Cortex-M0+ has four hardware breakpoints.
_Avoid_: Trap (a different event in the CPU)

**Watchpoint**:
A stop triggered by a read or write to a data address. The Cortex-M0+ has two hardware watchpoints.
_Avoid_: Data breakpoint (informal)

**GDB server**:
The part of a debugger or simulator that answers GDB's requests over a port, such as localhost:3333 for Wokwi. GDB runs on the PC and talks to it.
_Avoid_: Debugger (the GDB server is only one side of a debug session)

**State machine**:
A model with a fixed set of states, events and transition rules. The machine's state is a variable, and each event moves it to the next state according to the rules.
_Avoid_: Flowchart (a diagram, not the running code)

**Transition table**:
A two-dimensional table indexed by state and event, giving the next state for each pair. A cell that keeps the current state means the event is ignored in that state.
_Avoid_: Lookup table (too general)

**Deadline (timer)**:
A stored timer value at which an action should happen. A super-loop checks it on every pass and runs the action once it has passed, instead of waiting.
_Avoid_: Timeout (acceptable when a wait is actually bounded)

**Wraparound (timer)**:
The return of a counter to zero after its maximum value. A 32-bit microsecond counter wraps every 2³² µs, about 71.6 minutes. Comparisons must subtract first, so they stay correct across the wrap.
_Avoid_: Overflow (overflow is an arithmetic result, not the counter's normal cycle)

**Device driver**:
The code that turns the operations of one device (start measuring, read a temperature) into bus transactions. It sits above the bus driver and the HAL, and below the application.
_Avoid_: HAL (a portable API layer, not one device), library (too broad)

**Custom chip (Wokwi)**:
A simulated part written in C and compiled to WebAssembly, which Wokwi runs on the simulated bus. This course uses one for the mystery sensor in lesson 63. Its files are a `.chip.c`, a `.chip.json` and a `.chip.wasm`.
_Avoid_: Virtual part (a built-in Wokwi part), emulator (not used in this course)

**Register pointer**:
A device's internal address register, set by the first byte the master writes in an I2C transaction. Later bytes read or write the register it points to, and the pointer often increments.
_Avoid_: Register address (that is the number of a register, not the pointer that holds it)

**Repeated start**:
A START condition sent without a STOP first, so the master keeps the bus and switches from writing to reading. A register read is usually a write of the pointer, then a repeated start, then the read.
_Avoid_: Restart (acceptable in the RP2040 datasheet, which uses RESTART)

**Data-ready flag**:
A status bit a sensor sets when a new sample is ready, and clears when the sample is read. A driver checks it before reading, so that it never reads a stale or half-updated value.
_Avoid_: Interrupt (a data-ready flag may be polled, or may raise an interrupt)

**Race condition**:
A bug where the result depends on the order in which two code paths run. Two cores or a core and an interrupt that share a read-modify-write can each lose the other's update.
_Avoid_: Concurrency bug (too broad), timing bug (too vague)

**Lost update**:
The effect of a race on a read-modify-write: two writers each read the same old value, and one of the two new values is overwritten and lost.
_Avoid_: Dropped write (a different failure, where the hardware ignores a write)

**Hardware spinlock**:
One of the 32 single-bit locks in the RP2040's SIO. A read claims it, and a read returns zero if it is already claimed. A write of any value releases it.
_Avoid_: Mutex (a mutex is an RTOS object that can sleep the caller)

**Inter-core FIFO**:
A 32-bit wide, eight-entry hardware FIFO in the RP2040's SIO, one in each direction between core 0 and core 1. Used to pass messages and to launch core 1.
_Avoid_: Queue (a software structure in RAM), mailbox (acceptable in the datasheet, which calls it that)

**DREQ (data request)**:
A signal from a peripheral to the DMA, saying it can take or give one word. The DMA waits for it, so the peripheral sets the pace of the transfer.
_Avoid_: Interrupt (a DREQ is a DMA pacing signal, not an interrupt)

**PIO state machine**:
One of the four programmable I/O engines in each of the RP2040's two PIO blocks. It runs a short program of nine instruction types, one per clock cycle, and drives or reads GPIO pins.
_Avoid_: Peripheral (a PIO state machine is a programmable part of one), CPU (it has no program counter visible to C code)

**Opaque handle**:
A pointer to a struct whose fields are defined only in the implementation file. The caller passes the handle to each function and cannot read or change its fields, which keeps the instance's data private.
_Avoid_: Object (C has no objects; a handle is a convention)

**Ops table**:
A struct of function pointers, with a context pointer that each function receives. The caller picks the table at run time, and each call goes through one pointer, which costs one indirect call.
_Avoid_: Vtable (a C++ term for the same mechanism, with different rules)

**Link-time substitution**:
Choosing between two implementations of the same functions in the build, by compiling only one of the source files into the program. The choice costs nothing at run time, and two definitions of the same name fail to link.
_Avoid_: Dependency injection (a wider software idea; this is a build decision)

**Dual targeting**:
Compiling the same plain C module for the PC and for the microcontroller, so its logic can be unit-tested on the PC and used unchanged on the board.
_Avoid_: Cross-testing (a different idea: testing on a different machine than the one that built the code)

**Active object**:
A unit of state with one event queue and one handler. Other code posts events to the queue, and the dispatcher runs the handler for each event, so the state is changed only by its own handler.
_Avoid_: Task (a task has its own stack and is scheduled by an RTOS; an active object does not)

**Event queue**:
A ring buffer of events that one active object takes from, in the order they were posted. Its head is written by the poster and its tail by the dispatcher.
_Avoid_: Mailbox (a mailbox usually holds one message)

**Run-to-completion**:
The rule that a handler runs until it returns before the dispatcher takes the next event. No other event can interrupt a running handler, so its state needs no lock on one core.
_Avoid_: Preemption (the opposite: a higher-priority task interrupts a running one)

**Publish and subscribe**:
A pattern in which a publisher sends an event to every object that subscribed to that event, without knowing who they are. Adding a subscriber does not change the publisher.
_Avoid_: Broadcast (sends to everyone, with no subscription)

**Heap**:
The region that malloc() hands out, which grows up in the RAM above the static data. On a microcontroller it can fragment, so many standards ban its use after startup.
_Avoid_: Free store (a C++ term for the same region, with different rules)

**Memory pool**:
A fixed array of equal-size blocks with a free list. Taking and returning a block takes a fixed time, and no size fragments the pool.
_Avoid_: Arena (a region released all at once, not block by block)

**Stack painting**:
Filling the unused stack with a known pattern before the program runs, so that the words still holding the pattern afterward show how far the stack did not reach.
_Avoid_: Stack watermarking (the same idea under another name; use the course term)

**High-water mark**:
The deepest point a stack reached during a run, measured as the distance from the top of the stack to the lowest word that changed.
_Avoid_: Peak (too vague: it does not say the measure is bytes from the top)

**Stack canary**:
A known word placed at the lowest reserved address of a stack. If the word changes, the stack has passed its reserved size. It detects an overflow after it happens and does not prevent it.
_Avoid_: Guard page (an MPU or MMU region that faults on the first write, so the overflow is stopped)

**Unit test**:
A test of one function or module, run on its own, with no hardware and no other module's real code where a fake can stand in.
_Avoid_: Integration test (which runs several modules together)

**Test-driven development (TDD)**:
A practice in which a failing test for one behaviour is written first, and then the smallest code that passes it. The cycle repeats, with cleaning up while the tests stay green.
_Avoid_: Test-after (writing the tests once the code exists)

**Trunk-based development**:
A branching model in which short-lived branches merge to one main line often, usually daily, so each merge is small and tested against the current main.
_Avoid_: Git-flow (a different model with long-lived develop and release branches)

**Merge commit**:
A commit with two parents, created by a merge. The --no-ff flag creates one even when the branch could be fast-forwarded, which keeps the branch visible in the history.
_Avoid_: Fast-forward (a merge that only moves the branch pointer and creates no commit)

**Doxygen**:
A tool that reads special comment blocks in C and builds a reference document from them. Its blocks start with a double star and use tags such as @brief and @param.
_Avoid_: JavaDoc (a related tool for Java, with a similar comment style)

**West**:
The Zephyr meta-tool. It reads a manifest, fetches the listed repositories, and runs the build for a board.
_Avoid_: Zephyr build (West is the tool; the build is what it runs)

**West manifest**:
The file (`zephyr/west.yml` upstream) that lists the projects of a Zephyr workspace, with their remotes and revisions. A project filter in `.west/config` selects a subset.
_Avoid_: Manifest (on its own, when the context is not Zephyr)

**Kconfig symbol**:
A named build option with a type, a default and optional `depends on` and `select` lines. Its final value is written to `build/zephyr/.config`.
_Avoid_: Config option (use the symbol name, for example `CONFIG_LOG`)

**Devicetree**:
A tree of hardware nodes, each with properties such as `compatible`, `reg` and `status`, that the build compiles into C macros. Zephyr's hardware description format.
_Avoid_: Device tree (write it as one word in Zephyr text)

**Devicetree binding**:
The schema that says which properties a node with a given `compatible` must have. Zephyr generates its macros only for nodes that have a binding.
_Avoid_: Driver (a binding describes the node; a driver does the work)

**Devicetree overlay**:
A file that adds to or overrides the devicetree of a board for one application, usually `boards/<board>.overlay`.
_Avoid_: Patch (overlays merge; they do not patch text)

**Thread (Zephyr)**:
Zephyr's word for a task. Created with `K_THREAD_DEFINE`, with a priority where a smaller number is more urgent. Cooperative priorities are negative.
_Avoid_: Task (in Zephyr text, use thread)

**Message queue**:
A kernel object that copies fixed-size messages between threads, created with `K_MSGQ_DEFINE`.
_Avoid_: Mailbox, FIFO (K_FIFO is a different object with linked items)

**Start gate**:
A semaphore that holds several threads until `main()` has finished initialising, so no thread reads a device before it is ready. A pattern used in lab 6; not a Zephyr API.
_Avoid_: Barrier (a barrier waits for all parties at a point, which is a different thing)

**native_sim**:
Zephyr's host simulator board. It compiles the code into a Linux process, so it runs unit tests on a PC. Linux only.
_Avoid_: Emulator (native_sim runs the code natively, and it is not an instruction-level emulator)

**Twister**:
Zephyr's test runner. It reads `testcase.yaml`, builds each test for the listed platforms, and runs the ones it can.
_Avoid_: Test runner (generic; use Twister for the tool)

**ztest**:
Zephyr's unit test framework. A `ZTEST_SUITE` groups `ZTEST` cases, and `zassert_*` macros check the results.
_Avoid_: Unity (a different framework, used in lessons 80 and 81)

**UF2**:
A file format that carries a program plus its flash addresses in blocks. A board in BOOTSEL mode shows as a drive, and copying a UF2 file onto it programs the chip.
_Avoid_: Firmware image (too general; UF2 is one format)

**BOOTSEL mode**:
The Raspberry Pi boot ROM state, entered by holding the BOOTSEL button while plugging in USB. The board appears as mass storage, and no debug probe is needed.
_Avoid_: Bootloader mode (the ROM is not a bootloader you can change)

**Debug probe**:
A small device that connects a PC to a target's SWD (Serial Wire Debug) pins, so GDB can halt and inspect the target. The Raspberry Pi Debug Probe also bridges a UART.
_Avoid_: Programmer (a programmer only writes flash; a probe also debugs)

**Blue Pill clone**:
A board sold as a Blue Pill (STM32F103C8) whose chip is a different part, such as a CS32F103. Clones can report the wrong flash size and may not debug as the genuine part does.
_Avoid_: Fake STM32 (vague; the chip may be a licensed-looking clone rather than a counterfeit)

## Embedded C

**Integer promotion**:
The implicit conversion of a small integer type (such as uint8_t) to int, or to unsigned int if int cannot hold every value, before an arithmetic operator runs.
_Avoid_: Widening (informal; promotion is a rule of the language, not a cast)

**Undefined behaviour**:
A program action that the C standard does not define, so the compiler may do anything, including assume it never happens. Signed integer overflow is one example.
_Avoid_: Undefined (too short on its own in a review)

**Unsigned wraparound**:
Unsigned arithmetic is performed modulo 2 to the power of the type's width, so a value above the maximum wraps to zero. It is defined behaviour in C.
_Avoid_: Overflow (for unsigned types, which is defined)

**Usual arithmetic conversions**:
The rules that convert both operands of a binary operator, including comparisons, to a common type. A signed operand compared with an unsigned one is converted to unsigned.
_Avoid_: Implicit cast (informal)

**Volatile**:
A type qualifier that makes every access to an object an observable side effect, so the compiler reloads it and does not remove or merge the access. It is not atomic and gives no synchronisation between threads or ISRs.
_Avoid_: Atomic (volatile is not atomic)

**Atomic write**:
A single store that changes a register or bit without first reading it, so no other code can interleave between a read and a write. The STM32 BSRR register is an example.
_Avoid_: Thread-safe (broader and not the same claim)

**Register struct**:
A C struct whose fields match a peripheral's registers at their offsets, so that a pointer to the block gives named access to every register. The CMSIS GPIO_TypeDef is an example.
_Avoid_: Register map (a map is the documented address layout; the struct is the C code that follows it)

**Bit-field**:
A struct member declared with a width in bits. Its layout within storage is implementation-defined, so it is not a portable register layout.
_Avoid_: Bitfield (the standard's spelling is two words)

**Endianness**:
The order in which the bytes of a multi-byte value are stored in memory. Little-endian puts the least significant byte first, which is the default on the Cortex-M cores used in this course.
_Avoid_: Byte order (acceptable in conversation, but the course uses endianness)

**Packed struct**:
A struct declared with the packed attribute, which removes padding so that members sit at the smallest possible alignment. It changes layout, not byte order.
_Avoid_: Compact struct (not a standard term)

**Function pointer**:
A variable that holds the address of a function, so calling it jumps to that function. A table of function pointers is the basis of callbacks and the vector table.
_Avoid_: Callback (a callback is the use; the pointer is the mechanism)

**Callback**:
A function registered with other code, which that code calls later when an event occurs. Outside the ISR context, a callback is a function pointer stored for later use.
_Avoid_: Handler (acceptable for one specific event handler)

**Include guard**:
A preprocessor pattern (`#ifndef` and `#define` around a header) that makes a header's contents take effect only once in each translation unit.
_Avoid_: Header guard (acceptable in conversation)

**X-macro**:
A macro that takes a list macro as an argument, so one list of names generates several declarations, such as an enum and a string table, that cannot drift apart.
_Avoid_: Table macro (informal)

**Static inline function**:
A function declared static and inline, so it has file-local linkage and the compiler may expand it at each call. It evaluates its arguments once and follows the usual conversion rules, which a function-like macro does not.
_Avoid_: Inline macro (a macro is text substitution, not a function)

**Test double**:
A stand-in for a real dependency (the bus, a timer, a sensor) in a unit test. Gerard Meszaros named five kinds: dummy, fake, stub, spy and mock.
_Avoid_: Mock (for every double: mock is one kind), dummy object (too narrow)

**Stub**:
A test double that returns prepared answers to calls. It does not record how it was called.
_Avoid_: Mock (a mock also checks the calls it expects)

**Spy**:
A test double that records how it was called, so the test can check the calls afterwards.
_Avoid_: Stub (a stub only answers)

**Mock**:
A test double preloaded with the calls it expects, which fails the test when the calls differ.
_Avoid_: Fake (a fake is a simplified working implementation), any test double

**Fake (test double)**:
A test double with a working but simplified implementation, such as a bus that keeps a register array.
_Avoid_: Stub (a fake behaves; a stub only returns values)

**FFF (Fake Function Framework)**:
A C header of macros that writes a fake function, records its calls and lets the test set return values. Used in this course for host tests.
_Avoid_: Mocking framework (FFF records and stubs, it does not check expectations)

**Continuous integration (CI)**:
A server that runs a fixed list of checks (build, tests, analysis, simulation) on every change, on a clean machine.
_Avoid_: Build server (CI also tests and checks)

**Artifact (CI)**:
A build output that a CI job keeps for later, such as the ELF, the map file or a log.
_Avoid_: Release (a release is a published version; an artifact is any kept output)

**Repository secret**:
A value, such as an API token, stored in the repository settings and given to a CI job by name. It is not stored in the workflow file.
_Avoid_: Environment variable (a secret is a stored value; an environment variable is how a job receives it)

**Static analysis**:
Checking code without running it, with a compiler's warnings or a separate analyser such as cppcheck.
_Avoid_: Linting (linting is usually style-only; static analysis also finds defects)

**MISRA C**:
A coding standard for safety-related C, whose rules are grouped as mandatory, required and advisory.
_Avoid_: MISRA (on its own, without C and the year)

**Deviation (MISRA)**:
A recorded decision not to follow a required rule, with a justification. Mandatory rules cannot be deviated.
_Avoid_: Exception (a deviation is documented and reviewed; an exception is an error path)

**Watchdog**:
A counter that resets the chip if software does not clear it in time. A hung program stops clearing it, and the reset is the recovery.
_Avoid_: Timeout (a timeout is one test of elapsed time; a watchdog resets the device)

**Independent watchdog (IWDG)**:
An STM32 watchdog on its own low-speed clock. Once started it cannot be stopped except by a reset.
_Avoid_: Window watchdog (the WWDG has a window and a different clock)

**Window watchdog (WWDG)**:
An STM32 watchdog that must be kicked inside a time window: too early and too late both reset the chip.
_Avoid_: Independent watchdog (see above)

**Kick (watchdog)**:
Clearing a watchdog's counter so it does not reset the chip.
_Avoid_: Feed (an informal synonym; use kick in the course)

**Task check-in**:
A design where each task sets its own flag when it makes progress, and a supervisor kicks the watchdog only when every flag is set.
_Avoid_: Heartbeat (a heartbeat is one signal; check-in is the set of flags)

**Stacked frame**:
The eight words the core pushes on entry to an exception: R0, R1, R2, R3, R12, LR, PC and xPSR.
_Avoid_: Stack dump (a dump is a copy of memory; the stacked frame is the hardware-pushed part)

**Naked function**:
A C function with no compiler prologue or epilogue, so that its body controls every register. Used for fault handler stubs.
_Avoid_: Assembly function (the body can still be C; naked only removes the prologue)

**Assertion (firmware)**:
A check of an invariant that logs the file and line, then stops or resets the device. Used for bugs, not for input errors.
_Avoid_: Error handling (an assertion is for a bug that should never happen)

**No-init RAM (.noinit)**:
A RAM section the startup code does not clear, so its contents survive a reset. Its contents are random after power-on.
_Avoid_: BSS (BSS is cleared at every boot)

**Reset reason**:
The flags in the reset control register that say why the chip last reset, such as software, watchdog, power-on or the reset pin.
_Avoid_: Crash cause (a reset reason is the kind of reset; the crash cause is the fault that led to it)

**Crash log**:
A ring of the last few log lines kept in no-init RAM, so the reason for a reset can be read after the reset.
_Avoid_: Log file (a crash log lives in RAM, not on disk)

## Peripherals

**Critical section**:
A stretch of code run with interrupts disabled, so that a multi-step update of shared data cannot be interrupted. On the SDK it is bracketed by save_and_disable_interrupts() and restore_interrupts().
_Avoid_: Lock (a critical section is not a mutex; it guards only against interrupts on this core)

**ADC (analogue-to-digital converter)**:
A block that converts a voltage on an input pin to an integer code. The RP2040 ADC returns 12 bits, from 0 to 4095, at 500 ksps.
_Avoid_: Analog read (informal, and Arduino's term)

**Thermistor**:
A resistor whose value changes strongly with temperature. An NTC thermistor's resistance falls as it warms.
_Avoid_: Temperature resistor (vague)

**Oversampling**:
Taking more ADC conversions than the output needs and averaging them. Averaging N readings reduces random noise by about the square root of N.
_Avoid_: Averaging (too general: a moving average is also averaging)

**PWM (pulse-width modulation)**:
A square wave whose high time is a chosen fraction of each period. The average voltage follows that fraction.
_Avoid_: Analogue output (the Pico has no DAC for this)

**Duty cycle**:
The fraction of one PWM period that the output spends high, usually given in percent.
_Avoid_: Ratio (too vague on its own)

**PWM slice**:
One of the RP2040's eight counters, each with two outputs, A and B. Both outputs of a slice share its period.
_Avoid_: Timer (a slice is a PWM counter, not a general timer)

**Wrap value (TOP)**:
The count at which a PWM slice returns to zero. The period is TOP + 1 counts, multiplied by the clock divider.
_Avoid_: Period register (TOP is a count, not a time)

**Clock divider (DIV)**:
The value by which a PWM slice slows its counter. The RP2040 divider is an 8-bit integer with a 4-bit fraction.
_Avoid_: Prescaler (on the SPI peripheral, prescale is a different parameter)

**Servo**:
A motor with a position loop that moves to an angle given by the width of a pulse, normally 1 ms to 2 ms, repeated every 20 ms.
_Avoid_: Motor (a servo is a motor with feedback and a controller)

**I2C**:
A two-wire, multi-device bus with an open-drain clock and data line, a 7-bit address and an ACK after every byte. Speeds are 100 kbit/s in standard mode and 400 kbit/s in fast mode.
_Avoid_: TWI (Atmel's name), IIC (informal)

**ACK and NACK**:
The ninth bit of an I2C or SPI-style byte acknowledgement. ACK (low) means the receiver took the byte. NACK (high) means it did not, or that a master has finished reading.
_Avoid_: Handshake (too general)

**SPI**:
A four-wire synchronous serial bus: clock, MOSI, MISO and chip select, with one master, full duplex and no addressing in the protocol.
_Avoid_: Serial (too general, UART is serial too)

**Clock polarity and phase (CPOL, CPHA)**:
The two SPI settings that choose the idle clock level (CPOL) and the edge on which data is sampled (CPHA). Together they give modes 0 to 3.
_Avoid_: Mode (alone, which hides which of the two settings is meant)

**Chip select (CS)**:
An active-low line that tells one SPI device it is addressed. Some devices also use its rising edge as a latch.
_Avoid_: Slave select (acceptable in old texts, but the course uses chip select)

**Framebuffer**:
A copy of a display's pixel memory in the MCU's RAM, drawn into and sent to the display in one update.
_Avoid_: Screen buffer (informal)

## STM32 and CMSIS

**CMSIS (Cortex Microcontroller Software Interface Standard)**:
Arm's standard for the software that every Cortex-M vendor ships: core headers for the processor, and device headers that name each peripheral's registers and bits.
_Avoid_: CMSIS-Core (use only when you mean the core headers and functions specifically)

**Device header**:
The vendor's C header for one part, such as `stm32f103xb.h`, that defines base addresses, register structs, bit masks and the interrupt numbers (IRQn) of that chip.
_Avoid_: HAL header (the HAL has its own headers, in a different layer)

**Clock gating**:
The RCC enable bit that powers a peripheral's register block. While the bit is 0, reads return garbage and writes are ignored, so the clock must be enabled before the first register access.
_Avoid_: Power gating (a different technique that removes power, not the clock)

**AFIO (alternate-function I/O)**:
The STM32F1 block that routes an external interrupt line to a pin, through the EXTICR registers, and remaps some peripheral pins. Its clock must be enabled in RCC before EXTICR is written.
_Avoid_: Alternate function (alone, which is the pin mode, not the block)

**EXTI (external interrupt controller)**:
The block that turns an edge or a level on a pin into an interrupt request. Each line takes one pin number from each port, chosen by AFIO.
_Avoid_: GPIO interrupt (informal; the request goes through EXTI and then the NVIC)

**Ring buffer**:
A fixed-size array used as a queue. A head index marks where the producer writes next, and a tail index marks where the consumer reads next, and both wrap around the array.
_Avoid_: Circular buffer (acceptable synonym, but use ring buffer in the course)

**Single-producer single-consumer queue**:
A queue with exactly one writer and one reader. If each side writes only its own index, the queue needs no lock on a single core.
_Avoid_: Lock-free (true in the strict sense only when each index access is atomic and ordered, which the course's single-core case relies on)

**Weak symbol**:
A default definition that a strong definition in another object file replaces at link time. The startup file's default interrupt handlers and the HAL's callbacks are weak.
_Avoid_: Virtual function (a C++ term with different rules)

**HAL handle**:
The struct, such as `UART_HandleTypeDef`, that holds a peripheral's instance and its configuration, and is passed to every HAL call for that peripheral.
_Avoid_: Object (the HAL is C, not C++)

**HAL_StatusTypeDef**:
The enum that most HAL functions return: `HAL_OK`, `HAL_ERROR`, `HAL_BUSY` or `HAL_TIMEOUT`. Check it, because a failed init returns an error rather than stopping.
_Avoid_: Error code (the enum has four values, not only error values)

**CubeMX (STM32CubeMX)**:
ST's graphical configurator. It writes the initialisation code for pins, clocks and peripherals, and keeps the code between `USER CODE BEGIN` and `USER CODE END` when it regenerates.
_Avoid_: STM32CubeIDE (the IDE that bundles it; a different product)

**Low-layer (LL) driver**:
The STM32 layer of thin inline functions named `LL_*`, between the HAL and raw registers. It keeps the register sequence visible, with less code than the HAL.
_Avoid_: Register access (LL still calls functions; registers are the layer below it)

## RTOS

**Task**:
An independent thread of execution with its own stack, scheduled by an RTOS. FreeRTOS says "task"; Zephyr says "thread". This course uses each RTOS's own word inside that RTOS's lessons.
_Avoid_: Process

**Scheduler**:
The part of an RTOS that decides which task runs on the CPU core next.
_Avoid_: Dispatcher (that's the part that does the switch)

**RTOS (real-time operating system)**:
An operating system whose scheduler is designed to meet deadlines, not only to share the CPU. FreeRTOS is the one this course uses on the Cortex-M3.
_Avoid_: Real-time (an RTOS is the tool; real-time is the property the design must meet)

**Response time**:
The time from when a job becomes due to when it finishes: its waiting time plus its own execution time.
_Avoid_: Latency (acceptable for an interrupt's entry time, not for a job's whole response)

**Context switch**:
Saving the registers and stack pointer of the running task, and restoring those of the next task. On the Cortex-M3 the hardware stacks R0 to R3, R12, LR, PC and xPSR, and the kernel saves R4 to R11.
_Avoid_: Task switch (acceptable in conversation), interrupt (a switch is one possible result of an interrupt)

**PendSV**:
The Cortex-M exception that the FreeRTOS port uses to perform a context switch. It is set to the lowest priority, so the switch runs after all other interrupts.
_Avoid_: SVC (SVC starts the first task in the port; it is not the switch itself)

**Idle task**:
The task the kernel creates at priority 0, which runs when no other task is ready.
_Avoid_: Background task

**Queue (RTOS)**:
A fixed-length FIFO of items that tasks and interrupts send to and receive from. Each item is copied, not referenced.
_Avoid_: Buffer (a buffer is raw memory; a queue has the kernel's send and receive rules)

**Binary semaphore**:
A semaphore with a count of 0 or 1. It signals that an event happened, and repeated gives before a take count once.
_Avoid_: Lock (a lock has an owner; a binary semaphore does not)

**Counting semaphore**:
A semaphore whose count goes up to a limit, for example the number of free buffers in a pool.
_Avoid_: Binary semaphore (with a limit above 1)

**Mutex**:
A semaphore with an owner, used to protect shared data or a bus. It supports priority inheritance, and it is for tasks, not interrupts.
_Avoid_: Binary semaphore (used as a lock; it has no owner and no inheritance)

**Event group**:
A word of flags that different sources set, and a task waits for any or all of them.
_Avoid_: Queue (an event group carries flags, not data)

**Priority inversion**:
A high-priority task waits for a resource held by a low-priority task, while a medium-priority task that does not need the resource runs. The high task then waits for work it has no part in.
_Avoid_: Starvation (starvation is a task that never runs; inversion is a bounded but unjustified wait)

**Tick**:
The periodic interrupt that the kernel uses to count time and wake delayed tasks. In this course it is 1 kHz, so one tick is 1 ms.
_Avoid_: Clock (the tick is the kernel's count; the clock is the hardware that drives it)

**Stack high-water mark**:
The fewest free words a task's stack has ever had. It is the margin the stack really used, measured from the stack fill pattern.
_Avoid_: Stack size (the size is what was allocated; the high-water mark is what remains free)

**Rate-monotonic scheduling**:
A fixed-priority scheme in which the shorter the period, the higher the priority. It is optimal among fixed-priority schemes for independent periodic tasks with deadlines equal to periods.
_Avoid_: Priority by importance (importance is not the rule; the period is)

**Utilisation bound**:
For n periodic tasks under rate-monotonic scheduling, the sum of work over period is schedulable if it is at most n(2^(1/n) − 1). It is sufficient, not necessary.
_Avoid_: CPU load (load is a measurement; the bound is a test on the design)

## Communication

**CAN (Controller Area Network)**:
A multi-master serial bus on a differential pair (CANH and CANL). Any node may start a frame, and bit-wise arbitration on the identifier decides which one keeps the bus.
_Avoid_: CAN-bus (as a synonym for the protocol), "the CAN", "canbus"

**Dominant bit**:
The logic 0 level on a CAN bus, driven by any node. A dominant bit overwrites a recessive bit, so the bus behaves as a wired AND.
_Avoid_: Active bit, 0 (without the bus context)

**Recessive bit**:
The logic 1 level on a CAN bus. The bus rests at recessive, with both wires near 2.5 V.
_Avoid_: Passive bit (a different CAN term for an error state)

**Arbitration**:
The bit-by-bit contest for a CAN bus when several nodes start a frame together. A node that sends a recessive bit and reads a dominant one stops, so the lowest identifier wins.
_Avoid_: Collision (a collision is what arbitration resolves, not the process itself)

**Bit stuffing**:
The rule that a CAN or USB transmitter inserts one bit of the opposite level after five identical bits in a row, so the receiver can keep its clock. In CAN a sixth identical bit is a stuffing error.
_Avoid_: Padding, zero stuffing (in the CAN sense; COBS is a different scheme)

**Error-passive**:
The CAN error state in which a node may send only passive error flags, entered when its error counters pass the threshold.
_Avoid_: Passive (alone, which is ambiguous with recessive)

**Bus-off**:
The CAN error state in which a node has disconnected itself from the bus after too many errors, until it recovers.
_Avoid_: Dead node (informal)

**Modbus RTU**:
The binary Modbus framing: an address, a function code, the data and a CRC-16/MODBUS, with frames marked only by a silent interval. It runs over RS-485 or a UART.
_Avoid_: Modbus (alone, which also means the application protocol), Modbus binary

**Silent interval**:
The idle time of 3.5 character times that ends a Modbus RTU frame. Above 19200 baud the serial-line specification fixes it, and the course uses 1.750 ms.
_Avoid_: Gap, timeout (a timeout is a different, longer wait)

**Holding register**:
A 16-bit Modbus register that the master can read (function 03) and write (function 06). In this course it is the slave's data table.
_Avoid_: Register (alone, which is ambiguous with a hardware register)

**CRC-16/MODBUS**:
The CRC used by Modbus RTU: reflected polynomial 0xA001, initial value 0xFFFF, no final XOR. Its check value for ASCII 123456789 is 0x4B37.
_Avoid_: CRC16 (alone, which names several variants)

**CRC-16/CCITT-FALSE**:
A CRC with polynomial 0x1021, initial value 0xFFFF, no reflection and no final XOR. Its check value for ASCII 123456789 is 0x29B1.
_Avoid_: CCITT (alone, which names several variants)

**COBS (Consistent Overhead Byte Stuffing)**:
A byte-stuffing method that removes every zero from a frame body, so 0x00 can mark frame ends. It adds at most one byte in 254, plus one.
_Avoid_: Byte stuffing (alone, which covers SLIP too)

**Frame delimiter**:
A special byte value that ends a frame on a byte stream. With COBS it is 0x00, which never appears in the encoded body.
_Avoid_: Terminator, end byte (when the scheme is COBS)

**Endpoint**:
A source or sink of data on a USB device, identified by a number and a direction. Endpoint 0 is always the control endpoint.
_Avoid_: Pipe (a pipe is the host-side view of an endpoint)

**Descriptor**:
A structure a USB device stores and the host reads at connection time. The device, configuration, interface and endpoint descriptors describe what the device is.
_Avoid_: Header (for USB descriptors)

**Enumeration**:
The host's sequence for a newly attached USB device: reset, read the device descriptor at address 0, assign an address, read the configurations, select one and load the class drivers.
_Avoid_: Discovery, detection (detection is only the attach event)

**CDC (communications device class)**:
The USB class that presents a device as a virtual serial port. The Pico's USB stdio uses it.
_Avoid_: Serial over USB (as a class name)

**Vector table offset register (VTOR)**:
The Cortex-M register that holds the address of the active exception vector table. A bootloader sets it before it hands over to an application.
_Avoid_: Vector base (informal)

**Image header**:
A fixed-size structure at the start of a firmware slot, with a magic value, a version, the image size or end address, and the vector table offset. The bootloader validates it before it boots the image.
_Avoid_: Preamble, metadata (when the header is the validated record)

**Slot**:
An area of flash that holds one firmware image. Two slots let a device keep a known-good image while it writes the new one.
_Avoid_: Partition (a partition may hold anything, not only an image)

**Rollback**:
Returning to the previous firmware image after a new one fails to confirm itself. Anti-rollback is the separate rule that refuses an older image.
_Avoid_: Downgrade (a downgrade may be deliberate and allowed)

**Root of trust**:
The first code and keys that the chip trusts without checking anything, such as the RP2350 bootrom, which verifies the next stage.
_Avoid_: Trust anchor (as a synonym in the course; use root of trust)

**STRIDE**:
A threat-modelling checklist with six categories: Spoofing, Tampering, Repudiation, Information disclosure, Denial of service and Elevation of privilege.
_Avoid_: Threat list (STRIDE is a set of categories, not a list of threats)

**Readout protection**:
A chip setting that stops a debugger or a bootloader from reading the flash contents back. On the STM32F1 it is the read-protection level in the option bytes, reported by FLASH_OBR_RDPRT.
_Avoid_: Encryption (readout protection does not encrypt the flash)

## Embedded Rust

**no_std**:
A Rust crate attribute that drops the standard library, which assumes an operating system. A bare-metal Rust program declares it, and supplies its own panic handler and entry point.
_Avoid_: Freestanding (a different C term), bare metal (informal)

**PAC (peripheral access crate)**:
A crate of register structs and interrupt numbers generated from a chip's SVD description, for example rp2040-pac. It gives typed access to registers, with no safety rules beyond the register layout.
_Avoid_: HAL (a HAL is a higher layer with safe, typed operations)

**Peripheral singleton**:
The pattern in which the PAC's Peripherals::take() returns Some only on its first call, so that one owner can hold each peripheral. A second call returns None.
_Avoid_: Global peripheral (a singleton is taken once, not shared)

**Type-state**:
Encoding a value's state in its type, so that an operation invalid in that state does not compile. A GPIO pin configured as an input has a type that has no set_high method.
_Avoid_: State machine (a runtime structure, not a compile-time check)

## Course method

**Retrieval practice**:
Bringing an answer to mind from memory, as in a quiz, instead of rereading the material.
_Avoid_: Rereading (a weaker method)

**Spaced review**:
Returning to earlier material after a gap, so the memory is rebuilt each time it is recalled.
_Avoid_: Cramming

**Interleaving**:
Mixing different topics or problem types in one session, so each problem makes you choose the method.
_Avoid_: Blocked practice (one topic at a time)

**Desirable difficulty**:
A challenge that slows practice down but makes the learning last, such as retrieving an answer before checking it.
_Avoid_: Difficulty for its own sake

**Fluency**:
How easily you perform or recall something right now, which can rise without lasting learning behind it.
_Avoid_: Mastery (fluency is what you see during practice, not proof of it)

**Storage strength**:
How well something is learned in long-term memory, built by retrieval effort and kept over time.
_Avoid_: Retrieval strength (how easily an item is reached right now)

**Aliasing**:
The false lower frequency that a signal above half the sample rate takes after sampling. It happens in the sampling, so a digital filter cannot remove it afterwards.
_Avoid_: Folding (a synonym, acceptable only in the explanation), distortion (too general)

**Nyquist frequency**:
Half the sample rate. A signal must stay below it, or it aliases.
_Avoid_: Cutoff (the cutoff of a filter is a different number)

**Sample rate**:
The number of samples per second that a converter takes. It sets the highest frequency that can be represented without aliasing, which is the Nyquist frequency.
_Avoid_: Sampling frequency (acceptable in datasheets)

**Moving average**:
A filter whose output is the mean of the last N samples, kept in a ring buffer with a running sum, so each update costs the same whatever N is. It is a finite impulse response (FIR) filter.
_Avoid_: Averaging (too general: oversampling is also averaging)

**IIR filter (infinite impulse response)**:
A filter whose output feeds back its own previous output, so its memory never ends. The first-order exponential moving average is the simplest case.
_Avoid_: Recursive filter (acceptable in the DSP literature, but use IIR in this course)

**Exponential moving average**:
A first-order IIR filter, y += (x - y) × alpha, with alpha = 1 / 2 to the power k so that the update is a shift. Its time constant is about 2 to the power k samples.
_Avoid_: Low-pass filter (the EMA is one low-pass filter; the term covers all of them)

**Median filter**:
A filter whose output is the median of the last N samples. It removes single-sample spikes completely, but adds a delay of about half the window.
_Avoid_: Mean filter (the mean of the same window spreads a spike instead of removing it)

**Dead band (filter)**:
A range of inputs for which a fixed-point filter's update rounds to zero, so its output stops short of the input. Extra fractional bits in the state shrink it.
_Avoid_: Dead zone (acceptable in control texts)

**PID controller**:
A feedback controller whose output is a proportional term, plus an integral of the error, plus the derivative of the measurement, each times its gain.
_Avoid_: PID loop (acceptable for the running program)

**Setpoint**:
The value a control loop is trying to reach, such as the target temperature.
_Avoid_: Target (acceptable in conversation)

**Plant**:
The physical process a controller acts on, such as a heater, a motor or a dryer.
_Avoid_: System (too vague, since the controller is also part of the system)

**Settling time**:
The time after which a controlled value stays within a stated tolerance of the setpoint.
_Avoid_: Response time (the time to the first reach, which is a different measure)

**Overshoot**:
How far the controlled value goes past the setpoint on its way there, in the units of the value.
_Avoid_: Peak (the peak is the value itself, the overshoot is the excess over the setpoint)

**Integral windup**:
The growth of the integral term while the output is saturated, which makes the response overshoot when the error changes sign.
_Avoid_: Integrator wind-up (acceptable spelling variant in texts)

**Anti-windup clamp**:
A limit on the integral term to the output range, so the integral cannot store more than the actuator can use.
_Avoid_: Clamping (too general: the output is clamped too)

**Derivative kick**:
A sudden output spike caused by differentiating the error when the setpoint steps. Differentiating the measurement avoids it.
_Avoid_: Derivative spike (acceptable informally)

**Ziegler-Nichols tuning**:
A closed-loop tuning method: raise the proportional gain until the loop oscillates steadily, then set the gains from the ultimate gain and period. It is a starting point, not a finished tune.
_Avoid_: Auto-tune (a different, automated method)

**KiCad**:
A free, open-source EDA suite. Eeschema draws schematics and Pcbnew lays out boards.
_Avoid_: Eagle (a different, commercial tool)

**ERC (electrical rules check)**:
The schematic check that finds unconnected pins, conflicting outputs and missing power flags.
_Avoid_: DRC (checks the board's copper, not the circuit)

**DRC (design rules check)**:
The layout check that tests clearances, track widths and drill sizes against the design rules.
_Avoid_: ERC (checks the schematic)

**Netlist**:
The list of connections between pins that a schematic defines, and that the board layout must match.
_Avoid_: Wiring list (informal)

**Gerber file**:
The standard file format for one copper, mask or silkscreen layer, which a board factory builds from.
_Avoid_: PCB file (the KiCad board file is a different thing)

**Application processor**:
A microprocessor with an MMU and external memory that runs an operating system such as Linux. Compare with a microcontroller, which runs bare-metal or an RTOS.
_Avoid_: MPU (in this course MPU means the memory protection unit)

**PREEMPT_RT**:
A patch set for the Linux kernel that makes it preemptible almost everywhere, which lowers its scheduling latency. It does not make Linux an RTOS for microsecond work.
_Avoid_: Real-time Linux (too general: stock Linux also has real-time scheduling classes)

**Buildroot**:
A tool that generates a small embedded Linux system (toolchain, root filesystem, kernel and bootloader) from one configuration.
_Avoid_: Yocto (a different build system with layers and recipes)

**Yocto Project**:
A community project for building custom embedded Linux systems from layers and recipes. More flexible than Buildroot, with a steeper learning curve.
_Avoid_: Buildroot (a simpler tool)

**Host and MCU split**:
The architecture of a system where a Linux host plans the work and a microcontroller does the timing-critical part, as in Klipper.
_Avoid_: Hybrid (a looser term; use it for the general case)

**Functional safety**:
The discipline of showing that an electrical or electronic system does not create unreasonable risk from its malfunctions, by analysis, design and evidence.
_Avoid_: Safety (too broad: it includes physical safety measures outside the electronics)

**SIL (safety integrity level)**:
The four levels of IEC 61508, from SIL 1 to SIL 4, for the target rate of dangerous failures. SIL 4 is the most stringent.
_Avoid_: ASIL (the automotive scale in ISO 26262; the two do not correlate directly)

**ASIL (automotive safety integrity level)**:
The four levels of ISO 26262, from ASIL A to ASIL D, for automotive functions. ASIL D is the most stringent.
_Avoid_: SIL (the IEC 61508 scale)

**HARA (hazard analysis and risk assessment)**:
The first safety step: list the hazards of each function, rate severity, exposure and controllability, and derive the integrity level.
_Avoid_: FMEA (a different analysis of failure modes)

**V-model**:
The development lifecycle that goes down from requirements to code, then back up with a test that matches each level.
_Avoid_: Waterfall (the model without the matching tests)

**Safety case**:
A structured argument, with evidence, that a system is acceptably safe for its stated hazards.
_Avoid_: Test report (the evidence is one part of the case)

**Safety mechanism**:
A piece of hardware or software that detects a fault and moves the system to a safe state, such as a watchdog, a RAM self-test or a plausibility check.
_Avoid_: Safety feature (informal)

**Plausibility check**:
A test that a sensor value is physically possible, given its last value and the physics of the process.
_Avoid_: Range check (only tests the limits, not the change)

**March test**:
A RAM self-test that walks every address in both directions, writing and reading 0 and 1 patterns, to find stuck-at and coupling faults.
_Avoid_: Memory test (too general)

**Stuck-at fault**:
A bit or line that always reads 0 (stuck-at-0) or always 1 (stuck-at-1), whatever was written.
_Avoid_: Dead bit (informal)

**Safe state**:
The state a system moves to when a fault is detected, chosen so that no harm results, such as a heater off or a brake applied.
_Avoid_: Fail-safe (acceptable synonym in industry)

**Beta equation**:
The model of an NTC thermistor's resistance against temperature, 1/T = ln(R/R25)/B + 1/T25, with B the beta constant (3950 K is the Wokwi default) and T in kelvin. Inverting it turns a measured resistance into a temperature.
_Avoid_: Steinhart-Hart (a three-term model that fits more accurately, and is a different equation)

**Bootloader**:
A small program that runs first after reset, checks the application image, and jumps to it. It lets the application be updated in the field without a debugger.
_Avoid_: Monitor (a debug monitor is a different thing), boot loader (acceptable, but use one word here)

**Heater runaway**:
A fault where the heater is at full power and the temperature does not rise by a set amount within a set time. It means the heater, its wiring or the sensor has failed. Klipper's verify_heater check does this on printers.
_Avoid_: Thermal runaway (the general failure of a device that heats itself, which the check is meant to catch)

**Hysteresis (control)**:
A dead band in a switching controller: it turns on below the setpoint minus a band and off above the setpoint plus a band, so it does not chatter at the setpoint.
_Avoid_: Deadband (the same idea in filters means something else, lesson 104)

**Derivative on measurement**:
A PID derivative term computed from the measured value, not the error. A setpoint step then does not kick the output.
_Avoid_: Derivative on error (the version that does kick the output on a step)

**Closed loop**:
A control system whose output is set from a measurement of the quantity it controls. The loop is closed through the sensor.
_Avoid_: Feedback (too general: a closed loop is one kind of feedback)

**Safety monitor**:
A task or function that checks the published state of the control code and cuts the actuators when a limit is exceeded. It runs at the highest priority and does not share the control code's logic, so a bug there cannot disable it.
_Avoid_: Supervisor (in some RTOS texts, the same role under a broader meaning)

**Stale sample**:
A sensor reading that is older than the control period allows. A control loop that stops producing samples leaves the last one behind, which is why the safety monitor checks its age.
_Avoid_: Old data (too vague to test for)

**RFC 2217**:
A standard for serial ports over TCP. The Wokwi simulator serves its serial line on a TCP port with it, so a host script can talk to the simulated board. The port is set with rfc2217ServerPort in wokwi.toml.
_Avoid_: Serial over IP (the general idea, not the protocol)

**STAR method**:
A four-part answer to a behavioural question: Situation, Task, Action and Result. The Action should say what you did, and the Result should be measured.
_Avoid_: Storytelling (too loose; STAR is a checklist for the answer)
