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

**Pull-down resistor**:
A resistor connecting a signal line to ground, so the line reads logic low when nothing actively drives it high. Its current flows from the driving pin through any series resistor.
_Avoid_: Bias resistor

**Schmitt trigger**:
An input circuit with two thresholds, one for rising and one for falling edges. The gap between them, the hysteresis, stops a slow or noisy edge from making the input flip back and forth.
_Avoid_: Hysteresis input (say Schmitt trigger for the circuit and hysteresis for the gap)

**Thermal resistance**:
The temperature rise per watt of power on a heat path, written R<sub>θ</sub> in °C/W. A datasheet gives junction to case (for sizing a heatsink) and junction to ambient (the part on its own).
_Avoid_: Heat resistance (informal)

**Gate charge**:
The total charge, Q<sub>g</sub> in nanocoulombs, that the gate driver must move to switch a MOSFET. A driver's current sets how long the switch takes: t = Q<sub>g</sub> ÷ I.
_Avoid_: Gate capacitance (a different, smaller quantity, C<sub>iss</sub>)

**Buck-boost converter**:
A switching regulator that steps the voltage down or up, depending on its input, while holding a fixed output. The Pico's 3.3 V regulator is one.
_Avoid_: Buck-boost SMPS (say buck-boost converter)

**Overdrive voltage**:
The gate-source voltage above a MOSFET's threshold, written V<sub>ov</sub> = V<sub>GS</sub> − V<sub>GS(th)</sub>. The channel's current and on-resistance depend on it, not on the gate voltage alone.
_Avoid_: Gate drive (which is the gate voltage itself)

**Local label**:
A net label in a KiCad schematic that connects points only within the sheet it is drawn on.
_Avoid_: Wire label (informal)

**Global label**:
A net label in a KiCad schematic that connects points with the same name anywhere in the schematic, across sheets.
_Avoid_: Global net (say global label)

**Conductance (G)**:
The reciprocal of resistance, measured in siemens (S). Conductances add in parallel, so 1/R<sub>total</sub> = 1/R1 + 1/R2 is the sum of the two conductances.
_Avoid_: Conductivity (a material property, not a component property)

**Steady state**:
The condition in which a component's temperature has stopped rising because the heat leaving it equals the power going in.
_Avoid_: Equilibrium (too broad in this course)

**Band gap**:
The energy step a semiconductor's electron drops through when it recombines. A larger band gap gives a shorter wavelength of light, so it sets an LED's colour and its forward voltage.
_Avoid_: Bandgap (acceptable spelling in other sources)

**Drive strength**:
The output current a GPIO pad is set to supply, chosen from 2, 4, 8 or 12 mA on the RP2040. The default is 4 mA. It is a nominal setting, not a hard limit.
_Avoid_: Output current (the pin may supply less or more depending on the load)

**Loop**:
Any closed path through a circuit that starts and ends at the same node. Kirchhoff's voltage law says the voltage rises and drops around every loop sum to zero.
_Avoid_: Mesh (acceptable only in network-analysis texts)

**Inductor**:
A coil of wire that opposes a change in its current. Its voltage is V = L × di/dt, and it stores energy as ½ × L × I².
_Avoid_: Choke (a specific use of an inductor, acceptable only for a choke's role in a filter), coil (informal, acceptable for a relay or motor winding)

**Inductance (L)**:
The property of an inductor that sets how much voltage a given rate of current change produces, measured in henries (H).
_Avoid_: Inductor (the part, not the property)

**Capacitor**:
Two conductors separated by an insulator, which store charge Q = C × V. Its current is i = C × dV/dt, so its voltage cannot change in zero time.
_Avoid_: Condenser (old term), cap (informal)

**Capacitance (C)**:
The ratio of charge to voltage for a capacitor, measured in farads (F). Practical values are µF, nF and pF.
_Avoid_: Capacity (ambiguous)

**Relay**:
An electromechanical switch in which a coil, when energised, pulls a contact closed or open. The coil is an inductive load, so it needs a flyback diode or a snubber.
_Avoid_: Contactor (a relay for higher currents, acceptable in industrial contexts)

**Back-EMF**:
The voltage a motor generates while it spins, which opposes the supply and reduces the running current below the stall current.
_Avoid_: Inductive kickback (a different effect, from the coil's own inductance)

**Loading**:
The reduction of a circuit's voltage or change of its current caused by a meter or the next stage drawing current from it. A meter with a low input resistance in parallel with a divider's lower resistor pulls its reading down.
_Avoid_: Burden (which is the ammeter's own voltage drop)

**Burden voltage**:
The small voltage an ammeter drops across its own internal resistance, which slightly reduces the current in the circuit it measures.
_Avoid_: Loading (which describes a voltmeter or a load drawing current from a node)

**Overdrive**:
The gate-source voltage above a MOSFET's threshold, V_GS − V_GS(th). The drain current in saturation rises with the square of the overdrive.
_Avoid_: Gate voltage (which is the full V_GS, not the amount above threshold)

**Gate charge (Q_G)**:
The charge a MOSFET gate must receive to take it to a stated gate voltage, given on the datasheet in nanocoulombs. Switching time is about Q_G ÷ the drive current.
_Avoid_: Gate capacitance (a different measure, given as Ciss in picofarads)

**Thermal resistance (R_θJA)**:
The temperature rise of a device's junction above the ambient air per watt dissipated, in °C/W, with no heatsink. The junction-to-case value, R_θJC, applies when the case is held by a heatsink.
_Avoid_: Heat sink resistance (the heatsink has its own value)

**Forced gain**:
The ratio I_C ÷ I_B that a base current is designed to give, usually about 10 for a switch. It is below the transistor's real gain, so the switch stays saturated when the gain varies.
_Avoid_: Current gain (which is the real β, not the design ratio)

**Active region**:
The operating region of a BJT in which the collector current follows the base current in proportion. A switch should not stay here, because the transistor dissipates heavy power.
_Avoid_: Linear region (acceptable for amplifiers)

**Crystal oscillator (XOSC)**:
A quartz crystal and its driver circuit, which give an accurate reference clock. Software must start it and wait for it to settle before the clock is used.
_Avoid_: Crystal (alone, when a clock source is meant)

**Ring oscillator (ROSC)**:
An on-chip oscillator made from a loop of logic gates. It needs no external part and runs from power-up, but its frequency moves with voltage and temperature, so it is only approximately known.
_Avoid_: RC oscillator (the STM32 HSI is also an RC design, so the name does not tell the two apart)

**HSI (high-speed internal oscillator)**:
The STM32F1's internal 8 MHz oscillator. The system clock uses it straight after reset.
_Avoid_: Internal clock (too broad: the RP2040 also has internal oscillators)

**HSE (high-speed external oscillator)**:
The STM32F1's external crystal input. The header limits it to 4 to 16 MHz. The Blue Pill uses an 8 MHz crystal.
_Avoid_: External clock (also used for a clock signal driven from outside the chip)

**VCO (voltage-controlled oscillator)**:
The high-frequency oscillator inside a PLL. The feedback divider sets its frequency, and it must stay in its legal range (750 to 1600 MHz on the RP2040). It is not the clock the core runs from.
_Avoid_: System clock (the output after the post-dividers is the system clock)

**Post-divider**:
A divider after the VCO in a PLL. It sets the output frequency that the clock tree uses, and on the RP2040 there are two of them, POSTDIV1 and POSTDIV2.
_Avoid_: Output divider (acceptable, but this course uses post-divider)

**SystemCoreClock**:
The CMSIS variable that holds the core clock frequency in hertz. Call SystemCoreClockUpdate() after any clock change, so the variable matches the registers.
_Avoid_: HCLK (the same frequency under ST's name, but the variable is the one code reads)

**SWS (system clock switch status)**:
The RCC_CFGR field, bits 3 and 2 on the STM32F1, that reports which source drives the system clock: 0 for HSI, 4 for HSE and 8 for the PLL.
_Avoid_: Clock source select (that is SW, the request, which is a different field)

**Falling edge**:
The change of a signal from 1 to 0. A negative-edge flip-flop copies its input on this edge, and an SPI device sampling on the second edge of an idle-low clock uses it.
_Avoid_: Trailing edge (acceptable in timing diagrams)

**Differential pair**:
Two wires that carry one signal as the voltage difference between them, such as CANH and CANL or A and B. Noise that reaches both wires equally cancels in the difference.
_Avoid_: Differential line (acceptable in conversation), balanced pair (acceptable in TI text)

**Common-mode voltage**:
The voltage that two wires of a differential pair share, or the difference between the grounds of two nodes that a bus must tolerate. A differential receiver ignores it.
_Avoid_: Common mode (without "voltage" in formal text)

**Termination (bus)**:
A resistor at each end of a cable, matched to the cable's characteristic impedance, so that signals do not reflect back along it. CAN and RS-485 buses use 120 Ω at each end.
_Avoid_: Pull resistor (a pull sets a default level, it does not stop reflections)

**Half-duplex**:
A link in which one pair of wires carries traffic in both directions, but only one end may drive it at a time.
_Avoid_: Simplex (one direction only), full-duplex (both directions at once)

**Schematic**:
The drawing of a circuit as symbols for its parts, joined by wires and labelled nets. It defines the connections that the board must match.
_Avoid_: Circuit diagram (acceptable informally), netlist (the list of connections, not the drawing)

**Footprint**:
The copper pads and outline on a board that a part is soldered onto, taken from the package drawing in its datasheet. Each schematic symbol is linked to one footprint.
_Avoid_: Package (the part's case, not the board's pattern)

**Trace**:
A strip of copper on a board that carries a signal or a supply between pads.
_Avoid_: Track (acceptable in KiCad's own menus), wire (the schematic's line, not the copper)

**Ground pour**:
A large area of copper on a board, filled with the ground net, that gives every signal a low-impedance return path beneath it.
_Avoid_: Ground plane (the same idea on an inner layer of a multilayer board), copper fill (too general)

**PCB (printed circuit board)**:
The physical board: insulating core with copper layers, drilled and coated, with the parts soldered to it.
_Avoid_: PCB file (in KiCad, the board layout file, which is a different thing from the board itself)

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

**Immediate**:
A constant written into an instruction's encoding, such as the 5 in `MOVS R0, #5`. Its field width limits the values it can hold.
_Avoid_: Literal (a literal pool is a separate thing, a word in flash that holds a constant too large for an immediate)

**Halfword**:
Sixteen bits, two bytes. A 16-bit Thumb instruction is one halfword, and the Cortex-M reads instructions a halfword at a time.
_Avoid_: Short (a C type name, not the unit of an instruction)

**Speculative fetch**:
The fetch of instructions after a conditional branch before its outcome is known. The core keeps the fetches if the branch falls through and flushes them if it is taken.
_Avoid_: Prediction (a broader term that also covers branch predictors)

**Throughput**:
The number of instructions a pipeline completes per cycle in steady state. Pipelining raises throughput while leaving the latency of one instruction about the same.
_Avoid_: Speed (too vague)

**Latency (instruction)**:
The number of cycles one instruction takes from fetch to completion in a pipeline. It is larger than one in a pipelined core even though throughput is one per cycle.
_Avoid_: Delay (informal)

**Caller and callee**:
The caller is the function that makes a call, and the callee is the function that is called. The calling convention divides the duties between them.
_Avoid_: Client and server (a different pair of roles)

**Preserved register**:
A register that the AAPCS requires a callee to restore before it returns: R4 to R8, R10, R11 and SP. A caller can rely on its value after the call.
_Avoid_: Callee-saved (acceptable in other calling conventions, but say preserved under the AAPCS)

**Scratch register**:
A register a function may change without saving it. Under the AAPCS these are R0 to R3 and R12, and the argument and result registers are scratch.
_Avoid_: Temporary register (informal)

**Disassembly**:
The listing of machine code printed from an ELF file, where each line has an address, the raw bytes and the instruction they decode to. `arm-none-eabi-objdump -d` produces it.
_Avoid_: Decompilation (rebuilds C-like source from machine code, which the course does not do)

**INVSTATE**:
The fault raised when the core runs an instruction while the T bit in xPSR is clear, which happens after a branch to an address whose bit 0 is 0.
_Avoid_: Thumb fault (informal)

**Thumb state bit (T bit)**:
Bit 24 of xPSR, which must be set for the core to run Thumb code. An interworking branch sets or clears it from bit 0 of the target address.
_Avoid_: Thumb flag (it is a state bit, not a condition flag)

**STKALIGN**:
The bit in the Cortex-M3 Configuration Control Register that makes exception stack frames 8-byte aligned, so that the stack meets the AAPCS rule SP mod 8 = 0 at a public interface.
_Avoid_: Stack alignment bit (say STKALIGN, the register bit's name)

**Cross-compiler**:
A compiler that runs on one kind of processor (the host) and produces machine code for another (the target), such as `arm-none-eabi-gcc` on a Windows PC.
_Avoid_: Cross toolchain (acceptable in conversation)

**Object file**:
The output of the compiler for one source file: machine code and a symbol table, with calls to other files left unresolved. It cannot run until the linker joins it into an ELF file. Usually named `.o`.
_Avoid_: Binary (too vague)

**Symbol table**:
The list in an object or ELF file of the names it defines and the names it needs, with their addresses once the linker has placed them.
_Avoid_: Symbols (acceptable in informal use)

**Driver**:
Code that talks to one piece of hardware, such as a display or a sensor, and hides its register details behind a few functions.
_Avoid_: Library (a driver is one kind of library)

**Sensor**:
A component that turns a physical quantity into an electrical signal, such as a thermistor whose resistance changes with temperature.
_Avoid_: Probe (informal)

**Actuator**:
A component that turns an electrical signal into motion, heat or another physical effect, such as a motor, heater or relay.
_Avoid_: Output device (too vague)

**Hard real-time**:
A deadline where a late result is wrong, such as a motor step pulse that must fire at its scheduled time.
_Avoid_: Real-time (alone, when the deadline type matters)

**Soft real-time**:
A deadline where a late result is worse but still usable, such as a web page that loads late.
_Avoid_: Best effort (a different idea with no deadline)

**Bring-up**:
The first power-on and check of a new board, done pin by pin with a meter, scope or logic analyzer, and with simple test code.
_Avoid_: Commissioning (acceptable in industry)

**Period**:
The time for one complete cycle of a repeating signal, in seconds. Frequency is 1 ÷ period.
_Avoid_: Cycle time (ambiguous)

**Frequency**:
The number of complete cycles per second, in hertz (Hz). It is the inverse of the period.
_Avoid_: Rate (too vague)

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

**Bus**:
A set of wires and a protocol that carry an address, data and a control signal from a master to a slave.
_Avoid_: Interconnect (acceptable in fabric descriptions, but this course says bus)

**Bus master**:
A device that starts a bus transfer, such as the core or a DMA controller.
_Avoid_: Initiator (the same idea in some specifications)

**Bus slave**:
A device that answers a bus transfer, such as a memory or a peripheral register block.
_Avoid_: Target (acceptable in some specifications)

**AHB-Lite**:
The high-speed bus protocol that the RP2040 datasheet uses for its main crossbar. The fabric adds no wait states to an AHB-Lite slave access.
_Avoid_: AHB (the course uses the name the RP2040 datasheet uses)

**Cache**:
A small, fast copy of recently used memory, placed between the core and a slower memory. A read either hits the copy or misses and goes to the slower memory.
_Avoid_: Buffer (a buffer holds data in transit, not data kept for reuse)

**Cache hit**:
A read whose data is already in the cache. The RP2040 XIP cache hit costs one cycle.
_Avoid_: Cache read (too vague)

**Cache miss**:
A read whose data is not in the cache, so it goes to the slower memory, and the cache keeps a copy.
_Avoid_: Cache fail (a miss is normal, not a failure)

**Set-associative cache**:
A cache in which each address maps to one set of entries, and the address may sit in any entry of that set. A two-way set-associative cache has two entries per set.
_Avoid_: Direct-mapped (the one-entry-per-set case)

**CONTROL register**:
The Cortex-M register that holds the privilege bit (bit 0, nPRIV) and the stack-select bit (bit 1, SPSEL) for thread mode. Only a handler can make thread mode privileged again.
_Avoid_: Mode register (the mode is not stored in CONTROL)

**SVC (supervisor call)**:
The instruction that raises the SVCall exception, which is number 11. Unprivileged code uses it to ask a privileged handler for a service.
_Avoid_: Syscall (acceptable in other texts, but this course says SVC)

**Bootrom**:
Read-only memory on the chip, fixed at manufacture, that runs first after reset. On the RP2040 it is 16 kB at 0x00000000.
_Avoid_: Bootloader (the bootrom loads a program, which may or may not be a bootloader)

**Section (linker)**:
A named group of bytes in the output file, such as .text, .rodata, .data or .bss, that the linker script places in a memory region.
_Avoid_: Segment (a loader term that can group several sections)

**Thumb bit**:
Bit 0 of a function address in C, set to mark Thumb code. The code itself starts at the even address, so a printed function address ends in 1.
_Avoid_: Odd address (the bit is a marker, not the location)

**Deadline**:
A stored time at which an action must happen next. The loop compares the current time with it, and after the action it advances the stored value from its old value, not from the current time.
_Avoid_: Timeout (when the check repeats)

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

**Propagation delay**:
The time a gate or pin takes to change its output after an input changes. A datasheet gives it in nanoseconds, and it grows as the supply voltage falls. A test bench must wait for it before it reads an output.
_Avoid_: Delay (too vague: it could mean any wait), latency (a term for whole pipelines and buses)

**Ripple-carry adder**:
A row of full adders in which the carry out of each stage feeds the carry in of the next. Its delay grows with the width, because the carry must cross every stage.
_Avoid_: Carry chain (informal), serial adder (a different circuit that adds one bit per clock)

**One-hot**:
A code in which exactly one bit is 1. A decoder's outputs are one-hot, so each output can select one device.
_Avoid_: Enable line (an enable is an input that switches a block on or off)

**Sign extension**:
Copying a signed value to a wider type by filling the new upper bits with the value of the old sign bit, so the number does not change. Copying an unsigned value fills the upper bits with zeros instead.
_Avoid_: Widening (which is the general term for any wider copy)

**Binary point**:
The position that separates the integer bits from the fraction bits in a fixed-point number. In fixed point it stays in one place, and the programmer keeps track of it.
_Avoid_: Decimal point (correct only for decimal numbers)

**Saturating arithmetic**:
Arithmetic that clamps a result to the largest or smallest value the type holds, instead of wrapping around. It is the usual choice for control loops and filters.
_Avoid_: Clipping (informal), overflow protection (too vague)

**CMake**:
A build-description tool. A `CMakeLists.txt` file names the sources, programs and libraries, and CMake writes the commands that the build tool runs.
_Avoid_: Make (a different build tool)

**Ninja**:
A fast build tool that runs the compile and link commands CMake writes into `build.ninja`, rebuilding only what has changed.
_Avoid_: Make (a different build tool)

**Pico SDK**:
Raspberry Pi's C library and build support for the RP2040 and RP2350 chips. Version 2.3.1 is used in this course. It provides functions such as `gpio_put`, `sleep_ms` and `stdio_init_all`.
_Avoid_: Pico library (informal)

**Environment variable**:
A named text value that the operating system passes to each program it starts, such as `PICO_SDK_PATH`.
_Avoid_: Config (too vague)

**Git submodule**:
A separate git repository stored inside another at a fixed commit. A plain clone does not download it; `git submodule update --init` does.
_Avoid_: Subrepo

**PATH**:
The environment variable listing the folders a terminal searches when you type a program name. An installer changes it only for terminals opened afterwards.
_Avoid_: Path (ambiguous with file paths)

**Package manager**:
A tool, such as winget, Homebrew or apt, that installs software from a central list by exact package ID.
_Avoid_: Installer (an installer is one package; the package manager is the tool that runs them)

**.data section**:
The section for initialised writable globals. Its run address is in RAM, and its starting bytes are stored in flash at the load address, from which startup code copies them.
_Avoid_: Initialised data (acceptable in prose, but use .data for the section)

**.bss section**:
The section for zero-initialised globals. Startup code clears it, and no bytes for it are stored in flash.
_Avoid_: Zero-initialised data (acceptable in prose, but use .bss for the section)

**Preprocessor**:
The first build stage. It expands #include lines and macros as text, before the compiler runs, and it knows nothing about types or registers.
_Avoid_: Compiler (the compiler is the next stage)

**Object file (.o)**:
The assembler's output: machine code and data for one source file, with symbols whose final addresses the linker has not yet set.
_Avoid_: Binary (an object file is not a runnable image)

**Map file**:
The text file the linker writes, which lists each section and symbol with its address and load address. The STM32 template writes it as blink.map.
_Avoid_: Symbol table (the ELF file holds the symbol table; the map file is a report)

**Intel HEX**:
A text format that records each byte with its address, so a programmer can write a chip from it. The STM32 template makes one with objcopy.
_Avoid_: Hex file (ambiguous with a hexadecimal number)

**Startup code**:
The assembly that runs from reset, before main(). It sets the stack, calls the clock setup, copies .data from flash to RAM, clears .bss, and calls the C library's initialisers and then main.
_Avoid_: Boot code (which often means the bootrom or boot2)

**Default_Handler**:
The infinite loop that every unused vector table entry points at. A debugger that stops there usually means an interrupt or fault had no handler of its own.
_Avoid_: Hard fault (a different handler)

**Second-stage bootloader (boot2)**:
The RP2040 code that configures the external flash interface. The bootrom copies it into SRAM and runs it, and it is the only job of that stage.
_Avoid_: Bootloader (too broad: the UF2 bootloader is also in the bootrom)

**Reset value**:
The value a register holds after reset, given in the register's table in the reference manual. Header files do not carry reset values.
_Avoid_: Default value (a software default is set by code, not by the chip)

**Reference manual**:
The vendor document that specifies each peripheral's registers, bit fields and reset values. It has priority over the device header, and the errata sheet lists where the chip differs from it.
_Avoid_: Datasheet (the datasheet covers electrical limits and pinout, the reference manual covers registers)

**System Control Block (SCB)**:
The block of Cortex-M core registers, at 0xE000ED00 on the Cortex-M3, that holds the fault status registers, the vector table offset register and system control bits.
_Avoid_: System control register (the SCB is a block of several registers)

**Configurable fault status register (CFSR)**:
The SCB register at offset 0x28 that packs the MemManage, BusFault and UsageFault status bits into three byte-wide groups.
_Avoid_: Fault register (ambiguous: there is also HFSR)

**MemManage fault**:
The Cortex-M3 fault for memory protection violations, raised by the MPU. The M3 MPU is optional, and the STM32F103 has none.
_Avoid_: MPU fault (the MPU is the unit, MemManage is the exception)

**BusFault**:
The Cortex-M3 fault for errors the bus reports back to the core, such as an access to an address with no device behind it.
_Avoid_: Bus error (acceptable in prose, but BusFault is the exception name)

**UsageFault**:
The Cortex-M3 fault for instruction-level problems, such as an undefined instruction or an unaligned access, when that fault is enabled.
_Avoid_: Software fault (too vague)

**Application note**:
A short vendor document that shows one correct way to use a block, such as a recommended circuit, a power-up sequence or a peripheral setup. It is not a specification, so check its register values against the datasheet.
_Avoid_: Reference design (the circuit itself, which an application note may describe)

**Datasheet**:
The vendor's description of a chip: pins, electrical limits, clocks and the registers of each peripheral. Where a reference manual exists, it holds the longer register descriptions.
_Avoid_: Spec sheet (informal)

**Silicon revision**:
A version of the physical chip, marked by a letter or number such as B0, B1 or B2, which the vendor uses when it fixes a bug. Two parts with the same name can differ in revision.
_Avoid_: Chip version (too vague, since a bootrom version is a different number)

**Density (STM32F1)**:
The flash size class of an STM32F1 part: medium density (8 and B suffixes) or high density (C, D and E). Errata sheets and some features differ between densities.
_Avoid_: Size (too vague, since it also means package size)

**Switch-based state machine**:
A state machine written as a switch on the state, with an if or nested switch on the event inside each case. The rules read like the diagram, but a missing event for a state is easy to overlook.
_Avoid_: Nested-if machine (too vague)

**Table-driven state machine**:
A state machine whose rules are a static const two-dimensional array indexed by state and event, with one dispatch function that applies them. A missing cell is visible from the table's shape.
_Avoid_: Lookup-table machine (the table is a transition table; see Transition table)

**Dispatch (state machine)**:
The function that takes the current state and one event, looks up the next state, and applies the change: it prints the transition, updates the outputs and restarts the timer. It runs once per event.
_Avoid_: Dispatcher (in the RTOS sense, which is the scheduler; see Scheduler)

**Run address**:
The address where a section's variables are read and written while the program runs. For .data on Cortex-M it is in RAM, and the startup code copies the initial values there from the load address in flash.
_Avoid_: Virtual address (informal), destination address

**Write-1-to-clear (W1C)**:
A status bit that reads 1 while its event is pending, and that is cleared by writing a 1 to it. Writing a 0 leaves the bit unchanged, so a read-modify-write is not needed to clear it.
_Avoid_: Write-to-clear (does not say which value clears the bit)

**Free-running counter**:
A counter that increases on every tick and wraps at its maximum value, and that is used as an index only after masking. Differences of two such counters are correct across the wrap when they are computed in the counter's own width.
_Avoid_: Wrapping index (a masked counter is an index, the counter itself is not)

**Overrun error (ORE)**:
A USART status flag set when a new byte arrives before the previous one has been read, so the older byte is lost. Clearing it needs a read of the status register followed by a read of the data register.
_Avoid_: Buffer overflow (that is a software ring buffer condition, which is a different event)

**Active low**:
A signal or LED that is asserted, or lit, when its pin is at logic 0. An LED on the Blue Pill's PC13 is active low, because it lights when the pin is driven low.
_Avoid_: Inverted (ambiguous: says the logic is flipped, not which level is the active one)

**Active high**:
A signal or LED that is asserted, or lit, when its pin is at logic 1. The external LED on PB0 in lesson 67 is active high.
_Avoid_: Non-inverted (says what the level is not)

**HAL MSP function**:
A HAL hook, named with the MspInit suffix, that the HAL calls from a peripheral's init to do chip-specific setup: the clock enable and the alternate-function pin configuration. It is weak, so a project can define it in its own file. The HAL's name for it is MSP, for MCU support package.
_Avoid_: MSP alone (the glossary's MSP is the main stack pointer)

**Symbol (linker)**:
A global name, such as a function or a global variable, as the linker sees it. The linker binds each use of a symbol to one definition, and reports an error when two definitions share a name.
_Avoid_: Identifier (the C-language term, which is broader)

**Fragmentation (heap)**:
The state in which free memory is split into blocks, none of them large enough for a request, even though the total free space is large. Caused by allocating and freeing blocks of different sizes.
_Avoid_: Heap damage (a different fault: a write outside a block)

**Dispatcher**:
The loop that takes events from queues and calls the handler of the object that owns each queue, one event at a time.
_Avoid_: Scheduler (which decides when threads run; see RTOS)

**Subscription mask**:
A bit mask in which bit n is set when an active object wants signal n. The publisher compares the mask with each event's bit.
_Avoid_: Filter (informal)

**Fixture (test)**:
The state a unit test needs before it runs, set up in setUp() and cleared in tearDown(), so that each test starts from the same state.
_Avoid_: Setup state (informal)

**Assert (test)**:
A check in a unit test that stops the test with a message when a value is wrong. Unity's assert macros are typed, such as TEST_ASSERT_EQUAL_UINT8.
_Avoid_: Assertion (firmware) (that is a runtime check in the product, a different use)

**Red, green, refactor**:
The three steps of test-driven development: write a test and see it fail, write the simplest code that passes, then clean the code with the tests still passing.
_Avoid_: Red-green (omits the refactor step)

**Commit (git)**:
A named snapshot of the tracked files, with its message and a link to its parent commits. Each commit is identified by a hash of its contents.
_Avoid_: Save (informal)

**Branch (git)**:
A name that points at one commit. A commit on the branch moves the name forward.
_Avoid_: Copy of the code (a branch shares its history until it diverges)

**Fast-forward merge**:
A merge in which the target branch is simply behind the source, so Git moves the target's name and creates no merge commit. `--no-ff` forces a merge commit.
_Avoid_: Rebase (a different operation that rewrites commits)

**Revert (git)**:
A new commit that undoes the changes of an earlier commit, without rewriting history.
_Avoid_: Reset (which moves the branch name, and can discard work)

**Code review**:
A second person reads a proposed change before it reaches the main line, and comments on the lines that need work.
_Avoid_: Pull request (the hosted-tool name for the same step)

**Pull request**:
A hosted-tool request to merge a branch, which carries the diff, the discussion and the review. GitHub's term; GitLab calls it a merge request.
_Avoid_: Merge request (acceptable in GitLab contexts)

**Unit under test**:
The module that one unit test exercises. Everything it depends on is either replaced by a test double or left out of the run.
_Avoid_: System under test (a larger scope, used when several modules run together)

**Dependency (unit test)**:
Something the unit under test calls that is not the subject of the test, such as a bus function or a timer. A test replaces it with a test double.
_Avoid_: Collaborator (a general object-oriented term)

**Runner (CI)**:
The machine that runs a CI job. A hosted runner starts clean for each job, so nothing from a developer's laptop is present.
_Avoid_: Agent (a different CI vendor's word), server (too vague)

**Workflow (CI)**:
A YAML file that tells the CI server when to run, and which jobs and steps to run. GitHub reads workflows only from the repository's .github/workflows folder.
_Avoid_: Pipeline (the whole run is the pipeline; the file is the workflow)

**Job (CI)**:
A list of steps that run together on one runner. Jobs run in parallel unless one lists another in needs.
_Avoid_: Step (a step is one action or command inside a job)

**Exit code**:
The number a program returns when it stops. Zero means success, and any other value means failure. A CI job passes or fails from exit codes, not from what the program printed.
_Avoid_: Return code (the same idea in some tools; the course says exit code)

**Log level**:
A rank of how important a log line is: error, warning, info, debug or trace. A build keeps the levels at or above its threshold and drops the rest.
_Avoid_: Severity (the word cppcheck uses for its finding categories)

**Deferred logging**:
Recording an entry in a buffer in the time-critical code, and printing the buffer later from the main loop. The slow output then runs where its delay does not matter.
_Avoid_: Asynchronous logging (a general term that often means threads)

**Precise fault**:
A fault whose stacked PC is the address of the instruction that caused it. The fault is reported before any later instruction runs.
_Avoid_: Imprecise fault (the stacked PC is then a later instruction)

**Orphan section**:
A section that the linker script does not name. The linker places it by its own rules, after the sections it knows. A production script names every section it needs.
_Avoid_: Unplaced section (the linker does place it)

**Stack overflow hook**:
The function `vApplicationStackOverflowHook(TaskHandle_t, char *)` that FreeRTOS calls when `configCHECK_FOR_STACK_OVERFLOW` finds a stack past its limit or with a corrupted bottom pattern. The course's version loops forever, so a debugger stops at the bug.
_Avoid_: Stack guard (a guard is an MPU region that faults on the first write, not a check at task switches)

**Tick hook**:
The function `vApplicationTickHook()` that FreeRTOS calls once per tick when `configUSE_TICK_HOOK` is 1. The course uses it to call `HAL_IncTick()`, so the HAL's timeouts keep counting while FreeRTOS owns SysTick.
_Avoid_: Tick interrupt (the tick is the periodic interrupt; the hook is code the kernel calls from it)

**Devicetree alias**:
A second name for a devicetree node, defined under `aliases` and read in C with `DT_ALIAS(name)`. The C code uses an alias so that moving the node changes only the devicetree.
_Avoid_: Label (a label is the name used in the devicetree source for `&label` references, not for C)

**Devicetree label**:
The short name written before a node, such as `user_button: button_0`, that other devicetree text refers to with an ampersand (`&user_button`).
_Avoid_: Alias (an alias is a separate name defined under `aliases`)

**Devicetree phandle**:
A reference from one node to another, written with an ampersand and a label, such as `&gpio0`. A `gpios` property is a list of phandles, each followed by its cells.
_Avoid_: Pointer (in devicetree text, a phandle is a reference the build resolves, not a memory address)

**Board defconfig**:
The file in a board's folder that sets the Kconfig symbols that board needs. An application's `prj.conf` overrides it for the symbols both set.
_Avoid_: Default config (a Kconfig default is the value in a symbol's declaration, not a file)

**prj.conf**:
The application's Kconfig fragment, with `CONFIG_` assignments that override the board defconfig for this project only.
_Avoid_: Config file (too general; say prj.conf)

**gnuarmemb**:
The Zephyr toolchain variant that uses an Arm GNU Embedded toolchain already on the machine. Selected with `ZEPHYR_TOOLCHAIN_VARIANT=gnuarmemb` and `GNUARMEMB_TOOLCHAIN_PATH`.
_Avoid_: Zephyr SDK (the SDK bundles its own toolchains; gnuarmemb does not)

**Project filter**:
The `manifest.project-filter` setting in `.west/config`, a list of `-` and `+` patterns read left to right that decides which projects of the west manifest are fetched.
_Avoid_: Manifest (the manifest lists all projects; the filter selects some)

**Logging**:
Emitting text lines on purpose, each with a level and a module name, so a running device reports what it did. Zephyr filters by level per module and sends the output to a backend such as UART or the shell.
_Avoid_: printf debugging (for the disciplined form with levels), trace (which records events, not text)

**Shell (Zephyr)**:
A command line inside the firmware that reads text from a serial port, splits it into a command and arguments, and calls a handler written for that command. It runs in its own thread.
_Avoid_: Console (which is the output device), REPL (a general term for an interpreter prompt)

**Magic value**:
A constant that a valid image stores at a known place, so a bootloader can tell an image from erased or old flash. Erased flash reads as all ones. A magic value says the data looks like an image; it does not prove the image is intact.
_Avoid_: Signature (a signature is a keyed proof of origin, which a magic value is not)

**MAC (message authentication code)**:
A short tag computed from a message and a secret key, so that only holders of the key can produce a valid tag. Unlike a CRC, a forger without the key cannot recompute it.
_Avoid_: Checksum, hash (a plain hash has no key, so anyone can recompute it)

**Authenticity**:
The property that data came from a holder of a secret key. A MAC or a signature provides it. Integrity (the bytes did not change) and secrecy (nobody can read them) are separate properties.
_Avoid_: Security (too broad to test for)

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

**Fixed-width integer type**:
An integer type from `<stdint.h>` with an exact width, such as uint8_t (8 bits) or uint32_t (32 bits). Its width is part of the contract with a register or a wire format.
_Avoid_: int (which is at least 16 bits and has no fixed width)

**Modulo arithmetic**:
Unsigned arithmetic in which a result above the type's largest value wraps: the value is taken modulo 2 to the power N, where N is the width. For uint8_t, 300 becomes 44.
_Avoid_: Overflow (for unsigned types, which wrap by definition; reserve overflow for the undefined signed case)

**Static storage duration**:
The lifetime of an object that exists for the whole run of the program and is initialised once before main. A static local keeps its value between calls.
_Avoid_: Global (which is about scope, not lifetime)

**Internal linkage**:
The property of a file-scope object or function declared static, so that other translation units cannot refer to its name.
_Avoid_: Private (informal; C has no private)

**Macro**:
A name that the preprocessor replaces with text. A macro such as GPIO_BSRR_BR13 is expanded before the compiler sees the code.
_Avoid_: Function (a macro is substitution, with no call and no type checking)

**Literal pool**:
A small table of constants, such as 32-bit addresses, placed in flash near the code that uses it. A PC-relative ldr reads an entry, because Thumb-2 cannot hold a 32-bit constant in one instruction.
_Avoid_: Constant table (which is a program's own data table, not compiler-generated)

**Read-only data (.rodata)**:
The linker section that holds const objects and string literals. On the course's STM32 linker script it is placed in FLASH.
_Avoid_: Constant data (which also describes .data after its initial values are copied)

**Alignment**:
The rule that a value of a given size starts at an address that is a multiple of that size, so a 32-bit value sits at a multiple of 4. An aligned access can be done in one bus transfer, and an unaligned one may be slower or refused by the core.
_Avoid_: Byte boundary (informal, and it misses the size rule)

**Padding**:
Unused bytes that the compiler inserts between struct members so that each member meets its alignment. A packed struct removes it.
_Avoid_: Gap (informal)

**Union**:
A type whose members all start at the same address, so its size is that of its largest member. Reading a member other than the one last written is subtle in C.
_Avoid_: Variant (a different concept in other languages)

**Byte**:
Eight bits, the unit that the memory system reads and writes. Its bits are numbered 0 (least significant) to 7.
_Avoid_: Octet (acceptable in protocol specifications)

**Null pointer**:
A pointer value that points to nothing, written `NULL`. A static object of pointer type starts as null, and calling through a null function pointer is undefined behaviour.
_Avoid_: Zero pointer (informal)

**Indirect call**:
A call whose target address is read from a variable at run time, such as a function pointer, rather than named in the code. On Cortex-M the core loads the address into a register and branches through it.
_Avoid_: Function pointer call (the pointer is the mechanism; the call is the act)

**Translation unit**:
One source file after the preprocessor has pasted in its includes and expanded its macros. The compiler compiles each translation unit separately.
_Avoid_: Compilation unit (acceptable in conversation)

**Token pasting**:
The `##` operator in a macro, which joins two tokens into one identifier, as in `EV_##name`.
_Avoid_: Concatenation (informal)

**Stringizing**:
The `#` operator in a function-like macro, which turns its argument into a string literal, as in `#name`.
_Avoid_: Stringify (informal verb)

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

**Striped SRAM**:
The first 256 kB of RP2040 SRAM, where consecutive words go to four different 64 kB banks, so parallel accesses rarely collide.
_Avoid_: Interleaved (a near synonym, but the datasheet says striped)

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

**FIFO**:
A first-in, first-out hardware buffer between the CPU and a peripheral, such as the UART's 32-entry transmit and receive queues.
_Avoid_: Queue (in hardware contexts)

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

**DMA request**:
The signal a peripheral raises to ask the DMA controller for one transfer, such as a UART that has received a byte. Each request is wired to one DMA channel, and the mapping is in the DMA chapter of the reference manual.
_Avoid_: DMA trigger (informal)

**Polling**:
Checking a device's status or a pin's level in a loop, instead of waiting for an interrupt. Simple and deterministic, but the check costs CPU time on every pass, and a short event can be missed between passes.
_Avoid_: Busy-wait (a polling loop that waits for a condition with nothing else to do)

**Overrun error (UART)**:
The receiver's error when a new byte arrives before the previous one was read. The overrun flag must be cleared, here by reading the status register and then the data register, before the receiver accepts more bytes.
_Avoid_: Buffer overflow (the hardware has no software buffer in this sense)

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

**Update event**:
The moment a timer's counter wraps at its limit, or is forced by software, when it reloads the preloaded PSC and ARR values and raises the update interrupt flag. A new prescaler or reload takes effect at the next update event.
_Avoid_: Overflow (the counter does not overflow, it wraps by design), period tick (informal)

**Output compare**:
A timer mode in which a channel changes its output pin when the counter reaches the channel's compare register. PWM is one output compare mode.
_Avoid_: Compare match (informal, and the term for the event rather than the mode)

**Capture/compare register (CCR)**:
The per-channel register that holds the compare value in output mode, and the copied counter value in input capture mode. The name is CCRx for channel x.
_Avoid_: Compare register (drops the capture half of the name)

**Reload value (LOAD)**:
The SysTick register that holds the count the counter reloads from. The period is LOAD + 1 cycles, so LOAD is one less than the number of ticks per period.
_Avoid_: Period (the register holds a count, not a time)

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

**Deadlock**:
A cycle of waiting in which each task holds a resource that another task in the cycle needs, so none of them can proceed. A timeout does not break it; a lock order prevents it.
_Avoid_: Hang (a hang can have other causes, such as a stuck peripheral)

**Priority inheritance**:
The rule that while a high-priority task waits on a mutex, the owner runs at the waiter's priority, and gets its own priority back when it gives the mutex. FreeRTOS does this for mutexes, not for binary semaphores.
_Avoid_: Priority boost (informal)

**Lock ordering**:
A rule that every task takes a set of locks in one fixed global order, so that no cycle of waiting can form.
_Avoid_: Lock hierarchy (acceptable in some texts)

**Recursive mutex**:
A mutex that its owner may take again without blocking, and that is released after the same number of gives. A plain FreeRTOS mutex is not recursive.
_Avoid_: Reentrant lock (acceptable synonym)

**Ready list**:
The kernel's list of ready tasks, one list for each priority level. The scheduler takes the next task from the highest-priority list that is not empty.
_Avoid_: Run queue (informal)

**Time slicing**:
With `configUSE_TIME_SLICING` set to 1, tasks of equal priority take turns at each tick. Tasks of different priorities never share the core this way.
_Avoid_: Round robin (acceptable in conversation)

**Cooperative thread**:
A Zephyr thread with a negative priority. Once it runs, a preemptible thread cannot take the CPU from it, and it keeps the CPU until it blocks or yields.
_Avoid_: Non-preemptive task (FreeRTOS has no equivalent priority class)

**Preemptible thread**:
A Zephyr thread with a non-negative priority. A ready thread of higher or equal urgency can interrupt it at any time.
_Avoid_: Preemptive task (the Zephyr term is about the priority class, not the task)

**Interrupt context**:
The state of the CPU while an interrupt handler or a timer expiry function runs. Code there may not block, wait on a mutex or sleep, and must finish quickly.
_Avoid_: ISR context (which names only the hardware handler, not the expiry function)

**System workqueue**:
Zephyr's built-in thread that runs work items submitted from interrupts or threads, in order. A work item is a small structure with a handler function.
_Avoid_: Deferred task (a general pattern, not the Zephyr object)

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

**Master (I2C)**:
The device that starts every I2C transaction and generates the clock. The NXP specification (UM10204 rev. 7) calls it the controller, and the RP2040 datasheet calls it the master.
_Avoid_: Host (that is a computer, not a bus role)

**Clock stretching**:
A target holds SCL low to pause a transfer until it is ready. The master must wait until the line is released. Most simple sensors cannot stretch the clock because they have no SCL driver.
_Avoid_: Wait state (a general term for a processor pausing)

**Transceiver**:
The analogue chip between a controller's logic-level TX and RX pins and a differential bus. It drives the bus levels and limits fault current.
_Avoid_: Driver (a driver is software or a bus-driver stage inside the transceiver), PHY (acceptable in networking texts)

**RS-485**:
A TIA/EIA-485 differential, half-duplex serial standard for multi-node buses. It defines the electrical levels and not the message format, which is the job of a protocol such as Modbus RTU.
_Avoid_: RS485 (no hyphen), RS-232 (a different, single-ended standard)

**Driver enable (DE)**:
The transceiver pin that switches its bus driver on (high) or puts its outputs in high impedance (low). A node must raise it only for its own reply.
_Avoid_: TX enable (informal)

**Receiver enable (RE)**:
The transceiver pin that enables the receiver when low. When high, the receiver output is high impedance.
_Avoid_: RX enable (informal)

**Error frame**:
A CAN frame that a node sends to break a corrupt frame on purpose. An active error frame is six dominant bits in a row, which violates the stuffing rule, so every node sees the error.
_Avoid_: Error packet (not the CAN term)

**Bit error**:
A CAN error in which a transmitter reads back a level different from the one it sent. Arbitration and the ACK slot are the exceptions, where a recessive bit overwritten by a dominant one is normal.
_Avoid_: Bit flip (a physical event, not the protocol error)

**Stuff error**:
A CAN error in which six identical bits follow each other where a stuff bit should be.
_Avoid_: Stuffing error (acceptable in conversation)

**Form error**:
A CAN error in which a fixed-form field, such as the CRC delimiter, the ACK delimiter or the end of frame, carries an illegal dominant bit.
_Avoid_: Frame error (too vague)

**ACK error**:
A CAN error in which the transmitter finds the ACK slot still recessive, so no node accepted the frame.
_Avoid_: No-ack (informal)

**Transmit error counter (TEC)**:
The CAN counter that rises by 8 each time a node sends an error flag, and falls by 1 after each good frame it sends. A value of 128 or more makes the node error-passive, and 256 or more makes it bus-off.
_Avoid_: TX error count (acceptable in Bosch text)

**Receive error counter (REC)**:
The CAN counter that rises by 1 on each receive error, and falls by 1 after each good frame received. A value of 128 or more makes the node error-passive.
_Avoid_: RX error count (acceptable in Bosch text)

**Control transfer**:
The USB transfer type used for setup and requests, with a setup stage, an optional data stage and a status stage. Endpoint 0 is always a control endpoint.
_Avoid_: Control packet

**Interrupt transfer**:
A USB transfer type for small, time-bounded messages. The host polls the endpoint at the interval in its endpoint descriptor, and a corrupt packet is retried in the next period.
_Avoid_: Hardware interrupt (a CPU exception, a different thing)

**Bulk transfer**:
A USB transfer type for large blocks of data, with error correction and retransmission, using the bandwidth left after the other transfers. It has no latency guarantee.
_Avoid_: Block transfer (informal)

**Isochronous transfer**:
A USB transfer type with guaranteed bandwidth and bounded latency, for streams. Errors are detected by CRC but bad data is not retried.
_Avoid_: Streaming (acceptable in conversation)

**SET_ADDRESS**:
The standard USB control request, code 0x05, that gives a device its unique address after it has answered at address 0.
_Avoid_: Assign address (the request name)

**SET_CONFIGURATION**:
The standard USB control request, code 0x09, that selects a device configuration and activates its endpoints.
_Avoid_: Select config (informal)

**GET_DESCRIPTOR**:
The standard USB control request, code 0x06, that returns a descriptor. A configuration request returns the configuration, interface and endpoint descriptors together.
_Avoid_: Read descriptor (informal)

**CRC residue**:
The value a CRC takes over a frame that has its own CRC appended big-endian. For CRC-16/CCITT-FALSE, which has no final XOR and no reflection, it is zero for every intact frame.
_Avoid_: Checksum (a CRC residue is a property of a CRC, not an addition)

**Master (Modbus)**:
The device that starts every Modbus conversation. It sends a request and waits for a reply, and a slave never transmits unless a master asks.
_Avoid_: Client (the usual name in networking, but not in Modbus documents), host (use it only for the PC side of a course project)

**Slave (Modbus)**:
A device that answers requests from a master, identified by its address (1 to 247). It replies only to its own address, and it stays silent after a frame that it cannot process.
_Avoid_: Server (in Modbus documents), follower

**Exception code (Modbus)**:
The one-byte reason in an exception reply, sent with the function code's top bit set (0x80). Code 02 is an illegal data address and code 03 is an illegal data value.
_Avoid_: Error code (too general; a CRC failure gets no reply at all)

**One's complement**:
The bitwise inverse of a number, in which every 0 becomes 1 and every 1 becomes 0. Adding 1 to it gives the two's complement of the original value.
_Avoid_: Negation (negation is the arithmetic operation, which two's complement implements with the one's complement plus one)

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

## Low power

**Stop (STM32F1)**:
A low-power mode in which the main clocks stop, and the SRAM and registers keep their contents. The core resumes after the instruction that entered Stop. An EXTI line can wake it; a timer or ADC interrupt cannot, because their clocks are off.
_Avoid_: Deep sleep (informal; Standby is the deepest mode)

**Standby (STM32F1)**:
The deepest STM32F1 low-power mode. The SRAM contents are lost, and the chip restarts from reset on wake-up, so state must be kept in backup registers or flash.
_Avoid_: Power off (the chip still runs its wake-up logic)

## Signal processing

**FIR filter (finite impulse response)**:
A filter whose output depends only on a finite window of past inputs, so an input has no effect once it leaves the window. The moving average is the simplest case.
_Avoid_: Windowed filter (a design method, not the filter class)

## Embedded Linux

**Kernel**:
The part of an operating system that runs with full hardware access. It schedules processes, handles interrupts, manages memory and drives devices through drivers.
_Avoid_: Core (the processor core is a different thing)

**Root filesystem**:
The file system that the kernel mounts at boot, holding the programs, libraries and configuration that user space runs from.
_Avoid_: Rootfs (informal, acceptable in build tool output only)

**MMU (memory management unit)**:
Hardware on an application processor that translates each virtual address a program uses into a physical address, using tables that the kernel maintains.
_Avoid_: MPU (the Cortex-M unit that checks accesses against regions without translating them)

**Virtual memory**:
The mechanism in which each process sees its own address space, translated to physical memory by the MMU, so processes cannot read or overwrite one another's memory by accident.
_Avoid_: Virtual address (a single address; virtual memory is the whole system)

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

**Metacognition**:
Thinking about your own thinking: noticing whether you actually know something before you assume you do.
_Avoid_: Self-awareness (broader)
