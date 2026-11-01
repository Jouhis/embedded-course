# Proposals from the depth expansion of lessons 0010 to 0014

For the lead to merge into `GLOSSARY.md` and `RESOURCES.md`. Formats follow those files.

## Glossary terms (add to the groups shown)

### Electronics (group: Electronics)

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

**Pull-down resistor**:
A resistor connecting a signal line to ground, so the line reads logic low when nothing actively drives it high. Used on a MOSFET gate to keep the device off during reset.
_Avoid_: Bias resistor

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

## Resources

No new sources were needed. The lessons use these entries that already exist in `RESOURCES.md`:
- IRLZ44N datasheet (Infineon), for V_GS(th), R_DS(on) at 4 V, 5 V and 10 V, Q_G, C_iss, V_(BR)DSS, R_θJA, R_θJC and the operating junction range.
- PN2222A datasheet (Micro Commercial Components), for ratings, pin order, DC current gain and saturation voltages.
- RP2040 datasheet, for sections 2.9.1, 2.19.4, 2.19.6.3, 5.5.2.1 and Table 625.
- Hardware design with RP2040 (RP-008279-DS-2), for section 2.1.2 (decoupling) and 2.1.3 (regulator capacitors).
- Falstad CircuitJS, for the built-in examples (cap.txt, inductkick.txt, inductkick-snub.txt, voltdivide.txt, ohms.txt, npn.txt, nmosfet.txt). The MOSFET square-law equation was checked in the simulator source (MosfetElm.java).
- Not verified in this pass: the All About Circuits textbook pages (the site refused the fetch with HTTP 403). Lessons 0013 and 0014 state the capacitor and inductor relations Q = C × V, i = C × dV/dt, E = ½CV², V = L × di/dt and E = ½LI² as standard textbook relations, and cite the textbook only in general terms.
