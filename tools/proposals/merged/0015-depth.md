# Proposals from lessons 0015 to 0018 and lab 1 (author: depth expansion pass)

Do not merge these yourself: the lead adds them to GLOSSARY.md and RESOURCES.md in the exact formats used there.

## GLOSSARY.md additions

Add these under `## Electronics`, after **Dropout voltage** (pull-down, Schmitt trigger, thermal resistance and gate charge), after **Low-pass filter** (buck-boost and overdrive), and after **Net label** (local and global labels). The lessons already link to `#pull-down-resistor`, so that anchor is needed.

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

## GLOSSARY.md revision (existing entry, correct it in place)

**Net label** currently says every point with the same name is connected, even across sheets. That is true only for a global label. A local label joins points within its own sheet, and a hierarchical label joins a sub-sheet to its parent (KiCad 9.0 manual, Eeschema, Labels). Suggested replacement definition: "A name placed on a net in a schematic. Global labels with the same name are connected anywhere in the schematic; local labels only within their sheet."

## RESOURCES.md additions

Add under `### Vendor primary sources` (after the IRLZ44N entry), and under `### Tools` for the CircuitJS source files.

- [TI SLVA390: Calculating Efficiency and Power Dissipation in DC/DC Converters (Texas Instruments)](https://www.ti.com/lit/pdf/slva390)
  The application report that lists the three main causes of dissipation in a DC/DC converter (inductor conduction, MOSFET conduction, MOSFET switching) and the method for computing efficiency at any output voltage. Use for: lesson 15 (buck losses). Opened in this build; the introduction and the inductor section were read.
- [Panasonic CGR18650CH specification (copy hosted by orbtronic.com)](https://www.orbtronic.com/content/battery-specs-datasheet/CGR18650CH-Panasonic_18650_specification_datasheet.pdf)
  Lithium-ion cell: 3.6 V nominal, 4.2 V charge limit, 3.0 V discharge cut-off at 430 mA, 25 °C. Use for: lesson 15 (battery and dropout). This is a third-party copy; the manufacturer's own copy should be checked before a design relies on it.
- [CircuitJS source: MosfetElm.java, VoltageElm.java, ResistorElm.java, WireElm.java, GroundElm.java, OutputElm.java (sharpie7/circuitjs1, GitHub)](https://github.com/sharpie7/circuitjs1/tree/master/src/com/lushprojects/circuitjs1/client)
  The simulator's element classes. Their getDumpType() letters (v, r, w, g, O, f) and dump fields define the netlist format, and MosfetElm.java gives the MOSFET equations and the beta and threshold fields. Use for: lessons 17, 18 and Lab 1. Read in this build.

## Notes for the lead (not proposals)

- The IRLZ44N copy read for lesson 18 and Lab 1 is the 11/11/03 revision of the Infineon datasheet. Its values were checked against that copy. A newer revision may differ.
- The AN-140 application note cited in the old lesson 15 could not be fetched in this build (both attempts timed out), so its worked example (27.5 %) was removed from the citations. The efficiency result is now derived in the lesson from the loss formula.
- The RP2040 datasheet's Table 625 gives V_IH and V_IL at IOVDD = 3.3 V as 2 V and 0.8 V. The earlier text gave 2.15 V and 1.16 V, which are the 0.65 and 0.35 × IOVDD formulas for the 1.8 V row. Lesson 16 is corrected.
